import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import {
  Users,
  Ticket,
  Settings,
  LogOut,
  Wallet,
  Gift,
  BadgePercent,
  FileText,
  CalendarDays,
  Sun,
  Moon,
  MessageCircle,
  Bell,
  Menu,
  X,
  MonitorSmartphone,
} from "lucide-react";

const API_BASE_URL = "https://slimy-xenia-jayjay122-018fd7f8.koyeb.app";

const RECENT_TABS_STORAGE_KEY = "admin_recent_tabs_v3";
const MAX_RECENT_TABS = 12;

const TAB_LABELS = {
  "/admin/dashboard": "Dashboard",
  "/admin/invitation-codes": "Invitation Codes",
  "/admin/users": "Users",
  "/admin/trial-bonus": "Trial Bonus",
  "/admin/orders/pool": "Order Pool",
  "/admin/orders/bonus": "Bonus Triggers",
  "/admin/orders/list": "Order List",
  "/admin/withdrawals": "Withdrawals",
  "/admin/deposits": "Deposits",
  "/admin/signin-rewards": "Sign-in Rewards",
  "/admin/chat": "Live Chat",
  "/admin/settings": "Settings",
  "/admin/content": "Content",
  "/admin/events": "Events",
  "/admin/lucky-draw": "Lucky Draw",
  "/admin/bonus-credit": "Bonus Credit",
  "/admin/popups": "Popups",
  "/admin/emails": "Emails",
  "/admin/targeted-bonus-offers": "Targeted Bonus",
};

function loadUnreadMap() {
  try {
    return JSON.parse(localStorage.getItem("admin_unread_map") || "{}");
  } catch {
    return {};
  }
}

function getUnreadTotal() {
  const map = loadUnreadMap();
  return Object.values(map).reduce((sum, v) => sum + Number(v || 0), 0);
}

function saveUnreadMap(map) {
  try {
    localStorage.setItem("admin_unread_map", JSON.stringify(map || {}));

    window.dispatchEvent(
      new CustomEvent("admin-unread-updated", {
        detail: map || {},
      })
    );
  } catch {
    // ignore storage errors
  }
}

function buildUnreadMapFromConversations(conversations = []) {
  const next = {};

  for (const c of conversations) {
    const userId = String(c?.userId || "");
    if (!userId) continue;

    next[userId] = Number(c?.unreadCount || 0);
  }

  return next;
}

function isTrackableAdminPath(pathname) {
  return pathname.startsWith("/admin/") && pathname !== "/admin/login";
}

function getTabLabel(pathname) {
  return TAB_LABELS[pathname] || "Page";
}

function loadRecentTabs() {
  try {
    const raw = localStorage.getItem(RECENT_TABS_STORAGE_KEY);
    const parsed = JSON.parse(raw || "[]");

    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((tab) => tab && typeof tab.path === "string")
      .filter((tab) => isTrackableAdminPath(tab.path))
      .map((tab) => ({
        path: tab.path,
        label: TAB_LABELS[tab.path] || tab.label || getTabLabel(tab.path),
      }))
      .slice(0, MAX_RECENT_TABS);
  } catch {
    return [];
  }
}

function saveRecentTabs(tabs) {
  try {
    localStorage.setItem(RECENT_TABS_STORAGE_KEY, JSON.stringify(tabs));
  } catch {
    // ignore storage errors
  }
}

