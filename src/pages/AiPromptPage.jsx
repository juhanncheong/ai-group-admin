import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Loader2,
  MessageCircle,
  MessageSquareText,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  Wand2,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import Shell from "../components/Shell";
import { api } from "../api";
import { useTheme } from "../context/ThemeContext";

const CACHE_KEYS = {
  form: "aiCampaignStudio.form.v1",
  accounts: "aiCampaignStudio.accounts.v1",
  chats: "aiCampaignStudio.chats.v1",
};

const MODE_OPTIONS = [
  {
    value: "campaign",
    title: "Campaign Broadcast",
    description:
      "Send announcements, promos, reminders, and product updates to selected chats or groups.",
    icon: Send,
  },
  {
    value: "group_chat",
    title: "Group Discussion",
    description:
      "Create a scheduled team-style discussion in one shared group using selected authorized accounts.",
    icon: MessageCircle,
  },
];

const TONE_OPTIONS = [
  { value: "friendly", label: "Friendly" },
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual" },
  { value: "short", label: "Short" },
  { value: "sales", label: "Sales" },
  { value: "warm", label: "Warm" },
];

const LANGUAGE_OPTIONS = [
  { value: "english", label: "English" },
  { value: "malay", label: "Malay" },
  { value: "chinese", label: "Chinese" },
  { value: "english_chinese", label: "English + Chinese" },
  { value: "indonesian", label: "Indonesian" },
];

const NATURALNESS_OPTIONS = [
  { value: "clean", label: "Clean" },
  { value: "casual_light", label: "Casual Light" },
  { value: "casual_mixed", label: "Casual Mixed" },
  { value: "very_casual", label: "Very Casual" },
];

const GAP_STRATEGY_OPTIONS = [
  { value: "fixed_random", label: "Fixed Random" },
  { value: "ai_natural", label: "AI Natural" },
  { value: "conversation_realistic", label: "Conversation Realistic" },
];

const CAMPAIGN_SPEED_OPTIONS = [
  { value: "quick", label: "Quick · 2-5 min" },
  { value: "normal", label: "Normal · 4-10 min" },
  { value: "slow", label: "Slow · 6-15 min" },
];

const GROUP_CHAT_SPEED_OPTIONS = [
  { value: "tight", label: "Tight · 1-2 min" },
  { value: "normal", label: "Normal · 1-4 min" },
  { value: "slow", label: "Slow · 2-6 min" },
];

const CAMPAIGN_PROMPT_TEMPLATE_OPTIONS = [
  { value: "custom", label: "Custom Campaign Prompt", prompt: "" },
  {
    value: "product_promo",
    label: "Product Promo",
    prompt:
      "Create a Telegram campaign for {{productName}}. Mention the price {{price}} and make people reply if interested.",
  },
  {
    value: "announcement",
    label: "Announcement",
    prompt:
      "Create a clear Telegram announcement about {{topic}}. Keep it natural and easy to understand.",
  },
  {
    value: "friendly_follow_up",
    label: "Friendly Follow-up",
    prompt:
      "Create friendly Telegram follow-up messages about {{topic}} without sounding pushy.",
  },
  {
    value: "payment_reminder",
    label: "Payment Reminder",
    prompt:
      "Create polite Telegram payment reminder messages about {{topic}}. Keep it respectful and clear.",
  },
  {
    value: "limited_offer",
    label: "Limited Offer",
    prompt:
      "Create Telegram campaign messages for a limited offer about {{topic}}. Make it urgent but not spammy.",
  },
];

const GROUP_CHAT_PROMPT_TEMPLATE_OPTIONS = [
  { value: "custom", label: "Custom Chit Chat Topic", prompt: "" },
  {
    value: "morning_wishes",
    label: "Morning Wishes",
    prompt:
      "Create a natural group discussion where selected accounts greet each other in the morning. Make it casual and not robotic.",
  },
  {
    value: "morning_breakfast",
    label: "Morning Breakfast",
    prompt:
      "Create a natural group discussion about doing breakfast. Include casual short replies, but do not make every message slang.",
  },
  {
    value: "work_discussion",
    label: "Work Discussion",
    prompt:
      "Create a natural group discussion about today's work. Make the accounts talk casually like teammates.",
  },
  {
    value: "group_assignment",
    label: "Group Assignment Discussion",
    prompt:
      "Create a natural group discussion about a group assignment. Make it sound like people planning tasks together.",
  },
  {
    value: "dinner",
    label: "Dinner",
    prompt:
      "Create a natural group discussion about dinner plans. Make it relaxed and casual.",
  },
  {
    value: "entertainment",
    label: "Entertainment",
    prompt:
      "Create a natural group discussion about entertainment, shows, games, or movies. Make it casual and human.",
  },
];

function readCache(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeCache(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore localStorage errors
  }
}

function getAccountIdFromChat(chat) {
  return typeof chat.telegramAccountId === "object"
    ? chat.telegramAccountId?._id
    : chat.telegramAccountId;
}

function getAccountLabel(account) {
  return account?.label || account?.phoneNumber || "Telegram Account";
}

function formatDateTime(dateValue) {
  if (!dateValue) return "Not set";

  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateValue));
  } catch {
    return "Invalid date";
  }
}

function getTimelineTimes(startDateValue, items) {
  const start = startDateValue ? new Date(startDateValue) : new Date();

  if (Number.isNaN(start.getTime())) {
    return items.map(() => "--:--");
  }

  let current = new Date(start);

  return items.map((item, index) => {
    const label = new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(current);

    if (index < items.length - 1) {
      const gap = Number(item.gapAfterMinutes) || 0;
      current = new Date(current.getTime() + gap * 60 * 1000);
    }

    return label;
  });
}

