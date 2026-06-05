import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Check,
  CheckCircle2,
  ChevronDown,
  Edit3,
  Loader2,
  Bell,
  BellOff,
  Image,
  Link,
  MoreHorizontal,
  Phone,
  ShieldOff,
  UserMinus,
  UserPlus,
  MessageCircle,
  Pin,
  PinOff,
  RefreshCw,
  Search,
  Send,
  Smile,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { io } from "socket.io-client";
import Shell from "../components/Shell";
import { api } from "../api";
import { useTheme } from "../context/ThemeContext";
import EmojiPicker from "emoji-picker-react";
import Lottie from "lottie-react";
import pako from "pako";

const API_BASE_URL =
  api?.defaults?.baseURL?.replace(/\/$/, "") ||
  import.meta.env.VITE_API_URL?.replace(/\/$/, "");

const socket = io(API_BASE_URL, {
  transports: ["websocket"],
});

const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

const TELEGRAM_AVATAR_COLORS = [
  "linear-gradient(135deg, #ffb357, #f47b20)",
  "linear-gradient(135deg, #8b7cf6, #6d5dfc)",
  "linear-gradient(135deg, #6ed36e, #38b84f)",
  "linear-gradient(135deg, #63b3ed, #229ed9)",
  "linear-gradient(135deg, #f687b3, #d53f8c)",
  "linear-gradient(135deg, #f6ad55, #ed8936)",
  "linear-gradient(135deg, #4fd1c5, #319795)",
];

function getChatDisplayTitle(chat) {
  if (!chat) return "";

  if (chat.isSavedMessages) return "Saved Messages";

  return (
    String(chat.title || "").trim() ||
    String(chat.username || "").trim() ||
    String(chat.phone || "").trim() ||
    "Untitled"
  );
}

function getChatInitials(chat) {
  const title = getChatDisplayTitle(chat);

  if (!title) return "?";

  const cleaned = title.replace(/[^\p{L}\p{N}\s]/gu, " ").trim();

  const parts = cleaned.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }

  return cleaned.slice(0, 2).toUpperCase();
}

function getChatAvatarBackground(chat) {
  const key = String(chat?.chatId || chat?._id || chat?.title || "telegram");

  let hash = 0;

  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }

  return TELEGRAM_AVATAR_COLORS[Math.abs(hash) % TELEGRAM_AVATAR_COLORS.length];
}

function getSenderDisplayName(message) {
  const sender = message?.sender || {};

  const fullName = `${sender.firstName || ""} ${sender.lastName || ""}`.trim();

  return (
    fullName || sender.username || message.fromId || sender.id || "Unknown"
  );
}

function getSenderInitials(message) {
  const name = getSenderDisplayName(message);

  const cleaned = name.replace(/[^\p{L}\p{N}\s]/gu, " ").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }

  return cleaned.slice(0, 2).toUpperCase() || "?";
}

function getSenderAvatarBackground(message) {
  const key = String(
    message?.sender?.id ||
      message?.fromId ||
      message?.sender?.username ||
      getSenderDisplayName(message) ||
      "sender",
  );

  let hash = 0;

  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }

  return TELEGRAM_AVATAR_COLORS[Math.abs(hash) % TELEGRAM_AVATAR_COLORS.length];
}

function getMemberDisplayName(member) {
  const fullName =
    `${member?.firstName || ""} ${member?.lastName || ""}`.trim();

  return fullName || member?.username || member?.id || "Unknown";
}

function getMemberInitials(member) {
  const name = getMemberDisplayName(member);
  const cleaned = name.replace(/[^\p{L}\p{N}\s]/gu, " ").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }

  return cleaned.slice(0, 2).toUpperCase() || "?";
}

function getApiBase() {
  return (
    api?.defaults?.baseURL?.replace(/\/$/, "") ||
    import.meta.env.VITE_API_URL?.replace(/\/$/, "") ||
    ""
  );
}

function getTelegramMediaPreviewUrl(previewUrl) {
  if (!previewUrl) return "";

  if (previewUrl.startsWith("http://") || previewUrl.startsWith("https://")) {
    return previewUrl;
  }

  return `${getApiBase()}${previewUrl.startsWith("/") ? "" : "/"}${previewUrl}`;
}

function getMemberPhotoUrl(chatId, member) {
  if (!chatId || !member?.id || !member?.accessHash) return "";

  return `${getApiBase()}/api/telegram-chats/${chatId}/group/members/${member.id}/photo?accessHash=${encodeURIComponent(
    member.accessHash,
  )}`;
}

function cacheGet(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.time) return null;

    if (Date.now() - parsed.time > CACHE_TTL) {
      localStorage.removeItem(key);
      return null;
    }

    return parsed.data;
  } catch (_) {
    return null;
  }
}

function cacheSet(key, data) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        time: Date.now(),
        data,
      }),
    );
  } catch (_) {}
}

function rememberValue(key, value) {
  try {
    if (value === undefined || value === null) return;
    localStorage.setItem(key, String(value));
  } catch (_) {}
}

function getRememberedValue(key, fallback = "") {
  try {
    return localStorage.getItem(key) || fallback;
  } catch (_) {
    return fallback;
  }
}

