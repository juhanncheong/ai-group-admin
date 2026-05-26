import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Shell from "../components/Shell";
import { io } from "socket.io-client";
import {
  Pin,
  PinOff,
  Search,
  ImagePlus,
  SendHorizontal,
  Sparkles,
  ImageIcon,
  Pencil,
  UserCircle,
  Phone,
  BadgeInfo,
  Clock3,
  MessageCircle,
  Loader2,
  Trash2,
  AlertTriangle,
  X,
  Plus,
  Folder,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "https://slimy-xenia-jayjay122-018fd7f8.koyeb.app";

function formatTime(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

function formatMessageTime(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";

  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelativeTime(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";

  const diff = Date.now() - d.getTime();
  const sec = Math.max(0, Math.floor(diff / 1000));
  if (sec < 10) return "Just now";
  if (sec < 60) return `${sec}s ago`;

  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;

  const day = Math.floor(hr / 24);
  if (day === 1) return "Yesterday";
  if (day < 7) return `${day}d ago`;

  return d.toLocaleDateString();
}

function formatDayLabel(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";

  const today = new Date();
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  ).getTime();

  const diffDays = Math.floor((todayStart - start) / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";

  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

function saveUnreadMap(map) {
  localStorage.setItem("admin_unread_map", JSON.stringify(map || {}));
  window.dispatchEvent(
    new CustomEvent("admin-unread-updated", {
      detail: map || {},
    })
  );
}

function loadPinnedChats() {
  try {
    const raw = JSON.parse(localStorage.getItem("admin_pinned_chats") || "[]");
    return Array.isArray(raw) ? raw.map(String) : [];
  } catch {
    return [];
  }
}

function savePinnedChats(ids) {
  localStorage.setItem("admin_pinned_chats", JSON.stringify(ids || []));
}

function loadAdminChatUserCache() {
  try {
    return JSON.parse(localStorage.getItem("admin_chat_user_cache") || "{}");
  } catch {
    return {};
  }
}

function saveAdminChatUserCache(map) {
  localStorage.setItem("admin_chat_user_cache", JSON.stringify(map || {}));
}

function loadAdminChatMessagesCache() {
  try {
    return JSON.parse(
      localStorage.getItem("admin_chat_messages_cache") || "{}"
    );
  } catch {
    return {};
  }
}

function saveAdminChatMessagesCache(map) {
  localStorage.setItem("admin_chat_messages_cache", JSON.stringify(map || {}));
}

function loadAdminChatConvosCache() {
  try {
    const raw = JSON.parse(localStorage.getItem("admin_chat_convos_cache") || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function saveAdminChatConvosCache(conversations) {
  localStorage.setItem(
    "admin_chat_convos_cache",
    JSON.stringify(conversations || [])
  );
}

function loadAdminChatDraftsCache() {
  try {
    return JSON.parse(localStorage.getItem("admin_chat_drafts_cache") || "{}");
  } catch {
    return {};
  }
}

function saveAdminChatDraftsCache(map) {
  localStorage.setItem("admin_chat_drafts_cache", JSON.stringify(map || {}));
}

function loadLastActiveChatUser() {
  return localStorage.getItem("admin_chat_last_active_user") || "";
}

function saveLastActiveChatUser(userId) {
  if (userId) {
    localStorage.setItem("admin_chat_last_active_user", String(userId));
  } else {
    localStorage.removeItem("admin_chat_last_active_user");
  }
}

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

function normalizePresence(payload) {
  if (!payload || typeof payload !== "object") return null;

  const userId = String(
    payload.userId || payload.id || payload._id || payload.uid || ""
  ).trim();

  if (!userId) return null;

  const rawOnline =
    payload.isOnline ??
    payload.online ??
    (typeof payload.status === "string"
      ? payload.status.toLowerCase() === "online"
      : undefined);

  const isOnline = Boolean(rawOnline);
  const lastSeen =
    payload.lastSeen ||
    payload.lastActive ||
    payload.lastActiveAt ||
    payload.updatedAt ||
    payload.createdAt ||
    null;

  return { userId, isOnline, lastSeen };
}

function buildPresenceText(isOnline, lastSeen) {
  if (isOnline) return "Online";
  if (lastSeen) return `Last seen ${formatRelativeTime(lastSeen)}`;
  return "Offline";
}

function buildMessageItems(messages = []) {
  const out = [];
  let lastDay = "";

  for (const m of messages) {
    const day = formatDayLabel(m.createdAt);
    if (day && day !== lastDay) {
      out.push({
        kind: "day",
        id: `day_${day}_${m.createdAt}`,
        label: day,
      });
      lastDay = day;
    }

    out.push({
      kind: "message",
      id: m.id || `${m.createdAt}-${m.message}-${m.imageUrl || ""}`,
      data: m,
    });
  }

  return out;
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

function getMessageSenderLabel(sender) {
  const value = String(sender || "").toLowerCase();

  if (value === "admin") return "Admin";
  if (value === "user" || value === "customer") return "User";

  return "User";
}

function getLastMessageFromCache(messages = []) {
  if (!Array.isArray(messages) || messages.length === 0) return null;
  return messages[messages.length - 1] || null;
}

function getConversationLastSender(c, cachedMessages = []) {
  const cachedLast = getLastMessageFromCache(cachedMessages);

  return (
    c?.lastSender ||
    c?.lastMessageSender ||
    c?.sender ||
    c?.lastMessageBy ||
    cachedLast?.sender ||
    ""
  );
}

function getConversationLastType(c, cachedMessages = []) {
  const cachedLast = getLastMessageFromCache(cachedMessages);

  if (
    c?.lastMessageType ||
    c?.lastType ||
    c?.messageType ||
    cachedLast?.type
  ) {
    return (
      c?.lastMessageType ||
      c?.lastType ||
      c?.messageType ||
      cachedLast?.type ||
      "text"
    );
  }

  if (c?.lastImageUrl || c?.imageUrl || cachedLast?.imageUrl) return "image";

  return "text";
}

function getConversationPreview(c, cachedMessages = []) {
  const cachedLast = getLastMessageFromCache(cachedMessages);

  const msg =
    c?.lastMessage ||
    cachedLast?.message ||
    (getConversationLastType(c, cachedMessages) === "image" ? "Image" : "");

  return msg || "No messages yet";
}

function conversationMatchesSearch(c, query, cachedMessages = []) {
  const qq = query.trim().toLowerCase();
  if (!qq) return true;

  const baseText = [
    c?.uid,
    c?.phoneNumber,
    c?.userId,
    c?.lastMessage,
    c?.lastSender,
    c?.lastMessageSender,
    c?.nickname,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (baseText.includes(qq)) return true;

  if (Array.isArray(cachedMessages) && cachedMessages.length) {
    return cachedMessages.some((m) => {
      const msgText = [
        m?.message,
        m?.sender,
        m?.type,
        m?.imageUrl ? "image" : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return msgText.includes(qq);
    });
  }

  return false;
}

function Modal({
  open,
  title,
  subtitle,
  eyebrow,
  icon,
  children,
  onClose,
  footer,
  onKeyDown,
  size = "xl",
}) {
  const cardRef = useRef(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        onClose?.();
        return;
      }

      onKeyDown?.(e);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, onKeyDown]);

  useEffect(() => {
    if (!open) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const maxWidth =
    size === "2xl"
      ? "max-w-2xl"
      : size === "3xl"
      ? "max-w-3xl"
      : "max-w-xl";

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center overflow-y-auto px-3 py-4 sm:px-5"
      onMouseDown={(e) => {
        if (cardRef.current && !cardRef.current.contains(e.target)) {
          onClose?.();
        }
      }}
    >
      <div
        className={`absolute inset-0 ${
          theme === "dark"
            ? "bg-black/75"
            : "bg-slate-950/45"
        } backdrop-blur-xl`}
      />

      <div
        className={`pointer-events-none absolute inset-x-0 top-0 mx-auto h-56 max-w-3xl rounded-full blur-3xl ${
          theme === "dark" ? "bg-white/10" : "bg-slate-900/10"
        }`}
      />

      <div
        ref={cardRef}
        onMouseDown={(e) => e.stopPropagation()}
        className={`relative my-4 w-full ${maxWidth} overflow-hidden rounded-[30px] shadow-2xl ring-1 ${
          theme === "dark"
            ? "bg-[#08111f]/95 text-white ring-white/10"
            : "bg-white text-gray-900 ring-black/10"
        }`}
      >
        <div
          className={`relative overflow-hidden border-b px-5 py-5 sm:px-6 ${
            theme === "dark"
              ? "border-white/10 bg-white/[0.035]"
              : "border-gray-200 bg-gray-50"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              {icon ? (
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                    theme === "dark"
                      ? "border border-white/10 bg-white/10 text-white"
                      : "border border-gray-200 bg-white text-gray-900"
                  }`}
                >
                  {icon}
                </div>
              ) : null}

              <div className="min-w-0">
                {eyebrow ? (
                  <div
                    className={`mb-1 text-[10px] font-black uppercase tracking-[0.22em] ${
                      theme === "dark" ? "text-white/35" : "text-gray-400"
                    }`}
                  >
                    {eyebrow}
                  </div>
                ) : null}

                <div className="truncate text-lg font-bold tracking-tight">
                  {title}
                </div>

                {subtitle ? (
                  <div
                    className={`mt-1 max-w-xl text-xs leading-5 ${
                      theme === "dark" ? "text-white/50" : "text-gray-500"
                    }`}
                  >
                    {subtitle}
                  </div>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition active:scale-95 ${
                theme === "dark"
                  ? "border border-white/10 bg-white/5 text-white/65 hover:bg-white/10 hover:text-white"
                  : "border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              }`}
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="max-h-[68vh] overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          {children}
        </div>

        {footer ? (
          <div
            className={`border-t px-5 py-4 sm:px-6 ${
              theme === "dark"
                ? "border-white/10 bg-white/[0.035]"
                : "border-gray-200 bg-gray-50"
            }`}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function AdminChat() {
  const [params] = useSearchParams();
  const { theme } = useTheme();

  const mutedText = theme === "dark" ? "text-white/45" : "text-gray-500";
  const softText = theme === "dark" ? "text-white/70" : "text-gray-600";
  const strongText = theme === "dark" ? "text-white" : "text-gray-900";

  const pageBg =
    theme === "dark"
      ? "border border-white/10 bg-[#111827]/80 shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
      : "border border-gray-200 bg-gray-50 shadow-[0_24px_80px_rgba(15,23,42,0.08)]";

  const panelClass =
    theme === "dark"
      ? "rounded-[28px] border border-white/10 bg-white/[0.045] shadow-[0_16px_45px_rgba(0,0,0,0.18)] backdrop-blur"
      : "rounded-[28px] border border-gray-200 bg-white shadow-sm";

  const innerPanelClass =
    theme === "dark"
      ? "border border-white/10 bg-[#0b1220]/55"
      : "border border-gray-200 bg-gray-50";

  const cardClass =
    theme === "dark"
      ? "rounded-[22px] border border-white/10 bg-white/[0.055]"
      : "rounded-[22px] border border-gray-200 bg-white";

  const inputClass =
    theme === "dark"
      ? "w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/90 placeholder:text-white/30 outline-none focus:border-white/20"
      : "w-full rounded-2xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-400";

  const buttonClass =
    theme === "dark"
      ? "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 transition hover:bg-white/10"
      : "rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 transition hover:bg-gray-50";

  const primaryButtonClass =
    theme === "dark"
      ? "rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-xs text-white/85 transition hover:bg-white/15"
      : "rounded-2xl border border-gray-900 bg-gray-900 px-4 py-3 text-xs text-white transition hover:bg-gray-800";

  const iconButtonClass =
    theme === "dark"
      ? "inline-flex shrink-0 items-center justify-center text-white/65 transition hover:bg-white/10 hover:text-white"
      : "inline-flex shrink-0 items-center justify-center text-gray-500 transition hover:bg-gray-50 hover:text-gray-900";

  const [convos, setConvos] = useState(() => loadAdminChatConvosCache());
  const [usersCache, setUsersCache] = useState([]);
  const [userInfoCache, setUserInfoCache] = useState(() =>
    loadAdminChatUserCache()
  );
  const [messagesCache, setMessagesCache] = useState(() =>
    loadAdminChatMessagesCache()
  );
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [activeUserId, setActiveUserId] = useState("");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [editingMessage, setEditingMessage] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyMessage, setHistoryMessage] = useState(null);
  const [draftsCache, setDraftsCache] = useState(() => loadAdminChatDraftsCache());
  const [loadingConvos, setLoadingConvos] = useState(() => {
    return loadAdminChatConvosCache().length === 0;
  });

  const [refreshingConvos, setRefreshingConvos] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [error, setError] = useState("");

  const [q, setQ] = useState("");
  const [searchingMessages, setSearchingMessages] = useState(false);
  const [unreadMap, setUnreadMap] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("admin_unread_map") || "{}");
    } catch {
      return {};
    }
  });
  
  useEffect(() => {
    saveUnreadMap(unreadMap);
  }, [unreadMap]);

  const [pinnedChats, setPinnedChats] = useState(() => loadPinnedChats());
  const [chatTabs, setChatTabs] = useState([]);
  const [activeChatTabId, setActiveChatTabId] = useState("all");
  const [newTabName, setNewTabName] = useState("");
  const [creatingTab, setCreatingTab] = useState(false);
  const [createTabModalOpen, setCreateTabModalOpen] = useState(false);
  const [moveMenuUserId, setMoveMenuUserId] = useState("");

  const [nickname, setNickname] = useState("");
  const [nickSaving, setNickSaving] = useState(false);
  const [nicknameModalOpen, setNicknameModalOpen] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState("");

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSrc, setPreviewSrc] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  const [pendingImageModalOpen, setPendingImageModalOpen] = useState(false);
  const [pendingImageFile, setPendingImageFile] = useState(null);
  const [pendingImageSrc, setPendingImageSrc] = useState("");
  const [deleteImageModalOpen, setDeleteImageModalOpen] = useState(false);
  const [hotkeysModalOpen, setHotkeysModalOpen] = useState(false);
  const [chatInfoModalOpen, setChatInfoModalOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState(null);
  const [deletingImage, setDeletingImage] = useState(false);

  const [onlineMap, setOnlineMap] = useState({});
  const [lastSeenMap, setLastSeenMap] = useState({});
  const [slashIndex, setSlashIndex] = useState(0);

  const [hotkeys, setHotkeys] = useState([]);
  const [hotkeysLoading, setHotkeysLoading] = useState(false);
  const [hotkeySaving, setHotkeySaving] = useState(false);
  const [hotkeyLabel, setHotkeyLabel] = useState("");
  const [hotkeyText, setHotkeyText] = useState("");
  const [editingHotkeyId, setEditingHotkeyId] = useState("");

  const isMobileChatOpen = Boolean(activeUserId);
  const socketRef = useRef(null);
  const listRef = useRef(null);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const shouldStickToBottomRef = useRef(true);
  const fileInputRef = useRef(null);
  const typingTimerRef = useRef(null);
  const activeUserIdRef = useRef("");
  const composerRef = useRef(null);
  const searchHydrateTimerRef = useRef(null);
  const searchHydratingRef = useRef(false);
  const handledUrlOpenRef = useRef("");

  useEffect(() => {
    activeUserIdRef.current = activeUserId;
  }, [activeUserId]);

  useEffect(() => {
    savePinnedChats(pinnedChats);
  }, [pinnedChats]);

  useEffect(() => {
    setSlashIndex(0);
  }, [text]);

  useEffect(() => {
    return () => {
      if (pendingImageSrc) {
        URL.revokeObjectURL(pendingImageSrc);
      }
    };
  }, [pendingImageSrc]);

  useEffect(() => {
    function onEscCloseChat(e) {
      if (e.key !== "Escape") return;
      if (previewOpen) return;
      if (!activeUserId) return;

      const tag = document.activeElement?.tagName?.toLowerCase();
      const isTyping =
        tag === "textarea" ||
        tag === "input" ||
        document.activeElement?.isContentEditable;

      if (isTyping && text.trim()) return;

      e.preventDefault();
      closeActiveChat();
    }

    document.addEventListener("keydown", onEscCloseChat);
    return () => document.removeEventListener("keydown", onEscCloseChat);
  }, [activeUserId, previewOpen, text]);

  function getAdminToken() {
    return localStorage.getItem("admin_token") || "";
  }

  function hardLogout(reason = "Unknown logout reason") {
    console.error("[AdminChat] hardLogout blocked:", reason);
    setError(`Auth problem: ${reason}`);
  }

  function resizeComposer() {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }

  function isNearBottom() {
    const el = listRef.current;
    if (!el) return true;
  
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    return distanceFromBottom < 100;
  }
  
  function scrollMessagesToBottom({ smooth = false } = {}) {
    const el = listRef.current;
    if (!el) return;
  
    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });
  
    shouldStickToBottomRef.current = true;
    setShowJumpToLatest(false);
  }
  
  function handleMessagesScroll() {
    const nearBottom = isNearBottom();
  
    shouldStickToBottomRef.current = nearBottom;
    setShowJumpToLatest(Boolean(activeUserId) && !nearBottom);
  }

  function applyPresenceUpdate(payload) {
    const normalized = normalizePresence(payload);
    if (!normalized) return;

    const { userId, isOnline, lastSeen } = normalized;

    setOnlineMap((prev) => ({ ...prev, [userId]: isOnline }));

    if (lastSeen || !isOnline) {
      setLastSeenMap((prev) => ({
        ...prev,
        [userId]: lastSeen || new Date().toISOString(),
      }));
    }
  }

  function applyPresenceSnapshot(payload) {
    const arr = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.users)
      ? payload.users
      : Array.isArray(payload?.list)
      ? payload.list
      : [];

    if (!arr.length) return;

    const nextOnline = {};
    const nextLastSeen = {};

    for (const item of arr) {
      const normalized = normalizePresence(item);
      if (!normalized) continue;

      nextOnline[normalized.userId] = normalized.isOnline;
      if (normalized.lastSeen) {
        nextLastSeen[normalized.userId] = normalized.lastSeen;
      }
    }

    if (Object.keys(nextOnline).length) {
      setOnlineMap((prev) => ({ ...prev, ...nextOnline }));
    }

    if (Object.keys(nextLastSeen).length) {
      setLastSeenMap((prev) => ({ ...prev, ...nextLastSeen }));
    }
  }

  function togglePinnedChat(userId) {
    const uid = String(userId || "");
    if (!uid) return;

    setPinnedChats((prev) => {
      if (prev.includes(uid)) return prev.filter((x) => x !== uid);
      return [uid, ...prev];
    });
  }

  function handlePickQuickReply(item) {
    if (!item) return;
    setText(item.text);
    setSlashIndex(0);
    setTimeout(() => {
      composerRef.current?.focus();
      resizeComposer();
    }, 0);
  }

  async function loadAdminHotkeys() {
    setHotkeysLoading(true);
  
    try {
      const data = await authedJSON(
        `${API_BASE}/api/chat/admin-hotkeys`,
        {},
        { logoutOn401: false }
      );
  
      setHotkeys(Array.isArray(data.hotkeys) ? data.hotkeys : []);
    } catch (e) {
      setError(e.message || "Failed to load hotkeys");
    } finally {
      setHotkeysLoading(false);
    }
  }

  async function loadChatTabs() {
    try {
      const data = await authedJSON(
        `${API_BASE}/api/chat/admin-tabs`,
        {},
        { logoutOn401: false }
      );
  
      setChatTabs(Array.isArray(data.tabs) ? data.tabs : []);
    } catch (e) {
      setError(e.message || "Failed to load chat tabs");
    }
  }
  
  async function createChatTab(nameOverride = "") {
    const name = String(nameOverride || newTabName || "").trim();
  
    if (!name) {
      setError("Tab name is required.");
      return;
    }
  
    setCreatingTab(true);
    setError("");
  
    try {
      const data = await authedJSON(
        `${API_BASE}/api/chat/admin-tabs`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        },
        { logoutOn401: false }
      );
  
      if (data.tab) {
        setChatTabs((prev) => [...prev, data.tab]);
        setActiveChatTabId(String(data.tab.id));
        setNewTabName("");
        setCreateTabModalOpen(false);
      }
    } catch (e) {
      setError(e.message || "Failed to create chat tab");
    } finally {
      setCreatingTab(false);
    }
  }

  function openCreateTabModal() {
    setNewTabName("");
    setCreateTabModalOpen(true);
  }
  
  async function moveConversationToTab(userId, chatTabId) {
    if (!userId) return;
  
    try {
      const cleanTabId = chatTabId === "all" ? null : chatTabId;
  
      const data = await authedJSON(
        `${API_BASE}/api/chat/conversations/${userId}/tab`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatTabId: cleanTabId }),
        },
        { logoutOn401: false }
      );
  
      const nextTabId = data?.conversation?.chatTabId || null;
  
      setConvos((prev) =>
        prev.map((c) =>
          String(c.userId) === String(userId)
            ? { ...c, chatTabId: nextTabId }
            : c
        )
      );
    } catch (e) {
      setError(e.message || "Failed to move conversation");
    }
  }
  
  function resetHotkeyForm() {
    setHotkeyLabel("");
    setHotkeyText("");
    setEditingHotkeyId("");
  }
  
  function startEditHotkey(item) {
    setEditingHotkeyId(item.id);
    setHotkeyLabel(item.label || "");
    setHotkeyText(item.text || "");
  }
  
  async function saveHotkey() {
    const label = hotkeyLabel.trim();
    const textValue = hotkeyText.trim();
  
    if (!label) {
      setError("Hotkey label is required.");
      return;
    }
  
    if (!textValue) {
      setError("Hotkey text is required.");
      return;
    }
  
    setHotkeySaving(true);
    setError("");
  
    try {
      if (editingHotkeyId) {
        const data = await authedJSON(
          `${API_BASE}/api/chat/admin-hotkeys/${editingHotkeyId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              label,
              text: textValue,
            }),
          },
          { logoutOn401: false }
        );
  
        const updated = data.hotkey;
  
        setHotkeys((prev) =>
          prev.map((h) => (String(h.id) === String(updated.id) ? updated : h))
        );
      } else {
        const data = await authedJSON(
          `${API_BASE}/api/chat/admin-hotkeys`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              label,
              text: textValue,
              enabled: true,
            }),
          },
          { logoutOn401: false }
        );
  
        if (data.hotkey) {
          setHotkeys((prev) => [...prev, data.hotkey]);
        }
      }
  
      resetHotkeyForm();
    } catch (e) {
      setError(e.message || "Failed to save hotkey");
    } finally {
      setHotkeySaving(false);
    }
  }
  
  async function toggleHotkeyEnabled(item) {
    if (!item?.id) return;
  
    try {
      const data = await authedJSON(
        `${API_BASE}/api/chat/admin-hotkeys/${item.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            enabled: item.enabled === false,
          }),
        },
        { logoutOn401: false }
      );
  
      const updated = data.hotkey;
  
      setHotkeys((prev) =>
        prev.map((h) => (String(h.id) === String(updated.id) ? updated : h))
      );
    } catch (e) {
      setError(e.message || "Failed to update hotkey");
    }
  }
  
  async function deleteHotkey(id) {
    if (!id) return;
  
    try {
      await authedJSON(
        `${API_BASE}/api/chat/admin-hotkeys/${id}`,
        {
          method: "DELETE",
        },
        { logoutOn401: false }
      );
  
      setHotkeys((prev) => prev.filter((h) => String(h.id) !== String(id)));
  
      if (String(editingHotkeyId) === String(id)) {
        resetHotkeyForm();
      }
    } catch (e) {
      setError(e.message || "Failed to delete hotkey");
    }
  }

  async function authedJSON(url, options = {}, { logoutOn401 = false } = {}) {
    const token = getAdminToken();

    if (!token) {
      if (logoutOn401) hardLogout(`Missing token for ${url}`);
      throw new Error("Please login again.");
    }

    const res = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });

    let data = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }

    if (res.status === 401) {
      if (logoutOn401) hardLogout(`401 Unauthorized from ${url}`);
      throw new Error(data?.message || "Unauthorized");
    }

    if (!res.ok) {
      throw new Error(data?.message || `Request failed (${res.status})`);
    }

    return data;
  }

  async function markConversationRead(userId) {
    if (!userId) return;

    try {
      await authedJSON(
        `${API_BASE}/api/chat/conversations/${userId}/read-admin`,
        { method: "PATCH" },
        { logoutOn401: false }
      );
    } catch (e) {
      console.error("Failed to mark conversation as read:", e);
    }
  }

  function syncUnreadMap(nextMap) {
    setUnreadMap(nextMap || {});
  }

  function openNicknameModal() {
    setNicknameDraft(nickname || "");
    setNicknameModalOpen(true);
  }

  async function loadUsersCache() {
    setLoadingUsers(true);
    try {
      const data = await authedJSON(
        `${API_BASE}/api/admin/users`,
        {},
        { logoutOn401: false }
      );
      const users = data.users || [];
      setUsersCache(users);

      const nextUserInfoCache = {};
      const nextOnline = {};
      const nextLastSeen = {};

      for (const u of users) {
        const userId = String(u?._id || "");
        if (!userId) continue;

        nextUserInfoCache[userId] = {
          ...(userInfoCache[userId] || {}),
          uid: u?.uid || userInfoCache[userId]?.uid || "",
          phoneNumber: u?.phoneNumber || userInfoCache[userId]?.phoneNumber || "",
          nickname: userInfoCache[userId]?.nickname || "",
        };

        if (typeof u?.isOnline !== "undefined") {
          nextOnline[userId] = Boolean(u.isOnline);
        }

        if (u?.lastSeen) {
          nextLastSeen[userId] = u.lastSeen;
        }
      }

      setUserInfoCache((prev) => {
        const next = { ...prev, ...nextUserInfoCache };
        saveAdminChatUserCache(next);
        return next;
      });

      if (Object.keys(nextOnline).length) {
        setOnlineMap((prev) => ({ ...prev, ...nextOnline }));
      }

      if (Object.keys(nextLastSeen).length) {
        setLastSeenMap((prev) => ({ ...prev, ...nextLastSeen }));
      }
    } catch (e) {
      setUsersCache([]);
      setError((prev) => prev || e.message || "Failed to load users");
    } finally {
      setLoadingUsers(false);
    }
  }

  async function loadConvos({ silent = false } = {}) {
    if (silent) {
      setRefreshingConvos(true);
    } else {
      setLoadingConvos((prev) => {
        // Only show full loading if we have no conversations to display.
        return convos.length === 0 ? true : prev;
      });
    }
  
    setError("");
  
    try {
      const data = await authedJSON(
        `${API_BASE}/api/chat/conversations`,
        {},
        { logoutOn401: false }
      );
  
      const conversations = data.conversations || [];
  
      setConvos(conversations);
      saveAdminChatConvosCache(conversations);
  
      const nextUnreadMap = buildUnreadMapFromConversations(conversations);
      syncUnreadMap(nextUnreadMap);
  
      const nextOnline = {};
      const nextLastSeen = {};
  
      for (const c of conversations) {
        const userId = String(c?.userId || "");
        if (!userId) continue;
  
        if (typeof c?.isOnline !== "undefined") {
          nextOnline[userId] = Boolean(c.isOnline);
        }
  
        if (c?.lastSeen) {
          nextLastSeen[userId] = c.lastSeen;
        }
      }
  
      if (Object.keys(nextOnline).length) {
        setOnlineMap((prev) => ({ ...prev, ...nextOnline }));
      }
  
      if (Object.keys(nextLastSeen).length) {
        setLastSeenMap((prev) => ({ ...prev, ...nextLastSeen }));
      }
    } catch (e) {
      // Important: do NOT wipe cached conversations on error.
      setError(e.message || "Failed to refresh conversations");
    } finally {
      setLoadingConvos(false);
      setRefreshingConvos(false);
    }
  }

  async function loadNickname(userId) {
    if (!userId) return;
  
    try {
      const data = await authedJSON(
        `${API_BASE}/api/chat/admin-nickname/${userId}`,
        {},
        { logoutOn401: false }
      );
  
      const loadedNickname = data?.nickname || "";
      setNickname(loadedNickname);
  
      setUserInfoCache((prev) => {
        const key = String(userId);
        const next = {
          ...prev,
          [key]: {
            ...(prev[key] || {}),
            nickname: loadedNickname,
          },
        };
  
        saveAdminChatUserCache(next);
        return next;
      });
  
      setConvos((prev) =>
        prev.map((c) =>
          String(c.userId) === String(userId)
            ? { ...c, nickname: loadedNickname }
            : c
        )
      );
    } catch {
      setNickname("");
    }
  }

  async function saveNickname() {
    if (!activeUserId) return;

    const cleanNickname = String(nicknameDraft || "").trim().slice(0, 40);

    setNickSaving(true);
    setError("");

    try {
      const data = await authedJSON(
        `${API_BASE}/api/chat/admin-nickname/${activeUserId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nickname: cleanNickname }),
        },
        { logoutOn401: false }
      );

      const savedNickname = data?.nickname || "";

      setNickname(savedNickname);
      setNicknameDraft(savedNickname);
      setNicknameModalOpen(false);

      setUserInfoCache((prev) => {
        const key = String(activeUserId);
        const next = {
          ...prev,
          [key]: {
            ...(prev[key] || {}),
            nickname: savedNickname,
          },
        };

        saveAdminChatUserCache(next);
        return next;
      });

      setConvos((prev) =>
        prev.map((c) =>
          String(c.userId) === String(activeUserId)
            ? { ...c, nickname: savedNickname }
            : c
        )
      );

      loadConvos();
    } catch (e) {
      setError(e.message || "Failed to save nickname");
    } finally {
      setNickSaving(false);
    }
  }

  async function openChat(userId) {
    if (!userId) return;

    const key = String(userId);
    setActiveUserId(key);
    saveLastActiveChatUser(key);
    shouldStickToBottomRef.current = true;
    setShowJumpToLatest(false);
    setText(draftsCache[key] || "");
    setLoadingMsgs(true);
    setError("");

    loadNickname(key);

    const cachedMessages = messagesCache[key];
    if (Array.isArray(cachedMessages) && cachedMessages.length) {
      setMessages(cachedMessages);
    } else {
      setMessages([]);
    }

    try {
      const data = await authedJSON(
        `${API_BASE}/api/chat/messages/${key}`,
        {},
        { logoutOn401: false }
      );
      const nextMessages = data.messages || [];
      setMessages(nextMessages);

      setMessagesCache((prev) => {
        const next = {
          ...prev,
          [key]: nextMessages,
        };
        saveAdminChatMessagesCache(next);
        return next;
      });

      await markConversationRead(key);

      setUnreadMap((prev) => ({
        ...prev,
        [key]: 0,
      }));

      setConvos((prev) =>
        prev.map((c) =>
          String(c.userId) === key ? { ...c, unreadCount: 0 } : c
        )
      );
    } catch (e) {
      setMessages((prev) => prev || []);
      setError(e.message || "Failed to load messages");
    } finally {
      setLoadingMsgs(false);
      setTimeout(() => {
        composerRef.current?.focus();
        resizeComposer();
      }, 0);
    }

    socketRef.current?.emit("admin:openChat", { userId: key });
  }

  function closeActiveChat() {
    setActiveUserId("");
    setMessages([]);
    setNickname("");
    setText("");
    setSlashIndex(0);
    setLoadingMsgs(false);
    setPreviewOpen(false);
    setPreviewSrc("");
    saveLastActiveChatUser("");
  }

  function startEditMessage(message) {
    if (!message) return;
    if (message.sender !== "admin") return;
    if (message.type !== "text") return;
    if (!message.id || String(message.id).startsWith("tmp_")) {
      setError("Please wait until the message is fully sent before editing.");
      return;
    }
  
    setEditingMessage(message);
    setText(message.message || "");
  
    setTimeout(() => {
      composerRef.current?.focus();
      resizeComposer();
    }, 0);
  }
  
  function cancelEditingMessage() {
    setEditingMessage(null);
    setText("");
    setSlashIndex(0);
  
    if (activeUserId) {
      setDraftsCache((prev) => {
        const next = { ...prev };
        delete next[String(activeUserId)];
        saveAdminChatDraftsCache(next);
        return next;
      });
    }
  
    setTimeout(() => resizeComposer(), 0);
  }
  
  function openEditHistory(message) {
    if (!message?.edited) return;
    setHistoryMessage(message);
    setHistoryModalOpen(true);
  }
  
  function updateMessageEverywhere(updatedMessage) {
    if (!updatedMessage?.id) return;
  
    setMessages((prev) =>
      prev.map((m) =>
        String(m.id) === String(updatedMessage.id)
          ? { ...m, ...updatedMessage }
          : m
      )
    );
  
    setMessagesCache((prev) => {
      const key = String(updatedMessage.userId || activeUserId || "");
      if (!key) return prev;
  
      const existing = Array.isArray(prev[key]) ? prev[key] : [];
  
      const updated = existing.map((m) =>
        String(m.id) === String(updatedMessage.id)
          ? { ...m, ...updatedMessage }
          : m
      );
  
      const next = {
        ...prev,
        [key]: updated,
      };
  
      saveAdminChatMessagesCache(next);
      return next;
    });
  
    setConvos((prev) =>
      prev.map((c) => {
        if (String(c.userId) !== String(updatedMessage.userId || activeUserId)) {
          return c;
        }
  
        return {
          ...c,
          lastMessage:
            updatedMessage.type === "image"
              ? updatedMessage.message || "Image"
              : updatedMessage.message,
          lastTime: updatedMessage.createdAt,
          lastSender: updatedMessage.sender,
          lastMessageSender: updatedMessage.sender,
          lastMessageType: updatedMessage.type || "text",
        };
      })
    );
  }

  async function saveEditedMessage() {
    const msg = text.trim();
  
    if (!msg || !editingMessage?.id) return;
  
    if (msg === String(editingMessage.message || "").trim()) {
      cancelEditingMessage();
      return;
    }
  
    setSavingEdit(true);
    setError("");
  
    try {
      const data = await authedJSON(
        `${API_BASE}/api/chat/messages/${editingMessage.id}/edit`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: msg }),
        },
        { logoutOn401: false }
      );
  
      const updatedMessage = data.messageData;
  
      if (updatedMessage) {
        updateMessageEverywhere(updatedMessage);
      } else {
        await openChat(activeUserId);
      }
  
      setEditingMessage(null);
      setText("");
      setSlashIndex(0);
  
      setDraftsCache((prev) => {
        const next = { ...prev };
        delete next[String(activeUserId)];
        saveAdminChatDraftsCache(next);
        return next;
      });
  
      setTimeout(() => resizeComposer(), 0);
    } catch (e) {
      setError(e.message || "Failed to edit message");
    } finally {
      setSavingEdit(false);
    }
  }

  function sendReply() {
    if (editingMessage) {
      saveEditedMessage();
      return;
    }

    const msg = text.trim();
    if (!msg || !activeUserId) return;

    socketRef.current?.emit("admin:typing", {
      userId: activeUserId,
      typing: false,
    });

    const optimisticId = `tmp_${Date.now()}`;
    const optimistic = {
      id: optimisticId,
      userId: activeUserId,
      sender: "admin",
      message: msg,
      createdAt: new Date().toISOString(),
      status: "sent",
      type: "text",
      adminRead: true,
      userRead: false,
    };

    setMessages((prev) => [...prev, optimistic]);
    setSocketAndCacheAfterLocalMessage(optimistic);

    socketRef.current?.emit("admin:message", {
      userId: activeUserId,
      message: msg,
      clientId: optimisticId,
    });

    setText("");
    setSlashIndex(0);

    setDraftsCache((prev) => {
      const next = { ...prev };
      delete next[String(activeUserId)];
      saveAdminChatDraftsCache(next);
      return next;
    });

    setTimeout(() => {
      resizeComposer();
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    }, 30);
  }

  function setSocketAndCacheAfterLocalMessage(msg) {
    if (!msg?.userId) return;

    setMessagesCache((prev) => {
      const key = String(msg.userId);
      const existing = Array.isArray(prev[key]) ? prev[key] : [];
      const nextMessages = [...existing, msg];

      const next = {
        ...prev,
        [key]: nextMessages,
      };

      saveAdminChatMessagesCache(next);
      return next;
    });

    setConvos((prev) =>
      prev.map((c) => {
        if (String(c.userId) !== String(msg.userId)) return c;

        return {
          ...c,
          lastMessage: msg.type === "image" ? msg.message || "Image" : msg.message,
          lastTime: msg.createdAt,
          lastSender: msg.sender,
          lastMessageSender: msg.sender,
          lastMessageType: msg.type || "text",
        };
      })
    );
  }

  async function sendAdminImage(file) {
    if (!file || !activeUserId) return;

    const token = getAdminToken();
    if (!token) {
      setError("Please login again.");
      return;
    }

    const formData = new FormData();
    formData.append("image", file);
    formData.append("userId", activeUserId);
    formData.append("sender", "admin");

    setUploadingImage(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/chat/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (res.status === 401) {
        setError(data?.message || "Unauthorized");
        return;
      }

      if (!res.ok) {
        throw new Error(data?.message || "Image upload failed");
      }

      const msg = {
        ...data.messageData,
        imageUrl: data.messageData?.imageUrl?.startsWith("http")
          ? data.messageData.imageUrl
          : `${API_BASE}${data.messageData.imageUrl}`,
      };

      setMessages((prev) => [...prev, msg]);
      setSocketAndCacheAfterLocalMessage(msg);
      socketRef.current?.emit("chat:imageSent", msg);
      loadConvos({ silent: true });

      setTimeout(() => {
        if (listRef.current) {
          listRef.current.scrollTop = listRef.current.scrollHeight;
        }
      }, 30);
    } catch (e) {
      setError(e.message || "Image upload failed");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function hydrateSearchMessagesCache(query) {
    const qq = query.trim();
    if (qq.length < 2) return;
    if (searchHydratingRef.current) return;

    const missing = (convos || [])
      .map((c) => String(c?.userId || ""))
      .filter(Boolean)
      .filter((userId) => !Array.isArray(messagesCache[userId]));

    if (!missing.length) return;

    searchHydratingRef.current = true;
    setSearchingMessages(true);

    try {
      const nextCache = { ...messagesCache };

      for (const userId of missing.slice(0, 40)) {
        try {
          const data = await authedJSON(
            `${API_BASE}/api/chat/messages/${userId}`,
            {},
            { logoutOn401: false }
          );

          nextCache[userId] = data.messages || [];
        } catch {
          nextCache[userId] = [];
        }
      }

      setMessagesCache(nextCache);
      saveAdminChatMessagesCache(nextCache);
    } finally {
      searchHydratingRef.current = false;
      setSearchingMessages(false);
    }
  }

  const convosMerged = useMemo(() => {
    const userMap = new Map(usersCache.map((u) => [String(u._id), u]));

    return (convos || []).map((c) => {
      const key = String(c.userId);
      const u = userMap.get(key);
      const cached = userInfoCache[key] || {};

      return {
        ...c,
        nickname: c.nickname || cached.nickname || "",
        uid: c.uid || u?.uid || cached.uid || "",
        phoneNumber: c.phoneNumber || u?.phoneNumber || cached.phoneNumber || "",
        isBanned: Boolean(c.isBanned ?? u?.isBanned),
        isOnline:
          typeof onlineMap[key] !== "undefined"
            ? onlineMap[key]
            : Boolean(c.isOnline ?? u?.isOnline),
        lastSeen: lastSeenMap[key] || c.lastSeen || u?.lastSeen || null,
      };
    });
  }, [convos, usersCache, onlineMap, lastSeenMap, userInfoCache]);

  const activeConvo = useMemo(() => {
    return (
      convosMerged.find((c) => String(c.userId) === String(activeUserId)) || null
    );
  }, [convosMerged, activeUserId]);

  const activeTitle = useMemo(() => {
    if (!activeUserId) return "Select a user";

    const label =
      nickname?.trim() ||
      activeConvo?.nickname ||
      userInfoCache[String(activeUserId)]?.nickname ||
      activeConvo?.uid ||
      activeConvo?.phoneNumber ||
      userInfoCache[String(activeUserId)]?.uid ||
      userInfoCache[String(activeUserId)]?.phoneNumber ||
      activeUserId;

    return label;
  }, [activeUserId, nickname, activeConvo, userInfoCache]);

  const activeIdentity = useMemo(() => {
    const key = String(activeUserId || "");
    return {
      display:
       nickname?.trim() ||
       activeConvo?.nickname ||
       userInfoCache[key]?.nickname ||
       activeConvo?.uid ||
       activeConvo?.phoneNumber ||
       userInfoCache[key]?.uid ||
       userInfoCache[key]?.phoneNumber ||
       activeUserId ||
       "-",
      uid: activeConvo?.uid || userInfoCache[key]?.uid || "-",
      phone: activeConvo?.phoneNumber || userInfoCache[key]?.phoneNumber || "-",
    };
  }, [activeUserId, activeConvo, nickname, userInfoCache]);

  const filteredSortedConvos = useMemo(() => {
   const qq = q.trim();
  
   const filtered = (convosMerged || []).filter((c) => {
     const cachedMessages = messagesCache[String(c.userId)] || [];
  
     const matchesTab =
       activeChatTabId === "all"
         ? true
         : String(c.chatTabId || "") === String(activeChatTabId);
  
     return matchesTab && conversationMatchesSearch(c, qq, cachedMessages);
   });

    filtered.sort((a, b) => {
      const aPinned = pinnedChats.includes(String(a.userId)) ? 1 : 0;
      const bPinned = pinnedChats.includes(String(b.userId)) ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;

      const au = Number(unreadMap[a.userId] || 0);
      const bu = Number(unreadMap[b.userId] || 0);
      if (au !== bu) return bu - au;

      const at = new Date(a.lastTime || 0).getTime() || 0;
      const bt = new Date(b.lastTime || 0).getTime() || 0;
      return bt - at;
    });

    return filtered;
  }, [convosMerged, unreadMap, q, pinnedChats, messagesCache, activeChatTabId]);

  const groupedConvos = useMemo(() => {
    const unread = [];
    const pinned = [];
    const others = [];

    const used = new Set();

    for (const c of filteredSortedConvos) {
      const key = String(c.userId);
      const unreadCount = Number(unreadMap[key] || 0);

      if (unreadCount > 0) {
        unread.push(c);
        used.add(key);
      }
    }

    for (const c of filteredSortedConvos) {
      const key = String(c.userId);
      if (used.has(key)) continue;

      if (pinnedChats.includes(key)) {
        pinned.push(c);
        used.add(key);
      }
    }

    for (const c of filteredSortedConvos) {
      const key = String(c.userId);
      if (used.has(key)) continue;

      others.push(c);
      used.add(key);
    }

    return [
      {
        key: "unread",
        title: "Unread",
        count: unread.length,
        items: unread,
      },
      {
        key: "pinned",
        title: "Pinned",
        count: pinned.length,
        items: pinned,
      },
      {
        key: "all",
        title: "All Conversations",
        count: others.length,
        items: others,
      },
    ].filter((group) => group.items.length > 0);
  }, [filteredSortedConvos, unreadMap, pinnedChats]);

  const activePresenceText = useMemo(() => {
    return buildPresenceText(activeConvo?.isOnline, activeConvo?.lastSeen);
  }, [activeConvo]);

  const slashMatches = useMemo(() => {
    if (!text.startsWith("/")) return [];
  
    const query = text.slice(1).trim().toLowerCase();
  
    const enabledHotkeys = (hotkeys || []).filter(
      (item) => item.enabled !== false
    );
  
    if (!query) return enabledHotkeys;
  
    return enabledHotkeys.filter((item) => {
      const label = String(item.label || "").toLowerCase();
  
      // ✅ Only search hotkey label, not message text
      return label.includes(query);
    });
  }, [text, hotkeys]);

  const showSlashMenu = Boolean(activeUserId && text.startsWith("/"));
  const selectedSlash = slashMatches[slashIndex] || slashMatches[0] || null;

  const messageItems = useMemo(() => buildMessageItems(messages), [messages]);

  useEffect(() => {
    if (!activeUserId) return;

    setMessagesCache((prev) => {
      const next = {
        ...prev,
        [String(activeUserId)]: messages || [],
      };
      saveAdminChatMessagesCache(next);
      return next;
    });
  }, [messages, activeUserId]);

  useEffect(() => {
    if (searchHydrateTimerRef.current) {
      clearTimeout(searchHydrateTimerRef.current);
    }

    const query = q.trim();

    if (query.length < 2) {
      setSearchingMessages(false);
      return;
    }

    searchHydrateTimerRef.current = setTimeout(() => {
      hydrateSearchMessagesCache(query);
    }, 450);

    return () => {
      if (searchHydrateTimerRef.current) {
        clearTimeout(searchHydrateTimerRef.current);
      }
    };
  }, [q, convos.length]);

  useEffect(() => {
    const token = getAdminToken();
    if (!token) {
      setError("No admin token found. Check localStorage.");
      return;
    }

    loadConvos({ silent: convos.length > 0 });
    loadUsersCache();
    loadAdminHotkeys();
    loadChatTabs();

    const socket = io(API_BASE, {
      transports: ["polling", "websocket"],
      auth: { token },
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("admin:join");
    });

    socket.on("chat:newMessage", async (msg) => {
      // Keep the UI stable. Update the row locally first.
      // Do a silent refresh later only if needed.

      if (msg?.userId) {
        setLastSeenMap((prev) => ({
          ...prev,
          [msg.userId]: msg.createdAt || new Date().toISOString(),
        }));

        setMessagesCache((prev) => {
          const key = String(msg.userId);
          const existing = Array.isArray(prev[key]) ? prev[key] : [];

          if (msg.id && existing.some((m) => String(m.id) === String(msg.id))) {
            return prev;
          }

          if (
            msg.clientId &&
            existing.some((m) => String(m.id) === String(msg.clientId))
          ) {
            const replaced = existing.map((m) =>
              String(m.id) === String(msg.clientId)
                ? {
                    ...m,
                    ...msg,
                    id: msg.id || m.id,
                    status: msg.status || m.status,
                  }
                : m
            );

            const next = {
              ...prev,
              [key]: replaced,
            };

            saveAdminChatMessagesCache(next);
            return next;
          }

          const next = {
            ...prev,
            [key]: [...existing, msg],
          };

          saveAdminChatMessagesCache(next);
          return next;
        });
      }

      if (msg?.sender === "user" && msg?.userId) {
        setOnlineMap((prev) => ({
          ...prev,
          [msg.userId]: true,
        }));
      }

      const currentActiveUserId = activeUserIdRef.current;
      const isActive =
        msg?.userId && String(msg.userId) === String(currentActiveUserId);

      if (msg?.sender === "user" && msg?.userId && !isActive) {
        setUnreadMap((prev) => ({
          ...prev,
          [msg.userId]: Number(prev[msg.userId] || 0) + 1,
        }));
      }

      if (msg?.sender === "user" && msg?.userId && isActive) {
        await markConversationRead(msg.userId);
        setUnreadMap((prev) => ({
          ...prev,
          [msg.userId]: 0,
        }));
      }

      if (msg?.userId) {
        setConvos((prev) =>
          prev.map((c) => {
            if (String(c.userId) !== String(msg.userId)) return c;

            return {
              ...c,
              lastMessage:
                msg.type === "image" ? msg.message || "Image" : msg.message,
              lastTime: msg.createdAt,
              lastSender: msg.sender,
              lastMessageSender: msg.sender,
              lastMessageType: msg.type || "text",
            };
          })
        );
      }

      if (msg?.userId && isActive) {
        setMessages((prev) => {
          if (msg.clientId) {
            const idx = prev.findIndex(
              (m) => String(m.id) === String(msg.clientId)
            );
            if (idx !== -1) {
              const copy = [...prev];
              copy[idx] = {
                ...copy[idx],
                ...msg,
                id: msg.id || copy[idx].id,
                status: msg.status || copy[idx].status,
              };
              return copy;
            }
          }

          if (msg.id && prev.some((m) => String(m.id) === String(msg.id))) {
            return prev;
          }

          return [...prev, msg];
        });
      }
    });

    socket.on("chat:status", ({ messageId, status, clientId }) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (clientId && String(m.id) === String(clientId)) {
            return { ...m, status: status || m.status };
          }
          if (messageId && String(m.id) === String(messageId)) {
            return { ...m, status: status || m.status };
          }
          return m;
        })
      );
    });

    socket.on("chat:adminMessagesReadByUser", ({ userId, status }) => {
      const key = String(userId || "");
      if (!key) return;

      setMessages((prev) =>
        prev.map((m) => {
          if (String(m.userId) === key && m.sender === "admin") {
            return {
              ...m,
              status: status || "read",
              userRead: true,
            };
          }

          return m;
        })
      );

      setMessagesCache((prev) => {
        const existing = Array.isArray(prev[key]) ? prev[key] : [];

        const updated = existing.map((m) => {
          if (m.sender === "admin") {
            return {
              ...m,
              status: status || "read",
              userRead: true,
            };
          }

          return m;
        });

        const next = {
          ...prev,
          [key]: updated,
        };

        saveAdminChatMessagesCache(next);
        return next;
      });
    });

    socket.on("chat:userPresence", applyPresenceUpdate);
    socket.on("chat:user-presence", applyPresenceUpdate);
    socket.on("chat:presence", applyPresenceUpdate);
    socket.on("presence:update", applyPresenceUpdate);
    socket.on("chat:presenceSnapshot", applyPresenceSnapshot);
    socket.on("presence:snapshot", applyPresenceSnapshot);

    socket.on("connect_error", (err) => {
      setError(err?.message || "Socket connection failed");
    });

    socket.on("chat:imageDeleted", ({ messageId, userId }) => {
      removeImageEverywhere(messageId, userId);
    });

    return () => {
      socket.disconnect();
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
    };
  }, []);

  const qUserId = params.get("userId") || "";
  const qOpen = params.get("open") || "";
  
  useEffect(() => {
    let pendingUserId = "";
  
    try {
      pendingUserId = localStorage.getItem("admin_chat_pending_user") || "";
    } catch {
      pendingUserId = "";
    }
  
    const targetUserId = String(qUserId || pendingUserId || "").trim();
  
    if (targetUserId) {
      const openKey = `${targetUserId}:${qOpen}`;
  
      if (
        handledUrlOpenRef.current === openKey &&
        activeUserIdRef.current === targetUserId
      ) {
        return;
      }
  
      handledUrlOpenRef.current = openKey;
  
      try {
        localStorage.removeItem("admin_chat_pending_user");
      } catch {
        // ignore localStorage error
      }
  
      openChat(targetUserId);
      return;
    }
  
    const lastUserId = loadLastActiveChatUser();
  
    if (lastUserId && !activeUserIdRef.current) {
      openChat(lastUserId);
    }
  }, [qUserId, qOpen]);

  useEffect(() => {
    if (!activeUserId) return;
  
    if (shouldStickToBottomRef.current) {
      setTimeout(() => {
        scrollMessagesToBottom({ smooth: false });
      }, 0);
    } else {
      setShowJumpToLatest(true);
    }
  }, [messages, activeUserId]);

  useEffect(() => {
    resizeComposer();
  }, [text, activeUserId]);

  function openPreview(src) {
    if (!src) return;
    setPreviewSrc(src);
    setPreviewOpen(true);
  }

  function closePreview() {
    setPreviewOpen(false);
    setPreviewSrc("");
  }

  function openPendingImagePreview(file) {
    if (!file || !activeUserId) return;
  
    if (!file.type?.startsWith("image/")) {
      setError("Only image files are allowed.");
      return;
    }
  
    if (file.size > 5 * 1024 * 1024) {
      setError("Image is too large. Maximum size is 5MB.");
      return;
    }
  
    if (pendingImageSrc) {
      URL.revokeObjectURL(pendingImageSrc);
    }
  
    const objectUrl = URL.createObjectURL(file);
  
    setPendingImageFile(file);
    setPendingImageSrc(objectUrl);
    setPendingImageModalOpen(true);
  }
  
  function closePendingImagePreview() {
    if (pendingImageSrc) {
      URL.revokeObjectURL(pendingImageSrc);
    }
  
    setPendingImageModalOpen(false);
    setPendingImageFile(null);
    setPendingImageSrc("");
  
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }
  
  async function confirmSendPendingImage() {
    if (!pendingImageFile || !activeUserId) return;
  
    const file = pendingImageFile;
  
    closePendingImagePreview();
    await sendAdminImage(file);
  }
  
  function openDeleteImageModal(message) {
    if (!message) return;
  
    if (message.sender !== "admin" || message.type !== "image") {
      setError("Only admin-sent images can be deleted.");
      return;
    }
  
    if (!message.id || String(message.id).startsWith("tmp_")) {
      setError("Please wait until the image is fully sent before deleting.");
      return;
    }
  
    setImageToDelete(message);
    setDeleteImageModalOpen(true);
  }
  
  function closeDeleteImageModal() {
    if (deletingImage) return;
  
    setDeleteImageModalOpen(false);
    setImageToDelete(null);
  }
  
  function removeImageEverywhere(messageId, userId) {
    const mid = String(messageId || "");
    const uid = String(userId || activeUserId || "");
  
    if (!mid) return;
  
    setMessages((prev) => prev.filter((m) => String(m.id) !== mid));
  
    setMessagesCache((prev) => {
      const next = { ...prev };
  
      if (uid && Array.isArray(next[uid])) {
        next[uid] = next[uid].filter((m) => String(m.id) !== mid);
      }
  
      saveAdminChatMessagesCache(next);
      return next;
    });
  
    setConvos((prev) =>
      prev.map((c) => {
        if (String(c.userId) !== uid) return c;
  
        const cached = messagesCache[uid] || [];
        const remaining = cached.filter((m) => String(m.id) !== mid);
        const last = remaining[remaining.length - 1];
  
        if (!last) {
          return {
            ...c,
            lastMessage: "",
            lastMessageType: "text",
            lastSender: "",
            lastMessageSender: "",
          };
        }
  
        return {
          ...c,
          lastMessage: last.type === "image" ? last.message || "Image" : last.message,
          lastTime: last.createdAt,
          lastSender: last.sender,
          lastMessageSender: last.sender,
          lastMessageType: last.type || "text",
        };
      })
    );
  }
  
  async function confirmDeleteImage() {
    if (!imageToDelete?.id) return;
  
    setDeletingImage(true);
    setError("");
  
    try {
      const data = await authedJSON(
        `${API_BASE}/api/chat/messages/${imageToDelete.id}/image`,
        {
          method: "DELETE",
        },
        { logoutOn401: false }
      );
  
      removeImageEverywhere(data.messageId || imageToDelete.id, data.userId || imageToDelete.userId);
  
      setDeleteImageModalOpen(false);
      setImageToDelete(null);
      loadConvos({ silent: true });
    } catch (e) {
      setError(e.message || "Failed to delete image");
    } finally {
      setDeletingImage(false);
    }
  }
  
  function handleImageFileSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;
  
    openPendingImagePreview(file);
  }

  function handleComposerPaste(e) {
    const items = Array.from(e.clipboardData?.items || []);
    const imageItem = items.find((item) => item.type?.startsWith("image/"));
  
    if (!imageItem) return;
  
    if (!activeUserId) {
      setError("Select a user before sending an image.");
      return;
    }
  
    const file = imageItem.getAsFile();
    if (!file) return;
  
    e.preventDefault();
    openPendingImagePreview(file);
  }

  function getTabNameById(tabId) {
    if (!tabId) return "All";
  
    const found = chatTabs.find((tab) => String(tab.id) === String(tabId));
    return found?.name || "All";
  }

  function renderConversationRow(c) {
    const key = String(c.userId);
    const unread = Number(unreadMap[key] || 0);
    const cachedMessages = messagesCache[key] || [];
    const label =
      c.nickname ||
      userInfoCache[key]?.nickname ||
      c.uid ||
      c.phoneNumber ||
      userInfoCache[key]?.uid ||
      userInfoCache[key]?.phoneNumber ||
      c.userId;

    const isPinned = pinnedChats.includes(key);
    const isActive = String(activeUserId) === key;
    const lastSender = getConversationLastSender(c, cachedMessages);
    const lastSenderLabel = getMessageSenderLabel(lastSender);
    const lastType = getConversationLastType(c, cachedMessages);
    const preview = getConversationPreview(c, cachedMessages);
    const isImage = String(lastType).toLowerCase() === "image";

    return (
      <div
        key={c.userId}
        role="button"
        tabIndex={0}
        onClick={() => openChat(c.userId)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openChat(c.userId);
          }
        }}
        className={classNames(
          "group w-full cursor-pointer rounded-2xl p-3 text-left transition active:scale-[0.99]",
          isActive
            ? theme === "dark"
              ? "bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
              : "bg-gray-100 text-gray-900 shadow-[inset_0_0_0_1px_rgba(17,24,39,0.08)]"
            : theme === "dark"
            ? "text-white/75 hover:bg-white/[0.055] hover:text-white"
            : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
        )}
      >
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex items-center gap-2">
              <div className={`truncate text-xs font-bold ${strongText}`}>
                {label}
              </div>
    
              {unread > 0 ? (
                <span className="inline-flex h-4 min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold leading-none text-white shadow-sm">
                  {unread > 99 ? "99+" : unread}
                </span>
              ) : null}
            </div>
    
            <div className="flex shrink-0 items-center gap-2">
              <div className={`hidden shrink-0 text-[10px] sm:block ${mutedText}`}>
                {formatTime(c.lastTime)}
              </div>
    
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePinnedChat(c.userId);
                }}
                className={`rounded-lg p-1 transition ${
                  theme === "dark"
                    ? isPinned
                      ? "text-white/80 hover:bg-white/10"
                      : "text-white/35 hover:bg-white/10 hover:text-white"
                    : isPinned
                    ? "text-gray-800 hover:bg-gray-100"
                    : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                }`}
                title={isPinned ? "Unpin chat" : "Pin chat"}
              >
                {isPinned ? (
                  <PinOff className="h-3.5 w-3.5" />
                ) : (
                  <Pin className="h-3.5 w-3.5" />
                )}
              </button>

              <div className="relative hidden sm:block">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMoveMenuUserId((prev) => (prev === key ? "" : key));
                  }}
                  className={`inline-flex max-w-[118px] items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition ${
                    theme === "dark"
                      ? "border-white/10 bg-white/5 text-white/65 hover:bg-white/10 hover:text-white"
                      : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                  title="Move to tab"
                >
                  <Folder className="h-3 w-3 shrink-0" />
                  <span className="truncate">{getTabNameById(c.chatTabId)}</span>
                </button>
              
                {moveMenuUserId === key ? (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className={`absolute right-0 top-8 z-50 w-44 overflow-hidden rounded-2xl border p-1 shadow-xl ${
                      theme === "dark"
                        ? "border-white/10 bg-[#0b1220] text-white"
                        : "border-gray-200 bg-white text-gray-900"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        moveConversationToTab(c.userId, null);
                        setMoveMenuUserId("");
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[11px] font-semibold transition ${
                        !c.chatTabId
                          ? theme === "dark"
                            ? "bg-white/10 text-white"
                            : "bg-gray-100 text-gray-900"
                          : theme === "dark"
                          ? "text-white/65 hover:bg-white/10 hover:text-white"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      <span>All</span>
                      {!c.chatTabId ? <span>✓</span> : null}
                    </button>
              
                    {chatTabs.map((tab) => {
                      const active = String(c.chatTabId || "") === String(tab.id);
              
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            moveConversationToTab(c.userId, tab.id);
                            setMoveMenuUserId("");
                          }}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[11px] font-semibold transition ${
                            active
                              ? theme === "dark"
                                ? "bg-white/10 text-white"
                                : "bg-gray-100 text-gray-900"
                              : theme === "dark"
                              ? "text-white/65 hover:bg-white/10 hover:text-white"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                          }`}
                        >
                          <span className="truncate">{tab.name}</span>
                          {active ? <span>✓</span> : null}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>

            </div>
          </div>
    
          <div className={`mt-2 flex min-w-0 items-center gap-1.5 text-[11px] ${softText}`}>
            {isImage ? (
              <ImageIcon className="h-3.5 w-3.5 shrink-0 opacity-70" />
            ) : null}
    
            <span
              className={`shrink-0 font-semibold ${
                theme === "dark" ? "text-white/55" : "text-gray-500"
              }`}
            >
              {lastSenderLabel}:
            </span>
    
            <span className="min-w-0 truncate">
              {isImage && (!preview || preview === "Image") ? "Image" : preview}
            </span>
          </div>
        </div>
      </div>
    );
   }

   function renderHotkeySettingsPanel() {
     return (
       <div className="flex h-full min-h-0 flex-col gap-3">
         <div className={`${cardClass} p-4`}>
           <div className={`text-sm font-bold ${strongText}`}>
             Hotkey Settings
           </div>
           <div className={`mt-1 text-[11px] ${mutedText}`}>
             Add quick replies here. Admin can type / in chat to use them.
           </div>
         </div>
   
         <div className={`${cardClass} p-4`}>
           <div className={`text-xs font-bold ${strongText}`}>
             {editingHotkeyId ? "Edit Hotkey" : "Add Hotkey"}
           </div>
   
           <div className="mt-3 space-y-3">
             <input
               value={hotkeyLabel}
               onChange={(e) => setHotkeyLabel(e.target.value)}
               placeholder="Label, example: Welcome"
               className={inputClass}
               maxLength={40}
             />
   
             <textarea
               value={hotkeyText}
               onChange={(e) => setHotkeyText(e.target.value)}
               placeholder="Message text..."
               className={`${inputClass} min-h-[120px] resize-none`}
               maxLength={2000}
             />
   
             <div className="flex gap-2">
               <button
                 type="button"
                 onClick={saveHotkey}
                 disabled={hotkeySaving}
                 className={`${primaryButtonClass} flex-1 disabled:opacity-50`}
               >
                 {hotkeySaving
                   ? "Saving..."
                   : editingHotkeyId
                   ? "Save Changes"
                   : "Add Hotkey"}
               </button>
   
               {editingHotkeyId ? (
                 <button
                   type="button"
                   onClick={resetHotkeyForm}
                   className={buttonClass}
                 >
                   Cancel
                 </button>
               ) : null}
             </div>
           </div>
         </div>
   
         <div className="min-h-0 flex-1 overflow-y-auto pr-1">
           {hotkeysLoading ? (
             <div className={`${cardClass} p-4 text-xs ${mutedText}`}>
               Loading hotkeys...
             </div>
           ) : hotkeys.length === 0 ? (
             <div className={`${cardClass} p-4`}>
               <div className={`text-xs font-semibold ${strongText}`}>
                 No hotkeys yet
               </div>
               <div className={`mt-1 text-[11px] ${mutedText}`}>
                 Add your first hotkey above.
               </div>
             </div>
           ) : (
             <div className="space-y-2">
               {hotkeys.map((item) => (
                 <div key={item.id} className={`${cardClass} p-3`}>
                   <div className="flex items-start justify-between gap-2">
                     <div className="min-w-0">
                       <div className={`truncate text-xs font-bold ${strongText}`}>
                         {item.label}
                       </div>
                       <div className={`mt-1 line-clamp-2 text-[11px] ${softText}`}>
                         {item.text}
                       </div>
                       <div className={`mt-2 text-[10px] ${mutedText}`}>
                         {item.enabled === false ? "Disabled" : "Enabled"}
                       </div>
                     </div>
   
                     <div className="flex shrink-0 gap-1">
                       <button
                         type="button"
                         onClick={() => startEditHotkey(item)}
                         className={`h-8 w-8 rounded-xl ${iconButtonClass}`}
                         title="Edit hotkey"
                       >
                         <Pencil className="h-3.5 w-3.5" />
                       </button>
   
                       <button
                         type="button"
                         onClick={() => deleteHotkey(item.id)}
                         className={`h-8 w-8 rounded-xl ${iconButtonClass}`}
                         title="Delete hotkey"
                       >
                         <Trash2 className="h-3.5 w-3.5" />
                       </button>
                     </div>
                   </div>
   
                   <button
                     type="button"
                     onClick={() => toggleHotkeyEnabled(item)}
                     className={`mt-3 w-full ${buttonClass}`}
                   >
                     {item.enabled === false ? "Enable" : "Disable"}
                   </button>
                 </div>
               ))}
             </div>
           )}
         </div>
       </div>
     );
   }

   function renderChatInfoPanel() {
     if (!activeUserId) {
       return (
         <div className={`${cardClass} p-5 text-center`}>
           <div
             className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl ${
               theme === "dark"
                 ? "bg-white/10 text-white/70"
                 : "bg-gray-100 text-gray-600"
             }`}
           >
             <BadgeInfo className="h-6 w-6" />
           </div>
   
           <div className={`mt-3 text-sm font-bold ${strongText}`}>
             No chat selected
           </div>
   
           <div className={`mt-1 text-xs ${mutedText}`}>
             Select a conversation first to view customer information.
           </div>
         </div>
       );
     }
   
     const key = String(activeUserId);
     const unread = Number(unreadMap[key] || 0);
     const isPinned = pinnedChats.includes(key);
   
     const infoRows = [
       ["Display", activeIdentity.display],
       ["UID", activeIdentity.uid],
       ["Phone", activeIdentity.phone],
       ["Status", activePresenceText],
       ["Pinned", isPinned ? "Yes" : "No"],
       ["Unread", unread],
       ["Messages", messages.length],
     ];
   
     return (
       <div className="space-y-4">
         <div className={`${cardClass} overflow-hidden p-5`}>
           <div className="flex items-center gap-3">
             <div
               className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl ${
                 theme === "dark"
                   ? "bg-white/10 text-white"
                   : "bg-gray-900 text-white"
               }`}
             >
               <UserCircle className="h-8 w-8" />
             </div>
   
             <div className="min-w-0">
               <div className={`truncate text-base font-bold ${strongText}`}>
                 {activeIdentity.display}
               </div>
   
               <div className={`mt-1 flex items-center gap-2 text-xs ${mutedText}`}>
                 <span
                   className={`h-2 w-2 rounded-full ${
                     activeConvo?.isOnline ? "bg-emerald-400" : "bg-gray-400"
                   }`}
                 />
                 <span>{activePresenceText}</span>
               </div>
             </div>
           </div>
         </div>
   
         <div className="grid grid-cols-2 gap-3">
           <div className={`${cardClass} p-4`}>
             <div className={`text-[10px] font-bold uppercase tracking-wide ${mutedText}`}>
               Messages
             </div>
             <div className={`mt-1 text-2xl font-bold ${strongText}`}>
               {messages.length}
             </div>
           </div>
   
           <div className={`${cardClass} p-4`}>
             <div className={`text-[10px] font-bold uppercase tracking-wide ${mutedText}`}>
               Unread
             </div>
             <div className={`mt-1 text-2xl font-bold ${strongText}`}>
               {unread}
             </div>
           </div>
         </div>
   
         <div className={`${cardClass} overflow-hidden`}>
           {infoRows.map(([label, value], index) => (
             <div
               key={label}
               className={`flex items-center justify-between gap-4 px-4 py-3 text-xs ${
                 index !== infoRows.length - 1
                   ? theme === "dark"
                     ? "border-b border-white/10"
                     : "border-b border-gray-100"
                   : ""
               }`}
             >
               <div className={mutedText}>{label}</div>
               <div className={`min-w-0 truncate text-right font-bold ${strongText}`}>
                 {value || "-"}
               </div>
             </div>
           ))}
         </div>
   
         <button
           type="button"
           onClick={openNicknameModal}
           className={`${primaryButtonClass} w-full`}
         >
           Edit Nickname
         </button>
       </div>
     );
   }

  return (
    <Shell title="Live Chat">
      <>
        {error ? (
          <div
            className={`mb-3 rounded-2xl p-3 text-xs ${
              theme === "dark"
                ? "border border-white/10 bg-white/5 text-white/80"
                : "border border-gray-200 bg-white text-gray-700"
            }`}
          >
            {error}
          </div>
        ) : null}
      
        <div className="grid h-[calc(100dvh-150px)] min-h-[620px] grid-cols-1 gap-4 overflow-hidden xl:h-[calc(95vh-112px)] xl:min-h-0 xl:grid-cols-[500px_minmax(0,1fr)]">
          <aside
            className={`${panelClass} ${
              isMobileChatOpen ? "hidden xl:flex" : "flex"
            } relative h-full min-h-0 flex-col overflow-hidden p-3 pl-[84px] sm:p-4 sm:pl-[92px]`}
          >
              <div
                className={`absolute left-0 top-0 flex h-full w-[72px] shrink-0 flex-col items-center gap-2 border-r p-2 ${
                  theme === "dark"
                    ? "border-white/10 bg-[#0b1220]/65"
                    : "border-gray-200 bg-gray-100"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveChatTabId("all")}
                  className={classNames(
                    "flex w-full flex-col items-center justify-center rounded-2xl px-2 py-3 text-[10px] font-bold transition",
                    activeChatTabId === "all"
                      ? theme === "dark"
                        ? "bg-white text-gray-950"
                        : "bg-gray-900 text-white"
                      : theme === "dark"
                      ? "text-white/60 hover:bg-white/10 hover:text-white"
                      : "text-gray-500 hover:bg-white hover:text-gray-900"
                  )}
                  title="All chats"
                >
                  <MessageCircle className="mb-1 h-5 w-5" />
                  <span>All</span>
                </button>

                <div className="w-full min-h-0 flex-1 space-y-2 overflow-y-auto">
                  {chatTabs.map((tab) => {
                    const active = activeChatTabId === String(tab.id);
                    const shortName = String(tab.name || "?").slice(0, 2).toUpperCase();

                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveChatTabId(String(tab.id))}
                        className={classNames(
                          "flex w-full flex-col items-center justify-center rounded-2xl px-2 py-3 text-[10px] font-bold transition",
                          active
                            ? theme === "dark"
                              ? "bg-white text-gray-950"
                              : "bg-gray-900 text-white"
                            : theme === "dark"
                            ? "text-white/60 hover:bg-white/10 hover:text-white"
                            : "text-gray-500 hover:bg-white hover:text-gray-900"
                        )}
                        title={tab.name}
                      >
                        <div
                          className={classNames(
                            "mb-1 flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold",
                            active
                              ? theme === "dark"
                                ? "bg-gray-950 text-white"
                                : "bg-white text-gray-900"
                              : theme === "dark"
                              ? "bg-white/10 text-white/75"
                              : "bg-white text-gray-600"
                          )}
                        >
                          {shortName}
                        </div>
          
                        <span className="line-clamp-2 max-w-full leading-tight">
                          {tab.name}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={openCreateTabModal}
                  disabled={creatingTab}
                  className={`flex w-full flex-col items-center justify-center rounded-2xl px-2 py-3 text-[10px] font-bold transition disabled:opacity-50 ${
                    theme === "dark"
                      ? "text-white/65 hover:bg-white/10 hover:text-white"
                      : "text-gray-500 hover:bg-white hover:text-gray-900"
                  }`}
                  title="Create tab"
                >
                  <Plus className="mb-1 h-5 w-5" />
                  <span>{creatingTab ? "Adding" : "Add"}</span>
                </button>
              </div>
          
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className={`text-sm font-bold ${strongText}`}>
                      Conversations
                    </div>
                
                    {searchingMessages ? (
                      <div className={`mt-0.5 text-[10px] ${mutedText}`}>
                        Searching message history...
                      </div>
                    ) : (
                      <div className={`mt-0.5 text-[10px] ${mutedText}`}>
                        Live support inbox
                      </div>
                    )}
                  </div>
                
                  <div className="ml-auto flex shrink-0 items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setHotkeysModalOpen(true)}
                      className={buttonClass}
                      title="Hotkeys"
                    >
                      Hotkeys
                    </button>
                
                    <button
                      type="button"
                      onClick={() => {
                        loadConvos({ silent: true });
                        loadUsersCache();
                      }}
                      disabled={refreshingConvos || loadingUsers}
                      className={`${buttonClass} inline-flex items-center gap-2 disabled:opacity-50`}
                    >
                      <span>
                        {refreshingConvos || loadingUsers ? "Syncing" : "Refresh"}
                      </span>
                
                      {refreshingConvos || loadingUsers ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : null}
                    </button>
                  </div>
                </div>

               <div className="relative mt-4">
                 <Search
                   className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${
                     theme === "dark" ? "text-white/30" : "text-gray-400"
                   }`}
                 />
                 <input
                   value={q}
                   onChange={(e) => setQ(e.target.value)}
                   placeholder="Search phone / UID / message..."
                   className={`w-full rounded-2xl border ${
                     theme === "dark"
                       ? "border-white/10 bg-white/5 text-white/90 placeholder:text-white/30 focus:border-white/20"
                       : "border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:border-gray-400"
                   } py-2.5 pl-10 pr-3 text-xs outline-none`}
                 />
               </div>
   
               <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
                 {loadingConvos && filteredSortedConvos.length === 0 ? (
                   <div className={`${cardClass} p-4 text-xs ${mutedText}`}>
                     Loading conversations...
                   </div>
                 ) : filteredSortedConvos.length === 0 ? (
                   <div className={`${cardClass} p-4`}>
                     <div className={`text-xs font-semibold ${strongText}`}>
                       {q.trim() ? "No matching conversations." : "No messages yet."}
                     </div>
                     <div className={`mt-1 text-[11px] ${mutedText}`}>
                       {q.trim()
                         ? "Try searching UID, phone, last message, or message history."
                         : "Once a user sends a message, it will appear here."}
                     </div>
                   </div>
                 ) : (
                   <div className="space-y-5">
                     {groupedConvos.map((group) => (
                       <div key={group.key}>
                         <div
                           className={`mb-2 flex items-center justify-between px-1 text-[10px] font-bold uppercase tracking-[0.16em] ${
                             theme === "dark" ? "text-white/35" : "text-gray-400"
                           }`}
                         >
                           <span>{group.title}</span>
                           <span>{group.count}</span>
                         </div>

                         <div className="space-y-1.5">
                           {group.items.map((c) => renderConversationRow(c))}
                         </div>
                       </div>
                     ))}
                   </div>
                 )}
               </div>
          </aside>

          <main
            className={`${panelClass} ${
              isMobileChatOpen ? "flex" : "hidden xl:flex"
            } h-full min-h-0 flex-col overflow-hidden p-3 sm:p-4`}
          >
            <div
              className={`rounded-2xl p-3 sm:rounded-[24px] sm:p-4 ${
                theme === "dark"
                  ? "border border-white/10 bg-[#0f1728]/90"
                  : "border border-gray-200 bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-between gap-2 sm:gap-4">
                <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                  {activeUserId ? (
                    <button
                      type="button"
                      onClick={closeActiveChat}
                      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl xl:hidden ${
                        theme === "dark"
                          ? "border border-white/10 bg-white/5 text-white/80"
                          : "border border-gray-200 bg-white text-gray-700"
                      }`}
                    >
                      ←
                    </button>
                  ) : null}
              
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl sm:h-11 sm:w-11 ${
                      theme === "dark"
                        ? "bg-white/10 text-white/85"
                        : "bg-gray-900 text-white"
                    }`}
                  >
                    <UserCircle className="h-6 w-6" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className={`truncate text-sm font-bold ${strongText}`}>
                        {activeUserId ? activeTitle : "Select a user"}
                      </div>

                      {activeUserId ? (
                        <button
                          type="button"
                          onClick={openNicknameModal}
                          className={`h-6 w-6 ${iconButtonClass}`}
                          title="Edit nickname"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>

                    <div className={`mt-1 flex flex-wrap items-center gap-2 text-[11px] ${mutedText}`}>
                      {activeUserId ? (
                        <>
                          <span>UID: {activeIdentity.uid}</span>
                          <span>•</span>
                          <span>{activePresenceText}</span>
                        </>
                      ) : (
                        <span>Choose a conversation from the inbox</span>
                      )}
                    </div>
                  </div>
                </div>

                {activeUserId ? (
                  <div className="hidden shrink-0 items-center gap-2 sm:flex">
                    <span
                      className={classNames(
                        "inline-flex shrink-0 items-center rounded-full px-3 py-1.5 text-[11px] font-semibold",
                        theme === "dark"
                          ? activeConvo?.isOnline
                            ? "bg-emerald-400/10 text-emerald-200"
                            : "bg-white/5 text-white/55"
                          : activeConvo?.isOnline
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-gray-100 text-gray-600"
                      )}
                    >
                      {activePresenceText}
                    </span>

                    <button
                      type="button"
                      onClick={() => setChatInfoModalOpen(true)}
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                        theme === "dark"
                          ? "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                          : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <BadgeInfo className="h-3.5 w-3.5" />
                      Info
                    </button>

                    <button
                      type="button"
                      onClick={() => togglePinnedChat(activeUserId)}
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                        theme === "dark"
                          ? "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                          : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {pinnedChats.includes(String(activeUserId)) ? (
                        <>
                          <PinOff className="h-3.5 w-3.5" />
                          Unpin
                        </>
                      ) : (
                        <>
                          <Pin className="h-3.5 w-3.5" />
                          Pin
                        </>
                      )}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <div
              ref={listRef}
              onScroll={handleMessagesScroll}
              className={`chat-scroll mt-3 min-h-0 flex-1 overflow-y-auto rounded-2xl p-3 sm:mt-4 sm:rounded-[26px] sm:p-4 ${innerPanelClass}`}
            >
              {!activeUserId ? (
                <div className="flex h-full items-center justify-center">
                  <div className={`${cardClass} max-w-sm p-6 text-center`}>
                    <div
                      className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl ${
                        theme === "dark"
                          ? "bg-white/10 text-white/70"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      <MessageCircle className="h-6 w-6" />
                    </div>
                    <div className={`mt-3 text-sm font-bold ${strongText}`}>
                      No conversation selected
                    </div>
                    <div className={`mt-1 text-xs ${mutedText}`}>
                      Select a user from the left to view messages and reply.
                    </div>
                  </div>
                </div>
              ) : loadingMsgs && (!messages || messages.length === 0) ? (
                <div className={`text-xs ${mutedText}`}>Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <div className={`${cardClass} max-w-sm p-6 text-center`}>
                    <div
                      className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl ${
                        theme === "dark"
                          ? "bg-white/10 text-white/70"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      <MessageCircle className="h-6 w-6" />
                    </div>
                    <div className={`mt-3 text-sm font-bold ${strongText}`}>
                      No messages yet
                    </div>
                    <div className={`mt-1 text-xs ${mutedText}`}>
                      Send the first reply below.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <div className="space-y-2">
                    {messageItems.map((item) => {
                      if (item.kind === "day") {
                        return (
                          <div key={item.id} className="py-3">
                            <div className="flex items-center gap-3">
                              <div
                                className={`h-px flex-1 ${
                                  theme === "dark" ? "bg-white/10" : "bg-gray-200"
                                }`}
                              />
                              <div
                                className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${
                                  theme === "dark"
                                    ? "border border-white/10 bg-white/5 text-white/45"
                                    : "border border-gray-200 bg-white text-gray-500"
                                }`}
                              >
                                {item.label}
                              </div>
                              <div
                                className={`h-px flex-1 ${
                                  theme === "dark" ? "bg-white/10" : "bg-gray-200"
                                }`}
                              />
                            </div>
                          </div>
                        );
                      }
                
                      const m = item.data;
                      const isAdmin = m.sender === "admin";
                      const imgSrc = m.imageUrl
                        ? m.imageUrl.startsWith("http")
                          ? m.imageUrl
                          : `${API_BASE}${m.imageUrl}`
                        : "";
                
                      let ticks = "";
                      if (isAdmin) {
                        if (m.userRead || m.status === "read") ticks = "✓✓";
                        else ticks = "✓";
                      }
                
                      return (
                        <div
                          key={item.id}
                          className={classNames(
                            "group/message flex items-start gap-2",
                            isAdmin ? "justify-end" : "justify-start"
                          )}
                        >
                          {isAdmin && m.type === "image" && imgSrc ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDeleteImageModal(m);
                              }}
                              className={classNames(
                                "mt-2 inline-flex shrink-0 items-center justify-center opacity-0 transition duration-200 group-hover/message:opacity-100",
                                theme === "dark"
                                  ? "text-white/45 hover:text-red-400"
                                  : "text-gray-400 hover:text-red-500"
                              )}
                              title="Delete image"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : null}
                
                          <div
                            onContextMenu={(e) => {
                              if (isAdmin && m.type === "text") {
                                e.preventDefault();
                                startEditMessage(m);
                              }
                            }}
                            title={isAdmin && m.type === "text" ? "Right-click to edit message" : ""}
                            className={classNames(
                              "max-w-[86%] rounded-[22px] px-3.5 py-3 text-xs leading-relaxed shadow-sm sm:max-w-[68%] sm:rounded-[24px]",
                              isAdmin
                                ? theme === "dark"
                                  ? "border border-white/10 bg-white/[0.11] text-white"
                                  : "border border-gray-300 bg-gray-100 text-gray-900"
                                : theme === "dark"
                                ? "border border-white/10 bg-[#101827] text-white"
                                : "border border-gray-200 bg-white text-gray-900"
                            )}
                          >
                            {m.type === "image" && imgSrc ? (
                              <div>
                                <img
                                  src={imgSrc}
                                  alt="Chat"
                                  className="block w-full max-w-[280px] cursor-zoom-in rounded-2xl transition duration-200 group-hover/message:brightness-90"
                                  onClick={() => openPreview(imgSrc)}
                                />
                
                                {m.message ? (
                                  <div className="mt-2 whitespace-pre-wrap">
                                    {m.message}
                                  </div>
                                ) : null}
                              </div>
                            ) : (
                              <div className="whitespace-pre-wrap">{m.message}</div>
                            )}
                
                            <div
                              className={`mt-2 flex items-center gap-1.5 text-[10px] ${
                                isAdmin ? "justify-end" : "justify-start"
                              } ${theme === "dark" ? "text-white/55" : "text-gray-500"}`}
                            >
                              <span>{formatMessageTime(m.createdAt)}</span>
                
                              {isAdmin ? (
                                <span
                                  className={classNames(
                                    "font-mono leading-none",
                                    theme === "dark" ? "text-white/70" : "text-gray-600"
                                  )}
                                  title={
                                    m.userRead || m.status === "read"
                                      ? "Read by user"
                                      : `Status: ${m.status || "sent"}`
                                  }
                                >
                                  {ticks}
                                </span>
                              ) : null}
                
                              {isAdmin && m.edited ? (
                                <button
                                  type="button"
                                  onClick={() => openEditHistory(m)}
                                  className={`font-semibold underline-offset-2 hover:underline ${
                                    theme === "dark" ? "text-white/75" : "text-gray-700"
                                  }`}
                                  title="View edit history"
                                >
                                  Edited
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                
                  {showJumpToLatest ? (
                    <button
                      type="button"
                      onClick={() => scrollMessagesToBottom({ smooth: true })}
                      className={`sticky bottom-4 left-1/2 z-20 mt-3 flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 text-[11px] font-bold shadow-2xl backdrop-blur transition hover:scale-[1.03] active:scale-[0.98] ${
                        theme === "dark"
                          ? "border border-white/10 bg-white/90 text-gray-950 hover:bg-white"
                          : "border border-gray-200 bg-gray-950 text-white hover:bg-gray-800"
                      }`}
                      title="Scroll to bottom"
                    >
                      <span className="text-sm leading-none">↓</span>
                      <span>Scroll to bottom</span>
                    </button>
                  ) : null}
                </div>
              )}
            </div>

            <div className="mt-4">
              <div
                className={`relative rounded-[24px] p-2 ${
                  theme === "dark"
                    ? "border border-white/10 bg-white/[0.045]"
                    : "border border-gray-200 bg-white"
                }`}
              >

                {editingMessage ? (
                  <div
                    className={`mb-2 flex items-center justify-between gap-3 rounded-2xl px-3 py-2 text-xs ${
                      theme === "dark"
                        ? "border border-white/10 bg-white/[0.06] text-white/75"
                        : "border border-gray-200 bg-gray-50 text-gray-700"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-semibold">Editing message</div>
                      <div className={`mt-0.5 truncate text-[11px] ${mutedText}`}>
                        Right-click selected message loaded into input
                      </div>
                    </div>
                
                    <button
                      type="button"
                      onClick={cancelEditingMessage}
                      disabled={savingEdit}
                      className={`${buttonClass} shrink-0 disabled:opacity-50`}
                    >
                      Cancel
                    </button>
                  </div>
                ) : null}

                <div className="flex items-end gap-1.5 sm:gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageFileSelected}
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!activeUserId || uploadingImage}
                    className={`${primaryButtonClass} mb-1 flex h-11 w-11 items-center justify-center p-0 disabled:opacity-50 sm:h-12 sm:w-12`}
                    title="Upload image"
                  >
                    {uploadingImage ? (
                      <span className="text-[10px]">...</span>
                    ) : (
                      <ImagePlus className="h-4 w-4" />
                    )}
                  </button>

                  <textarea
                    ref={composerRef}
                    value={text}
                    spellCheck={true}
                    lang="en"
                    onChange={(e) => {
                      const value = e.target.value;
                      setText(value);
                    
                      if (activeUserId) {
                        setDraftsCache((prev) => {
                          const next = {
                            ...prev,
                            [String(activeUserId)]: value,
                          };
                    
                          saveAdminChatDraftsCache(next);
                          return next;
                        });
                      }
                    
                      if (!activeUserId) return;

                      socketRef.current?.emit("admin:typing", {
                        userId: activeUserId,
                        typing: true,
                      });

                      if (typingTimerRef.current) {
                        clearTimeout(typingTimerRef.current);
                      }

                      typingTimerRef.current = setTimeout(() => {
                        socketRef.current?.emit("admin:typing", {
                          userId: activeUserId,
                          typing: false,
                        });
                      }, 700);
                    }}
                    onPaste={handleComposerPaste}
                    onInput={resizeComposer}
                    placeholder={
                      !activeUserId
                        ? "Select a user to reply..."
                        : ""
                    }
                    disabled={!activeUserId}
                    rows={1}
                    onKeyDown={(e) => {
                      if (showSlashMenu && slashMatches.length) {
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setSlashIndex((prev) =>
                            prev + 1 >= slashMatches.length ? 0 : prev + 1
                          );
                          return;
                        }

                        if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setSlashIndex((prev) =>
                            prev - 1 < 0 ? slashMatches.length - 1 : prev - 1
                          );
                          return;
                        }

                        if (e.key === "Tab") {
                          e.preventDefault();
                          handlePickQuickReply(selectedSlash);
                          return;
                        }

                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handlePickQuickReply(selectedSlash);
                          return;
                        }

                        if (e.key === "Escape") {
                          e.preventDefault();
                          setText("");
                          return;
                        }
                      }

                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendReply();
                      }
                    }}
                    className={`chat-scroll-soft min-h-[48px] max-h-[120px] flex-1 resize-none rounded-2xl border px-3 py-3 text-base leading-relaxed outline-none disabled:opacity-50 sm:min-h-[52px] sm:max-h-[132px] sm:px-4 sm:text-xs ${
                      theme === "dark"
                        ? "border-white/10 bg-white/[0.045] text-white/90 placeholder:text-white/30 focus:border-white/20"
                        : "border-gray-300 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:border-gray-400"
                    }`}
                  />

                  <button
                    onClick={sendReply}
                    disabled={!activeUserId || !text.trim() || savingEdit}
                    className={`${primaryButtonClass} mb-1 flex h-11 w-11 items-center justify-center p-0 disabled:opacity-50 sm:h-12 sm:w-12`}
                    title={editingMessage ? "Save edit" : "Send"}
                  >
                    <SendHorizontal className="h-4 w-4" />
                  </button>
                </div>

                {showSlashMenu ? (
                  <div
                    className={`absolute bottom-[calc(100%+8px)] left-2 right-2 z-20 overflow-hidden rounded-2xl shadow-2xl ${
                      theme === "dark"
                        ? "border border-white/10 bg-[#101827]"
                        : "border border-gray-200 bg-white"
                    }`}
                  >
                    {slashMatches.length ? (
                      <div className="max-h-72 overflow-y-auto p-2">
                        {slashMatches.map((item, idx) => (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => handlePickQuickReply(item)}
                            className={classNames(
                              "flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left transition",
                              idx === slashIndex
                                ? theme === "dark"
                                  ? "bg-white/10 text-white"
                                  : "bg-gray-100 text-gray-900"
                                : theme === "dark"
                                ? "text-white/75 hover:bg-white/5 hover:text-white"
                                : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                            )}
                          >
                            <div
                              className={`mt-0.5 rounded-lg p-1.5 ${
                                theme === "dark" ? "bg-white/5" : "bg-gray-100"
                              }`}
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold">
                                /{item.key} • {item.label}
                              </div>
                              <div className={`mt-1 line-clamp-2 text-[11px] ${mutedText}`}>
                                {item.text}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className={`p-3 text-xs ${mutedText}`}>
                        No quick replies found.
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </main>
        </div>
      </>

      <Modal
        open={nicknameModalOpen}
        title="Edit User Nickname"
        subtitle="This nickname is only visible inside the admin panel."
        onClose={() => {
          if (!nickSaving) setNicknameModalOpen(false);
        }}
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={nickSaving}
              onClick={() => setNicknameModalOpen(false)}
              className={`${buttonClass} disabled:opacity-50`}
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={nickSaving}
              onClick={saveNickname}
              className={`${primaryButtonClass} disabled:opacity-50`}
            >
              {nickSaving ? "Saving..." : "Save Nickname"}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div
            className={`rounded-2xl p-4 ${
              theme === "dark"
                ? "border border-white/10 bg-white/[0.04]"
                : "border border-gray-200 bg-gray-50"
            }`}
          >
            <div className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${mutedText}`}>
              Current user
            </div>

            <div className={`mt-2 text-sm font-semibold ${strongText}`}>
              {activeIdentity.uid !== "-" ? activeIdentity.uid : activeUserId || "-"}
            </div>

            {activeIdentity.phone !== "-" ? (
              <div className={`mt-1 text-xs ${mutedText}`}>
                {activeIdentity.phone}
              </div>
            ) : null}
          </div>

          <div>
            <label className={`mb-2 block text-xs font-semibold ${softText}`}>
              Admin nickname
            </label>

            <input
              value={nicknameDraft}
              onChange={(e) => setNicknameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveNickname();
              }}
              maxLength={40}
              className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none ${
                theme === "dark"
                  ? "border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-white/25"
                  : "border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:border-gray-500"
              }`}
              autoFocus
            />

            <div className={`mt-2 flex justify-between text-[11px] ${mutedText}`}>
              <span>Use this to label users internally.</span>
              <span>{nicknameDraft.length}/40</span>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={createTabModalOpen}
        title="Create chat tab"
        subtitle="Add a new sidebar tab to organize conversations."
        eyebrow="Chat Tabs"
        icon={<Folder className="h-5 w-5" />}
        onClose={() => {
          if (creatingTab) return;
          setCreateTabModalOpen(false);
        }}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreateTabModalOpen(false)}
              disabled={creatingTab}
              className={buttonClass}
            >
              Cancel
            </button>
      
            <button
              type="button"
              onClick={() => createChatTab()}
              disabled={creatingTab || !newTabName.trim()}
              className={`${primaryButtonClass} disabled:opacity-50`}
            >
              {creatingTab ? "Creating..." : "Create Tab"}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <label className={`mb-2 block text-xs font-bold ${strongText}`}>
              Tab name
            </label>
      
            <input
              value={newTabName}
              onChange={(e) => setNewTabName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  createChatTab();
                }
              }}
              placeholder="Example: VIP, Deposit, Withdraw"
              maxLength={40}
              autoFocus
              className={inputClass}
            />
      
            <div className={`mt-2 text-[11px] ${mutedText}`}>
              One chat can only belong to one custom tab. All chats still appear in All.
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={pendingImageModalOpen}
        title="Review image before sending"
        subtitle="This image has not been sent yet. Confirm before it reaches the user."
        onClose={closePendingImagePreview}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !uploadingImage && pendingImageFile) {
            e.preventDefault();
            confirmSendPendingImage();
          }
        }}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closePendingImagePreview}
              disabled={uploadingImage}
              className={`${buttonClass} disabled:opacity-50`}
            >
              Cancel
            </button>
      
            <button
              type="button"
              onClick={confirmSendPendingImage}
              disabled={uploadingImage || !pendingImageFile}
              className={`${primaryButtonClass} inline-flex items-center justify-center gap-2 disabled:opacity-50`}
            >
              {uploadingImage ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <SendHorizontal className="h-4 w-4" />
                  Send Image
                </>
              )}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div
            className={classNames(
              "overflow-hidden rounded-2xl",
              theme === "dark"
                ? "border border-white/10 bg-black/20"
                : "border border-gray-200 bg-gray-50"
            )}
          >
            {pendingImageSrc ? (
              <img
                src={pendingImageSrc}
                alt="Image preview"
                className="max-h-[52vh] w-full object-contain"
              />
            ) : null}
          </div>
      
          <div
            className={classNames(
              "rounded-2xl p-3 text-xs",
              theme === "dark"
                ? "border border-white/10 bg-white/5 text-white/65"
                : "border border-gray-200 bg-gray-50 text-gray-600"
            )}
          >
            <div className="font-semibold">Safety check</div>
            <div className="mt-1">
              Confirm the image is correct before sending. Pasted images are no longer sent automatically.
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={deleteImageModalOpen}
        title="Delete this image?"
        subtitle="This removes only the image message. Text messages are not affected."
        onClose={closeDeleteImageModal}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeDeleteImageModal}
              disabled={deletingImage}
              className={`${buttonClass} disabled:opacity-50`}
            >
              Cancel
            </button>
      
            <button
              type="button"
              onClick={confirmDeleteImage}
              disabled={deletingImage}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500 px-4 py-3 text-xs font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
            >
              {deletingImage ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete Image
                </>
              )}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div
            className={classNames(
              "flex gap-3 rounded-2xl p-4",
              theme === "dark"
                ? "border border-red-400/15 bg-red-500/10 text-red-100"
                : "border border-red-100 bg-red-50 text-red-700"
            )}
          >
            <div className="mt-0.5">
              <AlertTriangle className="h-5 w-5" />
            </div>
      
            <div>
              <div className="text-sm font-bold">This action cannot be undone.</div>
              <div className="mt-1 text-xs opacity-80">
                The image will be removed from this conversation for the admin and the user.
              </div>
            </div>
          </div>
      
          {imageToDelete?.imageUrl ? (
            <div
              className={classNames(
                "overflow-hidden rounded-2xl",
                theme === "dark"
                  ? "border border-white/10 bg-black/20"
                  : "border border-gray-200 bg-gray-50"
              )}
            >
              <img
                src={
                  imageToDelete.imageUrl.startsWith("http")
                    ? imageToDelete.imageUrl
                    : `${API_BASE}${imageToDelete.imageUrl}`
                }
                alt="Image to delete"
                className="max-h-[42vh] w-full object-contain"
              />
            </div>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={historyModalOpen}
        title="Message Edit History"
        subtitle={
          historyMessage?.editHistory?.length
            ? `${historyMessage.editHistory.length} edit record${
                historyMessage.editHistory.length === 1 ? "" : "s"
              }`
            : "No edit history available"
        }
        onClose={() => {
          setHistoryModalOpen(false);
          setHistoryMessage(null);
        }}
        footer={
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setHistoryModalOpen(false);
                setHistoryMessage(null);
              }}
              className={buttonClass}
            >
              Close
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div
            className={`rounded-2xl p-4 ${
              theme === "dark"
                ? "border border-white/10 bg-white/[0.04]"
                : "border border-gray-200 bg-gray-50"
            }`}
          >
            <div className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${mutedText}`}>
              Current message
            </div>
      
            <div className={`mt-2 whitespace-pre-wrap text-sm font-semibold ${strongText}`}>
              {historyMessage?.message || "-"}
            </div>
      
            <div className={`mt-2 text-[11px] ${mutedText}`}>
              Last edited: {historyMessage?.editedAt ? formatTime(historyMessage.editedAt) : "-"}
            </div>
          </div>
      
          {Array.isArray(historyMessage?.editHistory) &&
          historyMessage.editHistory.length > 0 ? (
            <div className="space-y-3">
              {[...historyMessage.editHistory].reverse().map((item, index) => (
                <div
                  key={`${item.editedAt || index}_${index}`}
                  className={`rounded-2xl p-4 ${
                    theme === "dark"
                      ? "border border-white/10 bg-[#0f1728]/80"
                      : "border border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className={`text-xs font-bold ${strongText}`}>
                      Edit #{historyMessage.editHistory.length - index}
                    </div>
      
                    <div className={`text-[11px] ${mutedText}`}>
                      {item.editedAt ? formatTime(item.editedAt) : "-"}
                    </div>
                  </div>
      
                  <div className="mt-4 grid gap-3">
                    <div
                      className={`rounded-xl p-3 ${
                        theme === "dark" ? "bg-red-500/10" : "bg-red-50"
                      }`}
                    >
                      <div className={`text-[10px] font-bold uppercase tracking-[0.16em] ${mutedText}`}>
                        Before
                      </div>
                      <div className={`mt-1 whitespace-pre-wrap text-xs ${softText}`}>
                        {item.oldMessage || "-"}
                      </div>
                    </div>
      
                    <div
                      className={`rounded-xl p-3 ${
                        theme === "dark" ? "bg-emerald-500/10" : "bg-emerald-50"
                      }`}
                    >
                      <div className={`text-[10px] font-bold uppercase tracking-[0.16em] ${mutedText}`}>
                        After
                      </div>
                      <div className={`mt-1 whitespace-pre-wrap text-xs ${softText}`}>
                        {item.newMessage || "-"}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={`${cardClass} p-4 text-xs ${mutedText}`}>
              No previous versions found.
            </div>
          )}
        </div>
      </Modal>

      <Modal open={previewOpen} title="Image Preview" onClose={closePreview}>
        <div className="flex items-center justify-center">
          {previewSrc ? (
            <img
              src={previewSrc}
              alt="Preview"
              className="max-h-[80vh] max-w-full rounded-2xl"
            />
          ) : null}
        </div>
      </Modal>

      <Modal
        open={hotkeysModalOpen}
        onClose={() => setHotkeysModalOpen(false)}
        title="Hotkey Command Center"
        subtitle="Create, edit, enable, disable, and delete admin quick replies. Type / inside the chat composer to use active hotkeys."
        eyebrow="Admin tools"
        icon={<Sparkles className="h-5 w-5" />}
        size="3xl"
      >
        {renderHotkeySettingsPanel()}
      </Modal>
      
      <Modal
        open={chatInfoModalOpen}
        onClose={() => setChatInfoModalOpen(false)}
        title="Conversation info"
        subtitle="Customer identity, presence, message count, unread count, and quick chat actions."
        eyebrow="Chat info"
        icon={<BadgeInfo className="h-5 w-5" />}
        size="2xl"
      >
        {renderChatInfoPanel()}
      </Modal>

    </Shell>
  );
}