function getEstimatedDuration(items) {
  const total = items.reduce(
    (sum, item) => sum + (Number(item.gapAfterMinutes) || 0),
    0,
  );
  if (total <= 0) return "Instant";
  if (total < 60) return `${total} min`;

  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

export default function AiPromptPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const cachedForm = readCache(CACHE_KEYS.form, {});
  const cachedAccounts = readCache(CACHE_KEYS.accounts, []);
  const cachedChats = readCache(CACHE_KEYS.chats, []);

  const [mode, setMode] = useState(cachedForm.mode || "campaign");
  const [promptTemplate, setPromptTemplate] = useState(
    cachedForm.promptTemplate || "custom",
  );
  const [tone, setTone] = useState(cachedForm.tone || "friendly");
  const [language, setLanguage] = useState(cachedForm.language || "english");
  const [naturalnessLevel, setNaturalnessLevel] = useState(
    cachedForm.naturalnessLevel || "casual_mixed",
  );
  const [casualShortFormRatio, setCasualShortFormRatio] = useState(
    cachedForm.casualShortFormRatio ?? 0.35,
  );
  const [gapStrategy, setGapStrategy] = useState(
    cachedForm.gapStrategy || "ai_natural",
  );
  const [gapSpeedMode, setGapSpeedMode] = useState(
    cachedForm.gapSpeedMode || "normal",
  );
  const [messageCount, setMessageCount] = useState(
    cachedForm.messageCount || 10,
  );
  const [prompt, setPrompt] = useState(
    cachedForm.prompt || "Topic about doing breakfast",
  );
  const [sendAt, setSendAt] = useState(cachedForm.sendAt || "");
  const [requireApproval, setRequireApproval] = useState(
    typeof cachedForm.requireApproval === "boolean"
      ? cachedForm.requireApproval
      : true,
  );

  const [accounts, setAccounts] = useState(
    Array.isArray(cachedAccounts) ? cachedAccounts : [],
  );
  const [chats, setChats] = useState(
    Array.isArray(cachedChats) ? cachedChats : [],
  );
  const [selectedAccountIds, setSelectedAccountIds] = useState(
    Array.isArray(cachedForm.selectedAccountIds)
      ? cachedForm.selectedAccountIds
      : [],
  );
  const [selectedChatKeys, setSelectedChatKeys] = useState(
    Array.isArray(cachedForm.selectedChatKeys)
      ? cachedForm.selectedChatKeys
      : [],
  );
  const [selectedGroupKeys, setSelectedGroupKeys] = useState(
    Array.isArray(cachedForm.selectedGroupKeys)
      ? cachedForm.selectedGroupKeys
      : [],
  );

  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingStudioData, setLoadingStudioData] = useState(false);
  const [studioDataLoaded, setStudioDataLoaded] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [creating, setCreating] = useState(false);

  const [preview, setPreview] = useState(null);
  const [previewItems, setPreviewItems] = useState([]);
  const [checkedPreviewIndexes, setCheckedPreviewIndexes] = useState([]);
  const [result, setResult] = useState(null);

  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false);
  const [targetDrawerOpen, setTargetDrawerOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [accountSearch, setAccountSearch] = useState("");
  const [targetSearch, setTargetSearch] = useState("");
  const [accountDrawerMode, setAccountDrawerMode] = useState("select");
  const promptTextareaRef = useRef(null);

  const pageLocked = loadingStudioData || !studioDataLoaded;
  const isGroupChatMode = mode === "group_chat";

  const promptTemplateOptions = isGroupChatMode
    ? GROUP_CHAT_PROMPT_TEMPLATE_OPTIONS
    : CAMPAIGN_PROMPT_TEMPLATE_OPTIONS;

  const selectedAccounts = useMemo(() => {
    return accounts.filter((account) =>
      selectedAccountIds.includes(account._id),
    );
  }, [accounts, selectedAccountIds]);

  const speakerLabels = useMemo(() => {
    return selectedAccounts.map((account, index) => ({
      accountSlot: index + 1,
      accountId: account._id,
      label: getAccountLabel(account),
    }));
  }, [selectedAccounts]);

  const activeChatsForSelectedAccounts = useMemo(() => {
    if (!selectedAccountIds.length) return [];

    return chats.filter((chat) =>
      selectedAccountIds.includes(getAccountIdFromChat(chat)),
    );
  }, [chats, selectedAccountIds]);

  const targetChatOptions = useMemo(() => {
    if (isGroupChatMode) return [];

    const map = new Map();

    activeChatsForSelectedAccounts
      .filter((chat) => !["group", "supergroup"].includes(chat.type))
      .forEach((chat) => {
        const key = String(chat.chatId || chat.username || chat._id);
        const accountId = getAccountIdFromChat(chat);

        if (!map.has(key)) {
          map.set(key, {
            chatKey: key,
            title: chat.title || chat.username || "Telegram chat",
            username: chat.username,
            type: chat.type,
            chatId: chat.chatId,
            accountIds: [],
            docs: [],
          });
        }

        const item = map.get(key);
        item.docs.push(chat);

        if (accountId && !item.accountIds.includes(accountId)) {
          item.accountIds.push(accountId);
        }
      });

    return Array.from(map.values()).filter((chat) => {
      if (!selectedAccountIds.length) return false;
      return selectedAccountIds.every((accountId) =>
        chat.accountIds.includes(accountId),
      );
    });
  }, [activeChatsForSelectedAccounts, selectedAccountIds, isGroupChatMode]);

  const targetGroupOptions = useMemo(() => {
    const map = new Map();

    activeChatsForSelectedAccounts
      .filter((chat) => ["group", "supergroup"].includes(chat.type))
      .forEach((group) => {
        const key = String(group.chatId || group._id);
        const accountId = getAccountIdFromChat(group);

        if (!map.has(key)) {
          map.set(key, {
            groupKey: key,
            title: group.title || group.username || "Telegram group",
            type: group.type,
            chatId: group.chatId,
            accountIds: [],
            docs: [],
          });
        }

        const item = map.get(key);
        item.docs.push(group);

        if (accountId && !item.accountIds.includes(accountId)) {
          item.accountIds.push(accountId);
        }
      });

    return Array.from(map.values()).filter((group) => {
      if (!selectedAccountIds.length) return false;
      return selectedAccountIds.every((accountId) =>
        group.accountIds.includes(accountId),
      );
    });
  }, [activeChatsForSelectedAccounts, selectedAccountIds]);

  const selectedGroupIds = useMemo(() => {
    const ids = [];

    targetGroupOptions.forEach((group) => {
      if (!selectedGroupKeys.includes(group.groupKey)) return;

      group.docs.forEach((doc) => {
        const accountId = getAccountIdFromChat(doc);

        if (selectedAccountIds.includes(accountId)) {
          ids.push(doc._id);
        }
      });
    });

    return ids;
  }, [targetGroupOptions, selectedGroupKeys, selectedAccountIds]);

  const selectedChatIds = useMemo(() => {
    const ids = [];

    targetChatOptions.forEach((chat) => {
      if (!selectedChatKeys.includes(chat.chatKey)) return;

      chat.docs.forEach((doc) => {
        const accountId = getAccountIdFromChat(doc);

        if (selectedAccountIds.includes(accountId)) {
          ids.push(doc._id);
        }
      });
    });

    return ids;
  }, [targetChatOptions, selectedChatKeys, selectedAccountIds]);

  const filteredAccounts = useMemo(() => {
    const q = accountSearch.trim().toLowerCase();
    if (!q) return accounts;

    return accounts.filter((account) => {
      return (
        String(account.label || "")
          .toLowerCase()
          .includes(q) ||
        String(account.phoneNumber || "")
          .toLowerCase()
          .includes(q) ||
        String(account.status || "")
          .toLowerCase()
          .includes(q)
      );
    });
  }, [accounts, accountSearch]);

  const filteredChats = useMemo(() => {
    const q = targetSearch.trim().toLowerCase();
    if (!q) return targetChatOptions;

    return targetChatOptions.filter((chat) => {
      return (
        String(chat.title || "")
          .toLowerCase()
          .includes(q) ||
        String(chat.username || "")
          .toLowerCase()
          .includes(q) ||
        String(chat.type || "")
          .toLowerCase()
          .includes(q)
      );
    });
  }, [targetChatOptions, targetSearch]);

  const filteredGroups = useMemo(() => {
    const q = targetSearch.trim().toLowerCase();
    if (!q) return targetGroupOptions;

    return targetGroupOptions.filter((group) => {
      return (
        String(group.title || "")
          .toLowerCase()
          .includes(q) ||
        String(group.type || "")
          .toLowerCase()
          .includes(q)
      );
    });
  }, [targetGroupOptions, targetSearch]);

  const selectedTargetCount =
    selectedChatKeys.length + selectedGroupKeys.length;
  const previewMessages = useMemo(
    () => previewItems.map((item) => item.text),
    [previewItems],
  );
  const allPreviewChecked =
    previewItems.length > 0 &&
    checkedPreviewIndexes.length === previewItems.length;
  const estimatedDuration = useMemo(
    () => getEstimatedDuration(previewItems),
    [previewItems],
  );

  const allVisibleGroupsSelected =
    filteredGroups.length > 0 &&
    filteredGroups.every((group) => selectedGroupKeys.includes(group.groupKey));

  const readiness = useMemo(() => {
    const checks = [
      {
        label: "Accounts selected",
        ok: selectedAccountIds.length > 0,
        detail: `${selectedAccountIds.length} account(s)`,
      },
      {
        label: isGroupChatMode ? "Shared groups selected" : "Targets selected",
        ok: isGroupChatMode
          ? selectedGroupKeys.length > 0
          : selectedTargetCount > 0,
        detail: isGroupChatMode
          ? `${selectedGroupKeys.length} group(s) selected`
          : `${selectedTargetCount} target(s)`,
      },
      {
        label: "Prompt ready",
        ok: prompt.trim().length > 0,
        detail: `${prompt.trim().length} characters`,
      },
      {
        label: "Approval safety",
        ok: requireApproval,
        detail: requireApproval ? "Manual approval on" : "Approval skipped",
      },
    ];

    if (isGroupChatMode) {
      checks.splice(1, 0, {
        label: "Group discussion accounts",
        ok: selectedAccountIds.length >= 2,
        detail: "Needs at least 2 accounts",
      });
    }

    return checks;
  }, [
    selectedAccountIds.length,
    selectedGroupKeys.length,
    selectedTargetCount,
    prompt,
    requireApproval,
    isGroupChatMode,
  ]);

  const readinessScore = useMemo(() => {
    const okCount = readiness.filter((item) => item.ok).length;
    return Math.round((okCount / readiness.length) * 100);
  }, [readiness]);

  useEffect(() => {
    loadAiStudioData();
  }, []);

  useEffect(() => {
    if (mode === "group_chat") {
      setSelectedChatKeys([]);
      setGapSpeedMode((prev) => (prev === "quick" ? "tight" : prev));
      setGapStrategy("conversation_realistic");
      setMessageCount((prev) => Math.max(Number(prev) || 1, 6));
      return;
    }

    setGapSpeedMode((prev) => (prev === "tight" ? "normal" : prev));
  }, [mode]);

  useEffect(() => {
    const validGroupKeys = new Set(
      targetGroupOptions.map((group) => group.groupKey),
    );
    setSelectedGroupKeys((prev) =>
      prev.filter((groupKey) => validGroupKeys.has(groupKey)),
    );
  }, [targetGroupOptions]);

  useEffect(() => {
    const validChatKeys = new Set(
      targetChatOptions.map((chat) => chat.chatKey),
    );
    setSelectedChatKeys((prev) =>
      prev.filter((chatKey) => validChatKeys.has(chatKey)),
    );
  }, [targetChatOptions]);

  useEffect(() => {
    writeCache(CACHE_KEYS.form, {
      mode,
      promptTemplate,
      selectedAccountIds,
      selectedChatKeys,
      selectedGroupKeys,
      sendAt,
      gapSpeedMode,
      gapStrategy,
      messageCount,
      tone,
      language,
      naturalnessLevel,
      casualShortFormRatio,
      prompt,
      requireApproval,
    });
  }, [
    mode,
    promptTemplate,
    selectedAccountIds,
    selectedChatKeys,
    selectedGroupKeys,
    sendAt,
    gapSpeedMode,
    gapStrategy,
    messageCount,
    tone,
    language,
    naturalnessLevel,
    casualShortFormRatio,
    prompt,
    requireApproval,
  ]);

  useEffect(() => {
    function handleEscape(e) {
      if (e.key !== "Escape") return;

      if (previewModalOpen) return setPreviewModalOpen(false);
      if (accountDrawerOpen) return setAccountDrawerOpen(false);
      if (targetDrawerOpen) return setTargetDrawerOpen(false);
      if (dropdownOpen) setDropdownOpen(null);
    }

    window.addEventListener("keydown", handleEscape);

    return () => window.removeEventListener("keydown", handleEscape);
  }, [previewModalOpen, accountDrawerOpen, targetDrawerOpen, dropdownOpen]);

  async function loadAiStudioData() {
    try {
      setLoadingStudioData(true);
      setLoadingAccounts(true);
      setLoadingChats(true);

      const res = await api.get("/api/ai-messages/studio-data");

      const data = res.data?.data || {};
      const connected = Array.isArray(data.accounts) ? data.accounts : [];
      const savedChats = Array.isArray(data.chats) ? data.chats : [];

      setAccounts(connected);
      setChats(savedChats);

      writeCache(CACHE_KEYS.accounts, connected);
      writeCache(CACHE_KEYS.chats, savedChats);

      setSelectedAccountIds((prev) =>
        prev.filter((id) => connected.some((account) => account._id === id)),
      );

      setStudioDataLoaded(true);
    } catch (err) {
      console.error("Load AI studio data error:", err);

      setStudioDataLoaded(false);

      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to load AI studio data",
      );
    } finally {
      setLoadingStudioData(false);
      setLoadingAccounts(false);
      setLoadingChats(false);
    }
  }

  function clearPreviewBecauseInputChanged() {
    setPreview(null);
    setPreviewItems([]);
    setResult(null);
    setCheckedPreviewIndexes([]);
  }

  function handlePromptChange(value) {
    setPrompt(value);
    clearPreviewBecauseInputChanged();
  }

  function openAccountLabelPicker() {
    if (pageLocked) return;

    if (!selectedAccountIds.length) {
      toast.error("Please select Telegram accounts first");
      setAccountDrawerMode("select");
      setAccountDrawerOpen(true);
      return;
    }

    setAccountDrawerMode("insert_label");
    setAccountDrawerOpen(true);
  }

  function insertAccountLabel(accountId) {
    const account = selectedAccounts.find((item) => item._id === accountId);

    if (!account) {
      toast.error("This account is not selected yet");
      return;
    }

    const label = getAccountLabel(account);
    const insertText = `[label: ${label}]`;
    const textarea = promptTextareaRef.current;

    setPrompt((prev) => {
      const current = String(prev || "");

      if (!textarea) {
        return `${current}${current.endsWith(" ") || !current ? "" : " "}${insertText}`;
      }

      const start = textarea.selectionStart ?? current.length;
      const end = textarea.selectionEnd ?? current.length;

      const before = current.slice(0, start);
      const after = current.slice(end);

      const cleanedBefore = before.replace(/label:\s*$/i, "");

      return `${cleanedBefore}${insertText}${after}`;
    });

    clearPreviewBecauseInputChanged();
    setAccountDrawerOpen(false);
    setAccountDrawerMode("select");

    setTimeout(() => {
      promptTextareaRef.current?.focus();
    }, 0);
  }

  function handleModeChange(nextMode) {
    setMode(nextMode);
    setPromptTemplate("custom");
    setSelectedChatKeys([]);
    setSelectedGroupKeys([]);

    if (nextMode === "group_chat") {
      setPrompt("Create a natural group discussion about doing breakfast.");
    } else {
      setPrompt("Create a Telegram campaign about {{topic}}.");
    }

    clearPreviewBecauseInputChanged();
  }

  function handleTemplateChange(nextValue) {
    setPromptTemplate(nextValue);

    const template = promptTemplateOptions.find(
      (item) => item.value === nextValue,
    );

    if (template?.prompt) {
      setPrompt(template.prompt);
    }

    clearPreviewBecauseInputChanged();
  }

  function toggleAccount(accountId) {
    if (pageLocked) return;

    setSelectedAccountIds((prev) => {
      const exists = prev.includes(accountId);
      const next = exists
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId];

      setSelectedChatKeys([]);
      setSelectedGroupKeys([]);

      return next;
    });

    clearPreviewBecauseInputChanged();
  }

  function toggleChat(chatKey) {
    if (pageLocked || isGroupChatMode) return;

    setSelectedChatKeys((prev) =>
      prev.includes(chatKey)
        ? prev.filter((key) => key !== chatKey)
        : [...prev, chatKey],
    );

    clearPreviewBecauseInputChanged();
  }

  function toggleGroup(groupKey) {
    if (pageLocked) return;

    setSelectedGroupKeys((prev) =>
      prev.includes(groupKey)
        ? prev.filter((key) => key !== groupKey)
        : [...prev, groupKey],
    );

    clearPreviewBecauseInputChanged();
  }

  function toggleAllVisibleGroups() {
    if (pageLocked) return;

    if (allVisibleGroupsSelected) {
      setSelectedGroupKeys((prev) =>
        prev.filter(
          (key) => !filteredGroups.some((group) => group.groupKey === key),
        ),
      );
    } else {
      setSelectedGroupKeys((prev) => {
        const keys = new Set(prev);
        filteredGroups.forEach((group) => keys.add(group.groupKey));
        return Array.from(keys);
      });
    }

    clearPreviewBecauseInputChanged();
  }

  function togglePreviewCheck(index) {
    setCheckedPreviewIndexes((prev) =>
      prev.includes(index)
        ? prev.filter((item) => item !== index)
        : [...prev, index],
    );
  }

  function checkAllPreviewMessages() {
    if (allPreviewChecked) {
      setCheckedPreviewIndexes([]);
      return;
    }

    setCheckedPreviewIndexes(previewItems.map((_, index) => index));
  }

  function updatePreviewItem(index, patch) {
    setPreviewItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        ...patch,
      };
      return next;
    });
  }

  function deletePreviewItem(index) {
    setPreviewItems((prev) =>
      prev.filter((_, itemIndex) => itemIndex !== index),
    );
    setCheckedPreviewIndexes((prev) =>
      prev
        .filter((item) => item !== index)
        .map((item) => (item > index ? item - 1 : item)),
    );
  }

  function duplicatePreviewItem(index) {
    setPreviewItems((prev) => {
      const next = [...prev];
      next.splice(index + 1, 0, {
        ...prev[index],
        imageFile: null,
        imagePreviewUrl: "",
      });
      return next;
    });
  }

  function validateBeforeGenerate() {
    if (pageLocked) {
      toast.error("AI studio data is still loading. Please wait a moment.");
      return false;
    }

    if (!selectedAccountIds.length) {
      toast.error("Please select at least one Telegram account");
      setAccountDrawerOpen(true);
      return false;
    }

    if (isGroupChatMode && selectedAccountIds.length < 2) {
      toast.error("Group Discussion requires at least 2 Telegram accounts");
      setAccountDrawerOpen(true);
      return false;
    }

    if (isGroupChatMode && selectedGroupKeys.length < 1) {
      toast.error("Group Discussion requires at least 1 shared group");
      setTargetDrawerOpen(true);
      return false;
    }

    if (!isGroupChatMode && !selectedTargetCount) {
      toast.error("Please select at least one targeted chat or group");
      setTargetDrawerOpen(true);
      return false;
    }

    if (!prompt.trim()) {
      toast.error("Prompt is required");
      return false;
    }

    const cleanCount = Number(messageCount);

    if (!cleanCount || cleanCount < 1) {
      toast.error("Message count must be at least 1");
      return false;
    }

    return true;
  }

  async function generatePreview(e) {
    e.preventDefault();

    if (!validateBeforeGenerate()) return;

    try {
      setGenerating(true);
      setPreview(null);
      setResult(null);
      setCheckedPreviewIndexes([]);

      const res = await api.post("/api/ai-messages/preview", {
        mode,
        prompt: prompt.trim(),
        tone,
        language,
        messageCount: Number(messageCount),
        accountCount: selectedAccountIds.length,
        speakerLabels,
        naturalnessLevel,
        casualShortFormRatio: Number(casualShortFormRatio),
        gapStrategy,
        gapSpeedMode,
      });

      const rawItems =
        res.data?.messageItems || res.data?.aiPlan?.messageItems || [];
      const rawMessages =
        res.data?.messages || res.data?.aiPlan?.messages || [];

      const items = rawItems.length
        ? rawItems
        : rawMessages.map((text) => ({
            text,
            accountSlot: null,
            gapAfterMinutes: null,
          }));

      setPreview(res.data);
      setPreviewItems(
        items.map((item, index) => ({
          text: String(
            item.text || item.message || rawMessages[index] || "",
          ).trim(),
          accountSlot: item.accountSlot || null,
          gapAfterMinutes: Number.isFinite(Number(item.gapAfterMinutes))
            ? Number(item.gapAfterMinutes)
            : null,
          imageFile: null,
          imagePreviewUrl: "",
          imageUrl: String(item.imageUrl || ""),
          imageOriginalName: String(item.imageOriginalName || ""),
          imageMimeType: String(item.imageMimeType || ""),
        })),
      );
      setPreviewModalOpen(true);
      toast.success("AI plan generated");
    } catch (err) {
      console.error("Generate preview error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to generate preview",
      );
    } finally {
      setGenerating(false);
    }
  }

  async function uploadPreviewImages(items) {
    const uploadedItems = [];

    for (const item of items) {
      if (!item.imageFile) {
        uploadedItems.push({
          text: item.text,
          accountSlot: item.accountSlot || null,
          gapAfterMinutes: Number.isFinite(Number(item.gapAfterMinutes))
            ? Number(item.gapAfterMinutes)
            : null,
          imageUrl: item.imageUrl || "",
          imageOriginalName: item.imageOriginalName || "",
          imageMimeType: item.imageMimeType || "",
        });
        continue;
      }

      const formData = new FormData();
      formData.append("image", item.imageFile);

      const res = await api.post("/api/uploads/ai-image", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      uploadedItems.push({
        text: item.text,
        accountSlot: item.accountSlot || null,
        gapAfterMinutes: Number.isFinite(Number(item.gapAfterMinutes))
          ? Number(item.gapAfterMinutes)
          : null,
        imageUrl: res.data?.imageUrl || "",
        imageOriginalName: res.data?.originalName || item.imageFile.name || "",
        imageMimeType: res.data?.mimeType || item.imageFile.type || "",
      });
    }

    return uploadedItems;
  }

  async function createSchedule(timingMode) {
    if (!validateBeforeGenerate()) return;

    if (!previewItems.length) {
      toast.error("Generate a preview first");
      return;
    }

    if (!allPreviewChecked) {
      toast.error("Please check all preview messages first");
      return;
    }

    if (timingMode === "schedule_later" && !sendAt) {
      toast.error("Schedule date/time is required");
      return;
    }

    try {
      setCreating(true);
      setResult(null);

      const uploadedPreviewItems = await uploadPreviewImages(previewItems);

      const payload = {
        mode,
        telegramAccountIds: selectedAccountIds,
        chatIds: isGroupChatMode ? [] : selectedChatIds,
        groupIds: selectedGroupIds,
        prompt: prompt.trim(),
        tone,
        language,
        messageCount: Number(messageCount),
        naturalnessLevel,
        casualShortFormRatio: Number(casualShortFormRatio),
        gapStrategy,
        gapSpeedMode,
        messages: uploadedPreviewItems,
        timingMode,
        sendAt:
          timingMode === "send_now" ? null : new Date(sendAt).toISOString(),
        requireApproval,
      };

      const res = await api.post("/api/ai-messages/schedule", payload);

      setResult(res.data);
      setPreviewModalOpen(false);
      toast.success(res.data?.message || "AI messages created");
    } catch (err) {
      console.error("Create AI messages error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to create AI messages",
      );

      if (err?.response?.data) {
        setResult(err.response.data);
      }
    } finally {
      setCreating(false);
    }
  }

  const speedOptions = isGroupChatMode
    ? GROUP_CHAT_SPEED_OPTIONS
    : CAMPAIGN_SPEED_OPTIONS;

  const showLabelAccountSuggestion =
    isGroupChatMode &&
    /label:\s*$/i.test(prompt) &&
    selectedAccounts.length > 0;

  return (
    <Shell title="AI Campaign Studio">
      <div
        className={`-mx-3 -my-3 min-h-[calc(100vh-78px)] px-4 py-5 sm:px-6 ${isDark ? "bg-[#202127]" : "bg-[#f4efe6]"}`}
      >
        <div className="mx-auto space-y-5">
          <HeroHeader
            isDark={isDark}
            loadingStudioData={loadingStudioData}
            selectedAccountCount={selectedAccountIds.length}
            selectedTargetCount={selectedTargetCount}
            previewCount={previewItems.length}
            readinessScore={readinessScore}
          />
          {loadingStudioData && (
            <StudioNotice isDark={isDark}>
              Loading connected Telegram accounts and saved chats silently. No
              live Telegram sync is running.
            </StudioNotice>
          )}

          <div className="grid gap-5 xl:grid-cols-[1.4fr_0.9fr]">
            <section className={panelClass(isDark)}>
              <form onSubmit={generatePreview} className="space-y-5">
                <div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {MODE_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      const active = mode === option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          disabled={pageLocked}
                          onClick={() => handleModeChange(option.value)}
                          className={modeCardClass(isDark, active)}
                        >
                          <span className={modeIconClass(isDark, active)}>
                            <Icon className="h-5 w-5" />
                          </span>

                          <span className="min-w-0 text-left">
                            <span className="block text-[15px] font-semibold tracking-[-0.03em]">
                              {option.title}
                            </span>
                            <span className="mt-1 block text-[12px] leading-5 opacity-65">
                              {option.description}
                            </span>
                          </span>

                          {active && (
                            <CheckCircle2 className="h-5 w-5 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    disabled={pageLocked}
                    onClick={() => setAccountDrawerOpen(true)}
                    className={selectorButtonClass(isDark)}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className={selectorIconClass(isDark)}>
                        <Users className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 text-left">
                        <span className={selectorTitleClass(isDark)}>
                          Telegram Accounts
                        </span>
                        <span className={selectorSubClass(isDark)}>
                          {selectedAccountIds.length
                            ? `${selectedAccountIds.length} account(s) selected`
                            : "No account selected"}
                        </span>
                      </span>
                    </span>
                    <span className={selectorCountClass(isDark)}>
                      {selectedAccountIds.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={pageLocked}
                    onClick={() => setTargetDrawerOpen(true)}
                    className={selectorButtonClass(isDark)}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className={selectorIconClass(isDark)}>
                        <MessageSquareText className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 text-left">
                        <span className={selectorTitleClass(isDark)}>
                          {isGroupChatMode
                            ? "Shared Group"
                            : "Targeted Chats / Groups"}
                        </span>
                        <span className={selectorSubClass(isDark)}>
                          {isGroupChatMode
                            ? `${selectedGroupKeys.length} shared group selected`
                            : `Chats: ${selectedChatKeys.length} · Groups: ${selectedGroupKeys.length}`}
                        </span>
                      </span>
                    </span>
                    <span className={selectorCountClass(isDark)}>
                      {isGroupChatMode
                        ? selectedGroupKeys.length
                        : selectedTargetCount}
                    </span>
                  </button>
                </div>

                <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
                  <div>
                    <label className={labelClass(isDark)}>
                      Prompt Template
                    </label>
                    <CustomDropdown
                      isDark={isDark}
                      value={promptTemplate}
                      options={promptTemplateOptions}
                      open={dropdownOpen === "template"}
                      setOpen={(next) =>
                        setDropdownOpen(next ? "template" : null)
                      }
                      disabled={pageLocked}
                      onChange={handleTemplateChange}
                    />
                  </div>

                  <div>
                    <label className={labelClass(isDark)}>Prompt</label>
                    <div className="relative">
                      <textarea
                        ref={promptTextareaRef}
                        disabled={pageLocked}
                        value={prompt}
                        onChange={(e) => handlePromptChange(e.target.value)}
                        rows={5}
                        placeholder={
                          isGroupChatMode
                            ? "Example: Type label: to choose which Telegram account should do something."
                            : "Example: Write a product promotion for today's offer."
                        }
                        className={`${inputClass(isDark)} resize-none py-3 text-[14px] leading-6 disabled:cursor-not-allowed disabled:opacity-50`}
                      />

                      {showLabelAccountSuggestion && (
                        <div
                          className={`absolute left-3 right-3 top-full z-20 mt-2 rounded-[18px] border p-3 shadow-xl ${
                            isDark
                              ? "border-white/[0.08] bg-[#34343c] text-white"
                              : "border-black/[0.06] bg-white text-[#201d19]"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={openAccountLabelPicker}
                            className={`flex w-full items-center justify-between gap-3 rounded-[14px] px-3 py-2 text-left text-[13px] font-medium ${
                              isDark
                                ? "bg-[#292a2f] hover:bg-[#3d3e45]"
                                : "bg-[#f7f2ea] hover:bg-[#eee5d7]"
                            }`}
                          >
                            <span>Choose Telegram account label</span>
                            <ChevronDown className="h-4 w-4 rotate-[-90deg] opacity-60" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className={hintClass(isDark)}>
                      {prompt.length} characters
                      {isGroupChatMode && (
                        <span>
                          {" "}
                          · Type <span className="font-medium">label:</span> to
                          assign a selected Telegram account.
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <SectionTitle
                    isDark={isDark}
                    icon={Wand2}
                    title="AI behavior"
                    subtitle="Control the tone, language, naturalness, and minute-based sending rhythm."
                  />

                  <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <Field label="Message count" isDark={isDark}>
                      <input
                        disabled={pageLocked}
                        value={messageCount}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^\d]/g, "");
                          setMessageCount(value);
                          clearPreviewBecauseInputChanged();
                        }}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="10"
                        className={`${noSpinnerInputClass(isDark)} text-[16px] disabled:cursor-not-allowed disabled:opacity-50`}
                      />
                    </Field>

                    <Field label="Tone" isDark={isDark}>
                      <CustomDropdown
                        isDark={isDark}
                        value={tone}
                        options={TONE_OPTIONS}
                        open={dropdownOpen === "tone"}
                        setOpen={(next) =>
                          setDropdownOpen(next ? "tone" : null)
                        }
                        disabled={pageLocked}
                        onChange={(value) => {
                          setTone(value);
                          clearPreviewBecauseInputChanged();
                        }}
                      />
                    </Field>

                    <Field label="Language" isDark={isDark}>
                      <CustomDropdown
                        isDark={isDark}
                        value={language}
                        options={LANGUAGE_OPTIONS}
                        open={dropdownOpen === "language"}
                        setOpen={(next) =>
                          setDropdownOpen(next ? "language" : null)
                        }
                        disabled={pageLocked}
                        onChange={(value) => {
                          setLanguage(value);
                          clearPreviewBecauseInputChanged();
                        }}
                      />
                    </Field>

                    <Field label="Naturalness" isDark={isDark}>
                      <CustomDropdown
                        isDark={isDark}
                        value={naturalnessLevel}
                        options={NATURALNESS_OPTIONS}
                        open={dropdownOpen === "naturalness"}
                        setOpen={(next) =>
                          setDropdownOpen(next ? "naturalness" : null)
                        }
                        disabled={pageLocked}
                        onChange={(value) => {
                          setNaturalnessLevel(value);
                          clearPreviewBecauseInputChanged();
                        }}
                      />
                    </Field>

                    <Field label="Gap Strategy" isDark={isDark}>
                      <CustomDropdown
                        isDark={isDark}
                        value={gapStrategy}
                        options={GAP_STRATEGY_OPTIONS}
                        open={dropdownOpen === "gapStrategy"}
                        setOpen={(next) =>
                          setDropdownOpen(next ? "gapStrategy" : null)
                        }
                        disabled={pageLocked}
                        onChange={(value) => {
                          setGapStrategy(value);
                          clearPreviewBecauseInputChanged();
                        }}
                      />
                    </Field>

                    <Field
                      label={
                        isGroupChatMode
                          ? "Conversation Speed"
                          : "Campaign Speed"
                      }
                      isDark={isDark}
                    >
                      <CustomDropdown
                        isDark={isDark}
                        value={gapSpeedMode}
                        options={speedOptions}
                        open={dropdownOpen === "speed"}
                        setOpen={(next) =>
                          setDropdownOpen(next ? "speed" : null)
                        }
                        disabled={pageLocked}
                        onChange={(value) => {
                          setGapSpeedMode(value);
                          clearPreviewBecauseInputChanged();
                        }}
                      />
                    </Field>
                  </div>

                  <div
                    className={`mt-3 rounded-[18px] p-4 ${isDark ? "bg-[#292a2f]" : "bg-[#f7f2ea]"}`}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className={smallTitleClass(isDark)}>
                          Short-form balance
                        </div>
                        <div className={hintNoMarginClass(isDark)}>
                          Controls how often AI can use casual short forms like
                          “u”, “hw”, “btw”, “bro”, or “haha”.
                        </div>
                      </div>

                      <div className="flex min-w-[220px] items-center gap-3">
                        <input
                          disabled={pageLocked}
                          type="range"
                          min="0"
                          max="0.5"
                          step="0.05"
                          value={casualShortFormRatio}
                          onChange={(e) => {
                            setCasualShortFormRatio(Number(e.target.value));
                            clearPreviewBecauseInputChanged();
                          }}
                          className="w-full accent-[#d8c49a]"
                        />
                        <span
                          className={`w-12 text-right text-[13px] font-medium ${isDark ? "text-white" : "text-[#201d19]"}`}
                        >
                          {Math.round(Number(casualShortFormRatio) * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <label
                  className={`flex cursor-pointer items-center justify-between rounded-[20px] p-4 ${isDark ? "bg-[#292a2f]" : "bg-[#f7f2ea]"} ${pageLocked ? "cursor-not-allowed opacity-50" : ""}`}
                >
                  <div>
                    <div className={smallTitleClass(isDark)}>
                      Require approval
                    </div>
                    <div className={hintNoMarginClass(isDark)}>
                      Recommended. Review and approve messages before the sender
                      worker can send them.
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    disabled={pageLocked}
                    checked={requireApproval}
                    onChange={(e) => setRequireApproval(e.target.checked)}
                    className="h-4 w-4 accent-[#d8c49a]"
                  />
                </label>

                <button
                  type="submit"
                  disabled={generating || pageLocked}
                  className={primaryButton()}
                >
                  {generating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Generate AI Plan
                </button>
              </form>
            </section>

            <aside className="space-y-5">
              <ReadinessPanel
                isDark={isDark}
                readiness={readiness}
                readinessScore={readinessScore}
                mode={mode}
                selectedAccounts={selectedAccounts}
                selectedTargetCount={selectedTargetCount}
                selectedGroupKeys={selectedGroupKeys}
                previewItems={previewItems}
                estimatedDuration={estimatedDuration}
              />

              {result && <ResultPanel isDark={isDark} result={result} />}
            </aside>
          </div>
        </div>

        {accountDrawerOpen && (
          <RightDrawer
            isDark={isDark}
            title={
              accountDrawerMode === "insert_label"
                ? "Choose Account Label"
                : "Select Telegram Accounts"
            }
            subtitle={
              accountDrawerMode === "insert_label"
                ? "Choose one selected Telegram account to insert into the prompt."
                : isGroupChatMode
                  ? "Choose at least 2 connected accounts for the shared group discussion."
                  : "Choose which connected accounts should send these AI messages."
            }
            onClose={() => {
              setAccountDrawerOpen(false);
              setAccountDrawerMode("select");
            }}
          >
            <AccountDrawerContent
              isDark={isDark}
              mode={accountDrawerMode}
              accounts={
                accountDrawerMode === "insert_label"
                  ? selectedAccounts.filter((account) => {
                      const q = accountSearch.trim().toLowerCase();
                      if (!q) return true;

                      return (
                        String(account.label || "")
                          .toLowerCase()
                          .includes(q) ||
                        String(account.phoneNumber || "")
                          .toLowerCase()
                          .includes(q) ||
                        String(account.status || "")
                          .toLowerCase()
                          .includes(q)
                      );
                    })
                  : filteredAccounts
              }
              selectedAccountIds={selectedAccountIds}
              accountSearch={accountSearch}
              setAccountSearch={setAccountSearch}
              loadingAccounts={loadingAccounts}
              onToggleAccount={toggleAccount}
              onInsertAccountLabel={insertAccountLabel}
              onDone={() => {
                setAccountDrawerOpen(false);
                setAccountDrawerMode("select");
              }}
            />
          </RightDrawer>
        )}

        {targetDrawerOpen && (
          <RightDrawer
            isDark={isDark}
            title={
              isGroupChatMode
                ? "Select Shared Groups"
                : "Select Targeted Chats / Groups"
            }
            subtitle={
              isGroupChatMode
                ? "Choose one or more groups that all selected accounts can access."
                : "Choose private chats, channels, bots, or groups. You can select all groups then uncheck some."
            }
            onClose={() => setTargetDrawerOpen(false)}
          >
            <TargetDrawerContent
              isDark={isDark}
              mode={mode}
              selectedAccountIds={selectedAccountIds}
              loadingChats={loadingChats}
              targetSearch={targetSearch}
              setTargetSearch={setTargetSearch}
              filteredChats={filteredChats}
              filteredGroups={filteredGroups}
              selectedChatKeys={selectedChatKeys}
              selectedGroupKeys={selectedGroupKeys}
              selectedTargetCount={selectedTargetCount}
              allVisibleGroupsSelected={allVisibleGroupsSelected}
              onToggleChat={toggleChat}
              onToggleGroup={toggleGroup}
              onToggleAllVisibleGroups={toggleAllVisibleGroups}
              onDone={() => setTargetDrawerOpen(false)}
            />
          </RightDrawer>
        )}

        {previewModalOpen && (
          <PreviewModal
            isDark={isDark}
            mode={mode}
            preview={preview}
            previewItems={previewItems}
            setPreviewItems={setPreviewItems}
            selectedAccounts={selectedAccounts}
            checkedPreviewIndexes={checkedPreviewIndexes}
            allPreviewChecked={allPreviewChecked}
            creating={creating}
            sendAt={sendAt}
            setSendAt={setSendAt}
            requireApproval={requireApproval}
            selectedAccountIds={selectedAccountIds}
            selectedChatIds={selectedChatIds}
            selectedGroupKeys={selectedGroupKeys}
            estimatedDuration={estimatedDuration}
            onClose={() => setPreviewModalOpen(false)}
            onTogglePreviewCheck={togglePreviewCheck}
            onCheckAllPreviewMessages={checkAllPreviewMessages}
            onUpdateItem={updatePreviewItem}
            onDeleteItem={deletePreviewItem}
            onDuplicateItem={duplicatePreviewItem}
            onSendNow={() => createSchedule("send_now")}
            onSchedule={() => createSchedule("schedule_later")}
          />
        )}
      </div>
    </Shell>
  );
}

function HeroHeader({
  isDark,
  loadingStudioData,
  selectedAccountCount,
  selectedTargetCount,
  previewCount,
  readinessScore,
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <div className={eyebrowClass(isDark)}>
          <Bot className="h-3.5 w-3.5" />
          AI Telegram Studio
        </div>
        <h1 className={pageTitleClass(isDark)}>AI Campaign Studio</h1>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <MiniStat
          isDark={isDark}
          label="Data"
          value={loadingStudioData ? "Loading" : "Ready"}
        />
        <MiniStat
          isDark={isDark}
          label="Accounts"
          value={selectedAccountCount}
        />
        <MiniStat isDark={isDark} label="Targets" value={selectedTargetCount} />
        <MiniStat isDark={isDark} label="Preview" value={previewCount} />
        <MiniStat isDark={isDark} label="Ready" value={`${readinessScore}%`} />
      </div>
    </div>
  );
}

function StudioNotice({ isDark, children }) {
  return (
    <div
      className={`rounded-[22px] p-4 text-[13px] leading-5 ${isDark ? "bg-[#292a2f] text-white/55" : "bg-[#f7f2ea] text-[#70675c]"}`}
    >
      {children}
    </div>
  );
}

function SectionTitle({ isDark, icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3">
      <span className={sectionIconClass(isDark)}>
        <Icon className="h-4 w-4" />
      </span>
      <span>
        <span className={smallTitleClass(isDark)}>{title}</span>
        <span className={hintNoMarginClass(isDark)}>{subtitle}</span>
      </span>
    </div>
  );
}

function Field({ label, isDark, children }) {
  return (
    <div>
      <label className={labelClass(isDark)}>{label}</label>
      {children}
    </div>
  );
}

function ReadinessPanel({
  isDark,
  readiness,
  readinessScore,
  mode,
  selectedAccounts,
  selectedTargetCount,
  selectedGroupKeys,
  previewItems,
  estimatedDuration,
}) {
  return (
    <section className={panelClass(isDark)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className={eyebrowClass(isDark)}>
            <ShieldCheck className="h-3.5 w-3.5" />
            Readiness
          </div>
          <h2 className={titleClass(isDark)}>Studio checklist</h2>
          <p className={paragraphClass(isDark)}>
            Make sure the plan is valid before generating or scheduling.
          </p>
        </div>
        <div
          className={`rounded-[18px] px-3 py-2 text-[20px] font-semibold tracking-[-0.05em] ${isDark ? "bg-[#292a2f] text-white" : "bg-[#f7f2ea] text-[#201d19]"}`}
        >
          {readinessScore}%
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {readiness.map((item) => (
          <div
            key={item.label}
            className={`flex items-center justify-between gap-3 rounded-[16px] p-3 ${isDark ? "bg-[#292a2f]" : "bg-[#f7f2ea]"}`}
          >
            <div className="min-w-0">
              <div className={smallTitleClass(isDark)}>{item.label}</div>
              <div className={hintNoMarginClass(isDark)}>{item.detail}</div>
            </div>
            <span
              className={
                item.ok
                  ? "text-emerald-400"
                  : isDark
                    ? "text-white/25"
                    : "text-[#b0a69a]"
              }
            >
              <CheckCircle2 className="h-5 w-5" />
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <SummaryPill
          isDark={isDark}
          label="Mode"
          value={mode === "group_chat" ? "Discussion" : "Campaign"}
        />
        <SummaryPill
          isDark={isDark}
          label="Accounts"
          value={selectedAccounts.length}
        />
        <SummaryPill
          isDark={isDark}
          label="Targets"
          value={
            mode === "group_chat"
              ? selectedGroupKeys.length
              : selectedTargetCount
          }
        />
        <SummaryPill
          isDark={isDark}
          label="Duration"
          value={previewItems.length ? estimatedDuration : "—"}
        />
      </div>

      {selectedAccounts.length > 0 && (
        <div
          className={`mt-4 rounded-[18px] p-3 ${isDark ? "bg-[#292a2f]" : "bg-[#f7f2ea]"}`}
        >
          <div className={sectionHeaderClass(isDark)}>Selected Accounts</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedAccounts.slice(0, 8).map((account, index) => (
              <span key={account._id} className={chipClass(isDark)}>
                {mode === "group_chat" ? `A${index + 1} · ` : ""}
                {getAccountLabel(account)}
              </span>
            ))}
            {selectedAccounts.length > 8 && (
              <span className={chipClass(isDark)}>
                +{selectedAccounts.length - 8} more
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function ResultPanel({ isDark, result }) {
  return (
    <section className={panelClass(isDark)}>
      <div className="flex items-start gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] ${result.success ? "bg-emerald-400/10 text-emerald-300" : "bg-red-400/10 text-red-300"}`}
        >
          {result.success ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <MessageSquareText className="h-4 w-4" />
          )}
        </div>
        <div className="min-w-0">
          <div className={smallTitleClass(isDark)}>
            {result.message || "AI response"}
          </div>
          <div className={hintClass(isDark)}>
            Batch ID: {result.batchId || "No batch created"}
          </div>
          <div className={hintClass(isDark)}>
            Created: {Array.isArray(result.data) ? result.data.length : 0}
          </div>
        </div>
      </div>
    </section>
  );
}

function AccountDrawerContent({
  isDark,
  mode = "select",
  accounts,
  selectedAccountIds,
  accountSearch,
  setAccountSearch,
  loadingAccounts,
  onToggleAccount,
  onInsertAccountLabel,
  onDone,
}) {
  const isInsertLabelMode = mode === "insert_label";

  return (
    <div className="flex h-full flex-col">
      <div className="p-4">
        <SearchInput
          isDark={isDark}
          value={accountSearch}
          onChange={setAccountSearch}
          placeholder="Search accounts"
        />
        <div className={hintClass(isDark)}>
          {isInsertLabelMode
            ? "Click one selected account to insert its label into the prompt."
            : `Selected accounts: ${selectedAccountIds.length}`}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loadingAccounts && accounts.length === 0 ? (
          <DrawerEmpty isDark={isDark} text="Loading accounts..." />
        ) : accounts.length === 0 ? (
          <DrawerEmpty isDark={isDark} text="No connected accounts found." />
        ) : (
          <div className="space-y-2">
            {accounts.map((account) => {
              const active = isInsertLabelMode
                ? true
                : selectedAccountIds.includes(account._id);

              return (
                <button
                  key={account._id}
                  type="button"
                  onClick={() =>
                    isInsertLabelMode
                      ? onInsertAccountLabel(account._id)
                      : onToggleAccount(account._id)
                  }
                  className={targetButtonClass(isDark, active)}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {getAccountLabel(account)}
                    </span>
                    <span className="block truncate text-[10px] opacity-60">
                      {account.phoneNumber || account.status}
                    </span>
                  </span>
                  {active && <CheckCircle2 className="h-3.5 w-3.5" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <DrawerFooter isDark={isDark} onDone={onDone} />
    </div>
  );
}

function TargetDrawerContent({
  isDark,
  mode,
  selectedAccountIds,
  loadingChats,
  targetSearch,
  setTargetSearch,
  filteredChats,
  filteredGroups,
  selectedChatKeys,
  selectedGroupKeys,
  selectedTargetCount,
  allVisibleGroupsSelected,
  onToggleChat,
  onToggleGroup,
  onToggleAllVisibleGroups,
  onDone,
}) {
  const isGroupChatMode = mode === "group_chat";

  return (
    <div className="flex h-full flex-col">
      <div className="p-4">
        <SearchInput
          isDark={isDark}
          value={targetSearch}
          onChange={setTargetSearch}
          placeholder="Search chats or groups"
        />
        <div className={hintClass(isDark)}>
          {isGroupChatMode
            ? `Selected shared group: ${selectedGroupKeys.length}`
            : `Selected targets: ${selectedTargetCount} · Chats: ${selectedChatKeys.length} · Groups: ${selectedGroupKeys.length}`}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {!selectedAccountIds.length ? (
          <DrawerEmpty isDark={isDark} text="Select Telegram account first." />
        ) : loadingChats && !filteredChats.length && !filteredGroups.length ? (
          <DrawerEmpty isDark={isDark} text="Loading chats and groups..." />
        ) : !filteredChats.length && !filteredGroups.length ? (
          <DrawerEmpty
            isDark={isDark}
            text="No chats or groups found for all selected accounts."
          />
        ) : (
          <div className="space-y-5">
            <div>
              <div className={sectionHeaderClass(isDark)}>
                <span>{isGroupChatMode ? "Shared Groups" : "Groups"}</span>

                <button
                  type="button"
                  onClick={onToggleAllVisibleGroups}
                  disabled={!filteredGroups.length}
                  className={smallActionClass(isDark)}
                >
                  {allVisibleGroupsSelected
                    ? "Uncheck visible"
                    : "Select all groups"}
                </button>
              </div>

              {filteredGroups.length === 0 ? (
                <DrawerEmpty isDark={isDark} text="No groups found." compact />
              ) : (
                <div className="space-y-2">
                  {filteredGroups.map((group) => {
                    const active = selectedGroupKeys.includes(group.groupKey);

                    return (
                      <button
                        key={group.groupKey}
                        type="button"
                        onClick={() => onToggleGroup(group.groupKey)}
                        className={targetButtonClass(isDark, active)}
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {group.title || "Telegram group"}
                          </span>
                          <span className="block truncate text-[10px] opacity-60">
                            Available on all {selectedAccountIds.length}{" "}
                            selected account(s) ·{" "}
                            {isGroupChatMode ? "shared group" : "group"}
                          </span>
                        </span>
                        {active && <CheckCircle2 className="h-3.5 w-3.5" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {!isGroupChatMode && (
              <div>
                <div className={sectionHeaderClass(isDark)}>
                  <span>Chats</span>
                  <span>{selectedChatKeys.length} selected</span>
                </div>

                {filteredChats.length === 0 ? (
                  <DrawerEmpty isDark={isDark} text="No chats found." compact />
                ) : (
                  <div className="space-y-2">
                    {filteredChats.map((chat) => {
                      const active = selectedChatKeys.includes(chat.chatKey);

                      return (
                        <button
                          key={chat.chatKey}
                          type="button"
                          onClick={() => onToggleChat(chat.chatKey)}
                          className={targetButtonClass(isDark, active)}
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-medium">
                              {chat.title || chat.username || "Telegram chat"}
                            </span>
                            <span className="block truncate text-[10px] opacity-60">
                              Available on all {selectedAccountIds.length}{" "}
                              selected account(s) · {chat.type}
                            </span>
                          </span>
                          {active && <CheckCircle2 className="h-3.5 w-3.5" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <DrawerFooter isDark={isDark} onDone={onDone} />
    </div>
  );
}

function PreviewModal({
  isDark,
  mode,
  preview,
  previewItems,
  selectedAccounts,
  checkedPreviewIndexes,
  allPreviewChecked,
  creating,
  sendAt,
  setSendAt,
  requireApproval,
  selectedAccountIds,
  selectedChatIds,
  selectedGroupKeys,
  estimatedDuration,
  onClose,
  onTogglePreviewCheck,
  onCheckAllPreviewMessages,
  onUpdateItem,
  onDeleteItem,
  onDuplicateItem,
  onSendNow,
  onSchedule,
}) {
  const isGroupChatMode = mode === "group_chat";
  const timelineTimes = getTimelineTimes(sendAt || new Date(), previewItems);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-4">
      <div
        className={`max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-[26px] shadow-2xl ${isDark ? "bg-[#34343c] text-white" : "bg-white text-[#201d19]"}`}
      >
        <div
          className={`flex items-start justify-between gap-4 border-b px-5 py-4 ${isDark ? "border-white/[0.08]" : "border-black/[0.06]"}`}
        >
          <div>
            <div className={eyebrowClass(isDark)}>
              <Sparkles className="h-3.5 w-3.5" />
              AI Plan Preview
            </div>
            <h2 className={titleClass(isDark)}>
              {isGroupChatMode
                ? "Editable discussion timeline"
                : "Editable campaign timeline"}
            </h2>
            <p className={paragraphClass(isDark)}>
              Review every message, edit wording, adjust speaker/gap, then
              approve schedule creation.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={creating}
            className={iconButtonClass(isDark)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[calc(80vh-96px)] overflow-y-auto p-4">
          <div className="mb-4 grid gap-2 sm:grid-cols-5">
            <SummaryPill
              isDark={isDark}
              label="Mode"
              value={isGroupChatMode ? "Discussion" : "Campaign"}
            />
            <SummaryPill
              isDark={isDark}
              label="Accounts"
              value={selectedAccountIds.length}
            />
            <SummaryPill
              isDark={isDark}
              label="Chats"
              value={selectedChatIds.length}
            />
            <SummaryPill
              isDark={isDark}
              label="Groups"
              value={selectedGroupKeys.length}
            />
            <SummaryPill
              isDark={isDark}
              label="Duration"
              value={estimatedDuration}
            />
          </div>

          {preview?.aiPlan?.messageGoal && (
            <div
              className={`mb-4 rounded-[20px] p-4 ${isDark ? "bg-[#292a2f]" : "bg-[#f7f2ea]"}`}
            >
              <div className={sectionHeaderClass(isDark)}>AI Goal</div>
              <div
                className={`text-[13px] leading-6 ${isDark ? "text-white/65" : "text-[#4d463f]"}`}
              >
                {preview.aiPlan.messageGoal}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onCheckAllPreviewMessages}
            className={checkAllClass(isDark, allPreviewChecked)}
          >
            <span>
              {allPreviewChecked
                ? "All timeline messages checked"
                : "Check all timeline messages"}
            </span>
            {allPreviewChecked && <CheckCircle2 className="h-4 w-4" />}
          </button>

          <div className="mt-3 space-y-3">
            {previewItems.map((item, index) => {
              const checked = checkedPreviewIndexes.includes(index);
              const account = item.accountSlot
                ? selectedAccounts[item.accountSlot - 1]
                : null;

              return (
                <div
                  key={`${index}-${item.text}`}
                  className={timelineCardClass(isDark, checked)}
                >
                  <div className="mt-2">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onTogglePreviewCheck(index)}
                          className={timelineCheckClass(checked)}
                        >
                          {checked ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            index + 1
                          )}
                        </button>

                        <label className={labelClass(isDark)}>
                          Editable message
                        </label>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[12px] font-medium opacity-80">
                          {timelineTimes[index]}
                        </span>

                        {isGroupChatMode && (
                          <span className={compactChipClass(isDark)}>
                            A{item.accountSlot || "?"}
                            {account ? ` · ${getAccountLabel(account)}` : ""}
                          </span>
                        )}

                        <span className={compactChipClass(isDark)}>
                          Gap:{" "}
                          {index === previewItems.length - 1
                            ? "End"
                            : `${item.gapAfterMinutes ?? 0} min`}
                        </span>

                        <button
                          type="button"
                          onClick={() => onDuplicateItem(index)}
                          className={compactActionButtonClass(isDark)}
                        >
                          Duplicate
                        </button>

                        {previewItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => onDeleteItem(index)}
                            className={compactDangerButtonClass(isDark)}
                          >
                            Delete
                          </button>
                        )}

                        <ImageUploadBox
                          isDark={isDark}
                          item={item}
                          index={index}
                          onUpdateItem={onUpdateItem}
                        />
                      </div>
                    </div>

                    <textarea
                      value={item.text}
                      rows={2}
                      onChange={(e) =>
                        onUpdateItem(index, { text: e.target.value })
                      }
                      className={`w-full resize-none rounded-[16px] border px-4 py-3 text-[15px] leading-6 outline-none transition focus:ring-2 ${
                        isDark
                          ? "border-white/[0.08] bg-[#1f2026] text-white focus:ring-[#d8c49a]/30"
                          : "border-[#e1d6c7] bg-white text-[#201d19] shadow-sm focus:border-[#d8c49a] focus:ring-[#d8c49a]/35"
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div
            className={`mt-4 rounded-[22px] p-4 ${isDark ? "bg-[#292a2f]" : "bg-[#f7f2ea]"}`}
          >
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 opacity-60" />
              <div className={smallTitleClass(isDark)}>Schedule later</div>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
              <div>
                <label className={labelClass(isDark)}>Start date / time</label>
                <input
                  value={sendAt}
                  onChange={(e) => setSendAt(e.target.value)}
                  type="datetime-local"
                  className={`${inputClass(isDark)} text-[16px]`}
                />
                <div className={hintClass(isDark)}>
                  Start: {formatDateTime(sendAt)} · Estimated duration:{" "}
                  {estimatedDuration}
                </div>
              </div>

              <div className={chipClass(isDark)}>
                {requireApproval ? "Approval required" : "No approval"}
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={onSendNow}
              disabled={creating || !allPreviewChecked}
              className={primaryButton()}
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send Now
            </button>

            <button
              type="button"
              onClick={onSchedule}
              disabled={creating || !allPreviewChecked}
              className={primaryButton()}
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CalendarClock className="h-4 w-4" />
              )}
              Schedule Timeline
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ImageUploadBox({ isDark, item, index, onUpdateItem }) {
  const hasImage = Boolean(
    item.imageFile || item.imagePreviewUrl || item.imageUrl,
  );

  return (
    <div className="flex items-center gap-2">
      <label
        className={`group inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border px-4 text-[12px] font-semibold shadow-sm transition active:scale-[0.98] ${
          hasImage
            ? "border-emerald-400/30 bg-emerald-400/12 text-emerald-500"
            : isDark
              ? "border-white/[0.08] bg-white/[0.06] text-white/80 hover:bg-white/[0.10]"
              : "border-[#e1d6c7] bg-white text-[#4d463f] hover:border-[#d8c49a] hover:bg-[#fffaf1]"
        }`}
      >
        {hasImage ? (
          <>
            <CheckCircle2 className="h-4 w-4" />
            Image added
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 opacity-70 transition group-hover:opacity-100" />
            Choose image
          </>
        )}

        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            if (file.size > 5 * 1024 * 1024) {
              toast.error("Image must be smaller than 5MB");
              e.target.value = "";
              return;
            }

            onUpdateItem(index, {
              imageFile: file,
              imagePreviewUrl: URL.createObjectURL(file),
              imageUrl: "",
              imageOriginalName: file.name || "",
              imageMimeType: file.type || "",
            });
          }}
        />
      </label>

      {hasImage && (
        <button
          type="button"
          onClick={() =>
            onUpdateItem(index, {
              imageFile: null,
              imagePreviewUrl: "",
              imageUrl: "",
              imageOriginalName: "",
              imageMimeType: "",
            })
          }
          className={`inline-flex h-9 items-center rounded-full px-3 text-[12px] font-semibold transition ${
            isDark
              ? "bg-red-400/10 text-red-300 hover:bg-red-400/15"
              : "bg-red-50 text-red-500 hover:bg-red-100"
          }`}
        >
          Remove
        </button>
      )}
    </div>
  );
}

function SearchInput({ isDark, value, onChange, placeholder }) {
  return (
    <div className="relative">
      <Search
        className={`pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ${isDark ? "text-white/25" : "text-[#8d8375]"}`}
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${inputClass(isDark)} pl-9 text-[16px]`}
      />
    </div>
  );
}

function RightDrawer({ isDark, title, subtitle, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[100]">
      <button
        type="button"
        aria-label="Close drawer"
        onClick={onClose}
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
      />

      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-[450px] flex-col shadow-2xl ${isDark ? "bg-[#34343c] text-white" : "bg-white text-[#201d19]"}`}
      >
        <div
          className={`flex items-start justify-between gap-4 border-b p-4 ${isDark ? "border-white/[0.08]" : "border-black/[0.06]"}`}
        >
          <div className="min-w-0">
            <h2 className={titleClass(isDark)}>{title}</h2>
            <p className={paragraphClass(isDark)}>{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={iconButtonClass(isDark)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1">{children}</div>
      </aside>
    </div>
  );
}

function DrawerFooter({ isDark, onDone }) {
  return (
    <div
      className={`border-t p-4 ${isDark ? "border-white/[0.08]" : "border-black/[0.06]"}`}
    >
      <button type="button" onClick={onDone} className={primaryButton()}>
        Done
      </button>
    </div>
  );
}

function DrawerEmpty({ isDark, text, compact = false }) {
  return (
    <div
      className={`rounded-[16px] p-4 text-center text-[12px] ${compact ? "min-h-[52px]" : "min-h-[120px]"} flex items-center justify-center ${isDark ? "bg-[#292a2f] text-white/40" : "bg-[#f7f2ea] text-[#8d8375]"}`}
    >
      {text}
    </div>
  );
}

function SummaryPill({ label, value, isDark }) {
  return (
    <div
      className={`rounded-[16px] p-3 ${isDark ? "bg-[#292a2f]" : "bg-[#f7f2ea]"}`}
    >
      <div
        className={`text-[10px] uppercase tracking-[0.14em] ${isDark ? "text-white/32" : "text-[#8d8375]"}`}
      >
        {label}
      </div>
      <div
        className={`mt-1 truncate text-[14px] font-medium ${isDark ? "text-white" : "text-[#201d19]"}`}
      >
        {value}
      </div>
    </div>
  );
}

function MiniStat({ isDark, label, value }) {
  return (
    <div
      className={`min-w-[82px] rounded-[16px] px-3 py-2 ${isDark ? "bg-[#34343c]" : "bg-white"}`}
    >
      <div
        className={`text-[9px] uppercase tracking-[0.14em] ${isDark ? "text-white/30" : "text-[#8d8375]"}`}
      >
        {label}
      </div>
      <div
        className={`mt-0.5 text-[14px] font-semibold ${isDark ? "text-white" : "text-[#201d19]"}`}
      >
        {value}
      </div>
    </div>
  );
}

function CustomDropdown({
  isDark,
  value,
  options = [],
  open,
  setOpen,
  onChange,
  disabled = false,
}) {
  const selected = options.find((item) => item.value === value);

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen(!open);
        }}
        className={`${inputClass(isDark)} flex items-center justify-between gap-3 text-left text-[14px] disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <span>{selected?.label || "Select option"}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition ${open ? "rotate-180" : ""} ${isDark ? "text-white/40" : "text-[#8d8375]"}`}
        />
      </button>

      {open && !disabled && (
        <>
          <button
            type="button"
            aria-label="Close dropdown"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[105]"
          />
          <div
            className={`absolute top-[calc(100%+8px)] left-0 right-0 z-[106] max-h-[280px] overflow-y-auto rounded-[16px] border shadow-xl ${isDark ? "border-white/[0.08] bg-[#292a2f]" : "border-black/[0.06] bg-white"}`}
          >
            {options.map((option) => {
              const active = option.value === value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex min-h-[44px] w-full items-center justify-between px-3 text-left text-[13px] transition ${active ? "bg-[#d8c49a] text-[#171717]" : isDark ? "text-white/60 hover:bg-white/[0.06]" : "text-[#70675c] hover:bg-[#f7f2ea]"}`}
                >
                  <span>{option.label}</span>
                  {active && <CheckCircle2 className="h-3.5 w-3.5" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function noSpinnerInputClass(isDark) {
  return `${inputClass(isDark)} appearance-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`;
}

function panelClass(isDark) {
  return `rounded-[26px] p-4 sm:p-5 ${isDark ? "bg-[#34343c]" : "bg-white"}`;
}

function modeCardClass(isDark, active) {
  if (active) {
    return "flex min-h-[120px] items-start gap-4 rounded-[22px] bg-[#d8c49a] p-4 text-[#171717] transition";
  }

  return `flex min-h-[120px] items-start gap-4 rounded-[22px] p-4 transition disabled:cursor-not-allowed disabled:opacity-50 ${isDark ? "bg-[#292a2f] text-white/65 hover:bg-white/[0.06]" : "bg-[#f7f2ea] text-[#4d463f] hover:bg-[#efe6d8]"}`;
}

function modeIconClass(isDark, active) {
  if (active)
    return "flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-black/10 text-[#171717]";
  return `flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] ${isDark ? "bg-white/[0.06] text-white/50" : "bg-white text-[#746b61]"}`;
}

function eyebrowClass(isDark) {
  return `mb-2 inline-flex items-center gap-2 rounded-[14px] px-2.5 py-1.5 text-[11px] font-normal ${isDark ? "bg-white/[0.06] text-white/50" : "bg-white text-[#746b61]"}`;
}

function pageTitleClass(isDark) {
  return `text-[28px] font-semibold tracking-[-0.06em] sm:text-[34px] ${isDark ? "text-white" : "text-[#201d19]"}`;
}

function titleClass(isDark) {
  return `text-[18px] font-medium tracking-[-0.04em] ${isDark ? "text-white" : "text-[#201d19]"}`;
}

function smallTitleClass(isDark) {
  return `block text-[13px] font-medium ${isDark ? "text-white" : "text-[#201d19]"}`;
}

function paragraphClass(isDark) {
  return `mt-1 max-w-xl text-xs leading-5 ${isDark ? "text-white/42" : "text-[#70675c]"}`;
}

function labelClass(isDark) {
  return `mb-1.5 block text-[12px] font-normal ${isDark ? "text-white/55" : "text-[#70675c]"}`;
}

function hintClass(isDark) {
  return `mt-1.5 text-[11px] ${isDark ? "text-white/32" : "text-[#8d8375]"}`;
}

function hintNoMarginClass(isDark) {
  return `block text-[11px] leading-5 ${isDark ? "text-white/32" : "text-[#8d8375]"}`;
}

function inputClass(isDark) {
  return `min-h-[42px] w-full rounded-[15px] border px-3 text-[13px] outline-none transition ${isDark ? "border-transparent bg-[#292a2f] text-white placeholder:text-white/22 focus:border-[#d8c49a]/35 focus:ring-4 focus:ring-[#d8c49a]/10" : "border-transparent bg-[#f7f2ea] text-[#201d19] placeholder:text-[#aaa096] focus:border-[#d8c49a] focus:ring-4 focus:ring-[#d8c49a]/16"}`;
}

function primaryButton() {
  return "inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[15px] bg-[#d8c49a] px-4 text-[13px] font-semibold text-[#171717] transition hover:bg-[#e4d1a9] disabled:cursor-not-allowed disabled:opacity-60";
}

function selectorButtonClass(isDark) {
  return `flex min-h-[82px] w-full items-center justify-between gap-4 rounded-[22px] p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${isDark ? "bg-[#292a2f] text-white hover:bg-white/[0.06]" : "bg-[#f7f2ea] text-[#201d19] hover:bg-[#efe6d8]"}`;
}

function selectorIconClass(isDark) {
  return `flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] ${isDark ? "bg-white/[0.06] text-white/55" : "bg-white text-[#746b61]"}`;
}

function selectorTitleClass(isDark) {
  return `block truncate text-[13px] font-medium ${isDark ? "text-white" : "text-[#201d19]"}`;
}

function selectorSubClass(isDark) {
  return `mt-1 block truncate text-[11px] ${isDark ? "text-white/36" : "text-[#8d8375]"}`;
}

function selectorCountClass(isDark) {
  return `flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full px-2 text-[12px] font-medium ${isDark ? "bg-white/[0.08] text-white/60" : "bg-white text-[#746b61]"}`;
}

function sectionIconClass(isDark) {
  return `flex h-10 w-10 shrink-0 items-center justify-center rounded-[15px] ${isDark ? "bg-white/[0.06] text-white/50" : "bg-[#f7f2ea] text-[#746b61]"}`;
}

function sectionHeaderClass(isDark) {
  return `mb-2 flex items-center justify-between gap-2 px-1 text-[11px] font-medium uppercase tracking-[0.12em] ${isDark ? "text-white/35" : "text-[#8d8375]"}`;
}

function targetButtonClass(isDark, active) {
  if (active) {
    return "flex w-full items-center justify-between gap-3 rounded-[15px] bg-[#d8c49a] px-3 py-3 text-left text-[12px] text-[#171717] transition";
  }

  return `flex w-full items-center justify-between gap-3 rounded-[15px] px-3 py-3 text-left text-[12px] transition ${isDark ? "bg-[#202127] text-white/55 hover:bg-white/[0.05]" : "bg-[#f7f2ea] text-[#70675c] hover:bg-[#efe6d8]"}`;
}

function smallActionClass(isDark) {
  return `rounded-full px-2 py-1 text-[10px] transition ${isDark ? "bg-white/[0.06] text-white/50 hover:bg-white/[0.1]" : "bg-white text-[#70675c] hover:bg-[#efe6d8]"}`;
}

function iconButtonClass(isDark) {
  return `flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] transition ${isDark ? "bg-white/[0.06] text-white/55 hover:bg-white/[0.1]" : "bg-[#f7f2ea] text-[#70675c] hover:bg-[#efe6d8]"}`;
}

function chipClass(isDark) {
  return `inline-flex min-h-[28px] items-center rounded-full px-2.5 text-[11px] ${isDark ? "bg-white/[0.06] text-white/55" : "bg-white text-[#70675c]"}`;
}

function compactChipClass(isDark) {
  return `inline-flex h-8 items-center rounded-full px-3 text-[12px] font-medium ${
    isDark ? "bg-white/[0.06] text-white/70" : "bg-white text-[#70675c]"
  }`;
}

function compactActionButtonClass(isDark) {
  return `inline-flex h-8 items-center rounded-full px-3 text-[12px] font-medium transition ${
    isDark
      ? "bg-white/[0.06] text-white/70 hover:bg-white/[0.10]"
      : "bg-white text-[#70675c] hover:bg-[#fffaf1]"
  }`;
}

function compactDangerButtonClass(isDark) {
  return `inline-flex h-8 items-center rounded-full px-3 text-[12px] font-medium transition ${
    isDark
      ? "bg-red-400/10 text-red-300 hover:bg-red-400/15"
      : "bg-red-50 text-red-500 hover:bg-red-100"
  }`;
}

function checkAllClass(isDark, active) {
  if (active) {
    return "flex w-full items-center justify-between rounded-[17px] bg-[#d8c49a] p-3 text-left text-[13px] font-medium text-[#171717] transition";
  }

  return `flex w-full items-center justify-between rounded-[17px] p-3 text-left text-[13px] transition ${isDark ? "bg-[#292a2f] text-white/60 hover:bg-white/[0.06]" : "bg-[#f7f2ea] text-[#70675c] hover:bg-[#efe6d8]"}`;
}

function timelineCardClass(isDark, checked) {
  if (checked) {
    return `rounded-[18px] p-3 ${
      isDark
        ? "bg-[#292a2f] ring-1 ring-[#d8c49a]/25"
        : "bg-[#f7f2ea] ring-1 ring-[#d8c49a]"
    }`;
  }

  return `rounded-[18px] p-3 ${isDark ? "bg-[#292a2f]" : "bg-[#f7f2ea]"}`;
}

function timelineCheckClass(checked) {
  return `flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold transition ${
    checked
      ? "bg-emerald-400 text-white"
      : "bg-[#e6e0d7] text-[#5f574f] hover:bg-[#ded6cb]"
  }`;
}