export default function TelegramChats() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [mediaPanel, setMediaPanel] = useState("");

  const [profileOpen, setProfileOpen] = useState(false);
  const [accountPanelOpen, setAccountPanelOpen] = useState(false);

  const [memberProfileOpen, setMemberProfileOpen] = useState(false);
  const [selectedMemberProfile, setSelectedMemberProfile] = useState(null);
  const [loadingMemberProfile, setLoadingMemberProfile] = useState(false);

  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);

  const [createGroupForm, setCreateGroupForm] = useState(() => ({
    title: getRememberedValue("tg:createGroup:title", ""),
    about: getRememberedValue("tg:createGroup:about", ""),
    users: getRememberedValue("tg:createGroup:users", ""),
  }));

  const [groupMembers, setGroupMembers] = useState(() => {
    const chatId = getRememberedValue("tg:selectedChatId", "");
    if (!chatId) return [];
    return cacheGet(`tg:groupMembers:${chatId}`) || [];
  });

  const [loadingGroupMembers, setLoadingGroupMembers] = useState(false);
  const [groupAction, setGroupAction] = useState("");
  const [inviteLink, setInviteLink] = useState(() => {
    const chatId = getRememberedValue("tg:selectedChatId", "");
    if (!chatId) return "";
    return cacheGet(`tg:inviteLink:${chatId}`) || "";
  });

  const [chatProfile, setChatProfile] = useState(() => {
    const chatId = getRememberedValue("tg:selectedChatId", "");
    if (!chatId) return null;
    return cacheGet(`tg:profile:${chatId}`) || null;
  });

  const [chatPhotos, setChatPhotos] = useState(() => {
    const chatId = getRememberedValue("tg:selectedChatId", "");
    if (!chatId) return [];
    return cacheGet(`tg:photos:${chatId}`) || [];
  });

  const [chatLinks, setChatLinks] = useState(() => {
    const chatId = getRememberedValue("tg:selectedChatId", "");
    if (!chatId) return [];
    return cacheGet(`tg:links:${chatId}`) || [];
  });

  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactForm, setContactForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    note: "",
  });

  const [deleteContactModalOpen, setDeleteContactModalOpen] = useState(false);

  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [profileAction, setProfileAction] = useState("");

  const [accounts, setAccounts] = useState(() => {
    return cacheGet("tg:accounts") || [];
  });

  const [selectedAccountId, setSelectedAccountId] = useState(() => {
    return getRememberedValue("tg:selectedAccountId", "");
  });

  const [selectedChatId, setSelectedChatId] = useState("");
  const [openedHiddenChat, setOpenedHiddenChat] = useState(null);

  const [search, setSearch] = useState(() => {
    return getRememberedValue("tg:search", "");
  });

  const [typeFilter, setTypeFilter] = useState(() => {
    return getRememberedValue("tg:typeFilter", "all");
  });

  const [chatMode, setChatMode] = useState(() => {
    return getRememberedValue("tg:chatMode", "active");
  });

  const [chats, setChats] = useState(() => {
    const accountId = getRememberedValue("tg:selectedAccountId", "");
    const mode = getRememberedValue("tg:chatMode", "active");

    if (!accountId) return [];

    return cacheGet(`tg:chats:${accountId}:${mode}`) || [];
  });

  const [messages, setMessages] = useState([]);

  const [newMessage, setNewMessage] = useState("");
  const [editingMessageId, setEditingMessageId] = useState("");

  const [emojiPanelOpen, setEmojiPanelOpen] = useState(false);
  const [emojiTab, setEmojiTab] = useState("emoji");

  const [telegramGifs, setTelegramGifs] = useState([]);
  const [telegramStickers, setTelegramStickers] = useState([]);
  const [loadingTelegramMedia, setLoadingTelegramMedia] = useState(false);
  const [stickerEmoji, setStickerEmoji] = useState("😂");

  const imageInputRef = useRef(null);

  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState("");
  const [imageCaption, setImageCaption] = useState("");
  const [sendingImage, setSendingImage] = useState(false);

  const [fullImageOpen, setFullImageOpen] = useState(false);
  const [fullImageData, setFullImageData] = useState({
    chatId: "",
    messageId: "",
  });

  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [sending, setSending] = useState(false);
  const [messageActionId, setMessageActionId] = useState("");

  useEffect(() => {
    rememberValue("tg:selectedAccountId", selectedAccountId);
  }, [selectedAccountId]);

  useEffect(() => {
    rememberValue("tg:selectedChatId", selectedChatId);
  }, [selectedChatId]);

  useEffect(() => {
    rememberValue("tg:search", search);
  }, [search]);

  useEffect(() => {
    rememberValue("tg:typeFilter", typeFilter);
  }, [typeFilter]);

  useEffect(() => {
    rememberValue("tg:chatMode", chatMode);
  }, [chatMode]);

  useEffect(() => {
    rememberValue("tg:createGroup:title", createGroupForm.title);
  }, [createGroupForm.title]);

  useEffect(() => {
    rememberValue("tg:createGroup:about", createGroupForm.about);
  }, [createGroupForm.about]);

  useEffect(() => {
    rememberValue("tg:createGroup:users", createGroupForm.users);
  }, [createGroupForm.users]);

  useEffect(() => {
    loadAccounts({
      silent: accounts.length > 0,
    });
  }, []);

  useEffect(() => {
    if (selectedAccountId) {
      const cachedChats = cacheGet(`tg:chats:${selectedAccountId}:${chatMode}`);

      if (Array.isArray(cachedChats)) {
        setChats(cachedChats);
      }

      loadChats(selectedAccountId, chatMode, {
        silent: Array.isArray(cachedChats),
      });
    } else {
      setChats([]);
      setSelectedChatId("");
      setMessages([]);
    }
  }, [selectedAccountId, chatMode]);

  useEffect(() => {
    if (!selectedChatId) {
      setChatProfile(null);
      setChatPhotos([]);
      setChatLinks([]);
      setGroupMembers([]);
      setInviteLink("");
      setProfileOpen(false);
      return;
    }

    const cachedProfile = cacheGet(`tg:profile:${selectedChatId}`);
    const cachedPhotos = cacheGet(`tg:photos:${selectedChatId}`);
    const cachedLinks = cacheGet(`tg:links:${selectedChatId}`);
    const cachedMembers = cacheGet(`tg:groupMembers:${selectedChatId}`);
    const cachedInviteLink = cacheGet(`tg:inviteLink:${selectedChatId}`);

    if (cachedProfile) setChatProfile(cachedProfile);
    else setChatProfile(null);

    if (Array.isArray(cachedPhotos)) setChatPhotos(cachedPhotos);
    else setChatPhotos([]);

    if (Array.isArray(cachedLinks)) setChatLinks(cachedLinks);
    else setChatLinks([]);

    if (Array.isArray(cachedMembers)) setGroupMembers(cachedMembers);
    else setGroupMembers([]);

    if (cachedInviteLink) setInviteLink(cachedInviteLink);
    else setInviteLink("");

    loadChatProfile(selectedChatId, true);
  }, [selectedChatId]);

  useEffect(() => {
    if (!selectedAccountId) return;

    api
      .post("/api/telegram-chats/realtime/start", {
        telegramAccountId: selectedAccountId,
      })
      .catch((err) => {
        console.error("Start realtime error:", err);
        toast.error(
          err?.response?.data?.message ||
            err?.response?.data?.error ||
            "Failed to start Telegram realtime",
        );
      });

    return () => {
      api
        .post("/api/telegram-chats/realtime/stop", {
          telegramAccountId: selectedAccountId,
        })
        .catch(() => {});
    };
  }, [selectedAccountId]);

  useEffect(() => {
    if (!selectedChatId) {
      setMessages([]);
      return;
    }

    setEditingMessageId("");
    setNewMessage("");

    const cachedMessages = cacheGet(`tg:messages:${selectedChatId}`);

    if (Array.isArray(cachedMessages)) {
      setMessages(cachedMessages);
      loadMessages(selectedChatId, true);
    } else {
      setMessages([]);
      loadMessages(selectedChatId, false);
    }

    socket.emit("join-chat", {
      chatMongoId: selectedChatId,
    });

    function handleNewMessage(payload) {
      if (!payload || payload.chatId !== selectedChatId || !payload.message) {
        return;
      }

      setMessages((prev) => {
        const exists = prev.some(
          (item) => String(item.id) === String(payload.message.id),
        );

        if (exists) return prev;

        const next = [...prev, payload.message];
        cacheSet(`tg:messages:${selectedChatId}`, next);

        return next;
      });

      setChats((prev) => {
        const next = prev.map((chat) => {
          if (chat._id !== selectedChatId) return chat;

          return {
            ...chat,
            latestMessage: payload.message.message || "[New message]",
            latestMessageAt: new Date().toISOString(),
          };
        });

        if (selectedAccountId) {
          cacheSet(`tg:chats:${selectedAccountId}:${chatMode}`, next);
        }

        return next;
      });
    }

    socket.on("telegram-message:new", handleNewMessage);

    return () => {
      socket.emit("leave-chat", {
        chatMongoId: selectedChatId,
      });

      socket.off("telegram-message:new", handleNewMessage);
    };
  }, [selectedChatId, selectedAccountId, chatMode]);

  useEffect(() => {
    function handleEscape(e) {
      if (e.key !== "Escape") return;

      if (imagePreviewOpen) {
        closeImagePreview();
        return;
      }

      if (fullImageOpen) {
        closeFullImage();
        return;
      }

      if (mediaPanel) {
        setMediaPanel("");
        return;
      }

      if (profileOpen) {
        setProfileOpen(false);
        return;
      }

      if (contactModalOpen) {
        setContactModalOpen(false);
        return;
      }

      if (deleteContactModalOpen) {
        setDeleteContactModalOpen(false);
        return;
      }

      if (createGroupOpen) {
        setCreateGroupOpen(false);
        return;
      }

      if (accountPanelOpen) {
        setAccountPanelOpen(false);
        return;
      }

      if (selectedChatId) {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }

        setSelectedChatId("");
        setMessages([]);
        setEditingMessageId("");
        setNewMessage("");
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [
    imagePreviewOpen,
    selectedImageUrl,
    fullImageOpen,
    mediaPanel,
    profileOpen,
    contactModalOpen,
    deleteContactModalOpen,
    createGroupOpen,
    accountPanelOpen,
    selectedChatId,
  ]);

  useLayoutEffect(() => {
    scrollToBottomInstant();
  }, [messages.length, selectedChatId]);

  const selectedChat = useMemo(() => {
    return (
      chats.find((item) => item._id === selectedChatId) ||
      (openedHiddenChat && openedHiddenChat._id === selectedChatId
        ? openedHiddenChat
        : null)
    );
  }, [chats, selectedChatId, openedHiddenChat]);

  const filteredChats = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return chats
      .filter((chat) => {
        const matchType = typeFilter === "all" || chat.type === typeFilter;

        const matchSearch =
          !keyword ||
          String(chat.title || "")
            .toLowerCase()
            .includes(keyword) ||
          String(chat.username || "")
            .toLowerCase()
            .includes(keyword) ||
          String(chat.chatId || "")
            .toLowerCase()
            .includes(keyword);

        return matchType && matchSearch;
      })
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;

        const aTime = a.latestMessageAt
          ? new Date(a.latestMessageAt).getTime()
          : new Date(a.updatedAt || 0).getTime();

        const bTime = b.latestMessageAt
          ? new Date(b.latestMessageAt).getTime()
          : new Date(b.updatedAt || 0).getTime();

        return bTime - aTime;
      });
  }, [chats, search, typeFilter]);

  const accountOptions = useMemo(() => {
    return accounts.map((account) => ({
      value: account._id,
      label: account.label?.trim() || "Telegram Account",
    }));
  }, [accounts]);

  const selectedAccount = useMemo(() => {
    return accounts.find((item) => item._id === selectedAccountId) || null;
  }, [accounts, selectedAccountId]);

  const typeFilterOptions = useMemo(() => {
    return [
      { value: "all", label: "All chats" },
      { value: "private", label: "Private chats" },
      { value: "bot", label: "Bots" },
      { value: "group", label: "Groups" },
      { value: "channel", label: "Channels" },
      { value: "unknown", label: "Unknown" },
    ];
  }, []);

  function selectChat(chatId) {
    setOpenedHiddenChat(null);
    setSelectedChatId(chatId);
    setEditingMessageId("");
    setNewMessage("");

    const cachedMessages = cacheGet(`tg:messages:${chatId}`);

    if (Array.isArray(cachedMessages)) {
      setMessages(cachedMessages);
      setLoadingMessages(false);
    } else {
      setMessages([]);
    }
  }

  async function loadAccounts(options = {}) {
    const cached = cacheGet("tg:accounts");
    const hasCache = Array.isArray(cached);
    const silent = options.silent ?? hasCache;

    try {
      if (hasCache) {
        setAccounts(cached);
      }

      if (!silent) setLoadingAccounts(true);

      const res = await api.get("/api/telegram-auth/accounts");
      const list = Array.isArray(res.data?.data) ? res.data.data : [];

      cacheSet("tg:accounts", list);
      setAccounts(list);

      const firstConnected = list.find(
        (item) => item.isConnected && item.status === "connected",
      );

      if (!selectedAccountId && firstConnected?._id) {
        setSelectedAccountId(firstConnected._id);
      }
    } catch (err) {
      console.error("Load Telegram accounts error:", err);

      if (!silent) {
        toast.error(
          err?.response?.data?.message ||
            err?.response?.data?.error ||
            "Failed to load Telegram accounts",
        );
      }
    } finally {
      if (!silent) setLoadingAccounts(false);
    }
  }

  async function toggleSelectedGroupHistory(hidden) {
    if (!selectedChatId) return;

    try {
      setGroupAction("history");

      const res = await api.patch(
        `/api/telegram-chats/${selectedChatId}/group/history`,
        { hidden },
      );

      updateChatInState(selectedChatId, {
        historyHiddenForNewMembers: hidden,
      });

      cacheSet(`tg:profile:${selectedChatId}`, {
        ...(chatProfile || {}),
        historyHiddenForNewMembers: hidden,
      });

      toast.success(res.data?.message || "Group history setting updated");
    } catch (err) {
      console.error("Toggle group history error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to update group history setting",
      );
    } finally {
      setGroupAction("");
    }
  }

  async function loadChats(
    accountId = selectedAccountId,
    mode = chatMode,
    options = {},
  ) {
    if (!accountId) return;

    const cacheKey = `tg:chats:${accountId}:${mode}`;
    const cached = cacheGet(cacheKey);
    const hasCache = Array.isArray(cached);
    const silent = options.silent ?? hasCache;

    try {
      if (hasCache) {
        setChats(cached);
      }

      if (!silent) setLoadingChats(true);

      let url = `/api/telegram-chats?telegramAccountId=${accountId}`;

      if (mode === "archived") {
        url += "&archived=true";
      }

      if (mode === "saved") {
        url += "&savedMessages=true";
      }

      const res = await api.get(url);
      const list = Array.isArray(res.data?.data) ? res.data.data : [];

      cacheSet(cacheKey, list);
      setChats(list);

      setSelectedChatId((current) => {
        if (!current) return "";

        const stillExists = list.some((chat) => chat._id === current);
        return stillExists ? current : "";
      });
    } catch (err) {
      console.error("Load Telegram chats error:", err);

      if (!silent) {
        toast.error(
          err?.response?.data?.message ||
            err?.response?.data?.error ||
            "Failed to load Telegram chats",
        );
      }
    } finally {
      if (!silent) setLoadingChats(false);
    }
  }

  async function syncChats() {
    if (!selectedAccountId) {
      toast.error("Please select a Telegram account first");
      return;
    }

    try {
      setSyncing(true);

      const res = await api.post("/api/telegram-chats/sync", {
        telegramAccountId: selectedAccountId,
      });

      toast.success(res.data?.message || "Telegram chats synced");

      await loadChats(selectedAccountId, chatMode, {
        silent: true,
      });
    } catch (err) {
      console.error("Sync chats error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to sync Telegram chats",
      );
    } finally {
      setSyncing(false);
    }
  }

  async function syncAllChats() {
    try {
      setSyncingAll(true);

      const res = await api.post(
        "/api/telegram-chats/sync-all?limit=100&concurrency=3",
      );

      const syncedAccounts = Number(res.data?.syncedAccounts || 0);
      const failedAccounts = Number(res.data?.failedAccounts || 0);
      const totalSavedChats = Number(res.data?.totalSavedChats || 0);

      if (failedAccounts > 0) {
        toast.warning(
          `Sync all completed: ${syncedAccounts} accounts synced, ${failedAccounts} failed`,
        );
      } else {
        toast.success(
          `All accounts synced: ${syncedAccounts} accounts, ${totalSavedChats} chats`,
        );
      }

      await loadAccounts({
        silent: true,
      });

      if (selectedAccountId) {
        localStorage.removeItem(`tg:chats:${selectedAccountId}:active`);
        localStorage.removeItem(`tg:chats:${selectedAccountId}:archived`);
        localStorage.removeItem(`tg:chats:${selectedAccountId}:saved`);

        await loadChats(selectedAccountId, chatMode, {
          silent: true,
        });
      }
    } catch (err) {
      console.error("Sync all chats error:", err);

      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to sync all Telegram accounts",
      );
    } finally {
      setSyncingAll(false);
    }
  }

  async function archiveChat(chatId) {
    try {
      await api.patch(`/api/telegram-chats/${chatId}/archive`);
      toast.success("Chat archived");

      await loadChats(selectedAccountId, chatMode, {
        silent: true,
      });

      if (selectedChatId === chatId && chatMode === "active") {
        setSelectedChatId("");
        setMessages([]);
      }
    } catch (err) {
      console.error("Archive chat error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to archive chat",
      );
    }
  }

  async function unarchiveChat(chatId) {
    try {
      await api.patch(`/api/telegram-chats/${chatId}/unarchive`);
      toast.success("Chat unarchived");

      await loadChats(selectedAccountId, chatMode, {
        silent: true,
      });

      if (selectedChatId === chatId && chatMode === "archived") {
        setSelectedChatId("");
        setMessages([]);
      }
    } catch (err) {
      console.error("Unarchive chat error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to unarchive chat",
      );
    }
  }

  async function pinChat(chatId) {
    try {
      await api.patch(`/api/telegram-chats/${chatId}/pin`);
      toast.success("Chat pinned");

      await loadChats(selectedAccountId, chatMode, {
        silent: true,
      });
    } catch (err) {
      console.error("Pin chat error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to pin chat",
      );
    }
  }

  async function unpinChat(chatId) {
    try {
      await api.patch(`/api/telegram-chats/${chatId}/unpin`);
      toast.success("Chat unpinned");

      await loadChats(selectedAccountId, chatMode, {
        silent: true,
      });
    } catch (err) {
      console.error("Unpin chat error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to unpin chat",
      );
    }
  }

  async function loadChatProfile(chatId = selectedChatId, silent = false) {
    if (!chatId) return;

    const cacheKey = `tg:profile:${chatId}`;
    const cached = cacheGet(cacheKey);
    const hasCache = !!cached;

    try {
      if (hasCache) {
        setChatProfile(cached);
      }

      if (!silent && !hasCache) {
        setLoadingProfile(true);
      }

      const res = await api.get(`/api/telegram-chats/${chatId}/profile`);
      const profile = res.data?.data || null;

      if (profile) {
        cacheSet(cacheKey, profile);

        if (chatId === selectedChatId) {
          setChatProfile(profile);
        }

        updateChatInState(chatId, {
          username: profile.username,
          onlineStatus: profile.onlineStatus,
          lastSeenAt: profile.lastSeenAt,
          isContact: profile.isContact,
          isMuted: profile.isMuted,
          mutedUntil: profile.mutedUntil,
          isBlocked: profile.isBlocked,
          hasPhoto: profile.hasPhoto,
        });
      }
    } catch (err) {
      console.error("Load chat profile error:", err);

      if (!silent && !hasCache) {
        toast.error(
          err?.response?.data?.message ||
            err?.response?.data?.error ||
            "Failed to load chat profile",
        );
      }
    } finally {
      if (!silent) setLoadingProfile(false);
    }
  }

  async function loadMessages(
    chatId = selectedChatId,
    silent = false,
    force = false,
  ) {
    if (!chatId) return;

    const cacheKey = `tg:messages:${chatId}`;
    const cached = cacheGet(cacheKey);
    const hasCache = Array.isArray(cached);

    if (hasCache) {
      setMessages(cached);

      if (!force) {
        return;
      }
    }

    try {
      if (!silent && !hasCache) {
        setLoadingMessages(true);
      }

      const res = await api.get(
        `/api/telegram-chats/${chatId}/messages?limit=20`,
      );

      const list = Array.isArray(res.data?.data) ? res.data.data : [];

      cacheSet(cacheKey, list);

      if (chatId === selectedChatId || !selectedChatId) {
        setMessages(list);
      }

      const latest = list[list.length - 1];

      if (latest?.message) {
        setChats((prev) => {
          const next = prev.map((chat) => {
            if (chat._id !== chatId) return chat;

            return {
              ...chat,
              latestMessage: latest.message,
              latestMessageAt: latest.date
                ? new Date(latest.date * 1000).toISOString()
                : new Date().toISOString(),
            };
          });

          if (selectedAccountId) {
            cacheSet(`tg:chats:${selectedAccountId}:${chatMode}`, next);
          }

          return next;
        });
      }
    } catch (err) {
      console.error("Load Telegram messages error:", err);

      if (!silent && !hasCache) {
        toast.error(
          err?.response?.data?.message ||
            err?.response?.data?.error ||
            "Failed to load Telegram messages",
        );
      }
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  }

  async function submitMessage(e) {
    e.preventDefault();

    if (editingMessageId) {
      await saveEdit();
      return;
    }

    await sendMessage();
  }

  async function sendMessage() {
    const text = newMessage.trim();

    if (!selectedChatId) {
      toast.error("Please select a chat first");
      return;
    }

    if (!text) {
      toast.error("Message is required");
      return;
    }

    try {
      setSending(true);

      await api.post(`/api/telegram-chats/${selectedChatId}/messages`, {
        message: text,
      });

      setNewMessage("");
      setOpenedHiddenChat(null);
    } catch (err) {
      console.error("Send Telegram message error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to send Telegram message",
      );
    } finally {
      setSending(false);
    }
  }

  function openImagePicker() {
    if (!selectedChatId) {
      toast.error("Please select a chat first");
      return;
    }

    if (editingMessageId) {
      toast.error("Finish editing before sending an image");
      return;
    }

    imageInputRef.current?.click();
  }

  function getCurrentTelegramAccountId() {
    return (
      selectedChat?.telegramAccountId?._id ||
      selectedChat?.telegramAccountId ||
      selectedAccountId
    );
  }

  async function loadSavedTelegramGifs() {
    const telegramAccountId = getCurrentTelegramAccountId();

    if (!telegramAccountId) {
      toast.error("Please select a Telegram account first");
      return;
    }

    try {
      setLoadingTelegramMedia(true);

      const res = await api.get(
        `/api/telegram-chats/accounts/${telegramAccountId}/gifs/saved`,
      );

      setTelegramGifs(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      console.error("Load Telegram GIFs error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to load Telegram GIFs",
      );
    } finally {
      setLoadingTelegramMedia(false);
    }
  }

  async function loadTelegramStickers(emoji = stickerEmoji) {
    const telegramAccountId = getCurrentTelegramAccountId();

    if (!telegramAccountId) {
      toast.error("Please select a Telegram account first");
      return;
    }

    try {
      setLoadingTelegramMedia(true);

      const res = await api.get(
        `/api/telegram-chats/accounts/${telegramAccountId}/stickers?emoji=${encodeURIComponent(
          emoji || "😂",
        )}`,
      );

      setTelegramStickers(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      console.error("Load Telegram stickers error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to load Telegram stickers",
      );
    } finally {
      setLoadingTelegramMedia(false);
    }
  }

  async function sendPickedTelegramMedia(pickId) {
    if (!selectedChatId) {
      toast.error("Please select a chat first");
      return;
    }

    if (!pickId) return;

    try {
      setSending(true);

      await api.post(
        `/api/telegram-chats/${selectedChatId}/media-picker/${pickId}/send`,
      );

      setEmojiPanelOpen(false);

      await loadMessages(selectedChatId, true, true);
      await loadChats(selectedAccountId, chatMode, { silent: true });
    } catch (err) {
      console.error("Send Telegram media error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to send Telegram media",
      );
    } finally {
      setSending(false);
    }
  }

  function openEmojiPanel(nextTab = "emoji") {
    if (!selectedChatId) {
      toast.error("Please select a chat first");
      return;
    }

    setEmojiPanelOpen((current) => {
      const willOpen = !current || emojiTab !== nextTab;

      if (willOpen) {
        setEmojiTab(nextTab);

        if (nextTab === "gifs" && telegramGifs.length === 0) {
          loadSavedTelegramGifs();
        }

        if (nextTab === "stickers" && telegramStickers.length === 0) {
          loadTelegramStickers(stickerEmoji);
        }
      }

      return willOpen;
    });
  }

  function handleImageSelected(e) {
    const file = e.target.files?.[0];

    // allow selecting the same file again next time
    e.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const url = URL.createObjectURL(file);

    if (selectedImageUrl) {
      URL.revokeObjectURL(selectedImageUrl);
    }

    setSelectedImageFile(file);
    setSelectedImageUrl(url);
    setImageCaption("");
    setImagePreviewOpen(true);
  }

  function handlePasteImage(e) {
    if (!selectedChatId) return;

    if (editingMessageId) {
      return;
    }

    const items = Array.from(e.clipboardData?.items || []);

    const imageItem = items.find(
      (item) => item.kind === "file" && item.type.startsWith("image/"),
    );

    if (!imageItem) return;

    e.preventDefault();

    const file = imageItem.getAsFile();

    if (!file) {
      toast.error("Could not read pasted image");
      return;
    }

    const pastedFile = new File(
      [file],
      `pasted-image-${Date.now()}.${file.type.split("/")[1] || "png"}`,
      {
        type: file.type || "image/png",
      },
    );

    const url = URL.createObjectURL(pastedFile);

    if (selectedImageUrl) {
      URL.revokeObjectURL(selectedImageUrl);
    }

    setSelectedImageFile(pastedFile);
    setSelectedImageUrl(url);
    setImageCaption("");
    setImagePreviewOpen(true);
  }

  function closeImagePreview() {
    if (selectedImageUrl) {
      URL.revokeObjectURL(selectedImageUrl);
    }

    setImagePreviewOpen(false);
    setSelectedImageFile(null);
    setSelectedImageUrl("");
    setImageCaption("");
  }

  async function sendImageMessage() {
    if (!selectedChatId) {
      toast.error("Please select a chat first");
      return;
    }

    if (!selectedImageFile) {
      toast.error("Please select an image first");
      return;
    }

    try {
      setSendingImage(true);

      const formData = new FormData();
      formData.append("image", selectedImageFile);
      formData.append("caption", imageCaption.trim());

      await api.post(
        `/api/telegram-chats/${selectedChatId}/messages/image`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      closeImagePreview();
      await loadMessages(selectedChatId, true, true);
      toast.success("Image sent");
    } catch (err) {
      console.error("Send image error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to send image",
      );
    } finally {
      setSendingImage(false);
    }
  }

  function openFullImage(chatId, messageId) {
    setFullImageData({
      chatId,
      messageId,
    });
    setFullImageOpen(true);
  }

  function closeFullImage() {
    setFullImageOpen(false);
    setFullImageData({
      chatId: "",
      messageId: "",
    });
  }

  function openDeleteContactModal() {
    setDeleteContactModalOpen(true);
  }

  async function confirmDeleteContact() {
    setDeleteContactModalOpen(false);
    await deleteSelectedContact();
  }

  function startEdit(message) {
    setEditingMessageId(message.id);
    setNewMessage(message.message || "");

    setTimeout(() => {
      messageInputRef.current?.focus();
    }, 80);
  }

  function updateChatInState(chatId, patch = {}) {
    setChats((prev) => {
      const next = prev.map((chat) => {
        if (chat._id !== chatId) return chat;
        return { ...chat, ...patch };
      });

      if (selectedAccountId) {
        cacheSet(`tg:chats:${selectedAccountId}:${chatMode}`, next);
      }

      return next;
    });

    setChatProfile((prev) => {
      if (!prev || String(prev.chatId) !== String(chatId)) return prev;

      const next = {
        ...prev,
        ...patch,
      };

      cacheSet(`tg:profile:${chatId}`, next);

      return next;
    });
  }

  function cancelEdit() {
    setEditingMessageId("");
    setNewMessage("");
  }

  async function saveEdit() {
    const text = newMessage.trim();

    if (!editingMessageId) return;

    if (!text) {
      toast.error("Edited message cannot be empty");
      return;
    }

    try {
      setSending(true);
      setMessageActionId(editingMessageId);

      await api.patch(
        `/api/telegram-chats/${selectedChatId}/messages/${editingMessageId}`,
        {
          message: text,
        },
      );

      setEditingMessageId("");
      setNewMessage("");

      await loadMessages(selectedChatId, true, true);
      toast.success("Message edited");
    } catch (err) {
      console.error("Edit Telegram message error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to edit message. Telegram usually only allows editing your own messages.",
      );
    } finally {
      setSending(false);
      setMessageActionId("");
    }
  }

  async function loadChatPhotos(chatId = selectedChatId, silent = false) {
    if (!chatId) return;

    const cacheKey = `tg:photos:${chatId}`;
    const cached = cacheGet(cacheKey);
    const hasCache = Array.isArray(cached);

    try {
      if (hasCache) {
        setChatPhotos(cached);
      }

      if (!silent && !hasCache) {
        setLoadingPhotos(true);
      }

      const res = await api.get(
        `/api/telegram-chats/${chatId}/media/photos?limit=31`,
      );
      const list = Array.isArray(res.data?.data) ? res.data.data : [];

      cacheSet(cacheKey, list);

      if (chatId === selectedChatId) {
        setChatPhotos(list);
      }
    } catch (err) {
      console.error("Load chat photos error:", err);

      if (!silent && !hasCache) {
        toast.error(
          err?.response?.data?.message ||
            err?.response?.data?.error ||
            "Failed to load shared photos",
        );
      }
    } finally {
      if (!silent) setLoadingPhotos(false);
    }
  }

  async function loadChatLinks(chatId = selectedChatId, silent = false) {
    if (!chatId) return;

    const cacheKey = `tg:links:${chatId}`;
    const cached = cacheGet(cacheKey);
    const hasCache = Array.isArray(cached);

    try {
      if (hasCache) {
        setChatLinks(cached);
      }

      if (!silent && !hasCache) {
        setLoadingLinks(true);
      }

      const res = await api.get(
        `/api/telegram-chats/${chatId}/media/links?limit=50`,
      );
      const list = Array.isArray(res.data?.data) ? res.data.data : [];

      cacheSet(cacheKey, list);

      if (chatId === selectedChatId) {
        setChatLinks(list);
      }
    } catch (err) {
      console.error("Load chat links error:", err);

      if (!silent && !hasCache) {
        toast.error(
          err?.response?.data?.message ||
            err?.response?.data?.error ||
            "Failed to load shared links",
        );
      }
    } finally {
      if (!silent) setLoadingLinks(false);
    }
  }

  function parseUserList(value) {
    return String(value || "")
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  async function createGroup(e) {
    e.preventDefault();

    if (!selectedAccountId) {
      toast.error("Please select a Telegram account first");
      return;
    }

    const title = createGroupForm.title.trim();
    const about = createGroupForm.about.trim();
    const users = parseUserList(createGroupForm.users);

    if (!title) {
      toast.error("Group title is required");
      return;
    }

    try {
      setCreatingGroup(true);

      const res = await api.post("/api/telegram-chats/groups", {
        telegramAccountId: selectedAccountId,
        title,
        about,
        users,
      });

      const createdChat = res.data?.data || null;

      toast.success(res.data?.message || "Group created");

      setCreateGroupOpen(false);

      setCreateGroupForm((prev) => ({
        ...prev,
        title: "",
        about: "",
        users: "",
      }));

      rememberValue("tg:createGroup:title", "");
      rememberValue("tg:createGroup:about", "");
      rememberValue("tg:createGroup:users", "");

      await loadChats(selectedAccountId, chatMode, {
        silent: true,
      });

      if (createdChat?._id) {
        const nextCreatedChat = {
          ...createdChat,
          type: "group",
          historyHiddenForNewMembers: true,
        };

        setSelectedChatId(createdChat._id);
        cacheSet(`tg:profile:${createdChat._id}`, nextCreatedChat);
      }
    } catch (err) {
      console.error("Create group error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to create group",
      );
    } finally {
      setCreatingGroup(false);
    }
  }

  async function loadGroupMembers(chatId = selectedChatId, silent = false) {
    if (!chatId) return;

    const cacheKey = `tg:groupMembers:${chatId}`;
    const cached = cacheGet(cacheKey);
    const hasCache = Array.isArray(cached);

    try {
      if (hasCache) {
        setGroupMembers(cached);
      }

      if (!silent && !hasCache) {
        setLoadingGroupMembers(true);
      }

      const res = await api.get(`/api/telegram-chats/${chatId}/group/members`);
      const list = Array.isArray(res.data?.data) ? res.data.data : [];

      cacheSet(cacheKey, list);

      if (chatId === selectedChatId) {
        setGroupMembers(list);
      }
    } catch (err) {
      console.error("Load group members error:", err);

      if (!silent && !hasCache) {
        toast.error(
          err?.response?.data?.message ||
            err?.response?.data?.error ||
            "Failed to load group members",
        );
      }
    } finally {
      if (!silent) setLoadingGroupMembers(false);
    }
  }

  async function addMembersToSelectedGroup(usersText) {
    if (!selectedChatId) return;

    const users = parseUserList(usersText);

    if (!users.length) {
      toast.error("Enter at least 1 username/id/phone");
      return;
    }

    try {
      setGroupAction("add-members");

      const res = await api.post(
        `/api/telegram-chats/${selectedChatId}/group/members`,
        { users },
      );

      const added = Array.isArray(res.data?.added) ? res.data.added : [];
      const failed = Array.isArray(res.data?.failed) ? res.data.failed : [];
      const link = res.data?.inviteLink || "";

      if (link) {
        setInviteLink(link);
        cacheSet(`tg:inviteLink:${selectedChatId}`, link);
      }

      if (res.data?.success === false || failed.length > 0) {
        toast.error(
          failed[0]?.error
            ? `Could not add ${failed[0].user}: ${failed[0].error}`
            : res.data?.message || "Could not add member directly",
        );

        if (link) {
          toast.info("Use the invite link instead");
        }

        return;
      }

      toast.success(
        added.length > 0
          ? `${added.length} member added`
          : res.data?.message || "Members added",
      );

      localStorage.removeItem(`tg:groupMembers:${selectedChatId}`);
      await loadGroupMembers(selectedChatId, false);
    } catch (err) {
      console.error("Add group members error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to add members",
      );
    } finally {
      setGroupAction("");
    }
  }

  async function removeGroupMember(userId) {
    if (!selectedChatId || !userId) return;

    const yes = window.confirm("Remove this member from group?");
    if (!yes) return;

    try {
      setGroupAction(`remove:${userId}`);

      await api.delete(
        `/api/telegram-chats/${selectedChatId}/group/members/${userId}`,
      );

      const next = groupMembers.filter(
        (member) => String(member.id) !== String(userId),
      );

      setGroupMembers(next);
      cacheSet(`tg:groupMembers:${selectedChatId}`, next);

      toast.success("Member removed");
    } catch (err) {
      console.error("Remove group member error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to remove member",
      );
    } finally {
      setGroupAction("");
    }
  }

  async function openGroupMemberProfile(member) {
    if (!selectedChatId || !member?.id) return;

    try {
      setLoadingMemberProfile(true);
      setMemberProfileOpen(true);
      setSelectedMemberProfile(member);

      const res = await api.get(
        `/api/telegram-chats/${selectedChatId}/group/members/${member.id}/profile?accessHash=${encodeURIComponent(
          member.accessHash || "",
        )}`,
      );

      setSelectedMemberProfile(res.data?.data || member);
    } catch (err) {
      console.error("Open group member profile error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to open member profile",
      );
    } finally {
      setLoadingMemberProfile(false);
    }
  }

  async function messageGroupMember(member) {
    if (!selectedChatId || !member?.id) return;

    try {
      const res = await api.post(
        `/api/telegram-chats/${selectedChatId}/group/members/${member.id}/open-chat?accessHash=${encodeURIComponent(
          member.accessHash || "",
        )}`,
      );

      const chat = res.data?.data;

      if (!chat?._id) {
        toast.error("Could not open private chat");
        return;
      }

      const privateChat = {
        ...chat,
        type: "private",
        isHiddenFromChatList: true,
      };

      setMemberProfileOpen(false);
      setSelectedMemberProfile(null);
      setProfileOpen(false);
      setMediaPanel("");
      setEditingMessageId("");
      setNewMessage("");

      setOpenedHiddenChat(privateChat);
      setChatProfile(privateChat);
      setMessages([]);

      setSelectedChatId(privateChat._id);

      await loadChatProfile(privateChat._id, true);
      await loadMessages(privateChat._id, true);
    } catch (err) {
      console.error("Message group member error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to open private chat",
      );
    }
  }

  async function exportSelectedGroupInviteLink() {
    if (!selectedChatId) return;

    try {
      setGroupAction("invite-link");

      const res = await api.post(
        `/api/telegram-chats/${selectedChatId}/group/invite-link`,
      );

      const link = res.data?.data?.link || "";

      setInviteLink(link);
      cacheSet(`tg:inviteLink:${selectedChatId}`, link);

      if (link) {
        await navigator.clipboard?.writeText(link).catch(() => {});
        toast.success("Invite link copied");
      } else {
        toast.success("Invite link created");
      }
    } catch (err) {
      console.error("Export invite link error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to export invite link",
      );
    } finally {
      setGroupAction("");
    }
  }

  async function updateSelectedGroupTitle(nextTitle) {
    if (!selectedChatId) return;

    const title = String(nextTitle || "").trim();

    if (!title) {
      toast.error("Group title is required");
      return;
    }

    try {
      setGroupAction("title");

      const res = await api.patch(
        `/api/telegram-chats/${selectedChatId}/group/title`,
        { title },
      );

      updateChatInState(selectedChatId, {
        title,
      });

      cacheSet(`tg:profile:${selectedChatId}`, {
        ...(chatProfile || {}),
        title,
      });

      toast.success(res.data?.message || "Group title updated");
    } catch (err) {
      console.error("Update group title error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to update group title",
      );
    } finally {
      setGroupAction("");
    }
  }

  async function leaveSelectedGroup() {
    if (!selectedChatId) return;

    const yes = window.confirm("Leave this group?");
    if (!yes) return;

    try {
      setGroupAction("leave");

      await api.post(`/api/telegram-chats/${selectedChatId}/group/leave`);

      toast.success("Left group");

      localStorage.removeItem(`tg:messages:${selectedChatId}`);
      localStorage.removeItem(`tg:profile:${selectedChatId}`);
      localStorage.removeItem(`tg:photos:${selectedChatId}`);
      localStorage.removeItem(`tg:links:${selectedChatId}`);
      localStorage.removeItem(`tg:groupMembers:${selectedChatId}`);
      localStorage.removeItem(`tg:inviteLink:${selectedChatId}`);

      setSelectedChatId("");
      setMessages([]);
      setChatProfile(null);
      setGroupMembers([]);
      setInviteLink("");

      await loadChats(selectedAccountId, chatMode, {
        silent: true,
      });
    } catch (err) {
      console.error("Leave group error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to leave group",
      );
    } finally {
      setGroupAction("");
    }
  }

  async function muteSelectedChat() {
    if (!selectedChatId) return;

    try {
      setProfileAction("mute");

      const res = await api.patch(
        `/api/telegram-chats/${selectedChatId}/mute`,
        {
          minutes: 525600,
        },
      );

      updateChatInState(selectedChatId, {
        isMuted: true,
        mutedUntil: res.data?.data?.mutedUntil || null,
      });

      toast.success("Chat muted");
    } catch (err) {
      console.error("Mute chat error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to mute chat",
      );
    } finally {
      setProfileAction("");
    }
  }

  async function unmuteSelectedChat() {
    if (!selectedChatId) return;

    try {
      setProfileAction("unmute");

      await api.patch(`/api/telegram-chats/${selectedChatId}/unmute`);

      updateChatInState(selectedChatId, {
        isMuted: false,
        mutedUntil: null,
      });

      toast.success("Chat unmuted");
    } catch (err) {
      console.error("Unmute chat error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to unmute chat",
      );
    } finally {
      setProfileAction("");
    }
  }

  async function blockSelectedUser() {
    if (!selectedChatId) return;

    const yes = window.confirm("Block this Telegram user?");
    if (!yes) return;

    try {
      setProfileAction("block");

      await api.patch(`/api/telegram-chats/${selectedChatId}/block`);

      updateChatInState(selectedChatId, {
        isBlocked: true,
        onlineStatus: "long_time_ago",
      });

      toast.success("User blocked");
    } catch (err) {
      console.error("Block user error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to block user",
      );
    } finally {
      setProfileAction("");
    }
  }

  async function unblockSelectedUser() {
    if (!selectedChatId) return;

    try {
      setProfileAction("unblock");

      await api.patch(`/api/telegram-chats/${selectedChatId}/unblock`);

      updateChatInState(selectedChatId, {
        isBlocked: false,
      });

      await loadChatProfile(selectedChatId, true);

      toast.success("User unblocked");
    } catch (err) {
      console.error("Unblock user error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to unblock user",
      );
    } finally {
      setProfileAction("");
    }
  }

  function openContactModal() {
    const currentTitle = chatProfile?.firstName || selectedChat?.title || "";

    setContactForm({
      firstName: currentTitle,
      lastName: chatProfile?.lastName || "",
      phone: chatProfile?.phone || "",
      note: chatProfile?.note || "",
    });

    setContactModalOpen(true);
  }

  async function submitContactModal(e) {
    e.preventDefault();

    if (!selectedChatId) return;

    const firstName = contactForm.firstName.trim();
    const lastName = contactForm.lastName.trim();
    const phone = contactForm.phone.trim();

    if (!firstName) {
      toast.error("First name is required");
      return;
    }

    try {
      setProfileAction("contact");

      const method = chatProfile?.isContact ? "patch" : "post";

      const res = await api[method](
        `/api/telegram-chats/${selectedChatId}/contact`,
        {
          firstName,
          lastName,
          phone,
        },
      );

      updateChatInState(selectedChatId, {
        title: `${firstName} ${lastName}`.trim(),
        firstName,
        lastName,
        phone,
        isContact: true,
      });

      cacheSet(`tg:profile:${selectedChatId}`, {
        ...(chatProfile || {}),
        firstName,
        lastName,
        phone,
        isContact: true,
      });

      if (res.data?.data) {
        setChatProfile((prev) => ({
          ...(prev || {}),
          ...res.data.data,
          isContact: true,
        }));
      }

      setContactModalOpen(false);

      toast.success(
        chatProfile?.isContact ? "Contact updated" : "Contact added",
      );
    } catch (err) {
      console.error("Save contact error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to save contact",
      );
    } finally {
      setProfileAction("");
    }
  }

  async function deleteSelectedContact() {
    if (!selectedChatId) return;

    const yes = window.confirm("Delete this contact?");
    if (!yes) return;

    try {
      setProfileAction("delete-contact");

      await api.delete(`/api/telegram-chats/${selectedChatId}/contact`);

      updateChatInState(selectedChatId, {
        isContact: false,
        isMutualContact: false,
      });

      toast.success("Contact deleted");
    } catch (err) {
      console.error("Delete contact error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to delete contact",
      );
    } finally {
      setProfileAction("");
    }
  }

  async function deleteMessage(messageId) {
    const yes = window.confirm("Delete this Telegram message?");

    if (!yes) return;

    try {
      setMessageActionId(messageId);

      await api.delete(
        `/api/telegram-chats/${selectedChatId}/messages/${messageId}`,
      );

      if (editingMessageId === messageId) {
        cancelEdit();
      }

      await loadMessages(selectedChatId, true, true);
      toast.success("Message deleted");
    } catch (err) {
      console.error("Delete Telegram message error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to delete message",
      );
    } finally {
      setMessageActionId("");
    }
  }

  async function refreshAll() {
    await loadAccounts({
      silent: true,
    });

    if (selectedAccountId) {
      await loadChats(selectedAccountId, chatMode, {
        silent: true,
      });
    }

    if (selectedChatId) {
      await loadMessages(selectedChatId, true, true);
      await loadChatProfile(selectedChatId, true);
      await loadChatPhotos(selectedChatId, true);
      await loadChatLinks(selectedChatId, true);
    }
  }

  function handleAccountChange(nextAccountId) {
    setSelectedAccountId(nextAccountId);
    setChatMode("active");
    setTypeFilter("all");
    setEditingMessageId("");
    setNewMessage("");

    setSelectedChatId("");
    setMessages([]);
    setChatProfile(null);
    setChatPhotos([]);
    setChatLinks([]);
    setProfileOpen(false);
    setMediaPanel("");

    rememberValue("tg:selectedChatId", "");

    const cachedChats = cacheGet(`tg:chats:${nextAccountId}:active`) || [];
    setChats(cachedChats);
  }

  function changeChatMode(nextMode) {
    setChatMode(nextMode);
    setEditingMessageId("");
    setNewMessage("");

    if (!selectedAccountId) {
      setChats([]);
      setSelectedChatId("");
      setMessages([]);
      return;
    }

    const cachedChats = cacheGet(`tg:chats:${selectedAccountId}:${nextMode}`);

    if (Array.isArray(cachedChats)) {
      setChats(cachedChats);

      const stillExists = cachedChats.some(
        (chat) => chat._id === selectedChatId,
      );

      if (!stillExists) {
        setSelectedChatId("");
        setMessages([]);
      }
    } else {
      setChats([]);
      setSelectedChatId("");
      setMessages([]);
    }
  }

  function scrollToBottomInstant() {
    const el = messagesContainerRef.current;

    if (!el) return;

    el.scrollTop = el.scrollHeight;

    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }

  return (
    <Shell title="Telegram Chats">
      <div className="-m-4 min-h-[calc(100vh-78px)]">
        <section className="h-full overflow-hidden">
          <div className="grid h-[calc(100vh-78px)] grid-cols-1 lg:grid-cols-[360px_1fr]">
            <aside
              className={`flex min-h-0 flex-col border-r ${
                isDark
                  ? "border-white/[0.06] bg-[#34343c]"
                  : "border-[#eee4d5] bg-white"
              }`}
            >
              <div className="shrink-0 p-2.5">
                <div
                  className={`rounded-[18px] border p-2.5 ${
                    isDark
                      ? "border-white/[0.07] bg-[#292a2f]"
                      : "border-[#eee4d5] bg-[#f7f2ea]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setAccountPanelOpen(true)}
                    className={`flex min-h-[52px] w-full items-center justify-between gap-3 rounded-[16px] border px-4 text-left transition ${
                      isDark
                        ? "border-white/[0.08] bg-[#24252b] text-white hover:bg-white/[0.045]"
                        : "border-[#e8dece] bg-white text-[#201d19] hover:bg-[#f7f2ea]"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">
                        {selectedAccount?.label?.trim() ||
                          "Select Telegram account"}
                      </div>
                    </div>

                    <ChevronDown
                      className={`h-4 w-4 -rotate-90 ${
                        isDark ? "text-white/35" : "text-[#8d8375]"
                      }`}
                    />
                  </button>

                  <div className="mt-2 grid grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={refreshAll}
                      disabled={!selectedAccountId && loadingAccounts}
                      className={secondaryButton(isDark)}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Refresh
                    </button>

                    <button
                      type="button"
                      onClick={syncChats}
                      disabled={syncing || !selectedAccountId}
                      className={primarySmallButton()}
                    >
                      {syncing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                      Sync
                    </button>

                    <button
                      type="button"
                      onClick={syncAllChats}
                      disabled={syncingAll || loadingAccounts}
                      className={primarySmallButton()}
                    >
                      {syncingAll ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                      All
                    </button>

                    <button
                      type="button"
                      onClick={() => setCreateGroupOpen(true)}
                      disabled={!selectedAccountId}
                      className={secondaryButton(isDark)}
                    >
                      <Users className="h-3.5 w-3.5" />
                      Create
                    </button>
                  </div>
                </div>

                <div className="mt-2">
                  <div
                    className={`flex min-h-[38px] items-center gap-2 rounded-[14px] border px-3 ${
                      isDark
                        ? "border-white/[0.07] bg-[#292a2f]"
                        : "border-[#eee4d5] bg-[#f7f2ea]"
                    }`}
                  >
                    <Search
                      className={`h-3.5 w-3.5 ${
                        isDark ? "text-white/35" : "text-[#8d8375]"
                      }`}
                    />

                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search chats"
                      className={`min-h-[38px] w-full bg-transparent text-[13px] outline-none ${
                        isDark
                          ? "text-white placeholder:text-white/25"
                          : "text-[#201d19] placeholder:text-[#9b9081]"
                      }`}
                    />
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => changeChatMode("active")}
                    className={tabButton(isDark, chatMode === "active")}
                  >
                    Active
                  </button>

                  <button
                    type="button"
                    onClick={() => changeChatMode("archived")}
                    className={tabButton(isDark, chatMode === "archived")}
                  >
                    Archived
                  </button>

                  <button
                    type="button"
                    onClick={() => changeChatMode("saved")}
                    className={tabButton(isDark, chatMode === "saved")}
                  >
                    Saved
                  </button>
                </div>

                <div className="mt-2">
                  <CustomSelect
                    isDark={isDark}
                    value={typeFilter}
                    placeholder="All chats"
                    options={typeFilterOptions}
                    onChange={setTypeFilter}
                    compact
                  />
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto pb-4">
                {loadingChats && chats.length === 0 ? (
                  <ChatListLoading isDark={isDark} />
                ) : !selectedAccountId ? (
                  <SideEmpty
                    isDark={isDark}
                    title="Select account"
                    text="Choose a Telegram account first."
                  />
                ) : filteredChats.length === 0 ? (
                  <SideEmpty
                    isDark={isDark}
                    title="No chats found"
                    text="Click Sync to pull Telegram dialogs."
                  />
                ) : (
                  <div className="space-y-1">
                    {filteredChats.map((chat) => (
                      <ChatListItem
                        key={chat._id}
                        chat={chat}
                        isDark={isDark}
                        active={selectedChatId === chat._id}
                        onClick={() => selectChat(chat._id)}
                        onArchive={() => archiveChat(chat._id)}
                        onUnarchive={() => unarchiveChat(chat._id)}
                        onPin={() => pinChat(chat._id)}
                        onUnpin={() => unpinChat(chat._id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </aside>

            <main
              className={`flex min-h-0 flex-col ${
                isDark ? "bg-[#202127]" : "bg-[#f4efe6]"
              }`}
            >
              {selectedChat ? (
                <>
                  <div
                    className={`flex min-h-[76px] shrink-0 items-center justify-between border-b px-5 ${
                      isDark
                        ? "border-white/[0.06] bg-[#34343c]"
                        : "border-[#eee4d5] bg-white"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="min-w-0">
                        <div
                          className={`truncate text-sm font-semibold ${
                            isDark ? "text-white" : "text-[#201d19]"
                          }`}
                        >
                          {selectedChat.isSavedMessages
                            ? "Saved Messages"
                            : selectedChat.title || "Untitled Chat"}
                        </div>

                        <div
                          className={`mt-1 flex items-center gap-2 text-xs ${
                            isDark ? "text-white/35" : "text-[#8d8375]"
                          }`}
                        >
                          <span>{formatChatStatus(selectedChat)}</span>
                          {selectedChat.username && (
                            <>
                              <span>•</span>
                              <span>@{selectedChat.username}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(true);
                          loadChatProfile(selectedChatId, true);
                          loadChatPhotos(selectedChatId, true);
                          loadChatLinks(selectedChatId, true);

                          if (selectedChat?.type === "group") {
                            loadGroupMembers(selectedChatId, true);
                          }
                        }}
                        className={iconButton(isDark)}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => loadMessages(selectedChatId, true)}
                        disabled={loadingMessages && messages.length === 0}
                        className={iconButton(isDark)}
                      >
                        {loadingMessages && messages.length === 0 ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div
                    ref={messagesContainerRef}
                    className={`min-h-0 flex-1 overflow-y-auto px-5 py-5 ${
                      isDark ? "bg-[#202127]" : "bg-[#f4efe6]"
                    }`}
                  >
                    {loadingMessages && messages.length === 0 ? (
                      <MessageLoading isDark={isDark} />
                    ) : messages.length === 0 ? (
                      <ConversationEmpty isDark={isDark} />
                    ) : (
                      <div className="space-y-3">
                        {messages.map((message) => (
                          <MessageBubble
                            key={message.id}
                            message={message}
                            chatId={selectedChatId}
                            selectedChat={selectedChat}
                            isDark={isDark}
                            busy={messageActionId === message.id}
                            editing={editingMessageId === message.id}
                            onOpenImage={openFullImage}
                            onOpenSenderProfile={openGroupMemberProfile}
                            onEdit={() => startEdit(message)}
                            onDelete={() => deleteMessage(message.id)}
                          />
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </div>

                  <form
                    onSubmit={submitMessage}
                    className={`shrink-0 border-t p-4 ${
                      isDark
                        ? "border-white/[0.06] bg-[#34343c]"
                        : "border-[#eee4d5] bg-white"
                    }`}
                  >
                    {editingMessageId && (
                      <div
                        className={`mb-3 flex items-center justify-between rounded-2xl px-4 py-2 text-xs ${
                          isDark
                            ? "bg-[#292a2f] text-white/55"
                            : "bg-[#f7f2ea] text-[#70675c]"
                        }`}
                      >
                        <span>Editing message</span>

                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="inline-flex items-center gap-1 text-[#229ED9]"
                        >
                          <X className="h-3.5 w-3.5" />
                          Cancel
                        </button>
                      </div>
                    )}

                    <div className="flex items-end gap-3">
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageSelected}
                      />

                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => openEmojiPanel("emoji")}
                          disabled={sending || sendingImage || editingMessageId}
                          className={`flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${
                            isDark
                              ? "bg-[#292a2f] text-white hover:bg-white/[0.08]"
                              : "bg-[#f7f2ea] text-[#8d8375] hover:bg-[#efe6d8]"
                          }`}
                          title="Emoji, stickers and GIFs"
                        >
                          <Smile className="h-5 w-5" />
                        </button>

                        {emojiPanelOpen && (
                          <TelegramEmojiMediaPicker
                            isDark={isDark}
                            activeTab={emojiTab}
                            setActiveTab={(tab) => {
                              setEmojiTab(tab);

                              if (tab === "gifs" && telegramGifs.length === 0) {
                                loadSavedTelegramGifs();
                              }

                              if (
                                tab === "stickers" &&
                                telegramStickers.length === 0
                              ) {
                                loadTelegramStickers(stickerEmoji);
                              }
                            }}
                            newMessage={newMessage}
                            setNewMessage={setNewMessage}
                            gifs={telegramGifs}
                            stickers={telegramStickers}
                            loading={loadingTelegramMedia}
                            stickerEmoji={stickerEmoji}
                            setStickerEmoji={setStickerEmoji}
                            onLoadStickers={loadTelegramStickers}
                            onSendPickedMedia={sendPickedTelegramMedia}
                            onClose={() => setEmojiPanelOpen(false)}
                          />
                        )}
                      </div>

                      <textarea
                        ref={messageInputRef}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onPaste={handlePasteImage}
                        rows={1}
                        placeholder={
                          editingMessageId
                            ? "Edit your message..."
                            : "Write a message..."
                        }
                        className={`max-h-[120px] min-h-[50px] flex-1 resize-none rounded-2xl border px-4 py-3 text-[16px] outline-none transition ${
                          isDark
                            ? "border-transparent bg-[#292a2f] text-white placeholder:text-white/25 focus:border-[#229ED9]/50"
                            : "border-transparent bg-[#f7f2ea] text-[#201d19] placeholder:text-[#9b9081] focus:border-[#229ED9]/60"
                        }`}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            submitMessage(e);
                          }
                        }}
                      />

                      <button
                        type="button"
                        onClick={openImagePicker}
                        disabled={sending || sendingImage || editingMessageId}
                        className={`flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${
                          isDark
                            ? "bg-[#292a2f] text-white hover:bg-white/[0.08]"
                            : "bg-[#f7f2ea] text-[#229ED9] hover:bg-[#efe6d8]"
                        }`}
                        title="Attach image"
                      >
                        <Image className="h-5 w-5" />
                      </button>

                      <button
                        type="submit"
                        disabled={sending || !newMessage.trim()}
                        className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full bg-[#229ED9] text-white transition hover:bg-[#1f8ec4] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {sending ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : editingMessageId ? (
                          <Check className="h-5 w-5" />
                        ) : (
                          <Send className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </form>

                  {profileOpen && selectedChat && (
                    <ChatProfileDrawer
                      isDark={isDark}
                      chat={selectedChat}
                      profile={chatProfile}
                      photos={chatPhotos}
                      links={chatLinks}
                      groupMembers={groupMembers}
                      inviteLink={inviteLink}
                      loadingProfile={loadingProfile}
                      loadingPhotos={loadingPhotos}
                      loadingLinks={loadingLinks}
                      loadingGroupMembers={loadingGroupMembers}
                      profileAction={profileAction}
                      groupAction={groupAction}
                      onClose={() => setProfileOpen(false)}
                      onRefresh={() => {
                        loadChatProfile(selectedChatId, false);
                        loadChatPhotos(selectedChatId, false);
                        loadChatLinks(selectedChatId, false);

                        if (selectedChat?.type === "group") {
                          loadGroupMembers(selectedChatId, false);
                        }
                      }}
                      onOpenPhotos={() => {
                        setMediaPanel("photos");
                        loadChatPhotos(selectedChatId, false);
                      }}
                      onOpenLinks={() => {
                        setMediaPanel("links");
                        loadChatLinks(selectedChatId, false);
                      }}
                      onMute={muteSelectedChat}
                      onUnmute={unmuteSelectedChat}
                      onSaveContact={openContactModal}
                      onDeleteContact={openDeleteContactModal}
                      onBlock={blockSelectedUser}
                      onUnblock={unblockSelectedUser}
                      onLoadGroupMembers={() =>
                        loadGroupMembers(selectedChatId, false)
                      }
                      onAddGroupMembers={addMembersToSelectedGroup}
                      onRemoveGroupMember={removeGroupMember}
                      onOpenMemberProfile={openGroupMemberProfile}
                      onExportInviteLink={exportSelectedGroupInviteLink}
                      onUpdateGroupTitle={updateSelectedGroupTitle}
                      onToggleGroupHistory={toggleSelectedGroupHistory}
                      onLeaveGroup={leaveSelectedGroup}
                    />
                  )}

                  {mediaPanel && selectedChat && (
                    <MediaPanel
                      isDark={isDark}
                      type={mediaPanel}
                      chat={selectedChat}
                      photos={chatPhotos}
                      links={chatLinks}
                      loadingPhotos={loadingPhotos}
                      loadingLinks={loadingLinks}
                      onOpenImage={openFullImage}
                      onClose={() => setMediaPanel("")}
                    />
                  )}

                  {contactModalOpen && selectedChat && (
                    <EditContactModal
                      isDark={isDark}
                      chat={selectedChat}
                      profile={chatProfile}
                      form={contactForm}
                      setForm={setContactForm}
                      saving={profileAction === "contact"}
                      onClose={() => setContactModalOpen(false)}
                      onSubmit={submitContactModal}
                    />
                  )}

                  {imagePreviewOpen && (
                    <ImagePreviewModal
                      isDark={isDark}
                      imageUrl={selectedImageUrl}
                      caption={imageCaption}
                      setCaption={setImageCaption}
                      sending={sendingImage}
                      onClose={closeImagePreview}
                      onSend={sendImageMessage}
                    />
                  )}

                  {fullImageOpen &&
                    fullImageData.chatId &&
                    fullImageData.messageId && (
                      <FullImageModal
                        isDark={isDark}
                        chatId={fullImageData.chatId}
                        messageId={fullImageData.messageId}
                        onClose={closeFullImage}
                      />
                    )}

                  {memberProfileOpen && (
                    <MemberProfileDrawer
                      isDark={isDark}
                      chatId={selectedChatId}
                      member={selectedMemberProfile}
                      loading={loadingMemberProfile}
                      onClose={() => {
                        setMemberProfileOpen(false);
                        setSelectedMemberProfile(null);
                      }}
                      onMessage={messageGroupMember}
                    />
                  )}

                  {deleteContactModalOpen && selectedChat && (
                    <ConfirmModal
                      isDark={isDark}
                      title="Delete contact?"
                      text={`Delete ${selectedChat.title || "this contact"} from your Telegram contacts?`}
                      dangerText="Delete"
                      loading={profileAction === "delete-contact"}
                      onClose={() => setDeleteContactModalOpen(false)}
                      onConfirm={confirmDeleteContact}
                    />
                  )}
                </>
              ) : (
                <div
                  className={`flex min-h-0 flex-1 items-center justify-center ${
                    isDark ? "bg-[#202127]" : "bg-[#f4efe6]"
                  }`}
                >
                  <div className="px-6 text-center">
                    <div
                      className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
                        isDark
                          ? "bg-white/[0.07] text-white/45"
                          : "bg-white text-[#70675c]"
                      }`}
                    >
                      <MessageCircle className="h-7 w-7" />
                    </div>

                    <div
                      className={`mt-4 text-base font-semibold ${
                        isDark ? "text-white" : "text-[#201d19]"
                      }`}
                    >
                      Select a chat
                    </div>

                    <div
                      className={`mt-2 text-sm ${
                        isDark ? "text-white/40" : "text-[#70675c]"
                      }`}
                    >
                      Choose a Telegram dialog from the left side.
                    </div>
                  </div>
                </div>
              )}
            </main>

            {createGroupOpen && (
              <CreateGroupModal
                isDark={isDark}
                form={createGroupForm}
                setForm={setCreateGroupForm}
                creating={creatingGroup}
                onClose={() => setCreateGroupOpen(false)}
                onSubmit={createGroup}
              />
            )}

            {accountPanelOpen && (
              <AccountPanel
                isDark={isDark}
                accounts={accounts}
                selectedAccountId={selectedAccountId}
                loading={loadingAccounts}
                onClose={() => setAccountPanelOpen(false)}
                onSelect={(accountId) => {
                  handleAccountChange(accountId);
                  setAccountPanelOpen(false);
                }}
                onRefresh={() => loadAccounts({ silent: false })}
              />
            )}
          </div>
        </section>
      </div>
    </Shell>
  );
}

function ImagePreviewModal({
  isDark,
  imageUrl,
  caption,
  setCaption,
  sending,
  onClose,
  onSend,
}) {
  const captionRef = useRef(null);

  useEffect(() => {
    setTimeout(() => {
      captionRef.current?.focus();
    }, 80);
  }, []);

  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/55 px-4">
      <div
        className={`w-full max-w-[560px] overflow-hidden rounded-[18px] shadow-2xl ${
          isDark ? "bg-[#202127] text-white" : "bg-white text-[#201d19]"
        }`}
      >
        <div className="flex min-h-[64px] items-center justify-between px-6">
          <div className="text-xl font-semibold">Send an image</div>

          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
              isDark
                ? "text-white/55 hover:bg-white/[0.08]"
                : "text-[#70675c] hover:bg-[#f7f2ea]"
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 pb-5">
          <div
            className={`flex h-[360px] items-center justify-center overflow-hidden rounded-[12px] ${
              isDark ? "bg-[#292a2f]" : "bg-[#f2f2f2]"
            }`}
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Selected preview"
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <div
                className={`text-sm ${
                  isDark ? "text-white/35" : "text-[#8d8375]"
                }`}
              >
                No image selected
              </div>
            )}
          </div>

          <div className="mt-5">
            <input
              ref={captionRef}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Caption"
              disabled={sending}
              className={`min-h-[50px] w-full border-b bg-transparent text-[16px] outline-none transition ${
                isDark
                  ? "border-white/15 text-white placeholder:text-white/35 focus:border-[#229ED9]"
                  : "border-[#d8d0c5] text-[#201d19] placeholder:text-[#229ED9] focus:border-[#229ED9]"
              }`}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }

                if (e.key === "Escape") {
                  e.preventDefault();
                  onClose();
                }
              }}
            />
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              className="min-h-[42px] rounded-xl px-4 text-sm font-semibold text-[#229ED9] transition hover:bg-[#229ED9]/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onSend}
              disabled={sending || !imageUrl}
              className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-[#229ED9] transition hover:bg-[#229ED9]/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending && <Loader2 className="h-4 w-4 animate-spin" />}
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TelegramMediaImage({ chatId, messageId, isDark, onOpen }) {
  const [imageUrl, setImageUrl] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl = "";

    async function loadImage() {
      try {
        setFailed(false);

        const res = await api.get(
          `/api/telegram-chats/${chatId}/media/${messageId}/download`,
          {
            responseType: "blob",
          },
        );

        objectUrl = URL.createObjectURL(res.data);
        setImageUrl(objectUrl);
      } catch (err) {
        console.error("Load Telegram image error:", err);
        setFailed(true);
      }
    }

    if (chatId && messageId) {
      loadImage();
    }

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [chatId, messageId]);

  if (failed) {
    return (
      <div
        className={`mb-2 flex h-[160px] w-[260px] items-center justify-center rounded-2xl text-sm ${
          isDark ? "bg-black/20 text-white/50" : "bg-white/50 text-[#70675c]"
        }`}
      >
        Failed to load image
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div
        className={`mb-2 flex h-[160px] w-[260px] items-center justify-center rounded-2xl text-sm ${
          isDark ? "bg-black/20 text-white/50" : "bg-white/50 text-[#70675c]"
        }`}
      >
        Loading image...
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpen?.(chatId, messageId)}
      className="mb-2 block cursor-zoom-in overflow-hidden rounded-2xl"
    >
      <img
        src={imageUrl}
        alt="Telegram media"
        className="max-h-[360px] max-w-[320px] object-contain"
      />
    </button>
  );
}

function SharedPhotoThumb({ isDark, chatId, messageId, onOpen }) {
  const [imageUrl, setImageUrl] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl = "";

    async function loadImage() {
      try {
        setFailed(false);

        const res = await api.get(
          `/api/telegram-chats/${chatId}/media/${messageId}/download`,
          {
            responseType: "blob",
          },
        );

        objectUrl = URL.createObjectURL(res.data);
        setImageUrl(objectUrl);
      } catch (err) {
        console.error("Load shared photo error:", err);
        setFailed(true);
      }
    }

    if (chatId && messageId) {
      loadImage();
    }

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [chatId, messageId]);

  return (
    <button
      type="button"
      onClick={() => {
        if (!failed) onOpen?.(chatId, messageId);
      }}
      className={`aspect-square overflow-hidden rounded-xl ${
        isDark ? "bg-white/[0.07]" : "bg-[#f7f2ea]"
      }`}
    >
      {failed ? (
        <div className="flex h-full w-full items-center justify-center text-xs opacity-50">
          Failed
        </div>
      ) : imageUrl ? (
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin opacity-50" />
        </div>
      )}
    </button>
  );
}

function FullImageModal({ isDark, chatId, messageId, onClose }) {
  const [imageUrl, setImageUrl] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl = "";

    async function loadImage() {
      try {
        setFailed(false);

        const res = await api.get(
          `/api/telegram-chats/${chatId}/media/${messageId}/download`,
          {
            responseType: "blob",
          },
        );

        objectUrl = URL.createObjectURL(res.data);
        setImageUrl(objectUrl);
      } catch (err) {
        console.error("Load full image error:", err);
        setFailed(true);
      }
    }

    if (chatId && messageId) {
      loadImage();
    }

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [chatId, messageId]);

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/85 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-5 top-5 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
      >
        <X className="h-5 w-5" />
      </button>

      <div
        className="flex max-h-full max-w-full items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {failed ? (
          <div
            className={`rounded-2xl px-6 py-5 text-sm ${
              isDark ? "bg-[#202127] text-white" : "bg-white text-[#201d19]"
            }`}
          >
            Failed to load image
          </div>
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt="Telegram full media"
            className="max-h-[92vh] max-w-[92vw] rounded-xl object-contain shadow-2xl"
          />
        ) : (
          <div className="flex h-[180px] w-[260px] items-center justify-center rounded-2xl bg-black/40 text-white">
            <Loader2 className="h-6 w-6 animate-spin opacity-70" />
          </div>
        )}
      </div>
    </div>
  );
}

function CustomSelect({
  isDark,
  value,
  onChange,
  options = [],
  placeholder = "Select option",
  emptyText = "No options",
  disabled = false,
  compact = false,
}) {
  const wrapRef = useRef(null);
  const [open, setOpen] = useState(false);

  const selectedOption = options.find(
    (option) => String(option.value) === String(value),
  );

  useEffect(() => {
    function handleClickOutside(event) {
      if (!wrapRef.current) return;

      if (!wrapRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) setOpen((prev) => !prev);
        }}
        className={`flex w-full items-center justify-between gap-2 rounded-[14px] border text-left outline-none transition ${
          compact
            ? "min-h-[38px] px-3 text-[12px]"
            : "min-h-[44px] px-4 text-[13px]"
        } ${
          disabled
            ? "cursor-not-allowed opacity-60"
            : isDark
              ? "hover:bg-white/[0.045]"
              : "hover:bg-white"
        } ${
          isDark
            ? "border-white/[0.08] bg-[#24252b] text-white focus:border-[#229ED9]/55 focus:ring-4 focus:ring-[#229ED9]/10"
            : "border-[#e8dece] bg-white text-[#201d19] focus:border-[#229ED9] focus:ring-4 focus:ring-[#229ED9]/15"
        }`}
      >
        <span
          className={`min-w-0 flex-1 truncate ${
            selectedOption
              ? isDark
                ? "text-white"
                : "text-[#201d19]"
              : isDark
                ? "text-white/35"
                : "text-[#9b9081]"
          }`}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>

        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 transition ${
            open ? "rotate-180" : ""
          } ${isDark ? "text-white/35" : "text-[#8d8375]"}`}
        />
      </button>

      {open && !disabled && (
        <div
          className={`absolute left-0 right-0 top-[calc(100%+6px)] z-[80] max-h-[230px] overflow-y-auto rounded-[16px] border p-1.5 shadow-2xl ${
            isDark
              ? "border-white/[0.08] bg-[#202127]"
              : "border-[#eee4d5] bg-white"
          }`}
        >
          {options.map((option) => {
            const active = String(option.value) === String(value);

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex min-h-[34px] w-full items-center justify-between gap-2 rounded-[12px] px-2.5 text-left text-[12px] transition ${
                  active
                    ? "bg-[#229ED9] text-white"
                    : isDark
                      ? "text-white/65 hover:bg-white/[0.06]"
                      : "text-[#201d19] hover:bg-[#f7f2ea]"
                }`}
              >
                <span className="truncate">{option.label}</span>

                {active && <Check className="h-3.5 w-3.5 shrink-0" />}
              </button>
            );
          })}

          {!options.length && (
            <div
              className={`flex min-h-[70px] items-center justify-center rounded-[12px] px-3 text-center text-[12px] ${
                isDark
                  ? "bg-white/[0.03] text-white/35"
                  : "bg-[#f7f2ea] text-[#8d8375]"
              }`}
            >
              {emptyText}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ChatListItem({
  chat,
  isDark,
  active,
  onClick,
  onArchive,
  onUnarchive,
  onPin,
  onUnpin,
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter") onClick();

        if (e.key === "Escape") {
          e.currentTarget.blur();
        }
      }}
      className={`group flex w-full cursor-pointer items-center gap-2 px-4 py-3 text-left transition outline-none focus:outline-none focus-visible:outline-none ${
        active
          ? "bg-[#229ED9] text-white"
          : isDark
            ? "text-white"
            : "text-[#201d19]"
      }`}
    >
      <ChatAvatar isDark={isDark} chat={chat} size="small" active={active} />

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          {chat.isPinned && <Pin className="h-3 w-3 shrink-0" />}

          <div className="min-w-0 flex-1 truncate text-[12px] font-medium">
            {chat.isSavedMessages
              ? "Saved Messages"
              : chat.title || "Untitled Chat"}
          </div>

          {chat.onlineStatus === "online" && (
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                active ? "bg-white" : "bg-emerald-400"
              }`}
            />
          )}

          <div className="ml-1 flex shrink-0 items-center gap-1 opacity-100 transition">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                chat.isPinned ? onUnpin() : onPin();
              }}
              className={`inline-flex h-6 w-6 items-center justify-center rounded-lg text-[11px] ${
                active
                  ? "text-white"
                  : isDark
                    ? "text-white/45 hover:bg-white/[0.06]"
                    : "text-[#70675c] hover:bg-[#efe6d8]"
              }`}
            >
              {chat.isPinned ? (
                <PinOff className="h-3 w-3" />
              ) : (
                <Pin className="h-3 w-3" />
              )}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                chat.isArchived ? onUnarchive() : onArchive();
              }}
              className={`inline-flex h-6 w-6 items-center justify-center rounded-lg text-[11px] ${
                active
                  ? "text-white"
                  : isDark
                    ? "text-white/45 hover:bg-white/[0.06]"
                    : "text-[#70675c] hover:bg-[#efe6d8]"
              }`}
            >
              {chat.isArchived ? (
                <ArchiveRestore className="h-3 w-3" />
              ) : (
                <Archive className="h-3 w-3" />
              )}
            </button>
          </div>
        </div>

        <div
          className={`mt-0.5 truncate text-[11px] ${
            active
              ? "text-white/75"
              : isDark
                ? "text-white/35"
                : "text-[#8d8375]"
          }`}
        >
          {formatChatPreview(chat)}
        </div>
      </div>
    </div>
  );
}

function MemberProfileDrawer({
  isDark,
  chatId,
  member,
  loading,
  onClose,
  onMessage,
}) {
  const name = getMemberDisplayName(member);

  return (
    <div className="fixed inset-0 z-[160] flex justify-end bg-black/35">
      <div
        className={`h-full w-full max-w-[390px] overflow-y-auto shadow-2xl ${
          isDark ? "bg-[#202127] text-white" : "bg-white text-[#201d19]"
        }`}
      >
        <div
          className={`sticky top-0 z-10 flex min-h-[56px] items-center justify-between border-b px-4 ${
            isDark
              ? "border-white/[0.07] bg-[#34343c]"
              : "border-[#eee4d5] bg-white"
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className={iconButton(isDark)}
          >
            <X className="h-4 w-4" />
          </button>

          <div className="text-sm font-semibold">Profile</div>

          <div className="h-10 w-10" />
        </div>

        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin opacity-50" />
          </div>
        ) : (
          <>
            <div className="px-5 pb-7 pt-9 text-center">
              <div
                className="relative mx-auto flex h-[112px] w-[112px] items-center justify-center overflow-hidden rounded-full text-[34px] font-semibold text-white"
                style={{
                  background: getSenderAvatarBackground({
                    sender: member,
                    fromId: member?.id,
                  }),
                }}
              >
                {member?.hasPhoto ? (
                  <img
                    src={getMemberPhotoUrl(chatId, member.id)}
                    alt=""
                    className="absolute inset-0 z-[2] h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : null}

                <span className="relative z-[1]">
                  {getMemberInitials(member)}
                </span>
              </div>

              <div className="mt-6 text-xl font-semibold">{name}</div>

              <div
                className={`mt-2 text-base ${
                  isDark ? "text-white/40" : "text-[#8d8375]"
                }`}
              >
                {member?.onlineStatus || "unknown"}
              </div>

              {member?.username && (
                <div className="mt-5 text-base text-[#229ED9]">
                  @{member.username}
                </div>
              )}

              <div className="mt-8 grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={() => onMessage(member)}
                  className={`flex min-h-[72px] flex-col items-center justify-center gap-2 rounded-2xl text-sm font-semibold ${
                    isDark
                      ? "bg-white/[0.06] text-white hover:bg-white/[0.09]"
                      : "bg-[#f4efe6] text-[#201d19] hover:bg-[#eee6da]"
                  }`}
                >
                  <MessageCircle className="h-6 w-6" />
                  Message
                </button>
              </div>
            </div>

            <div
              className={`border-y ${
                isDark ? "border-white/[0.07]" : "border-[#eee4d5]"
              }`}
            >
              <div className="flex items-center gap-4 px-6 py-4">
                <User className={isDark ? "text-white/45" : "text-[#8d8375]"} />

                <div className="min-w-0">
                  <div className="truncate text-base">
                    {member?.username ? `@${member.username}` : "No username"}
                  </div>

                  <div
                    className={`mt-1 text-sm ${
                      isDark ? "text-white/35" : "text-[#8d8375]"
                    }`}
                  >
                    Username
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`border-b ${
                isDark ? "border-white/[0.07]" : "border-[#eee4d5]"
              }`}
            >
              <div className="flex items-center gap-4 px-6 py-4">
                <Phone
                  className={isDark ? "text-white/45" : "text-[#8d8375]"}
                />

                <div className="min-w-0">
                  <div className="truncate text-base">
                    {member?.phone || "Hidden"}
                  </div>

                  <div
                    className={`mt-1 text-sm ${
                      isDark ? "text-white/35" : "text-[#8d8375]"
                    }`}
                  >
                    Phone
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-5">
              <div
                className={`rounded-3xl border p-4 ${
                  isDark ? "border-white/[0.07]" : "border-[#eee4d5]"
                }`}
              >
                <div className="text-sm font-semibold">Details</div>

                <div
                  className={`mt-3 space-y-2 text-sm ${
                    isDark ? "text-white/55" : "text-[#70675c]"
                  }`}
                >
                  <div>ID: {member?.id || "-"}</div>
                  <div>Premium: {member?.premium ? "Yes" : "No"}</div>
                  <div>Bot: {member?.bot ? "Yes" : "No"}</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  chatId,
  selectedChat,
  isDark,
  busy,
  editing,
  onOpenImage,
  onOpenSenderProfile,
  onEdit,
  onDelete,
}) {
  if (message.isService) {
    return (
      <div className="flex justify-center">
        <div
          className={`max-w-[80%] rounded-full px-3.5 py-1.5 text-center text-[13px] font-medium leading-5 shadow-sm ${
            isDark ? "bg-white/[0.10] text-white/70" : "bg-[#78b98f] text-white"
          }`}
        >
          {message.message}
        </div>
      </div>
    );
  }
  const isMine = !!message.out;
  const canModify = isMine;
  const senderName = getSenderDisplayName(message);
  const showSenderInfo = selectedChat?.type === "group" && !isMine;

  return (
    <div
      className={`group flex items-end gap-2 ${
        isMine ? "justify-end" : "justify-start"
      }`}
    >
      {showSenderInfo && (
        <button
          type="button"
          onClick={() => {
            if (selectedChat?.type === "group" && message?.sender?.id) {
              onOpenSenderProfile?.(message.sender);
            }
          }}
          className="relative mb-1 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-[11px] font-bold text-white shadow-sm"
          style={{
            background: getSenderAvatarBackground(message),
          }}
          title={senderName}
        >
          <span className="relative z-[1]">{getSenderInitials(message)}</span>

          {selectedChat?.type === "group" && message?.sender?.id ? (
            <img
              src={getMemberPhotoUrl(chatId, message.sender.id)}
              alt=""
              className="absolute inset-0 z-[2] h-full w-full rounded-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : null}
        </button>
      )}

      {canModify && (
        <MessageActions
          isDark={isDark}
          busy={busy}
          editing={editing}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}

      <div
        className={`max-w-[78%] rounded-[22px] px-4 py-3 ${
          isMine
            ? editing
              ? "rounded-br-md bg-[#1f8ec4] text-white ring-2 ring-white/40"
              : "rounded-br-md bg-[#229ED9] text-white"
            : isDark
              ? "rounded-bl-md bg-[#34343c] text-white"
              : "rounded-bl-md bg-white text-[#201d19]"
        }`}
      >
        {showSenderInfo && senderName && (
          <div className="mb-1 text-xs font-semibold text-[#229ED9]">
            {senderName}
          </div>
        )}

        {message.hasMedia && message.mediaType === "photo" && (
          <TelegramMediaImage
            chatId={chatId}
            messageId={message.id}
            isDark={isDark}
            onOpen={onOpenImage}
          />
        )}

        {message.message ? (
          <div className="whitespace-pre-wrap break-words text-sm leading-6">
            {message.message}
          </div>
        ) : message.hasMedia ? null : (
          <div className="whitespace-pre-wrap break-words text-sm leading-6">
            [Unsupported message]
          </div>
        )}

        <div
          className={`mt-1 flex items-center justify-end gap-1 text-[11px] ${
            isMine
              ? "text-white/70"
              : isDark
                ? "text-white/35"
                : "text-[#8d8375]"
          }`}
        >
          <span>{formatMessageTime(message.date)}</span>

          {isMine && <CheckCircle2 className="h-3 w-3" />}
        </div>
      </div>
    </div>
  );
}

function EditContactModal({
  isDark,
  chat,
  profile,
  form,
  setForm,
  saving,
  onClose,
  onSubmit,
}) {
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/45 px-4">
      <form
        onSubmit={onSubmit}
        className={`w-full max-w-[520px] overflow-hidden rounded-[26px] shadow-2xl ${
          isDark ? "bg-[#202127] text-white" : "bg-white text-[#201d19]"
        }`}
      >
        <div className="px-7 pt-6">
          <div className="text-xl font-semibold">Edit contact</div>

          <div className="mt-8 flex items-center gap-6">
            <ProfileAvatar isDark={isDark} chat={chat} />

            <div className="min-w-0">
              <div className="truncate text-xl font-semibold">
                {chat.title || "Telegram User"}
              </div>
              <div
                className={`mt-1 text-sm ${
                  isDark ? "text-white/40" : "text-[#9b9081]"
                }`}
              >
                {profile?.phone ? profile.phone : "Mobile hidden"}
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-5">
            <FloatingInput
              isDark={isDark}
              label="First name"
              value={form.firstName}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, firstName: value }))
              }
              autoFocus
            />

            <FloatingInput
              isDark={isDark}
              label="Last name"
              value={form.lastName}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, lastName: value }))
              }
            />

            <FloatingInput
              isDark={isDark}
              label="Note"
              value={form.note}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, note: value }))
              }
              placeholder="Notes are only visible to you."
            />
          </div>
        </div>

        <div
          className={`mt-7 border-t px-7 py-4 ${
            isDark ? "border-white/[0.07]" : "border-[#eee4d5]"
          }`}
        >
          <div className="space-y-4 text-[#229ED9]">
            <button type="button" className="block text-left text-sm">
              Suggest Date of Birth
            </button>
            <button type="button" className="block text-left text-sm">
              Suggest Photo for {chat.title || "this user"}
            </button>
            <button type="button" className="block text-left text-sm">
              Set Photo for {chat.title || "this user"}
            </button>
          </div>
        </div>

        <div
          className={`border-t px-7 py-4 text-sm ${
            isDark
              ? "border-white/[0.07] text-white/35"
              : "border-[#eee4d5] text-[#9b9081]"
          }`}
        >
          You can replace this contact&apos;s photo with another photo that only
          you will see.
        </div>

        <div className="flex items-center justify-between px-7 py-5">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-[#229ED9]"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving || !form.firstName.trim()}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#229ED9] disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Done
          </button>
        </div>
      </form>
    </div>
  );
}