function moveTab(list, fromIndex, toIndex) {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= list.length ||
    toIndex >= list.length ||
    fromIndex === toIndex
  ) {
    return list;
  }

  const next = [...list];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export default function Shell({ title, children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const pageKey = useMemo(() => {
    return `${location.pathname}-${location.search}-${theme}`;
  }, [location.pathname, location.search, theme]);

  const [chatUnreadTotal, setChatUnreadTotal] = useState(() => getUnreadTotal());
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [bellOpen, setBellOpen] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [recentTabs, setRecentTabs] = useState(() => loadRecentTabs());

  const [draggingPath, setDraggingPath] = useState(null);
  const [dragOverPath, setDragOverPath] = useState(null);
  const dragMovedRef = useRef(false);

  const [pageLoading, setPageLoading] = useState(false);
  const [pageProgress, setPageProgress] = useState(0);
  const progressIntervalRef = useRef(null);
  const progressFinishTimerRef = useRef(null);
  const progressResetTimerRef = useRef(null);

  const [currentTime, setCurrentTime] = useState(() =>
    new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  );

  const audioRef = useRef(null);
  const chatAudioRef = useRef(null);
  const chatConvosRef = useRef([]);
  const chatSocketRef = useRef(null);
  const hasLoadedNotificationsRef = useRef(false);
  const lastUnreadIdsRef = useRef([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    function askAfterFirstClick() {
      requestChatNotificationPermission();
    }

    window.addEventListener("click", askAfterFirstClick, { once: true });

    return () => {
      window.removeEventListener("click", askAfterFirstClick);
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    requestChatNotificationPermission();
    loadChatUnreadTotal();

    const refreshTimer = setInterval(() => {
      loadChatUnreadTotal({ silent: true });
    }, 10000);

    const socket = io(API_BASE_URL, {
      transports: ["polling", "websocket"],
      auth: { token },
    });

    chatSocketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Shell chat socket] connected", socket.id);
      socket.emit("admin:join");
    });

    socket.on("chat:newMessage", async (msg) => {
      console.log("[Shell chat:newMessage]", msg);

      const conversations = await loadChatUnreadTotal({ silent: true });

      if (Array.isArray(conversations) && conversations.length) {
        chatConvosRef.current = conversations;
      }

      if (msg?.sender !== "user") return;

      playChatSound();
      showChatDesktopNotification(msg);
    });

    socket.on("connect_error", (err) => {
      console.error("Shell chat socket error:", err?.message || err);
    });

    return () => {
      clearInterval(refreshTimer);
      socket.disconnect();
      chatSocketRef.current = null;
    };
  }, []);

  useEffect(() => {
    function clearProgressTimers() {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }

      if (progressFinishTimerRef.current) {
        clearTimeout(progressFinishTimerRef.current);
      }

      if (progressResetTimerRef.current) {
        clearTimeout(progressResetTimerRef.current);
      }
    }

    clearProgressTimers();

    setPageLoading(true);
    setPageProgress(12);

    progressIntervalRef.current = setInterval(() => {
      setPageProgress((prev) => {
        if (prev >= 86) return prev;
        return prev + Math.max(2, Math.round((90 - prev) * 0.12));
      });
    }, 120);

    progressFinishTimerRef.current = setTimeout(() => {
      clearProgressTimers();
      setPageProgress(100);

      progressResetTimerRef.current = setTimeout(() => {
        setPageLoading(false);
        setPageProgress(0);
      }, 280);
    }, 450);

    return clearProgressTimers;
  }, [location.pathname, location.search]);

  useEffect(() => {
    function refreshUnread() {
      setChatUnreadTotal(getUnreadTotal());
    }

    function onUnreadUpdated() {
      refreshUnread();
    }

    function onStorage(e) {
      if (!e || e.key === "admin_unread_map") {
        refreshUnread();
      }

      if (!e || e.key === RECENT_TABS_STORAGE_KEY) {
        setRecentTabs(loadRecentTabs());
      }
    }

    window.addEventListener("admin-unread-updated", onUnreadUpdated);
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", refreshUnread);

    refreshUnread();

    return () => {
      window.removeEventListener("admin-unread-updated", onUnreadUpdated);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", refreshUnread);
    };
  }, []);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isTrackableAdminPath(location.pathname)) return;

    const newTab = {
      path: location.pathname,
      label: getTabLabel(location.pathname),
    };

    setRecentTabs((prev) => {
      const alreadyExists = prev.some((tab) => tab.path === newTab.path);
      if (alreadyExists) return prev;

      const nextTabs = [...prev, newTab].slice(0, MAX_RECENT_TABS);
      saveRecentTabs(nextTabs);
      return nextTabs;
    });
  }, [location.pathname]);

  const unreadCount = useMemo(() => {
    return notifications.filter((item) => !item.isRead).length;
  }, [notifications]);

  async function loadChatUnreadTotal({ silent = false } = {}) {
    try {
      const token = localStorage.getItem("admin_token");
      if (!token) return [];

      const res = await fetch(`${API_BASE_URL}/api/chat/conversations`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to load chat conversations");
      }

      const conversations = Array.isArray(data.conversations)
        ? data.conversations
        : [];

      chatConvosRef.current = conversations;

      const nextUnreadMap = buildUnreadMapFromConversations(conversations);

      saveUnreadMap(nextUnreadMap);
      setChatUnreadTotal(getUnreadTotal());

      return conversations;
    } catch (err) {
      if (!silent) {
        console.error("Failed to load chat unread total:", err);
      }

      return [];
    }
  }

  async function loadNotifications({ silent = false } = {}) {
    try {
      const token = localStorage.getItem("admin_token");
      if (!token) return;

      if (!silent) setLoadingNotifications(true);

      const res = await fetch(`${API_BASE_URL}/api/admin/notifications`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || "Failed to load notifications");
      }

      const items = Array.isArray(data.notifications) ? data.notifications : [];

      const newUnreadIds = items
        .filter((item) => !item.isRead)
        .map((item) => item._id);

      if (hasLoadedNotificationsRef.current) {
        const previousUnreadIds = lastUnreadIdsRef.current;
        const hasBrandNewUnread = newUnreadIds.some(
          (id) => !previousUnreadIds.includes(id)
        );

        if (hasBrandNewUnread) {
          playNotificationSound();
        }
      }

      lastUnreadIdsRef.current = newUnreadIds;
      hasLoadedNotificationsRef.current = true;

      setNotifications(items);
    } catch (err) {
      console.error("Failed to load admin notifications:", err);
    } finally {
      if (!silent) setLoadingNotifications(false);
    }
  }

  async function markNotificationRead(notificationId) {
    try {
      const token = localStorage.getItem("admin_token");
      if (!token) return;

      const res = await fetch(
        `${API_BASE_URL}/api/admin/notifications/${notificationId}/read`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || "Failed to mark notification as read");
      }

      setNotifications((prev) =>
        prev.map((item) =>
          item._id === notificationId ? { ...item, isRead: true } : item
        )
      );
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  }

  async function markAllNotificationsRead() {
    try {
      const token = localStorage.getItem("admin_token");
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/api/admin/notifications/read-all`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || "Failed to mark all as read");
      }

      setNotifications((prev) =>
        prev.map((item) => ({ ...item, isRead: true }))
      );
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    }
  }

  function formatTime(value) {
    if (!value) return "";
    try {
      return new Date(value).toLocaleString();
    } catch {
      return "";
    }
  }

  function playNotificationSound() {
    if (!audioRef.current) return;

    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {
      // browser may block autoplay until user interacts once
    });
  }

  function playChatSound() {
    if (!chatAudioRef.current) return;

    chatAudioRef.current.currentTime = 0;
    chatAudioRef.current.play().catch(() => {
      // browser may block autoplay until admin interacts once
    });
  }

  function getChatSenderLabel(msg) {
    const userId = String(msg?.userId || "");

    const convo = chatConvosRef.current.find(
      (c) => String(c?.userId || "") === userId
    );

    const uid =
      msg?.uid ||
      msg?.userUid ||
      msg?.user?.uid ||
      convo?.uid ||
      convo?.user?.uid;

    if (uid) return formatUidLabel(uid);

    const phone =
      msg?.phoneNumber ||
      msg?.user?.phoneNumber ||
      convo?.phoneNumber ||
      convo?.user?.phoneNumber;

    if (phone) return phone;

    const nickname = convo?.nickname || msg?.nickname;
    if (nickname) return nickname;

    return userId || "Unknown user";
  }

  function formatUidLabel(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";

    // UID123456 / UID 123456 -> UID 123456
    const match = raw.match(/^UID\s*(.+)$/i);
    if (match) return `UID ${match[1].trim()}`;

    // 100004 -> UID 100004
    if (/^\d+$/.test(raw)) {
      return `UID ${raw}`;
    }

    return raw;
  }

  async function requestChatNotificationPermission() {
    if (!("Notification" in window)) {
      console.warn("[Chat notification] Notification API not supported");
      return "unsupported";
    }

    console.log("[Chat notification] current permission:", Notification.permission);

    if (Notification.permission === "granted") {
      return "granted";
    }

    if (Notification.permission === "denied") {
      console.warn("[Chat notification] permission denied in browser settings");
      return "denied";
    }

    try {
      const result = await Notification.requestPermission();
      console.log("[Chat notification] permission result:", result);
      return result;
    } catch (err) {
      console.error("[Chat notification] permission request failed:", err);
      return Notification.permission;
    }
  }

  function showChatDesktopNotification(msg) {
    if (!("Notification" in window)) {
      console.warn("[Chat notification] Notification API not supported");
      return;
    }

    if (Notification.permission !== "granted") {
      console.warn(
        "[Chat notification] blocked because permission is:",
        Notification.permission
      );
      return;
    }

    const userId = String(msg?.userId || "");
    const senderLabel = getChatSenderLabel(msg);

    const body =
      msg?.type === "image"
        ? "Sent an image"
        : String(msg?.message || "New live chat message").slice(0, 120);

    try {
      const notification = new Notification(senderLabel, {
        body,
        icon: "/favicon.ico",
        tag: userId
          ? `admin-chat-${userId}-${Date.now()}`
          : `admin-chat-${Date.now()}`,
        renotify: true,
        requireInteraction: false,
      });

      notification.onclick = () => {
        notification.close();
      
        const cleanUserId = String(userId || "").trim();
      
        if (cleanUserId) {
          try {
            localStorage.setItem("admin_chat_pending_user", cleanUserId);
          } catch {
            // ignore localStorage error
          }
      
          const targetUrl = `/admin/chat?userId=${encodeURIComponent(
            cleanUserId
          )}&open=${Date.now()}`;
      
          window.focus();
      
          navigate(targetUrl);
      
          setTimeout(() => {
            const currentUserId = new URLSearchParams(window.location.search).get(
              "userId"
            );
      
            if (
              window.location.pathname !== "/admin/chat" ||
              String(currentUserId || "") !== cleanUserId
            ) {
              window.location.href = targetUrl;
            }
          }, 80);
      
          return;
        }
      
        window.focus();
        navigate("/admin/chat");
      };

      console.log("[Chat notification] shown");
    } catch (err) {
      console.error("[Chat notification] failed to show:", err);
    }
  }

  function buildNotificationSubtitle(item) {
    const currentUser =
      item?.user?.uid || item?.user?.phoneNumber || item?.user?._id || "Unknown";
    const relatedUser =
      item?.relatedUser?.uid ||
      item?.relatedUser?.phoneNumber ||
      item?.relatedUser?._id ||
      "Unknown";

    if (item?.type === "NEW_WITHDRAWAL") {
      return `User ${currentUser}${item?.cryptoType ? ` · ${item.cryptoType}` : ""}`;
    }

    if (item?.type === "DUPLICATE_WITHDRAWAL_ADDRESS") {
      return `User ${currentUser} matched ${relatedUser}${
        item?.cryptoType ? ` · ${item.cryptoType}` : ""
      }`;
    }

    if (item?.type === "DUPLICATE_REGISTER_IP") {
      return `User ${currentUser} matched ${relatedUser}${
        item?.ip ? ` · ${item.ip}` : ""
      }`;
    }

    return "";
  }

  function handleTabClick(path) {
    if (dragMovedRef.current) {
      dragMovedRef.current = false;
      return;
    }

    if (path !== location.pathname) {
      navigate(path);
    }
  }

  function closeTab(path, e) {
    e.stopPropagation();

    setRecentTabs((prev) => {
      const closingIndex = prev.findIndex((tab) => tab.path === path);
      const nextTabs = prev.filter((tab) => tab.path !== path);

      saveRecentTabs(nextTabs);

      if (location.pathname === path) {
        const leftTab = closingIndex > 0 ? prev[closingIndex - 1] : null;
        const rightTab =
          closingIndex >= 0 && closingIndex < prev.length - 1
            ? prev[closingIndex + 1]
            : null;

        const fallbackPath =
          leftTab?.path || rightTab?.path || "/admin/dashboard";

        navigate(fallbackPath);
      }

      return nextTabs;
    });
  }

  function handleTabDragStart(path) {
    setDraggingPath(path);
    setDragOverPath(path);
    dragMovedRef.current = false;
  }

  function handleTabDragOver(targetPath, e) {
    e.preventDefault();

    if (!draggingPath || draggingPath === targetPath) {
      setDragOverPath(targetPath);
      return;
    }

    setRecentTabs((prev) => {
      const fromIndex = prev.findIndex((tab) => tab.path === draggingPath);
      const toIndex = prev.findIndex((tab) => tab.path === targetPath);

      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
        return prev;
      }

      dragMovedRef.current = true;
      const nextTabs = moveTab(prev, fromIndex, toIndex);
      saveRecentTabs(nextTabs);
      return nextTabs;
    });

    setDragOverPath(targetPath);
  }

  function handleTabDrop(e) {
    e.preventDefault();
    setDraggingPath(null);
    setDragOverPath(null);
  }

  function handleTabDragEnd() {
    setTimeout(() => {
      dragMovedRef.current = false;
      setDraggingPath(null);
      setDragOverPath(null);
    }, 0);
  }

  function openLogoutModal() {
    setLogoutModalOpen(true);
  }
  
  function closeLogoutModal() {
    setLogoutModalOpen(false);
  }
  
  function confirmLogout() {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_unread_map");
    window.location.href = "/admin/login";
  }

  useEffect(() => {
    loadNotifications();

    const timer = setInterval(() => {
      loadNotifications({ silent: true });
    }, 10000);

    return () => clearInterval(timer);
  }, []);

  const isDark = theme === "dark";

  return (
    <div
      className={`h-screen overflow-hidden transition-colors duration-300 ${
        isDark
          ? "bg-[#0B1220] text-white"
          : "bg-[#FAF7F0] text-[#111827]"
      }`}
    >
      <div className="flex h-full overflow-hidden">
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 z-[80] bg-black/45 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        <aside
          className={`fixed left-0 top-0 z-[90] flex h-full w-[280px] max-w-[85vw] shrink-0 flex-col overflow-y-auto px-4 py-5 transition-transform duration-300 lg:static lg:z-auto lg:w-[250px] lg:max-w-none lg:translate-x-0 ${
            mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } ${
            isDark
              ? "border-r border-cyan-400/10 bg-[#06111F]"
              : "border-r border-[#E9E2D7] bg-[#F4EEE5] text-[#111827]"
          }`}
        >
          <div className="flex items-center justify-between gap-3 px-2">
            <div
              className={`text-[19px] font-extrabold tracking-tight ${
                isDark ? "text-white" : "text-[#111827]"
              }`}
            >
              16 集团 Admin
            </div>

            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl lg:hidden ${
                isDark
                  ? "border border-white/10 bg-white/10 text-white"
                  : "border border-[#E7DED0] bg-white text-[#111827]"
              }`}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1">
            <nav className="mt-6 space-y-5">
              <SidebarSection title="Main" theme={theme}>
                <SideLink
                  theme={theme}
                  to="/admin/dashboard"
                  icon={<Users className="h-4 w-4 shrink-0" />}
                >
                  Dashboard
                </SideLink>

                <SideLink
                  theme={theme}
                  to="/admin/users"
                  icon={<Users className="h-4 w-4 shrink-0" />}
                >
                  Users
                </SideLink>

                <SideLink
                  theme={theme}
                  to="/admin/chat"
                  icon={<MessageCircle className="h-4 w-4 shrink-0" />}
                  badge={chatUnreadTotal}
                >
                  Live Chat
                </SideLink>
              </SidebarSection>

              <SidebarSection title="Finance" theme={theme}>
                <SideLink
                  theme={theme}
                  to="/admin/withdrawals"
                  icon={<Wallet className="h-4 w-4 shrink-0" />}
                >
                  Withdrawals
                </SideLink>

                <SideLink
                  theme={theme}
                  to="/admin/deposits"
                  icon={<Wallet className="h-4 w-4 shrink-0" />}
                >
                  Deposits
                </SideLink>

                <SideLink
                  theme={theme}
                  to="/admin/bonus-credit"
                  icon={<Gift className="h-4 w-4 shrink-0" />}
                >
                  Bonus Credit
                </SideLink>
              </SidebarSection>

              <SidebarSection title="Rewards" theme={theme}>
                <SideLink
                  theme={theme}
                  to="/admin/trial-bonus"
                  icon={<BadgePercent className="h-4 w-4 shrink-0" />}
                >
                  Trial Bonus
                </SideLink>

                <SideLink
                  theme={theme}
                  to="/admin/orders/bonus"
                  icon={<Settings className="h-4 w-4 shrink-0" />}
                >
                  Bonus Triggers
                </SideLink>

                <SideLink
                  theme={theme}
                  to="/admin/lucky-draw"
                  icon={<Gift className="h-4 w-4 shrink-0" />}
                >
                  Lucky Draw
                </SideLink>

                <SideLink
                  theme={theme}
                  to="/admin/targeted-bonus-offers"
                  icon={<BadgePercent className="h-4 w-4 shrink-0" />}
                >
                  Targeted Bonus
                </SideLink>

                <SideLink
                  theme={theme}
                  to="/admin/signin-rewards"
                  icon={<Gift className="h-4 w-4 shrink-0" />}
                >
                  Sign-in Rewards
                </SideLink>
              </SidebarSection>

              <SidebarSection title="Orders" theme={theme}>
                <SideLink
                  theme={theme}
                  to="/admin/orders/list"
                  icon={<FileText className="h-4 w-4 shrink-0" />}
                >
                  Order List
                </SideLink>

                <SideLink
                  theme={theme}
                  to="/admin/orders/pool"
                  icon={<Settings className="h-4 w-4 shrink-0" />}
                >
                  Order Pool
                </SideLink>
              </SidebarSection>

              <SidebarSection title="Content" theme={theme}>
                <SideLink
                  theme={theme}
                  to="/admin/popups"
                  icon={<MonitorSmartphone className="h-4 w-4 shrink-0" />}
                >
                  Popups
                </SideLink>

                <SideLink
                  theme={theme}
                  to="/admin/content"
                  icon={<FileText className="h-4 w-4 shrink-0" />}
                >
                  Content
                </SideLink>

                <SideLink
                  theme={theme}
                  to="/admin/events"
                  icon={<CalendarDays className="h-4 w-4 shrink-0" />}
                >
                  Events
                </SideLink>

                <SideLink
                  theme={theme}
                  to="/admin/emails"
                  icon={<FileText className="h-4 w-4 shrink-0" />}
                >
                  Emails
                </SideLink>
              </SidebarSection>

              <SidebarSection title="System" theme={theme}>
                <SideLink
                  theme={theme}
                  to="/admin/invitation-codes"
                  icon={<Ticket className="h-4 w-4 shrink-0" />}
                >
                  Referrals
                </SideLink>

                <SideLink
                  theme={theme}
                  to="/admin/settings"
                  icon={<Settings className="h-4 w-4 shrink-0" />}
                >
                  Settings
                </SideLink>
              </SidebarSection>
            </nav>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div
            className={`relative z-50 h-1 shrink-0 overflow-hidden ${
              isDark ? "bg-[#07111F]" : "bg-[#F4EEE5]"
            }`}
          >
            <div
              className={`h-full rounded-r-full transition-all duration-200 ease-out ${
                pageLoading
                  ? isDark
                    ? "bg-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.55)]"
                    : "bg-[#111827]"
                  : "bg-transparent"
              }`}
              style={{
                width: pageLoading ? `${pageProgress}%` : "0%",
                opacity: pageLoading ? 1 : 0,
              }}
            />
          </div>

          <header
            className={`sticky top-0 z-40 shrink-0 border-b px-3 py-3 transition-colors duration-300 sm:px-6 ${
              isDark
                ? "border-cyan-400/10 bg-[#07111F]/95 backdrop-blur-xl"
                : "border-[#E9E2D7] bg-[#F4EEE5]/95 backdrop-blur-xl"
            }`}
          >
            <div className="flex min-w-0 items-center justify-between gap-2 sm:gap-4">
              <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(true)}
                  className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl lg:hidden ${
                    isDark
                      ? "border border-white/10 bg-white/10 text-white"
                      : "border border-[#E7DED0] bg-white text-[#111827]"
                  }`}
                >
                  <Menu className="h-5 w-5" />
                </button>

                {recentTabs.length > 0 && (
                  <div
                    className="hidden min-w-0 flex-1 overflow-x-auto md:block"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleTabDrop}
                  >
                    <div className="flex items-center gap-2">
                      {recentTabs.map((tab) => {
                        const isActive = location.pathname === tab.path;
                        const isDragging = draggingPath === tab.path;
                        const isDragOver =
                          dragOverPath === tab.path && draggingPath !== tab.path;

                        return (
                          <button
                            key={tab.path}
                            type="button"
                            draggable
                            onDragStart={() => handleTabDragStart(tab.path)}
                            onDragOver={(e) => handleTabDragOver(tab.path, e)}
                            onDrop={handleTabDrop}
                            onDragEnd={handleTabDragEnd}
                            onClick={() => handleTabClick(tab.path)}
                            className={`group inline-flex h-10 shrink-0 items-center gap-2 rounded-2xl border px-3 text-sm font-semibold transition ${
                              isActive
                                ? isDark
                                  ? "border-cyan-400/25 bg-[#0B1B33] text-cyan-100 shadow-[0_0_0_1px_rgba(34,211,238,0.12),0_10px_28px_rgba(0,0,0,0.18)]"
                                  : "border-[#E3D8C8] bg-white text-[#111827] shadow-[0_10px_24px_rgba(38,31,22,0.08)]"
                                : isDark
                                ? "border-cyan-400/10 bg-[#0B1628] text-slate-300 hover:border-cyan-400/20 hover:bg-[#13233A] hover:text-cyan-100"
                                : "border-[#E9E0D2] bg-[#FAF7F1] text-[#6B5F50] hover:border-[#DED2C0] hover:bg-white hover:text-[#111827]"
                            } ${isDragging ? "opacity-50" : ""} ${
                              isDragOver
                                ? isDark
                                  ? "ring-1 ring-cyan-300/35"
                                  : "ring-1 ring-[#BCA98E]/40"
                                : ""
                            }`}
                            title="Drag to move tab"
                          >
                            <span className="cursor-grab select-none text-xs opacity-45 active:cursor-grabbing">
                              ⋮⋮
                            </span>

                            <span className="max-w-[140px] truncate">
                              {tab.label}
                            </span>

                            <span
                              onClick={(e) => closeTab(tab.path, e)}
                              className={`inline-flex h-5 w-5 items-center justify-center rounded-full transition ${
                                isDark
                                  ? "text-cyan-100/70 hover:bg-white/10 hover:text-white"
                                  : "text-[#7B6E5E] hover:bg-black/5 hover:text-[#111827]"
                              }`}
                              title={`Close ${tab.label}`}
                            >
                              <X className="h-3.5 w-3.5" />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <div
                  className={`hidden rounded-2xl border px-3 py-2 text-xs font-semibold md:block ${
                    isDark
                      ? "border-cyan-400/10 bg-[#0B1628] text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                      : "border-[#E7DED0] bg-white text-[#374151] shadow-sm"
                  }`}
                >
                  {currentTime}
                </div>

                <button
                  type="button"
                  onClick={() => setBellOpen((prev) => !prev)}
                  title={`You have ${unreadCount} unread notifications`}
                  className={`relative inline-flex h-11 w-11 items-center justify-center rounded-2xl transition ${
                    isDark
                      ? "border border-white/10 bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:bg-white/15"
                      : "border border-[#E7DED0] bg-white text-[#1F2937] shadow-sm hover:bg-[#FBF7F0]"
                  }`}
                >
                  <Bell className="h-5 w-5" />

                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 inline-flex min-h-[20px] min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold leading-none text-white shadow">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={toggleTheme}
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-semibold transition sm:w-auto sm:gap-2 sm:px-4 sm:py-2.5 ${
                    isDark
                      ? "border border-white/10 bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:bg-white/15"
                      : "border border-[#E7DED0] bg-white text-[#1F2937] shadow-sm hover:bg-[#FBF7F0]"
                  }`}
                >
                  {isDark ? (
                    <>
                      <Sun className="h-4 w-4" />
                      <span className="hidden sm:inline">Light Mode</span>
                    </>
                  ) : (
                    <>
                      <Moon className="h-4 w-4" />
                      <span className="hidden sm:inline">Dark Mode</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={openLogoutModal}
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-semibold transition sm:w-auto sm:gap-2 sm:px-4 sm:py-2.5 ${
                    isDark
                      ? "border border-red-400/20 bg-red-500/10 text-red-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_12px_30px_rgba(239,68,68,0.12)] hover:border-red-300/35 hover:bg-red-500/15"
                      : "border border-red-200 bg-red-50 text-red-600 shadow-sm hover:bg-red-100"
                  }`}
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Log out</span>
                </button>

              </div>
            </div>
          </header>

          <main className="min-w-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
            <div
              key={pageKey}
              className={`rounded-2xl p-3 transition-colors duration-300 sm:rounded-[28px] sm:p-5 ${
                isDark
                  ? "border border-white/10 bg-white/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                  : "border border-[#E9E2D7] bg-white shadow-[0_18px_45px_rgba(62,48,31,0.07)]"
              }`}
            >
              {children}
            </div>
          </main>
        </div>
      </div>

      {bellOpen && (
        <>
          <div
            className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-[1px]"
            onClick={() => setBellOpen(false)}
          />

          <div
            className={`fixed right-0 top-0 z-[100] flex h-screen w-full max-w-[420px] flex-col border-l shadow-2xl transition-transform duration-300 ${
              isDark
                ? "border-cyan-400/20 bg-[#0B1B33] text-cyan-100 shadow-[0_0_0_1px_rgba(14,165,233,0.12)]"
                : "border-[#E8E1D6] bg-white text-[#1F2937]"
            }`}
          >
            <div
              className={`flex items-center justify-between px-4 py-4 ${
                isDark ? "border-b border-white/10" : "border-b border-[#F0EADF]"
              }`}
            >
              <div>
                <div className="text-sm font-semibold">Notifications</div>
                <div
                  className={`text-xs ${
                    isDark ? "text-white/60" : "text-[#6B7280]"
                  }`}
                >
                  {unreadCount} unread
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => loadNotifications()}
                  className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                    isDark
                      ? "bg-white/10 text-white hover:bg-white/15"
                      : "bg-[#F8F3EA] text-[#1F2937] hover:bg-[#F1EADB]"
                  }`}
                >
                  Refresh
                </button>

                <button
                  type="button"
                  onClick={markAllNotificationsRead}
                  className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                    isDark
                      ? "bg-white/10 text-white hover:bg-white/15"
                      : "bg-[#F8F3EA] text-[#1F2937] hover:bg-[#F1EADB]"
                  }`}
                >
                  Read all
                </button>

                <button
                  type="button"
                  onClick={() => setBellOpen(false)}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-xl transition ${
                    isDark
                      ? "bg-white/10 text-white hover:bg-white/15"
                      : "bg-[#F8F3EA] text-[#1F2937] hover:bg-[#F1EADB]"
                  }`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingNotifications ? (
                <div
                  className={`px-4 py-6 text-sm ${
                    isDark ? "text-white/70" : "text-[#6B7280]"
                  }`}
                >
                  Loading notifications...
                </div>
              ) : notifications.length === 0 ? (
                <div
                  className={`px-4 py-6 text-sm ${
                    isDark ? "text-white/70" : "text-[#6B7280]"
                  }`}
                >
                  No notifications yet.
                </div>
              ) : (
                notifications.map((item) => (
                  <button
                    key={item._id}
                    type="button"
                    onClick={() => {
                      if (!item.isRead) {
                        markNotificationRead(item._id);
                      }
                    }}
                    className={`block w-full px-4 py-3 text-left transition ${
                      isDark
                        ? "border-b border-white/5 hover:bg-white/5"
                        : "border-b border-[#F7F2E9] hover:bg-[#FCFAF7]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                          item.isRead ? "bg-gray-400" : "bg-red-500"
                        }`}
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <div className="truncate text-sm font-semibold">
                            {item.title || "Notification"}
                          </div>

                          <div
                            className={`shrink-0 text-[11px] ${
                              isDark ? "text-white/50" : "text-[#9CA3AF]"
                            }`}
                          >
                            {formatTime(item.createdAt)}
                          </div>
                        </div>

                        {item.message ? (
                          <div
                            className={`mt-1 text-xs ${
                              isDark ? "text-white/70" : "text-[#6B7280]"
                            }`}
                          >
                            {item.message}
                          </div>
                        ) : null}

                        {buildNotificationSubtitle(item) ? (
                          <div
                            className={`mt-1 text-xs ${
                              isDark ? "text-white/55" : "text-[#9CA3AF]"
                            }`}
                          >
                            {buildNotificationSubtitle(item)}
                          </div>
                        ) : null}

                        {item.address ? (
                          <div
                            className={`mt-1 break-all text-[11px] ${
                              isDark ? "text-white/50" : "text-[#9CA3AF]"
                            }`}
                          >
                            {item.address}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {logoutModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close logout modal"
            onClick={closeLogoutModal}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
          />
      
          <div
            className={`relative w-full max-w-[460px] overflow-hidden rounded-[32px] border shadow-2xl ${
              isDark
                ? "border-white/10 bg-[#07111F] text-white shadow-[0_30px_100px_rgba(0,0,0,0.65)]"
                : "border-gray-200 bg-white text-gray-900 shadow-[0_30px_100px_rgba(15,23,42,0.18)]"
            }`}
          >
            <div
              className={`absolute inset-x-0 top-0 h-1 ${
                isDark
                  ? "bg-gradient-to-r from-red-500 via-orange-400 to-cyan-400"
                  : "bg-gradient-to-r from-red-500 via-orange-400 to-amber-300"
              }`}
            />
      
            <div className="p-6 sm:p-7">
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl ${
                    isDark
                      ? "border border-red-400/20 bg-red-500/10 text-red-200"
                      : "border border-red-200 bg-red-50 text-red-600"
                  }`}
                >
                  <LogOut className="h-6 w-6" />
                </div>
      
                <div className="min-w-0 flex-1">
                  <div
                    className={`text-xl font-bold tracking-tight ${
                      isDark ? "text-white" : "text-gray-950"
                    }`}
                  >
                    Confirm secure logout
                  </div>
      
                  <div
                    className={`mt-2 text-sm leading-relaxed ${
                      isDark ? "text-white/60" : "text-gray-500"
                    }`}
                  >
                    You are about to end this admin session. Any open admin pages will
                    require login again before continuing.
                  </div>
                </div>
              </div>
      
              <div
                className={`mt-6 rounded-3xl border p-4 ${
                  isDark
                    ? "border-white/10 bg-white/[0.04]"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <div
                  className={`text-xs font-bold uppercase tracking-[0.22em] ${
                    isDark ? "text-white/35" : "text-gray-400"
                  }`}
                >
                  Session action
                </div>
      
                <div
                  className={`mt-3 text-sm ${
                    isDark ? "text-white/75" : "text-gray-600"
                  }`}
                >
                  Logout will remove the admin token from this browser and redirect
                  you to the admin login page.
                </div>
              </div>
      
              <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeLogoutModal}
                  className={`rounded-2xl px-5 py-3 text-sm font-bold transition ${
                    isDark
                      ? "border border-white/10 bg-white/5 text-white/75 hover:bg-white/10"
                      : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Cancel
                </button>
      
                <button
                  type="button"
                  onClick={confirmLogout}
                  className={`rounded-2xl px-5 py-3 text-sm font-bold transition ${
                    isDark
                      ? "bg-red-500 text-white shadow-[0_18px_40px_rgba(239,68,68,0.28)] hover:bg-red-400"
                      : "bg-red-600 text-white shadow-[0_18px_40px_rgba(220,38,38,0.22)] hover:bg-red-500"
                  }`}
                >
                  Yes, log me out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <audio ref={audioRef} preload="auto">
        <source src="/notification.mp3" type="audio/mpeg" />
      </audio>

      <audio ref={chatAudioRef} preload="auto">
        <source src="/chat-notification.mp3" type="audio/mpeg" />
      </audio>
    </div>
  );
}

function SidebarSection({ title, children, theme }) {
  const isDark = theme === "dark";

  return (
    <div>
      <div
        className={`mb-2 px-3 text-[10px] font-extrabold uppercase tracking-[0.22em] ${
          isDark ? "text-white/35" : "text-[#9A8F80]"
        }`}
      >
        {title}
      </div>

      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function SideLink({ to, icon, children, badge = 0, theme }) {
  const isDark = theme === "dark";

  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `group relative flex items-center justify-between gap-2 overflow-hidden rounded-2xl px-3 py-2 text-sm transition-all duration-200 ${
          isDark
            ? isActive
              ? "bg-[#062F3C] text-cyan-50 shadow-[inset_4px_0_0_rgba(34,211,238,0.98),0_14px_30px_rgba(0,0,0,0.22)]"
              : "text-slate-300 hover:bg-[#0D2136] hover:text-cyan-100"
            : isActive
            ? "bg-white text-[#2B2118] shadow-[inset_4px_0_0_rgba(139,92,46,0.95),0_12px_26px_rgba(62,48,31,0.10)]"
            : "text-[#4B5563] hover:bg-white/70 hover:text-[#111827] hover:shadow-sm"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={`pointer-events-none absolute inset-y-0 left-0 w-1 rounded-r-full transition ${
              isActive
                ? isDark
                  ? "bg-cyan-400"
                  : "bg-[#8B5C2E]"
                : "bg-transparent"
            }`}
          />

          {isActive && (
            <span
              className={`pointer-events-none absolute inset-0 transition ${
                isDark
                  ? "bg-[radial-gradient(circle_at_left,rgba(34,211,238,0.18),transparent_42%)]"
                  : "bg-[radial-gradient(circle_at_left,rgba(139,92,46,0.13),transparent_45%)]"
              }`}
            />
          )}

          <div className="relative z-10 flex min-w-0 items-center gap-3">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition ${
                isDark
                  ? isActive
                    ? "bg-cyan-400/10 text-cyan-50"
                    : "bg-transparent text-cyan-100/85 group-hover:text-cyan-100"
                  : isActive
                  ? "bg-[#F5EEE6] text-[#2B2118]"
                  : "bg-transparent text-[#111827] group-hover:text-[#111827]"
              }`}
            >
              {icon}
            </span>

            <span className="truncate whitespace-nowrap font-semibold">
              {children}
            </span>
          </div>

          {badge > 0 ? (
            <span className="relative z-10 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-2 text-[11px] font-bold text-white shadow">
              {badge > 99 ? "99+" : badge}
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  );
}