function FloatingInput({
  isDark,
  label,
  value,
  onChange,
  placeholder,
  autoFocus,
}) {
  return (
    <label className="block">
      <div
        className={`mb-1 text-sm font-semibold ${
          value ? "text-[#229ED9]" : isDark ? "text-white/35" : "text-[#9b9081]"
        }`}
      >
        {label}
      </div>

      <input
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`min-h-[44px] w-full border-b bg-transparent text-[16px] outline-none ${
          isDark
            ? "border-white/[0.12] text-white placeholder:text-white/25 focus:border-[#229ED9]"
            : "border-[#ddd2c1] text-[#201d19] placeholder:text-[#9b9081] focus:border-[#229ED9]"
        }`}
      />
    </label>
  );
}

function ConfirmModal({
  isDark,
  title,
  text,
  dangerText = "Delete",
  loading,
  onClose,
  onConfirm,
}) {
  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/45 px-4">
      <div
        className={`w-full max-w-[390px] rounded-[24px] p-6 shadow-2xl ${
          isDark ? "bg-[#202127] text-white" : "bg-white text-[#201d19]"
        }`}
      >
        <div className="text-lg font-semibold">{title}</div>

        <div
          className={`mt-2 text-sm leading-6 ${
            isDark ? "text-white/45" : "text-[#70675c]"
          }`}
        >
          {text}
        </div>

        <div className="mt-6 flex justify-end gap-4">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-[#229ED9]"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center gap-2 text-sm font-semibold text-red-500 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {dangerText}
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateGroupModal({
  isDark,
  form,
  setForm,
  creating,
  onClose,
  onSubmit,
}) {
  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/45 px-4">
      <form
        onSubmit={onSubmit}
        className={`w-full max-w-[520px] overflow-hidden rounded-[26px] shadow-2xl ${
          isDark ? "bg-[#202127] text-white" : "bg-white text-[#201d19]"
        }`}
      >
        <div className="px-7 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xl font-semibold">Create group</div>
              <div
                className={`mt-1 text-sm ${
                  isDark ? "text-white/40" : "text-[#70675c]"
                }`}
              >
                Create a Telegram group.
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className={iconButton(isDark)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-5 space-y-5">
            <FloatingInput
              isDark={isDark}
              label="Group title"
              value={form.title}
              onChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  title: value,
                }))
              }
              autoFocus
            />

            <FloatingInput
              isDark={isDark}
              label="About"
              value={form.about}
              onChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  about: value,
                }))
              }
              placeholder="Optional group description"
            />

            <label className="block">
              <div
                className={`mb-1 text-sm font-semibold ${
                  form.users
                    ? "text-[#229ED9]"
                    : isDark
                      ? "text-white/35"
                      : "text-[#9b9081]"
                }`}
              >
                Members
              </div>

              <textarea
                value={form.users}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    users: e.target.value,
                  }))
                }
                placeholder="@username1, @username2 or one per line"
                rows={5}
                className={`min-h-[120px] w-full resize-none rounded-2xl border px-4 py-3 text-[16px] outline-none ${
                  isDark
                    ? "border-white/[0.12] bg-[#292a2f] text-white placeholder:text-white/25 focus:border-[#229ED9]"
                    : "border-[#ddd2c1] bg-[#f7f2ea] text-[#201d19] placeholder:text-[#9b9081] focus:border-[#229ED9]"
                }`}
              />
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between px-7 py-5">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-[#229ED9]"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={creating || !form.title.trim()}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#229ED9] disabled:opacity-50"
          >
            {creating && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </button>
        </div>
      </form>
    </div>
  );
}

function MessageActions({ isDark, busy, editing, onEdit, onDelete }) {
  return (
    <div className="hidden shrink-0 items-center gap-1 pb-1 group-hover:flex">
      <button
        type="button"
        onClick={onEdit}
        disabled={busy}
        className={`inline-flex h-8 items-center gap-1 rounded-xl px-2 text-[11px] transition ${
          editing
            ? "bg-[#229ED9] text-white"
            : isDark
              ? "text-white/55"
              : "text-[#70675c]"
        }`}
      >
        <Edit3 className="h-3 w-3" />
      </button>

      <button
        type="button"
        onClick={onDelete}
        disabled={busy}
        className={`inline-flex h-8 items-center gap-1 rounded-xl px-2 text-[11px] transition ${
          isDark ? "text-red-200" : "text-red-500"
        }`}
      >
        {busy ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Trash2 className="h-3 w-3" />
        )}
      </button>
    </div>
  );
}

function ManageMembersPanel({
  isDark,
  chat,
  members,
  inviteLink,
  loadingMembers,
  groupAction,
  onBack,
  onLoadMembers,
  onAddMembers,
  onRemoveMember,
  onExportInviteLink,
}) {
  const [usersText, setUsersText] = useState(() =>
    getRememberedValue(`tg:addMembers:${chat?._id}`, ""),
  );

  useEffect(() => {
    if (chat?._id) {
      rememberValue(`tg:addMembers:${chat._id}`, usersText);
    }
  }, [chat?._id, usersText]);

  return (
    <div className="min-h-full px-5 py-5">
      <div className="mb-5 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-semibold text-[#229ED9]"
        >
          Back
        </button>

        <div className="font-semibold">Manage members</div>

        <button
          type="button"
          onClick={onLoadMembers}
          className={iconButton(isDark)}
        >
          {loadingMembers ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className="rounded-3xl border border-[#eee4d5] p-4">
        <div className="mb-2 text-sm font-semibold">Add members</div>

        <textarea
          value={usersText}
          onChange={(e) => setUsersText(e.target.value)}
          rows={4}
          placeholder="@username1, @username2 or one per line"
          className={`min-h-[100px] w-full resize-none rounded-2xl border px-4 py-3 text-[16px] outline-none ${
            isDark
              ? "border-white/[0.12] bg-[#292a2f] text-white placeholder:text-white/25"
              : "border-[#ddd2c1] bg-[#f7f2ea] text-[#201d19] placeholder:text-[#9b9081]"
          }`}
        />

        <button
          type="button"
          onClick={async () => {
            await onAddMembers(usersText);
            setUsersText("");
            if (chat?._id) rememberValue(`tg:addMembers:${chat._id}`, "");
          }}
          disabled={groupAction === "add-members" || !usersText.trim()}
          className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#229ED9] disabled:opacity-50"
        >
          {groupAction === "add-members" && (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          Add members
        </button>
      </div>

      <div className="mt-4 rounded-3xl border border-[#eee4d5] p-4">
        <button
          type="button"
          onClick={onExportInviteLink}
          disabled={groupAction === "invite-link"}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#229ED9] disabled:opacity-50"
        >
          {groupAction === "invite-link" && (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          Export invite link
        </button>

        {inviteLink && (
          <div
            className={`mt-3 break-all rounded-2xl px-3 py-2 text-xs ${
              isDark
                ? "bg-white/[0.05] text-white/55"
                : "bg-[#f7f2ea] text-[#70675c]"
            }`}
          >
            {inviteLink}
          </div>
        )}
      </div>

      <div className="mt-5">
        <div className="mb-2 font-semibold">Members</div>

        {loadingMembers && members.length === 0 ? (
          <div
            className={
              isDark ? "text-sm text-white/35" : "text-sm text-[#8d8375]"
            }
          >
            Loading members...
          </div>
        ) : members.length === 0 ? (
          <div
            className={
              isDark ? "text-sm text-white/35" : "text-sm text-[#8d8375]"
            }
          >
            No members loaded yet.
          </div>
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className={`flex items-center justify-between gap-3 rounded-2xl px-3 py-2 ${
                  isDark ? "bg-white/[0.05]" : "bg-[#f7f2ea]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onOpenMemberProfile?.(member)}
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-2xl text-left"
                >
                  <div
                    className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold text-white"
                    style={{
                      background: getSenderAvatarBackground({
                        sender: member,
                        fromId: member.id,
                      }),
                    }}
                  >
                    {member.hasPhoto ? (
                      <img
                        src={getMemberPhotoUrl(chat?._id, member)}
                        alt=""
                        className="absolute inset-0 z-[2] h-full w-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : null}

                    <span className="relative z-[1]">
                      {getMemberInitials(member)}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">
                      {getMemberDisplayName(member)}
                    </div>

                    <div
                      className={`truncate text-xs ${
                        isDark ? "text-white/35" : "text-[#8d8375]"
                      }`}
                    >
                      {member.username ? `@${member.username}` : "member"}
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onRemoveGroupMember(member.id)}
                  disabled={groupAction === `remove:${member.id}`}
                  className="text-red-500 disabled:opacity-50"
                >
                  {groupAction === `remove:${member.id}` ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GroupSettingsPanel({
  isDark,
  chat,
  profile,
  groupTitle,
  setGroupTitle,
  groupAction,
  onBack,
  onUpdateGroupTitle,
  onToggleGroupHistory,
  onLeaveGroup,
}) {
  return (
    <div className="min-h-full px-5 py-5">
      <div className="mb-5 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-semibold text-[#229ED9]"
        >
          Back
        </button>

        <div className="font-semibold">Group settings</div>

        <div className="h-10 w-10" />
      </div>

      <div
        className={`rounded-3xl border p-4 ${
          isDark ? "border-white/[0.07]" : "border-[#eee4d5]"
        }`}
      >
        <div className="mb-1 text-base font-semibold">Group title</div>

        <div
          className={`mb-4 text-sm ${
            isDark ? "text-white/40" : "text-[#8d8375]"
          }`}
        >
          Change the group name.
        </div>

        <input
          value={groupTitle}
          onChange={(e) => setGroupTitle(e.target.value)}
          className={`min-h-[50px] w-full border-b bg-transparent text-[16px] outline-none ${
            isDark
              ? "border-white/15 text-white"
              : "border-[#d8d0c5] text-[#201d19]"
          }`}
        />

        <button
          type="button"
          onClick={() => onUpdateGroupTitle(groupTitle)}
          disabled={groupAction === "title" || !groupTitle.trim()}
          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#229ED9] disabled:opacity-50"
        >
          {groupAction === "title" && (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          Save title
        </button>
      </div>

      <div
        className={`mt-4 rounded-3xl border p-4 ${
          isDark ? "border-white/[0.07]" : "border-[#eee4d5]"
        }`}
      >
        <div className="mb-3 text-base font-semibold">Chat history</div>

        <HistoryVisibilityRow
          isDark={isDark}
          hidden={
            !!(
              profile?.historyHiddenForNewMembers ||
              chat?.historyHiddenForNewMembers
            )
          }
          busy={groupAction === "history"}
          onChange={onToggleGroupHistory}
        />
      </div>

      <div
        className={`mt-4 rounded-3xl border p-4 ${
          isDark ? "border-white/[0.07]" : "border-[#eee4d5]"
        }`}
      >
        <button
          type="button"
          onClick={onLeaveGroup}
          disabled={groupAction === "leave"}
          className="inline-flex items-center gap-2 text-sm font-semibold text-red-500 disabled:opacity-50"
        >
          {groupAction === "leave" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          Leave group
        </button>
      </div>
    </div>
  );
}

function ChatProfileDrawer({
  isDark,
  chat,
  profile,
  photos,
  links,
  groupMembers = [],
  inviteLink = "",
  loadingProfile,
  loadingPhotos,
  onToggleGroupHistory,

  onOpenPhotos,
  onOpenLinks,
  loadingLinks,
  loadingGroupMembers,
  profileAction,
  groupAction,
  onClose,
  onRefresh,
  onMute,
  onUnmute,
  onSaveContact,
  onDeleteContact,
  onBlock,
  onUnblock,
  onLoadGroupMembers,
  onAddGroupMembers,
  onRemoveGroupMember,
  onOpenMemberProfile,
  onExportInviteLink,
  onUpdateGroupTitle,
  onLeaveGroup,
}) {
  const displayName = profile?.title || chat?.title || "Telegram User";

  const username = profile?.username || chat?.username || "";
  const isMuted = !!(profile?.isMuted || chat?.isMuted);
  const isBlocked = !!(profile?.isBlocked || chat?.isBlocked);
  const isContact = !!(profile?.isContact || chat?.isContact);
  const canContact = chat?.type === "private" || chat?.type === "bot";
  const isGroup = chat?.type === "group";

  const [drawerPage, setDrawerPage] = useState("profile");
  const [groupTitle, setGroupTitle] = useState(chat?.title || "");

  useEffect(() => {
    setGroupTitle(chat?.title || "");
    setDrawerPage("profile");
  }, [chat?._id, chat?.title]);

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/35">
      <div
        className={`flex h-full w-full max-w-[390px] flex-col overflow-hidden shadow-2xl ${
          isDark ? "bg-[#202127] text-white" : "bg-white text-[#201d19]"
        }`}
      >
        <div
          className={`shrink-0 flex min-h-[56px] items-center justify-between border-b px-4 ${
            isDark
              ? "border-white/[0.07] bg-[#34343c]"
              : "border-[#eee4d5] bg-white"
          }`}
        >
          <button
            type="button"
            onClick={
              drawerPage === "members"
                ? () => setDrawerPage("profile")
                : onClose
            }
            className={iconButton(isDark)}
          >
            <X className="h-4 w-4" />
          </button>

          <div className="text-sm font-semibold">
            {drawerPage === "members"
              ? "Manage members"
              : drawerPage === "settings"
                ? "Group settings"
                : "Profile"}
          </div>

          <button
            type="button"
            onClick={drawerPage === "members" ? onLoadGroupMembers : onRefresh}
            className={iconButton(isDark)}
          >
            {(
              drawerPage === "members" ? loadingGroupMembers : loadingProfile
            ) ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          <div
            className="flex h-full w-[300%] transition-transform duration-300 ease-out"
            style={{
              transform:
                drawerPage === "members"
                  ? "translateX(-33.3333%)"
                  : drawerPage === "settings"
                    ? "translateX(-66.6666%)"
                    : "translateX(0%)",
            }}
          >
            <div className="h-full w-1/3 shrink-0 overflow-y-auto">
              <div className="px-5 py-6 text-center">
                <ProfileAvatar isDark={isDark} chat={chat} />

                <div className="mt-4 text-base font-semibold">
                  {chat?.isSavedMessages ? "Saved Messages" : displayName}
                </div>

                <div
                  className={`mt-1 text-sm ${
                    isDark ? "text-white/45" : "text-[#70675c]"
                  }`}
                >
                  {formatChatStatus(profile || chat)}
                </div>

                {username && (
                  <div className="mt-3 text-sm text-[#229ED9]">@{username}</div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 px-5">
                <ProfileTopButton
                  isDark={isDark}
                  icon={MessageCircle}
                  label="Message"
                  onClick={onClose}
                />

                <ProfileTopButton
                  isDark={isDark}
                  icon={isMuted ? Bell : BellOff}
                  label={isMuted ? "Unmute" : "Mute"}
                  busy={profileAction === "mute" || profileAction === "unmute"}
                  onClick={isMuted ? onUnmute : onMute}
                />

                <ProfileTopButton
                  isDark={isDark}
                  icon={MoreHorizontal}
                  label="Refresh"
                  onClick={onRefresh}
                />
              </div>

              <div
                className={`mt-5 border-y ${
                  isDark ? "border-white/[0.07]" : "border-[#eee4d5]"
                }`}
              >
                {username && (
                  <ProfileInfoRow
                    isDark={isDark}
                    icon={User}
                    title={`@${username}`}
                    text="Username"
                  />
                )}

                {profile?.phone && (
                  <ProfileInfoRow
                    isDark={isDark}
                    icon={Phone}
                    title={profile.phone}
                    text="Phone"
                  />
                )}

                {!username && !profile?.phone && (
                  <ProfileInfoRow
                    isDark={isDark}
                    icon={User}
                    title={chat?.type || "Unknown"}
                    text="Chat type"
                  />
                )}
              </div>

              <div
                className={`mt-3 border-y ${
                  isDark ? "border-white/[0.07]" : "border-[#eee4d5]"
                }`}
              >
                <ProfileClickableRow
                  isDark={isDark}
                  icon={Image}
                  title={`${photos.length} photos`}
                  text={loadingPhotos ? "Loading photos..." : "Shared media"}
                  onClick={onOpenPhotos}
                />

                <ProfileClickableRow
                  isDark={isDark}
                  icon={Link}
                  title={`${links.length} shared links`}
                  text={loadingLinks ? "Loading links..." : "Shared links"}
                  onClick={onOpenLinks}
                />
              </div>

              {isGroup && (
                <>
                  <div className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => {
                        setDrawerPage("members");
                        onLoadGroupMembers?.();
                      }}
                      className={`flex w-full items-center justify-between rounded-3xl px-4 py-4 text-left ${
                        isDark ? "bg-white/[0.05]" : "bg-[#f7f2ea]"
                      }`}
                    >
                      <div>
                        <div className="font-semibold">Manage members</div>
                        <div
                          className={`mt-1 text-sm ${
                            isDark ? "text-white/40" : "text-[#8d8375]"
                          }`}
                        >
                          Add members, invite link, members list
                        </div>
                      </div>

                      <Users className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="px-5 pb-4">
                    <button
                      type="button"
                      onClick={() => setDrawerPage("settings")}
                      className={`flex w-full items-center justify-between rounded-3xl px-4 py-4 text-left ${
                        isDark ? "bg-white/[0.05]" : "bg-[#f7f2ea]"
                      }`}
                    >
                      <div>
                        <div className="font-semibold">Group settings</div>
                        <div
                          className={`mt-1 text-sm ${
                            isDark ? "text-white/40" : "text-[#8d8375]"
                          }`}
                        >
                          Edit title, history visibility, leave group
                        </div>
                      </div>

                      <Edit3 className="h-5 w-5" />
                    </button>
                  </div>
                </>
              )}

              <div
                className={`mt-3 border-y ${
                  isDark ? "border-white/[0.07]" : "border-[#eee4d5]"
                }`}
              >
                {canContact && (
                  <ProfileActionRow
                    isDark={isDark}
                    icon={isContact ? Edit3 : UserPlus}
                    title={isContact ? "Edit contact" : "Add contact"}
                    busy={profileAction === "contact"}
                    onClick={onSaveContact}
                  />
                )}

                {canContact && isContact && (
                  <ProfileActionRow
                    isDark={isDark}
                    icon={UserMinus}
                    title="Delete contact"
                    busy={profileAction === "delete-contact"}
                    onClick={onDeleteContact}
                  />
                )}

                {canContact && (
                  <ProfileActionRow
                    isDark={isDark}
                    icon={ShieldOff}
                    title={isBlocked ? "Unblock user" : "Block user"}
                    danger={!isBlocked}
                    busy={
                      profileAction === "block" || profileAction === "unblock"
                    }
                    onClick={isBlocked ? onUnblock : onBlock}
                  />
                )}
              </div>
            </div>

            <div className="h-full w-1/3 shrink-0 overflow-y-auto">
              <ManageMembersPanel
                isDark={isDark}
                chat={chat}
                members={groupMembers}
                inviteLink={inviteLink}
                loadingMembers={loadingGroupMembers}
                groupAction={groupAction}
                onBack={() => setDrawerPage("profile")}
                onLoadMembers={onLoadGroupMembers}
                onAddMembers={onAddGroupMembers}
                onRemoveMember={onRemoveGroupMember}
                onExportInviteLink={onExportInviteLink}
              />
            </div>

            <div className="h-full w-1/3 shrink-0 overflow-y-auto">
              <GroupSettingsPanel
                isDark={isDark}
                chat={chat}
                profile={profile}
                groupTitle={groupTitle}
                setGroupTitle={setGroupTitle}
                groupAction={groupAction}
                onBack={() => setDrawerPage("profile")}
                onUpdateGroupTitle={onUpdateGroupTitle}
                onToggleGroupHistory={onToggleGroupHistory}
                onLeaveGroup={onLeaveGroup}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GroupManageSection({
  isDark,
  chat,
  members,
  inviteLink,
  loadingMembers,
  groupAction,
  onLoadMembers,
  onAddMembers,
  onRemoveMember,
  onExportInviteLink,
  onUpdateTitle,
  onToggleHistory,
  onLeaveGroup,
}) {
  const [title, setTitle] = useState(chat?.title || "");
  const [usersText, setUsersText] = useState(() => {
    return getRememberedValue(`tg:addMembers:${chat?._id || ""}`, "");
  });

  useEffect(() => {
    setTitle(chat?.title || "");
  }, [chat?.title]);

  useEffect(() => {
    if (!chat?._id) return;
    rememberValue(`tg:addMembers:${chat._id}`, usersText);
  }, [chat?._id, usersText]);

  return (
    <div
      className={`mt-3 border-y px-5 py-4 ${
        isDark ? "border-white/[0.07]" : "border-[#eee4d5]"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Group tools</div>
          <div
            className={`mt-1 text-xs ${
              isDark ? "text-white/35" : "text-[#8d8375]"
            }`}
          >
            {members.length} cached members
          </div>
        </div>

        <button
          type="button"
          onClick={onLoadMembers}
          disabled={loadingMembers}
          className={iconButton(isDark)}
        >
          {loadingMembers ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className="mt-4">
        <FloatingInput
          isDark={isDark}
          label="Group title"
          value={title}
          onChange={setTitle}
        />

        <button
          type="button"
          onClick={() => onUpdateTitle(title)}
          disabled={groupAction === "title" || !title.trim()}
          className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#229ED9] disabled:opacity-50"
        >
          {groupAction === "title" && (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          Save title
        </button>
      </div>

      <div className="mt-5">
        <label className="block">
          <div
            className={`mb-1 text-sm font-semibold ${
              usersText
                ? "text-[#229ED9]"
                : isDark
                  ? "text-white/35"
                  : "text-[#9b9081]"
            }`}
          >
            Add members
          </div>

          <textarea
            value={usersText}
            onChange={(e) => setUsersText(e.target.value)}
            placeholder="@username1, @username2 or one per line"
            rows={4}
            className={`min-h-[100px] w-full resize-none rounded-2xl border px-4 py-3 text-[16px] outline-none ${
              isDark
                ? "border-white/[0.12] bg-[#292a2f] text-white placeholder:text-white/25 focus:border-[#229ED9]"
                : "border-[#ddd2c1] bg-[#f7f2ea] text-[#201d19] placeholder:text-[#9b9081] focus:border-[#229ED9]"
            }`}
          />
        </label>

        <button
          type="button"
          onClick={async () => {
            await onAddMembers(usersText);
            setUsersText("");
            if (chat?._id) rememberValue(`tg:addMembers:${chat._id}`, "");
          }}
          disabled={groupAction === "add-members" || !usersText.trim()}
          className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#229ED9] disabled:opacity-50"
        >
          {groupAction === "add-members" && (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          Add members
        </button>
      </div>

      <div className="mt-5">
        <button
          type="button"
          onClick={onExportInviteLink}
          disabled={groupAction === "invite-link"}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#229ED9] disabled:opacity-50"
        >
          {groupAction === "invite-link" && (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          Export invite link
        </button>

        {inviteLink && (
          <div
            className={`mt-2 break-all rounded-2xl px-3 py-2 text-xs ${
              isDark
                ? "bg-white/[0.05] text-white/55"
                : "bg-[#f7f2ea] text-[#70675c]"
            }`}
          >
            {inviteLink}
          </div>
        )}
      </div>

      <HistoryVisibilityRow
        isDark={isDark}
        hidden={!!chat?.historyHiddenForNewMembers}
        loading={groupAction === "history"}
        onSave={onToggleHistory}
      />

      <div className="mt-5">
        <div className="mb-2 text-sm font-semibold">Members</div>

        {loadingMembers && members.length === 0 ? (
          <div
            className={
              isDark ? "text-sm text-white/35" : "text-sm text-[#8d8375]"
            }
          >
            Loading members...
          </div>
        ) : members.length === 0 ? (
          <div
            className={
              isDark ? "text-sm text-white/35" : "text-sm text-[#8d8375]"
            }
          >
            No members loaded yet.
          </div>
        ) : (
          <div className="max-h-[220px] space-y-1 overflow-y-auto">
            {members.map((member) => (
              <div
                key={member.id}
                className={`flex items-center justify-between gap-2 rounded-2xl px-3 py-2 ${
                  isDark ? "bg-white/[0.04]" : "bg-[#f7f2ea]"
                }`}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {`${member.firstName || ""} ${member.lastName || ""}`.trim() ||
                      member.username ||
                      member.id}
                  </div>

                  <div
                    className={`truncate text-xs ${
                      isDark ? "text-white/35" : "text-[#8d8375]"
                    }`}
                  >
                    {member.username ? `@${member.username}` : member.id}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onRemoveMember(member.username || member.id)}
                  disabled={groupAction === `remove:${member.id}`}
                  className="text-xs font-semibold text-red-500 disabled:opacity-50"
                >
                  {groupAction === `remove:${member.id}` ? "..." : "Remove"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onLeaveGroup}
        disabled={groupAction === "leave"}
        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-red-500 disabled:opacity-50"
      >
        {groupAction === "leave" && (
          <Loader2 className="h-4 w-4 animate-spin" />
        )}
        Leave group
      </button>
    </div>
  );
}

function HistoryVisibilityRow({ isDark, hidden, loading, onSave }) {
  const [open, setOpen] = useState(false);
  const [draftHidden, setDraftHidden] = useState(hidden);

  useEffect(() => {
    setDraftHidden(hidden);
  }, [hidden]);

  async function handleSave() {
    await onSave(draftHidden);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={loading}
        className={`mt-5 flex min-h-[56px] w-full items-center justify-between gap-3 rounded-2xl px-4 text-left transition ${
          isDark
            ? "bg-white/[0.04] text-white hover:bg-white/[0.07]"
            : "bg-[#f7f2ea] text-[#201d19] hover:bg-[#f1e8db]"
        } disabled:opacity-60`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <MessageCircle
            className={`h-5 w-5 shrink-0 ${
              isDark ? "text-white/45" : "text-[#70675c]"
            }`}
          />

          <div className="min-w-0">
            <div className="truncate text-sm font-medium">
              Chat history for new members
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 text-sm font-medium text-[#229ED9]">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {hidden ? "Hidden" : "Visible"}
        </div>
      </button>

      {open && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/45 px-5">
          <div
            className={`w-full max-w-[480px] rounded-[14px] px-6 py-6 shadow-2xl ${
              isDark ? "bg-[#202127] text-white" : "bg-white text-[#201d19]"
            }`}
          >
            <div className="text-xl font-semibold">
              Chat history for new members
            </div>

            <div className="mt-7 space-y-5">
              <button
                type="button"
                onClick={() => setDraftHidden(false)}
                className="flex w-full gap-4 text-left"
              >
                <RadioCircle active={!draftHidden} />

                <div className="min-w-0">
                  <div className="text-base font-medium">Visible</div>
                  <div
                    className={`mt-1 text-sm leading-6 ${
                      isDark ? "text-white/40" : "text-[#8d8375]"
                    }`}
                  >
                    New members will see messages that were sent before they
                    joined.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDraftHidden(true)}
                className="flex w-full gap-4 text-left"
              >
                <RadioCircle active={draftHidden} />

                <div className="min-w-0">
                  <div className="text-base font-medium">Hidden</div>
                  <div
                    className={`mt-1 text-sm leading-6 ${
                      isDark ? "text-white/40" : "text-[#8d8375]"
                    }`}
                  >
                    New members won&apos;t see earlier messages.
                  </div>
                </div>
              </button>
            </div>

            <div className="mt-8 flex justify-end gap-8">
              <button
                type="button"
                onClick={() => {
                  setDraftHidden(hidden);
                  setOpen(false);
                }}
                className="text-sm font-semibold text-[#229ED9]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={loading}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#229ED9] disabled:opacity-50"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function RadioCircle({ active }) {
  return (
    <span
      className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
        active ? "border-[#35A8E0]" : "border-[#a8a8a8]"
      }`}
    >
      {active && <span className="h-3.5 w-3.5 rounded-full bg-[#35A8E0]" />}
    </span>
  );
}

function ChatAvatar({ isDark, chat, size = "small", active = false }) {
  const [failed, setFailed] = useState(false);

  const apiBase = API_BASE_URL;

  const dimension = size === "large" ? "h-[112px] w-[112px]" : "h-11 w-11";
  const textSize = size === "large" ? "text-[34px]" : "text-[16px]";

  const shouldTryPhoto = !!chat?._id && chat.hasPhoto !== false && !failed;

  const photoUrl = chat?._id
    ? `${apiBase}/api/telegram-chats/${chat._id}/profile-photo`
    : "";

  if (shouldTryPhoto && photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        loading="lazy"
        className={`${dimension} shrink-0 rounded-full object-cover`}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      className={`${dimension} ${textSize} flex shrink-0 items-center justify-center rounded-full font-semibold text-white`}
      style={{
        background: getChatAvatarBackground(chat),
      }}
      title={getChatDisplayTitle(chat)}
    >
      {getChatInitials(chat)}
    </div>
  );
}

function AccountPanel({
  isDark,
  accounts,
  selectedAccountId,
  loading,
  onClose,
  onSelect,
  onRefresh,
}) {
  return (
    <div className="fixed inset-0 z-[140] flex justify-end bg-black/35">
      <div
        className={`h-full w-full max-w-[390px] overflow-y-auto shadow-2xl ${
          isDark ? "bg-[#202127] text-white" : "bg-white text-[#201d19]"
        }`}
      >
        <div
          className={`sticky top-0 z-10 flex min-h-[56px] items-center justify-between border-b px-4 ${
            isDark
              ? "border-white/[0.07] bg-[#34343c]"
              : "border-[#eee4d5] bg-white"
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className={iconButton(isDark)}
          >
            <X className="h-4 w-4" />
          </button>

          <div className="text-sm font-semibold">Telegram accounts</div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className={iconButton(isDark)}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </button>
        </div>

        <div className="p-3">
          {accounts.length === 0 ? (
            <div
              className={`rounded-[20px] p-6 text-center text-sm ${
                isDark
                  ? "bg-white/[0.04] text-white/40"
                  : "bg-[#f7f2ea] text-[#70675c]"
              }`}
            >
              No Telegram accounts found.
            </div>
          ) : (
            <div className="space-y-2">
              {accounts.map((account) => {
                const active = account._id === selectedAccountId;
                const connected =
                  account.isConnected && account.status === "connected";

                return (
                  <button
                    key={account._id}
                    type="button"
                    onClick={() => onSelect(account._id)}
                    className={`flex min-h-[68px] w-full items-center gap-3 rounded-[18px] px-4 text-left transition ${
                      active
                        ? "bg-[#229ED9] text-white"
                        : isDark
                          ? "bg-white/[0.045] text-white hover:bg-white/[0.07]"
                          : "bg-[#f7f2ea] text-[#201d19] hover:bg-[#efe6d8]"
                    }`}
                  >
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                        active
                          ? "bg-white/20 text-white"
                          : isDark
                            ? "bg-white/[0.08] text-white/50"
                            : "bg-white text-[#70675c]"
                      }`}
                    >
                      <User className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">
                        {account.label?.trim() || "Telegram Account"}
                      </div>

                      <div
                        className={`mt-1 truncate text-xs ${
                          active
                            ? "text-white/75"
                            : isDark
                              ? "text-white/35"
                              : "text-[#8d8375]"
                        }`}
                      >
                        {account.phoneNumber || "No phone number"}
                      </div>
                    </div>

                    <div
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                        connected ? "bg-emerald-400" : "bg-red-400"
                      }`}
                    />

                    {active && <Check className="h-4 w-4 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TelegramEmojiMediaPicker({
  isDark,
  activeTab,
  setActiveTab,
  newMessage,
  setNewMessage,
  gifs,
  stickers,
  loading,
  stickerEmoji,
  setStickerEmoji,
  onLoadStickers,
  onSendPickedMedia,
  onClose,
}) {
  return (
    <div
      className={`absolute bottom-[60px] left-0 z-50 w-[360px] overflow-hidden rounded-[18px] border shadow-2xl ${
        isDark
          ? "border-white/[0.08] bg-[#292a2f]"
          : "border-[#e8dece] bg-white"
      }`}
    >
      <div
        className={`flex border-b ${
          isDark ? "border-white/[0.08]" : "border-[#eee4d5]"
        }`}
      >
        {[
          { key: "emoji", label: "Emoji" },
          { key: "stickers", label: "Stickers" },
          { key: "gifs", label: "GIFs" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`h-[48px] flex-1 text-sm font-semibold transition ${
              activeTab === tab.key
                ? "border-b-2 border-[#229ED9] text-[#229ED9]"
                : isDark
                  ? "text-white/45 hover:text-white"
                  : "text-[#8d8375] hover:text-[#201d19]"
            }`}
          >
            {tab.label}
          </button>
        ))}

        <button
          type="button"
          onClick={onClose}
          className={`w-[44px] text-sm ${
            isDark ? "text-white/45 hover:text-white" : "text-[#8d8375]"
          }`}
        >
          ×
        </button>
      </div>

      {activeTab === "emoji" && (
        <div className="h-[390px] overflow-hidden">
          <EmojiPicker
            width="100%"
            height={390}
            theme={isDark ? "dark" : "light"}
            searchDisabled={false}
            previewConfig={{ showPreview: false }}
            onEmojiClick={(emojiData) => {
              setNewMessage((prev) => `${prev}${emojiData.emoji}`);
            }}
          />
        </div>
      )}

      {activeTab === "stickers" && (
        <div className="h-[390px] overflow-y-auto p-3">
          <div className="mb-3 flex gap-2">
            <input
              value={stickerEmoji}
              onChange={(e) => setStickerEmoji(e.target.value)}
              placeholder="Emoji"
              className={`min-h-[38px] flex-1 rounded-xl border px-3 text-sm outline-none ${
                isDark
                  ? "border-white/[0.08] bg-[#202127] text-white"
                  : "border-[#eee4d5] bg-[#f7f2ea] text-[#201d19]"
              }`}
            />

            <button
              type="button"
              onClick={() => onLoadStickers(stickerEmoji)}
              className="rounded-xl bg-[#229ED9] px-4 text-sm font-semibold text-white"
            >
              Search
            </button>
          </div>

          {loading ? (
            <PickerLoading isDark={isDark} />
          ) : stickers.length === 0 ? (
            <PickerEmpty isDark={isDark} text="No stickers found" />
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {stickers.map((item) => (
                <button
                  key={item.pickId}
                  type="button"
                  onClick={() => onSendPickedMedia(item.pickId)}
                  className={`aspect-square overflow-hidden rounded-xl border p-1 transition hover:scale-[1.03] ${
                    isDark
                      ? "border-white/[0.08] bg-[#202127]"
                      : "border-[#eee4d5] bg-[#f7f2ea]"
                  }`}
                >
                  <TelegramMediaThumb item={item} label="sticker" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "gifs" && (
        <div className="h-[390px] overflow-y-auto p-3">
          {loading ? (
            <PickerLoading isDark={isDark} />
          ) : gifs.length === 0 ? (
            <PickerEmpty isDark={isDark} text="No saved GIFs found" />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {gifs.map((item) => (
                <button
                  key={item.pickId}
                  type="button"
                  onClick={() => onSendPickedMedia(item.pickId)}
                  className={`aspect-video overflow-hidden rounded-xl border transition hover:scale-[1.02] ${
                    isDark
                      ? "border-white/[0.08] bg-[#202127]"
                      : "border-[#eee4d5] bg-[#f7f2ea]"
                  }`}
                >
                  <TelegramMediaThumb item={item} label="gif" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TelegramMediaThumb({ item, label = "media" }) {
  const src = getTelegramMediaPreviewUrl(item?.previewUrl);
  const mimeType = String(item?.mimeType || "").toLowerCase();

  if (!src) {
    return (
      <div className="flex h-full w-full items-center justify-center text-xs opacity-50">
        No preview
      </div>
    );
  }

  // Telegram animated sticker: .tgs
  if (
    mimeType.includes("x-tgsticker") ||
    mimeType.includes("application/x-tgsticker")
  ) {
    return <TgsStickerPreview src={src} />;
  }

  // Telegram video sticker / animated GIF style document
  if (mimeType.includes("video")) {
    return (
      <video
        src={src}
        className="h-full w-full object-contain"
        autoPlay
        loop
        muted
        playsInline
      />
    );
  }

  // Static sticker / GIF / photo
  if (
    mimeType.includes("image") ||
    mimeType.includes("webp") ||
    mimeType.includes("gif")
  ) {
    return (
      <img src={src} alt={label} className="h-full w-full object-contain" />
    );
  }

  // Try image anyway before giving up
  return (
    <img
      src={src}
      alt={label}
      className="h-full w-full object-contain"
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
    />
  );
}

function TgsStickerPreview({ src }) {
  const [animationData, setAnimationData] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadTgs() {
      try {
        const res = await fetch(src);

        if (!res.ok) {
          throw new Error("Failed to load TGS sticker");
        }

        const arrayBuffer = await res.arrayBuffer();
        const compressed = new Uint8Array(arrayBuffer);

        // Telegram .tgs files are gzipped Lottie JSON
        const jsonText = pako.ungzip(compressed, { to: "string" });
        const json = JSON.parse(jsonText);

        if (!cancelled) {
          setAnimationData(json);
        }
      } catch (err) {
        console.error("TGS sticker preview error:", err);

        if (!cancelled) {
          setFailed(true);
        }
      }
    }

    loadTgs();

    return () => {
      cancelled = true;
    };
  }, [src]);

  if (failed) {
    return (
      <div className="flex h-full w-full items-center justify-center text-xs opacity-60">
        sticker
      </div>
    );
  }

  if (!animationData) {
    return (
      <div className="flex h-full w-full items-center justify-center text-xs opacity-50">
        ...
      </div>
    );
  }

  return (
    <Lottie
      animationData={animationData}
      loop
      autoplay
      style={{
        width: "100%",
        height: "100%",
      }}
    />
  );
}

function PickerLoading({ isDark }) {
  return (
    <div
      className={`flex h-full items-center justify-center text-sm ${
        isDark ? "text-white/45" : "text-[#8d8375]"
      }`}
    >
      Loading...
    </div>
  );
}

function PickerEmpty({ isDark, text }) {
  return (
    <div
      className={`flex h-full items-center justify-center text-sm ${
        isDark ? "text-white/45" : "text-[#8d8375]"
      }`}
    >
      {text}
    </div>
  );
}

function ProfileAvatar({ isDark, chat }) {
  return (
    <div className="flex justify-center">
      <ChatAvatar isDark={isDark} chat={chat} size="large" />
    </div>
  );
}

function ProfileClickableRow({ isDark, icon: Icon, title, text, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[64px] w-full items-center gap-4 px-5 text-left transition ${
        isDark ? "hover:bg-white/[0.05]" : "hover:bg-[#f7f2ea]"
      }`}
    >
      <Icon
        className={`h-5 w-5 shrink-0 ${
          isDark ? "text-white/45" : "text-[#70675c]"
        }`}
      />

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm">{title}</div>

        <div
          className={`mt-1 text-xs ${
            isDark ? "text-white/35" : "text-[#8d8375]"
          }`}
        >
          {text}
        </div>
      </div>

      <ChevronDown
        className={`h-4 w-4 -rotate-90 ${
          isDark ? "text-white/30" : "text-[#9b9081]"
        }`}
      />
    </button>
  );
}

function MediaPanel({
  isDark,
  type,
  chat,
  photos,
  links,
  loadingPhotos,
  loadingLinks,
  onOpenImage,
  onClose,
}) {
  const isPhotos = type === "photos";
  const title = isPhotos ? "Shared Photos" : "Shared Links";
  const loading = isPhotos ? loadingPhotos : loadingLinks;
  const items = isPhotos ? photos : links;

  return (
    <div className="fixed inset-0 z-[120] flex justify-end bg-black/40">
      <div
        className={`h-full w-full max-w-[430px] overflow-y-auto shadow-2xl ${
          isDark ? "bg-[#202127] text-white" : "bg-white text-[#201d19]"
        }`}
      >
        <div
          className={`sticky top-0 z-10 flex min-h-[56px] items-center justify-between border-b px-4 ${
            isDark
              ? "border-white/[0.07] bg-[#34343c]"
              : "border-[#eee4d5] bg-white"
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className={iconButton(isDark)}
          >
            <X className="h-4 w-4" />
          </button>

          <div className="text-sm font-semibold">{title}</div>

          <div className="h-10 w-10" />
        </div>

        {loading && items.length === 0 ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin opacity-50" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-[240px] items-center justify-center px-6 text-center">
            <div>
              <div
                className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${
                  isDark
                    ? "bg-white/[0.07] text-white/45"
                    : "bg-[#f7f2ea] text-[#70675c]"
                }`}
              >
                {isPhotos ? (
                  <Image className="h-6 w-6" />
                ) : (
                  <Link className="h-6 w-6" />
                )}
              </div>

              <div className="mt-4 text-sm font-semibold">
                No {isPhotos ? "photos" : "links"} found
              </div>
            </div>
          </div>
        ) : isPhotos ? (
          <div className="grid grid-cols-3 gap-1 p-2">
            {items.map((item) => (
              <SharedPhotoThumb
                key={item.id}
                isDark={isDark}
                chatId={chat._id}
                messageId={item.id}
                onOpen={onOpenImage}
              />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-black/5">
            {items.map((item) => {
              const url = extractFirstUrl(item.message);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (url) window.open(url, "_blank", "noopener,noreferrer");
                  }}
                  className={`flex w-full gap-3 px-5 py-4 text-left transition ${
                    isDark ? "hover:bg-white/[0.05]" : "hover:bg-[#f7f2ea]"
                  }`}
                >
                  <Link className="mt-0.5 h-5 w-5 shrink-0 text-[#229ED9]" />

                  <div className="min-w-0 flex-1">
                    <div className="break-words text-sm">
                      {url || item.message || "Shared link"}
                    </div>

                    {item.date && (
                      <div
                        className={`mt-1 text-xs ${
                          isDark ? "text-white/35" : "text-[#8d8375]"
                        }`}
                      >
                        {new Date(item.date).toLocaleString()}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function extractFirstUrl(text = "") {
  const match = String(text).match(/https?:\/\/[^\s]+/i);
  return match ? match[0] : "";
}

function ProfileTopButton({ isDark, icon: Icon, label, busy, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`flex min-h-[72px] flex-col items-center justify-center gap-2 rounded-2xl text-sm transition ${
        isDark
          ? "bg-white/[0.055] text-white/75 hover:bg-white/[0.08]"
          : "bg-[#f7f2ea] text-[#201d19] hover:bg-[#efe6d8]"
      } disabled:opacity-60`}
    >
      {busy ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <Icon className="h-5 w-5" />
      )}

      <span>{label}</span>
    </button>
  );
}

function ProfileInfoRow({ isDark, icon: Icon, title, text }) {
  return (
    <div className="flex min-h-[64px] items-center gap-4 px-5">
      <Icon
        className={`h-5 w-5 shrink-0 ${
          isDark ? "text-white/45" : "text-[#70675c]"
        }`}
      />

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm">{title}</div>

        <div
          className={`mt-1 text-xs ${
            isDark ? "text-white/35" : "text-[#8d8375]"
          }`}
        >
          {text}
        </div>
      </div>
    </div>
  );
}

function ProfileActionRow({
  isDark,
  icon: Icon,
  title,
  danger,
  busy,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`flex min-h-[58px] w-full items-center gap-4 px-5 text-left transition ${
        danger
          ? "text-red-500 hover:bg-red-500/10"
          : isDark
            ? "text-white/80 hover:bg-white/[0.05]"
            : "text-[#201d19] hover:bg-[#f7f2ea]"
      } disabled:opacity-60`}
    >
      {busy ? (
        <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
      ) : (
        <Icon className="h-5 w-5 shrink-0" />
      )}

      <span className="text-sm">{title}</span>
    </button>
  );
}

function tabButton(isDark, active) {
  if (active) {
    return "min-h-[34px] rounded-[12px] bg-[#229ED9] px-2 text-[11px] font-semibold text-white transition";
  }

  return `min-h-[34px] rounded-[12px] px-2 text-[11px] font-medium transition ${
    isDark
      ? "bg-white/[0.055] text-white/45 hover:bg-white/[0.08]"
      : "bg-white text-[#70675c] hover:bg-[#efe6d8]"
  }`;
}

function ChatListLoading({ isDark }) {
  return (
    <div className="flex min-h-[180px] items-center justify-center">
      <div className="text-center">
        <Loader2
          className={`mx-auto h-6 w-6 animate-spin ${
            isDark ? "text-white/40" : "text-[#746b61]"
          }`}
        />

        <div
          className={`mt-3 text-sm ${
            isDark ? "text-white/40" : "text-[#70675c]"
          }`}
        >
          Loading chats
        </div>
      </div>
    </div>
  );
}

function MessageLoading({ isDark }) {
  return (
    <div className="flex min-h-full items-center justify-center">
      <div className="text-center">
        <Loader2
          className={`mx-auto h-6 w-6 animate-spin ${
            isDark ? "text-white/40" : "text-[#746b61]"
          }`}
        />

        <div
          className={`mt-3 text-sm ${
            isDark ? "text-white/40" : "text-[#70675c]"
          }`}
        >
          Loading messages
        </div>
      </div>
    </div>
  );
}

function SideEmpty({ isDark, title, text }) {
  return (
    <div
      className={`p-5 text-center ${
        isDark ? "bg-white/[0.04]" : "bg-[#f7f2ea]"
      }`}
    >
      <div
        className={`text-sm font-medium ${
          isDark ? "text-white" : "text-[#201d19]"
        }`}
      >
        {title}
      </div>

      <div
        className={`mt-2 text-xs leading-5 ${
          isDark ? "text-white/38" : "text-[#70675c]"
        }`}
      >
        {text}
      </div>
    </div>
  );
}

function ConversationEmpty({ isDark }) {
  return (
    <div className="flex min-h-full items-center justify-center">
      <div className="text-center">
        <div
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${
            isDark ? "bg-white/[0.07] text-white/45" : "bg-white text-[#70675c]"
          }`}
        >
          <MessageCircle className="h-6 w-6" />
        </div>

        <div
          className={`mt-4 text-sm font-semibold ${
            isDark ? "text-white" : "text-[#201d19]"
          }`}
        >
          No messages loaded
        </div>

        <div
          className={`mt-2 text-xs ${
            isDark ? "text-white/38" : "text-[#70675c]"
          }`}
        >
          Try refreshing this chat.
        </div>
      </div>
    </div>
  );
}

function primarySmallButton() {
  return "inline-flex min-h-[34px] items-center justify-center gap-1.5 rounded-[12px] bg-[#d8c49a] px-3 text-[12px] font-medium text-[#171717] transition hover:bg-[#e4d1a9] disabled:cursor-not-allowed disabled:opacity-60";
}

function secondaryButton(isDark) {
  return `inline-flex min-h-[34px] items-center justify-center gap-1.5 rounded-[12px] px-3 text-[12px] font-normal transition ${
    isDark
      ? "bg-white/[0.055] text-white/55 hover:bg-white/[0.08]"
      : "bg-white text-[#70675c] hover:bg-[#efe6d8]"
  } disabled:cursor-not-allowed disabled:opacity-60`;
}

function iconButton(isDark) {
  return `inline-flex h-10 w-10 items-center justify-center rounded-2xl transition ${
    isDark
      ? "bg-white/[0.06] text-white/50 hover:bg-white/[0.1]"
      : "bg-[#f7f2ea] text-[#70675c] hover:bg-[#efe6d8]"
  } disabled:opacity-60`;
}

function formatMessageTime(value) {
  if (!value) return "";

  const date = new Date(Number(value) * 1000);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatChatStatus(chat) {
  if (!chat) return "";

  if (chat.isBlocked) return "last seen a long time ago";

  if (chat.onlineStatus === "online") return "online";
  if (chat.onlineStatus === "offline") return "offline";
  if (chat.onlineStatus === "recently") return "last seen recently";
  if (chat.onlineStatus === "last_week") return "last seen within a week";
  if (chat.onlineStatus === "last_month") return "last seen within a month";
  if (chat.onlineStatus === "long_time_ago") return "last seen a long time ago";

  if (chat.lastSeenAt) {
    const date = new Date(chat.lastSeenAt);

    if (!Number.isNaN(date.getTime())) {
      return `last seen ${date.toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    }
  }

  return chat.type || "unknown";
}

function formatChatPreview(chat) {
  if (!chat) return "";

  const latestMessage = String(chat.latestMessage || "").trim();

  if (latestMessage) {
    return latestMessage;
  }

  return formatChatStatus(chat);
}
