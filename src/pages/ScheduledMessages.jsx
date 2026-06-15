import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Send,
  Smartphone,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import Shell from "../components/Shell";
import { api } from "../api";
import { useTheme } from "../context/ThemeContext";

const CACHE_TTL = 1000 * 60 * 30; // 30 minutes
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

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

function uaeDateTimeLocalToIso(value) {
  if (!value) return "";

  // datetime-local gives: YYYY-MM-DDTHH:mm
  // UAE is always UTC+04:00
  return new Date(`${value}:00+04:00`).toISOString();
}

export default function ScheduledMessages() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [accounts, setAccounts] = useState(() => {
    return cacheGet("scheduled:accounts") || [];
  });

  const [telegramAccountId, setTelegramAccountId] = useState(() => {
    return getRememberedValue("scheduled:telegramAccountId", "");
  });

  const [chats, setChats] = useState(() => {
    const savedAccountId = getRememberedValue(
      "scheduled:telegramAccountId",
      "",
    );
    if (!savedAccountId) return [];

    return cacheGet(`scheduled:chats:${savedAccountId}`) || [];
  });

  const [messages, setMessages] = useState(() => {
    const savedAccountId = getRememberedValue(
      "scheduled:telegramAccountId",
      "",
    );
    return cacheGet(`scheduled:messages:${savedAccountId || "all"}`) || [];
  });

  const [modalOpen, setModalOpen] = useState(false);

  const [targetMode, setTargetMode] = useState("single_chat");
  const [chatId, setChatId] = useState("");
  const [selectedChatIds, setSelectedChatIds] = useState([]);
  const [excludeChatIds, setExcludeChatIds] = useState([]);

  const [finalMessage, setFinalMessage] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [sendAt, setSendAt] = useState("");
  const [requireApproval, setRequireApproval] = useState(true);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingChats, setLoadingChats] = useState(false);
  const [creating, setCreating] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [emergencyChatId, setEmergencyChatId] = useState("");
  const [emergencyLoading, setEmergencyLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(() => {
    return Number(getRememberedValue("scheduled:currentPage", "1")) || 1;
  });

  const [pageSize, setPageSize] = useState(() => {
    const saved = Number(getRememberedValue("scheduled:pageSize", "10"));
    return PAGE_SIZE_OPTIONS.includes(saved) ? saved : 10;
  });

  const selectedAccount = useMemo(() => {
    return accounts.find((account) => account._id === telegramAccountId);
  }, [accounts, telegramAccountId]);

  const selectedChat = useMemo(() => {
    return chats.find((chat) => chat._id === chatId);
  }, [chats, chatId]);

  const groupChats = useMemo(() => {
    return chats.filter((chat) =>
      ["group", "supergroup"].includes(String(chat.type || "").toLowerCase()),
    );
  }, [chats]);

  const accountOptions = useMemo(() => {
    return accounts.map((account) => ({
      value: account._id,
      label: account.label?.trim() || account.phoneNumber || "Telegram Account",
      description: account.status || "unknown",
    }));
  }, [accounts]);

  const chatOptions = useMemo(() => {
    return chats.map((chat) => ({
      value: chat._id,
      label: chat.title || "Untitled chat",
      description: chat.type || "unknown",
    }));
  }, [chats]);

  const totalMessages = messages.length;

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalMessages / pageSize));
  }, [totalMessages, pageSize]);

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedMessages = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return messages.slice(start, start + pageSize);
  }, [messages, safeCurrentPage, pageSize]);

  useEffect(() => {
    loadPageData({
      silent: accounts.length > 0 || messages.length > 0,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    rememberValue("scheduled:telegramAccountId", telegramAccountId);
  }, [telegramAccountId]);

  useEffect(() => {
    rememberValue("scheduled:currentPage", currentPage);
  }, [currentPage]);

  useEffect(() => {
    rememberValue("scheduled:pageSize", pageSize);
  }, [pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [telegramAccountId, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (telegramAccountId) {
      const cachedChats = cacheGet(`scheduled:chats:${telegramAccountId}`);

      if (Array.isArray(cachedChats)) {
        setChats(cachedChats);
      }

      loadChats(telegramAccountId, { silent: true });
    } else {
      setChats([]);
      setChatId("");
      setSelectedChatIds([]);
      setExcludeChatIds([]);
    }
  }, [telegramAccountId]);

  async function loadPageData(options = {}) {
    const silent = options.silent === true;

    try {
      const cachedAccounts = cacheGet("scheduled:accounts");
      const cachedMessages = cacheGet("scheduled:messages:all");

      if (Array.isArray(cachedAccounts)) {
        setAccounts(cachedAccounts);
      }

      if (Array.isArray(cachedMessages)) {
        setMessages(cachedMessages);
      }

      if (silent) {
        setRefreshing(true);
      } else if (
        !Array.isArray(cachedAccounts) ||
        !Array.isArray(cachedMessages)
      ) {
        setLoading(true);
      }

      const [accountsRes, messagesRes] = await Promise.all([
        api.get("/api/telegram-auth/accounts"),
        api.get("/api/scheduled-messages"),
      ]);

      const accountList = Array.isArray(accountsRes.data?.data)
        ? accountsRes.data.data
        : [];

      const messageList = Array.isArray(messagesRes.data?.data)
        ? messagesRes.data.data
        : [];

      cacheSet("scheduled:accounts", accountList);
      cacheSet("scheduled:messages:all", messageList);

      setAccounts(accountList);
      setMessages(messageList);

      if (!telegramAccountId && accountList.length > 0) {
        const firstConnected = accountList.find(
          (account) => account.isConnected && account.status === "connected",
        );

        if (firstConnected?._id) {
          setTelegramAccountId(firstConnected._id);
        }
      }
    } catch (err) {
      console.error("Load scheduled page error:", err);

      if (!silent) {
        toast.error(
          err?.response?.data?.message ||
            err?.response?.data?.error ||
            "Failed to load scheduled messages",
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadChats(accountId, options = {}) {
    const silent = options.silent === true;

    if (!accountId) {
      setChats([]);
      setChatId("");
      setSelectedChatIds([]);
      setExcludeChatIds([]);
      return;
    }

    try {
      const cacheKey = `scheduled:chats:${accountId}`;
      const cachedChats = cacheGet(cacheKey);

      if (Array.isArray(cachedChats)) {
        setChats(cachedChats);
      }

      if (!silent && !Array.isArray(cachedChats)) {
        setLoadingChats(true);
      }

      const res = await api.get(
        `/api/telegram-chats?telegramAccountId=${accountId}`,
      );

      const chatList = Array.isArray(res.data?.data) ? res.data.data : [];

      cacheSet(cacheKey, chatList);

      setChats(chatList);
      setSelectedChatIds([]);
      setExcludeChatIds([]);

      if (chatList.length > 0) {
        setChatId((currentChatId) => {
          const stillExists = chatList.some(
            (chat) => chat._id === currentChatId,
          );

          return stillExists ? currentChatId : chatList[0]._id;
        });
      } else {
        setChatId("");
      }
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
      setLoadingChats(false);
    }
  }

  async function loadScheduledMessages(options = {}) {
    const silent = options.silent === true;
    const cacheKey = "scheduled:messages:all";

    try {
      const cachedMessages = cacheGet(cacheKey);

      if (Array.isArray(cachedMessages)) {
        setMessages(cachedMessages);
      }

      if (!silent && !Array.isArray(cachedMessages)) {
        setLoading(true);
      }

      const res = await api.get("/api/scheduled-messages");

      const messageList = Array.isArray(res.data?.data) ? res.data.data : [];

      cacheSet(cacheKey, messageList);
      setMessages(messageList);
    } catch (err) {
      console.error("Load scheduled messages error:", err);

      if (!silent) {
        toast.error(
          err?.response?.data?.message ||
            err?.response?.data?.error ||
            "Failed to load scheduled messages",
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function refreshAll() {
    try {
      setRefreshing(true);

      await loadPageData({ silent: true });

      if (telegramAccountId) {
        await loadChats(telegramAccountId, { silent: true });
      }

      await loadScheduledMessages({ silent: true });

      toast.success("Scheduled messages refreshed");
    } finally {
      setRefreshing(false);
    }
  }

  function resetCreateForm() {
    setTargetMode("single_chat");
    setChatId(chats[0]?._id || "");
    setSelectedChatIds([]);
    setExcludeChatIds([]);
    setFinalMessage("");
    setImageFile(null);
    setImagePreviewUrl("");
    setSendAt("");
    setRequireApproval(true);
  }

  function openCreateModal() {
    resetCreateForm();
    setModalOpen(true);
  }

  function closeCreateModal() {
    if (creating) return;
    setModalOpen(false);
  }

  async function uploadManualImage() {
    if (!imageFile) {
      return {
        imageUrl: "",
        imageOriginalName: "",
        imageMimeType: "",
      };
    }

    const formData = new FormData();
    formData.append("image", imageFile);

    const res = await api.post("/api/telegram-scripts/upload-image", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return {
      imageUrl: res.data?.imageUrl || "",
      imageOriginalName: res.data?.originalName || imageFile.name || "",
      imageMimeType: res.data?.mimeType || imageFile.type || "",
    };
  }

  async function createScheduledMessage(e) {
    e.preventDefault();

    if (!telegramAccountId) {
      toast.error("Please select a Telegram account");
      return;
    }

    if (targetMode === "single_chat" && !chatId) {
      toast.error("Please select a Telegram chat");
      return;
    }

    if (targetMode === "selected_chats" && selectedChatIds.length === 0) {
      toast.error("Please select at least one chat");
      return;
    }

    if (!finalMessage.trim() && !imageFile) {
      toast.error("Message or image is required");
      return;
    }

    if (!sendAt) {
      toast.error("Send date/time is required");
      return;
    }

    try {
      setCreating(true);

      const uploadedImage = await uploadManualImage();

      const payload = {
        telegramAccountId,
        targetMode,
        messageType: "manual",
        finalMessage: finalMessage.trim(),
        imageUrl: uploadedImage.imageUrl,
        imageOriginalName: uploadedImage.imageOriginalName,
        imageMimeType: uploadedImage.imageMimeType,
        sendAt: uaeDateTimeLocalToIso(sendAt),
        requireApproval,
      };

      if (targetMode === "single_chat") {
        payload.chatId = chatId;
      }

      if (targetMode === "selected_chats") {
        payload.chatIds = selectedChatIds;
      }

      if (targetMode === "all_groups" || targetMode === "all_chats") {
        payload.excludeChatIds = excludeChatIds;
      }

      await api.post("/api/scheduled-messages", payload);

      toast.success("Scheduled message created");

      setFinalMessage("");
      setImageFile(null);
      setImagePreviewUrl("");
      setSendAt("");
      setRequireApproval(true);
      setSelectedChatIds([]);
      setExcludeChatIds([]);
      setModalOpen(false);

      await loadScheduledMessages({ silent: true });
    } catch (err) {
      console.error("Create scheduled message error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to create scheduled message",
      );
    } finally {
      setCreating(false);
    }
  }

  async function approveMessage(id) {
    try {
      setActionLoadingId(id);

      await api.patch(`/api/scheduled-messages/${id}/approve`);

      toast.success("Message approved");
      await loadScheduledMessages({ silent: true });
    } catch (err) {
      console.error("Approve message error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to approve message",
      );
    } finally {
      setActionLoadingId("");
    }
  }

  async function cancelMessage(id) {
    try {
      setActionLoadingId(id);

      await api.patch(`/api/scheduled-messages/${id}/cancel`);

      toast.success("Message cancelled");
      await loadScheduledMessages({ silent: true });
    } catch (err) {
      console.error("Cancel message error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to cancel message",
      );
    } finally {
      setActionLoadingId("");
    }
  }

  async function emergencyStopChat() {
    if (!telegramAccountId) {
      toast.error("Please select a Telegram account first");
      return;
    }

    if (!emergencyChatId) {
      toast.error("Please select a group/chat to emergency stop");
      return;
    }

    const selectedEmergencyChat = chats.find(
      (chat) => String(chat._id) === String(emergencyChatId),
    );

    const chatName = selectedEmergencyChat?.title || "this group/chat";

    const confirmed = window.confirm(
      `Emergency stop ${chatName}?\n\nThis will cancel all unsent scheduled messages for this group/chat.`,
    );

    if (!confirmed) return;

    try {
      setEmergencyLoading(true);

      const res = await api.patch(
        "/api/scheduled-messages/emergency-stop-chat",
        {
          telegramAccountId,
          chatId: emergencyChatId,
        },
      );

      toast.success(
        res.data?.message || `Emergency stop completed for ${chatName}`,
      );

      setEmergencyChatId("");
      await loadScheduledMessages({ silent: true });
    } catch (err) {
      console.error("Emergency stop error:", err);

      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to emergency stop this group/chat",
      );
    } finally {
      setEmergencyLoading(false);
    }
  }

  const createButtonDisabled =
    creating ||
    !telegramAccountId ||
    (targetMode === "single_chat" && !chatId) ||
    (targetMode === "selected_chats" && selectedChatIds.length === 0) ||
    (!finalMessage.trim() && !imageFile);

  return (
    <Shell title="Scheduled Messages">
      <div
        className={`-mx-3 -my-3 min-h-[calc(100vh-78px)] px-6 py-6 ${
          isDark ? "bg-[#202127]" : "bg-[#f4efe6]"
        }`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                isDark
                  ? "bg-white/[0.06] text-white/65"
                  : "bg-white text-[#6d6254]"
              }`}
            >
              <CalendarClock className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <div
                className={`text-[11px] font-medium uppercase tracking-[0.18em] ${
                  isDark ? "text-white/38" : "text-[#8a8176]"
                }`}
              >
                Message queue
              </div>

              <h2
                className={`mt-0.5 truncate text-[22px] font-semibold tracking-[-0.04em] ${
                  isDark ? "text-white" : "text-[#201d19]"
                }`}
              >
                Scheduled Messages
              </h2>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <div className="w-[260px]">
              <CustomSelect
                isDark={isDark}
                value={emergencyChatId}
                placeholder={
                  !telegramAccountId
                    ? "Select account first"
                    : loadingChats
                      ? "Loading chats..."
                      : "Search group/chat"
                }
                options={chatOptions}
                emptyText="No chats found"
                disabled={!telegramAccountId || loadingChats || !chats.length}
                loading={loadingChats}
                onChange={setEmergencyChatId}
                compact
              />
            </div>

            <button
              type="button"
              onClick={emergencyStopChat}
              disabled={
                emergencyLoading || !telegramAccountId || !emergencyChatId
              }
              className="inline-flex min-h-[38px] items-center justify-center gap-2 rounded-[14px] bg-red-500 px-4 text-[12px] font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {emergencyLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
              Emergency Stop
            </button>

            <button
              type="button"
              onClick={refreshAll}
              disabled={refreshing}
              className={luxurySoftButtonClass(isDark)}
            >
              {refreshing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Refresh
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              className={luxuryPrimaryButtonClass()}
            >
              <Plus className="h-3.5 w-3.5" />
              Create scheduled message
            </button>
          </div>
        </div>

        <div
          className={`mt-5 overflow-hidden rounded-[24px] border ${
            isDark
              ? "border-white/[0.06] bg-[#282a30]"
              : "border-[#eee4d5] bg-white"
          }`}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1250px] table-fixed border-collapse">
              <thead>
                <tr
                  className={
                    isDark
                      ? "border-b border-white/[0.05] bg-[#24252b] text-white/42"
                      : "border-b border-[#eee4d5] bg-[#fbf8f2] text-[#8a8176]"
                  }
                >
                  <Th className="w-[90px]">Status</Th>
                  <Th className="w-[450px]">Message</Th>
                  <Th className="w-[120px]">Type</Th>
                  <Th className="w-[150px]">Account</Th>
                  <Th className="w-[100px]">Target</Th>
                  <Th className="w-[150px]">Send time</Th>
                  <Th className="w-[160px]" align="right">
                    Actions
                  </Th>
                </tr>
              </thead>

              <tbody>
                {loading && messages.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-14 text-center">
                      <div
                        className={`inline-flex items-center gap-2 text-sm ${
                          isDark ? "text-white/50" : "text-[#746b61]"
                        }`}
                      >
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading scheduled messages...
                      </div>
                    </td>
                  </tr>
                ) : messages.length ? (
                  paginatedMessages.map((message) => (
                    <MessageRow
                      key={message._id}
                      message={message}
                      isDark={isDark}
                      loading={actionLoadingId === message._id}
                      onApprove={() => approveMessage(message._id)}
                      onCancel={() => cancelMessage(message._id)}
                    />
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <div className="mx-auto max-w-sm">
                        <div
                          className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl ${
                            isDark
                              ? "bg-white/[0.07] text-white/60"
                              : "bg-[#eee4d5] text-[#5c5348]"
                          }`}
                        >
                          <Clock className="h-5 w-5" />
                        </div>

                        <div
                          className={`mt-4 text-sm font-semibold ${
                            isDark ? "text-white" : "text-[#201d19]"
                          }`}
                        >
                          No scheduled messages
                        </div>

                        <div
                          className={`mt-2 text-xs leading-5 ${
                            isDark ? "text-white/42" : "text-[#746b61]"
                          }`}
                        >
                          Click Create scheduled message to add the first one.
                        </div>

                        <button
                          type="button"
                          onClick={openCreateModal}
                          className={luxuryPrimaryButtonClass("mx-auto mt-5")}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Create scheduled message
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div
            className={`flex flex-col gap-3 border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${
              isDark ? "border-white/[0.06]" : "border-[#eee4d5]"
            }`}
          >
            <div
              className={`text-[12px] ${
                isDark ? "text-white/42" : "text-[#746b61]"
              }`}
            >
              Showing{" "}
              {messages.length ? (safeCurrentPage - 1) * pageSize + 1 : 0}-
              {Math.min(safeCurrentPage * pageSize, messages.length)} of{" "}
              {messages.length}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className={`min-h-[36px] rounded-xl border px-3 text-[12px] outline-none ${
                  isDark
                    ? "border-white/[0.08] bg-[#292a2f] text-white"
                    : "border-[#eee4d5] bg-[#f7f2ea] text-[#201d19]"
                }`}
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size} / page
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={safeCurrentPage <= 1}
                className={paginationButtonClass(isDark)}
              >
                Prev
              </button>

              <div
                className={`min-h-[36px] rounded-xl px-3 py-2 text-[12px] ${
                  isDark
                    ? "bg-[#292a2f] text-white/55"
                    : "bg-[#f7f2ea] text-[#70675c]"
                }`}
              >
                Page {safeCurrentPage} / {totalPages}
              </div>

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) => Math.min(totalPages, page + 1))
                }
                disabled={safeCurrentPage >= totalPages}
                className={paginationButtonClass(isDark)}
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {modalOpen && (
          <CreateScheduleModal
            isDark={isDark}
            accountOptions={accountOptions}
            chatOptions={chatOptions}
            chats={chats}
            groupChats={groupChats}
            selectedAccount={selectedAccount}
            selectedChat={selectedChat}
            telegramAccountId={telegramAccountId}
            setTelegramAccountId={setTelegramAccountId}
            targetMode={targetMode}
            setTargetMode={setTargetMode}
            chatId={chatId}
            setChatId={setChatId}
            selectedChatIds={selectedChatIds}
            setSelectedChatIds={setSelectedChatIds}
            excludeChatIds={excludeChatIds}
            setExcludeChatIds={setExcludeChatIds}
            finalMessage={finalMessage}
            setFinalMessage={setFinalMessage}
            imageFile={imageFile}
            setImageFile={setImageFile}
            imagePreviewUrl={imagePreviewUrl}
            setImagePreviewUrl={setImagePreviewUrl}
            sendAt={sendAt}
            setSendAt={setSendAt}
            requireApproval={requireApproval}
            setRequireApproval={setRequireApproval}
            loadingChats={loadingChats}
            creating={creating}
            createButtonDisabled={createButtonDisabled}
            onClose={closeCreateModal}
            onSubmit={createScheduledMessage}
          />
        )}
      </div>
    </Shell>
  );
}

function CreateScheduleModal({
  isDark,
  accountOptions,
  chatOptions,
  chats,
  groupChats,
  selectedAccount,
  selectedChat,
  telegramAccountId,
  setTelegramAccountId,
  targetMode,
  setTargetMode,
  chatId,
  setChatId,
  selectedChatIds,
  setSelectedChatIds,
  excludeChatIds,
  setExcludeChatIds,
  finalMessage,
  setFinalMessage,
  imageFile,
  setImageFile,
  imagePreviewUrl,
  setImagePreviewUrl,
  sendAt,
  setSendAt,
  requireApproval,
  setRequireApproval,
  loadingChats,
  creating,
  createButtonDisabled,
  onClose,
  onSubmit,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 z-0 bg-black/55 backdrop-blur-sm"
        aria-label="Close modal backdrop"
      />

      <div
        className={`relative z-10 flex max-h-[92vh] w-full max-w-[760px] flex-col overflow-hidden rounded-[28px] shadow-2xl ${
          isDark ? "bg-[#34343c] text-white" : "bg-white text-[#171717]"
        }`}
      >
        <div
          className={`flex items-start justify-between gap-4 border-b px-5 py-4 ${
            isDark ? "border-white/[0.07]" : "border-[#eee4d5]"
          }`}
        >
          <div>
            <div
              className={`mb-1 text-[11px] font-medium uppercase tracking-[0.18em] ${
                isDark ? "text-white/38" : "text-[#8a8176]"
              }`}
            >
              Create schedule
            </div>

            <h3 className="text-[22px] font-semibold tracking-[-0.04em]">
              New scheduled message
            </h3>
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

        <div className="overflow-y-auto px-5 py-5">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className={labelClass(isDark)}>Telegram account</label>

              <CustomSelect
                isDark={isDark}
                value={telegramAccountId}
                placeholder="Select Telegram account"
                options={accountOptions}
                emptyText="No Telegram accounts"
                onChange={(value) => {
                  setTelegramAccountId(value);
                  setChatId("");
                  setSelectedChatIds([]);
                  setExcludeChatIds([]);
                }}
              />

              {selectedAccount && (
                <div className={hintClass(isDark)}>
                  Selected:{" "}
                  {selectedAccount.label?.trim() ||
                    selectedAccount.phoneNumber ||
                    "Telegram Account"}
                </div>
              )}
            </div>

            <div>
              <label className={labelClass(isDark)}>Target</label>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ["single_chat", "Single"],
                  ["selected_chats", "Selected"],
                  ["all_chats", "All chats"],
                  ["all_groups", "All groups"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setTargetMode(value);
                      setSelectedChatIds([]);
                      setExcludeChatIds([]);
                    }}
                    className={`min-h-[38px] rounded-[13px] px-2 text-[12px] transition ${
                      targetMode === value
                        ? "bg-[#d8c49a] text-[#171717]"
                        : isDark
                          ? "bg-[#292a2f] text-white/55 hover:bg-white/[0.06]"
                          : "bg-[#f7f2ea] text-[#70675c] hover:bg-[#efe6d8]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {targetMode === "single_chat" && (
                <div className="mt-3">
                  <CustomSelect
                    isDark={isDark}
                    value={chatId}
                    placeholder={
                      !telegramAccountId
                        ? "Select account first"
                        : loadingChats
                          ? "Loading chats..."
                          : "Select chat"
                    }
                    options={chatOptions}
                    emptyText="No chats synced"
                    disabled={
                      !telegramAccountId || loadingChats || !chats.length
                    }
                    loading={loadingChats}
                    onChange={setChatId}
                  />

                  {selectedChat && (
                    <div className={hintClass(isDark)}>
                      Selected: {selectedChat.title} · {selectedChat.type}
                    </div>
                  )}
                </div>
              )}

              {targetMode === "selected_chats" && (
                <>
                  <div className={hintClass(isDark)}>
                    Tick the chats you want. Selected: {selectedChatIds.length}
                  </div>

                  <CompactChatList
                    chats={chats}
                    isDark={isDark}
                    selectedIds={selectedChatIds}
                    onToggle={(id) => {
                      setSelectedChatIds((prev) =>
                        prev.includes(id)
                          ? prev.filter((x) => x !== id)
                          : [...prev, id],
                      );
                    }}
                  />
                </>
              )}

              {targetMode === "all_groups" && (
                <>
                  <div className={hintClass(isDark)}>
                    All groups selected. Untick groups you do not want.
                  </div>

                  <CompactChatList
                    chats={groupChats}
                    isDark={isDark}
                    selectedIds={groupChats
                      .map((chat) => chat._id)
                      .filter((id) => !excludeChatIds.includes(id))}
                    onToggle={(id) => {
                      setExcludeChatIds((prev) =>
                        prev.includes(id)
                          ? prev.filter((x) => x !== id)
                          : [...prev, id],
                      );
                    }}
                  />
                </>
              )}

              {targetMode === "all_chats" && (
                <div className={hintClass(isDark)}>
                  Message will be scheduled to all synced chats.
                </div>
              )}

              {telegramAccountId && chats.length === 0 && !loadingChats && (
                <div className={hintClass(isDark)}>
                  No chats found. Go to Telegram Chats page and sync this
                  account first.
                </div>
              )}
            </div>

            <div>
              <label className={labelClass(isDark)}>Message text</label>

              <textarea
                value={finalMessage}
                onChange={(e) => setFinalMessage(e.target.value)}
                placeholder="Write the message text here..."
                rows={4}
                className={`${inputClass(isDark)} min-h-[110px] resize-none py-3 leading-5`}
              />

              <div className={hintClass(isDark)}>
                If you upload an image, this text will be used as the Telegram
                caption.
              </div>
            </div>

            <div
              className={`rounded-[16px] border p-3 ${
                isDark
                  ? "border-white/[0.07] bg-[#292a2f]"
                  : "border-[#eee4d5] bg-[#f7f2ea]"
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className={labelClass(isDark)}>Optional image</label>

                {imageFile && (
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreviewUrl("");
                    }}
                    className="text-[11px] text-red-300"
                  >
                    Remove
                  </button>
                )}
              </div>

              {imagePreviewUrl && (
                <img
                  src={imagePreviewUrl}
                  alt="Selected preview"
                  className="mb-3 max-h-56 w-full rounded-[14px] object-cover"
                />
              )}

              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];

                  if (!file) return;

                  if (file.size > 5 * 1024 * 1024) {
                    toast.error("Image must be smaller than 5MB");
                    return;
                  }

                  setImageFile(file);
                  setImagePreviewUrl(URL.createObjectURL(file));
                }}
                className="block w-full text-[12px] opacity-80"
              />

              <div className={hintClass(isDark)}>
                If image is added, the message text becomes the Telegram
                caption.
              </div>
            </div>

            <div>
              <label className={labelClass(isDark)}>Send date/time (UAE)</label>

              <input
                value={sendAt}
                onChange={(e) => setSendAt(e.target.value)}
                type="datetime-local"
                className={inputClass(isDark)}
              />
            </div>

            <label
              className={`flex cursor-pointer items-center justify-between rounded-[16px] border p-3 ${
                isDark
                  ? "border-white/[0.07] bg-[#292a2f]"
                  : "border-[#eee4d5] bg-[#f7f2ea]"
              }`}
            >
              <div>
                <div className={smallTitleClass(isDark)}>Require approval</div>
                <div className={hintClass(isDark)}>
                  Admin must approve before sending.
                </div>
              </div>

              <input
                type="checkbox"
                checked={requireApproval}
                onChange={(e) => setRequireApproval(e.target.checked)}
                className="h-4 w-4 accent-[#d8c49a]"
              />
            </label>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={creating}
                className={modalSoftButtonClass(isDark)}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={createButtonDisabled}
                className={modalPrimaryButtonClass()}
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Create Schedule
              </button>
            </div>
          </form>
        </div>
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
  loading = false,
  compact = false,
}) {
  const wrapRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedOption = options.find(
    (option) => String(option.value) === String(value),
  );

  const filteredOptions = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    if (!cleanQuery) return options;

    return options.filter((option) => {
      const label = String(option.label || "").toLowerCase();
      const description = String(option.description || "").toLowerCase();

      return label.includes(cleanQuery) || description.includes(cleanQuery);
    });
  }, [options, query]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (!wrapRef.current) return;

      if (!wrapRef.current.contains(event.target)) {
        setOpen(false);
        setQuery("");
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
        className={`flex ${compact ? "min-h-[38px] rounded-[14px] px-3 text-[12px]" : "min-h-[44px] rounded-[15px] px-3.5 text-[13px]"} w-full items-center justify-between gap-3 border text-left outline-none transition ${
          disabled
            ? "cursor-not-allowed opacity-60"
            : isDark
              ? "hover:bg-white/[0.045]"
              : "hover:bg-white"
        } ${
          isDark
            ? "border-white/[0.08] bg-[#292a2f] text-white focus:border-[#d8c49a]/55 focus:ring-4 focus:ring-[#d8c49a]/10"
            : "border-[#eee4d5] bg-[#f7f2ea] text-[#201d19] focus:border-[#d8c49a] focus:ring-4 focus:ring-[#d8c49a]/16"
        }`}
      >
        <span className="min-w-0 flex-1">
          <span
            className={`block truncate ${
              selectedOption
                ? isDark
                  ? "text-white"
                  : "text-[#201d19]"
                : isDark
                  ? "text-white/35"
                  : "text-[#9b9081]"
            }`}
          >
            {loading
              ? "Loading..."
              : selectedOption
                ? selectedOption.label
                : placeholder}
          </span>

          {selectedOption?.description && (
            <span
              className={`mt-0.5 block truncate text-[11px] ${
                isDark ? "text-white/35" : "text-[#8d8375]"
              }`}
            >
              {selectedOption.description}
            </span>
          )}
        </span>

        {loading ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin opacity-60" />
        ) : (
          <ChevronDown
            className={`h-4 w-4 shrink-0 transition ${
              open ? "rotate-180" : ""
            } ${isDark ? "text-white/35" : "text-[#8d8375]"}`}
          />
        )}
      </button>

      {open && !disabled && (
        <div
          className={`absolute left-0 right-0 top-[calc(100%+8px)] z-[90] overflow-hidden rounded-[18px] border shadow-2xl ${
            isDark
              ? "border-white/[0.08] bg-[#202127]"
              : "border-[#eee4d5] bg-white"
          }`}
        >
          <div className="p-2">
            <div
              className={`flex min-h-[38px] items-center gap-2 rounded-[13px] px-3 ${
                isDark ? "bg-[#292a2f]" : "bg-[#f7f2ea]"
              }`}
            >
              <Search
                className={`h-3.5 w-3.5 ${
                  isDark ? "text-white/35" : "text-[#8d8375]"
                }`}
              />

              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                className={`w-full bg-transparent text-[12px] outline-none ${
                  isDark
                    ? "text-white placeholder:text-white/25"
                    : "text-[#201d19] placeholder:text-[#aaa096]"
                }`}
              />
            </div>
          </div>

          <div className="max-h-[240px] overflow-y-auto p-2 pt-0">
            {filteredOptions.map((option) => {
              const active = String(option.value) === String(value);

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`flex min-h-[42px] w-full items-center justify-between gap-3 rounded-[13px] px-3 text-left transition ${
                    active
                      ? "bg-[#d8c49a] text-[#171717]"
                      : isDark
                        ? "text-white/65 hover:bg-white/[0.06]"
                        : "text-[#201d19] hover:bg-[#f7f2ea]"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13px]">
                      {option.label}
                    </span>

                    {option.description && (
                      <span
                        className={`mt-0.5 block truncate text-[11px] ${
                          active
                            ? "text-[#171717]/60"
                            : isDark
                              ? "text-white/35"
                              : "text-[#8d8375]"
                        }`}
                      >
                        {option.description}
                      </span>
                    )}
                  </span>

                  {active && <Check className="h-4 w-4 shrink-0" />}
                </button>
              );
            })}

            {!filteredOptions.length && (
              <div
                className={`flex min-h-[90px] items-center justify-center rounded-[14px] px-3 text-center text-[12px] ${
                  isDark
                    ? "bg-white/[0.03] text-white/35"
                    : "bg-[#f7f2ea] text-[#8d8375]"
                }`}
              >
                {emptyText}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CompactChatList({ chats, isDark, selectedIds, onToggle }) {
  if (!chats.length) {
    return <div className={hintClass(isDark)}>No chats found.</div>;
  }

  return (
    <div
      className={`mt-3 max-h-[210px] overflow-y-auto rounded-[16px] border p-2 ${
        isDark
          ? "border-white/[0.07] bg-[#292a2f]"
          : "border-[#eee4d5] bg-[#f7f2ea]"
      }`}
    >
      <div className="space-y-1">
        {chats.map((chat) => {
          const checked = selectedIds.includes(chat._id);

          return (
            <label
              key={chat._id}
              className={`flex cursor-pointer items-center gap-2 rounded-[10px] px-2 py-1.5 text-[12px] ${
                isDark
                  ? "text-white/65 hover:bg-white/[0.04]"
                  : "text-[#51483d] hover:bg-white"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(chat._id)}
                className="h-3.5 w-3.5 accent-[#d8c49a]"
              />

              <span className="min-w-0 flex-1 truncate">
                {chat.title || "Untitled chat"}
              </span>

              <span className={isDark ? "text-white/30" : "text-[#9b9081]"}>
                {chat.type}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function getBackendBaseUrl() {
  const baseUrl = String(api?.defaults?.baseURL || "").replace(/\/+$/, "");

  // If your api baseURL is http://localhost:5000/api,
  // uploads are served from http://localhost:5000/uploads, not /api/uploads.
  return baseUrl.replace(/\/api$/, "");
}

function getImageSrc(imageUrl = "") {
  const cleanUrl = String(imageUrl || "").trim();

  if (!cleanUrl) return "";

  if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) {
    return cleanUrl;
  }

  const backendBaseUrl = getBackendBaseUrl();
  const uploadPath = cleanUrl.startsWith("/") ? cleanUrl : `/${cleanUrl}`;

  return backendBaseUrl ? `${backendBaseUrl}${uploadPath}` : uploadPath;
}

function MessageRow({ message, isDark, loading, onApprove, onCancel }) {
  const isScriptMessage =
    message.messageType === "script" || Boolean(message.scriptRunId);

  const canApprove = !isScriptMessage && message.status === "pending_approval";

  const canCancel =
    !isScriptMessage &&
    ["pending_approval", "approved", "draft"].includes(message.status);

  const accountLabel =
    message.telegramAccountId?.label ||
    message.telegramAccountId?.phoneNumber ||
    "Unknown account";

  const chatLabel = message.chatId?.title || "Unknown chat";
  const chatType = message.chatId?.type || "unknown";

  const imageSrc = getImageSrc(message.imageUrl);
  const isPhotoMessage = message.messageFormat === "photo" || Boolean(imageSrc);

  return (
    <tr
      className={`border-b last:border-b-0 ${
        isDark
          ? "border-white/[0.045] text-white hover:bg-white/[0.03]"
          : "border-[#eee4d5]/80 text-[#201d19] hover:bg-[#fbf8f2]"
      }`}
    >
      <td className="px-5 py-4">
        <StatusBadge status={message.status} isDark={isDark} />
      </td>

      <td className="px-5 py-4">
        <div className="flex max-w-[460px] items-start gap-3">
          <div className="min-w-0">
            <div
              className={`line-clamp-2 max-w-full overflow-hidden whitespace-pre-wrap break-words text-[13px] leading-5 ${
                isDark ? "text-white/78" : "text-[#2d2822]"
              }`}
            >
              {message.finalMessage || (imageSrc ? "Image message" : "")}
            </div>

            {imageSrc && (
              <div className={miniTextClass(isDark)}>
                {message.imageOriginalName || "Image attached"}
              </div>
            )}

            {message.error && message.status !== "cancelled" && (
              <div className="mt-2 max-w-[420px] truncate rounded-[10px] bg-red-400/10 px-2.5 py-1.5 text-[11px] text-red-300">
                {message.error}
              </div>
            )}
          </div>
          {imageSrc && (
            <img
              src={imageSrc}
              alt="Scheduled media"
              className={`h-14 w-14 shrink-0 rounded-[12px] object-cover ${
                isDark ? "bg-white/[0.06]" : "bg-[#f7f2ea]"
              }`}
            />
          )}
        </div>
      </td>

      <td className="px-5 py-4">
        <div
          className={`text-[12px] font-medium ${
            isPhotoMessage
              ? "text-[#e6d4ae]"
              : isDark
                ? "text-white/55"
                : "text-[#746b61]"
          }`}
        >
          {isPhotoMessage ? "Photo + caption" : "Text"}
        </div>

        {message.messageType === "ai" && (
          <div className={miniTextClass(isDark)}>AI message</div>
        )}
      </td>

      <td className="px-5 py-4">
        <div className="flex items-center gap-2 text-[13px]">
          <Smartphone className="h-3.5 w-3.5 opacity-45" />
          <span className="block max-w-full truncate">{accountLabel}</span>
        </div>
      </td>

      <td className="px-5 py-4">
        <div className="max-w-full truncate text-[13px]">{chatLabel}</div>
        <div className={miniTextClass(isDark)}>{chatType}</div>
      </td>

      <td className="px-5 py-4">
        <div className={`text-[13px] ${mutedTextClass(isDark)}`}>
          {formatDate(message.sendAt)}
        </div>

        {message.batchId && (
          <div className={miniTextClass(isDark)}>Batch message</div>
        )}
      </td>

      <td className="px-5 py-4">
        <div className="flex justify-end gap-2">
          {canApprove && (
            <button
              type="button"
              onClick={onApprove}
              disabled={loading}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-medium text-emerald-400 transition disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              Approve
            </button>
          )}

          {canCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-medium text-red-300 transition disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
            </button>
          )}

          {!canApprove && !canCancel && (
            <span className={miniTextClass(isDark)}>
              {isScriptMessage ? "Manage in Scripts" : "-"}
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

function StatusBadge({ status, isDark }) {
  const map = {
    draft: "Draft",
    pending_approval: "Pending",
    approved: "Approved",
    sending: "Sending",
    sent: "Sent",
    failed: "Failed",
    cancelled: "Cancelled",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-normal ${
        status === "sent"
          ? "bg-emerald-400/10 text-emerald-500"
          : status === "approved"
            ? "bg-blue-400/10 text-blue-400"
            : status === "failed" || status === "cancelled"
              ? "bg-red-400/10 text-red-300"
              : isDark
                ? "bg-white/[0.06] text-white/50"
                : "bg-[#f7f2ea] text-[#70675c]"
      }`}
    >
      {map[status] || status}
    </span>
  );
}

function Th({ children, align = "left", className = "" }) {
  return (
    <th
      className={`px-5 py-4 text-${align} text-[11px] font-semibold uppercase tracking-[0.16em] ${className}`}
    >
      {children}
    </th>
  );
}

function labelClass(isDark) {
  return `mb-1.5 block text-[12px] font-normal ${
    isDark ? "text-white/55" : "text-[#70675c]"
  }`;
}

function hintClass(isDark) {
  return `mt-1.5 text-[11px] ${isDark ? "text-white/32" : "text-[#8d8375]"}`;
}

function smallTitleClass(isDark) {
  return `text-[13px] font-medium ${isDark ? "text-white" : "text-[#201d19]"}`;
}

function miniTextClass(isDark) {
  return `mt-1 inline-flex items-center text-[11px] ${
    isDark ? "text-white/35" : "text-[#8d8375]"
  }`;
}

function mutedTextClass(isDark) {
  return isDark ? "text-white/45" : "text-[#746b61]";
}

function inputClass(isDark) {
  return `min-h-[44px] w-full rounded-[15px] border px-3.5 text-[13px] outline-none transition ${
    isDark
      ? "border-white/[0.08] bg-[#292a2f] text-white placeholder:text-white/22 focus:border-[#d8c49a]/55 focus:ring-4 focus:ring-[#d8c49a]/10"
      : "border-[#eee4d5] bg-[#f7f2ea] text-[#201d19] placeholder:text-[#aaa096] focus:border-[#d8c49a] focus:ring-4 focus:ring-[#d8c49a]/16"
  }`;
}

function luxuryPrimaryButtonClass(extra = "") {
  return `inline-flex min-h-[38px] items-center justify-center gap-2 rounded-[14px] bg-[#d8c49a] px-4 text-[12px] font-semibold text-[#171717] shadow-[0_10px_24px_rgba(216,196,154,0.12)] transition hover:bg-[#e4d1a9] disabled:cursor-not-allowed disabled:opacity-60 ${extra}`;
}

function luxurySoftButtonClass(isDark) {
  return `inline-flex min-h-[38px] items-center justify-center gap-2 rounded-[14px] px-4 text-[12px] font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
    isDark
      ? "bg-white/[0.06] text-white/58 hover:bg-white/[0.10]"
      : "bg-white text-[#5c5348] hover:bg-[#f7f2ea]"
  }`;
}

function modalPrimaryButtonClass(extra = "") {
  return `inline-flex min-h-[42px] items-center justify-center gap-2 rounded-[14px] bg-[#d8c49a] px-4 text-[13px] font-semibold text-[#171717] transition hover:bg-[#e4d1a9] disabled:cursor-not-allowed disabled:opacity-60 ${extra}`;
}

function modalSoftButtonClass(isDark) {
  return `inline-flex min-h-[42px] items-center justify-center gap-2 rounded-[14px] px-4 text-[13px] font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
    isDark
      ? "bg-white/[0.06] text-white/58 hover:bg-white/[0.10]"
      : "bg-[#f7f2ea] text-[#5c5348] hover:bg-[#efe6d8]"
  }`;
}

function iconButtonClass(isDark) {
  return `inline-flex h-9 w-9 items-center justify-center rounded-2xl transition disabled:opacity-60 ${
    isDark
      ? "bg-white/[0.08] text-white/60 hover:bg-white/[0.12]"
      : "bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0]"
  }`;
}

function paginationButtonClass(isDark) {
  return `inline-flex min-h-[36px] items-center justify-center rounded-xl px-3 text-[12px] font-medium transition disabled:cursor-not-allowed disabled:opacity-45 ${
    isDark
      ? "bg-white/[0.06] text-white/60 hover:bg-white/[0.10]"
      : "bg-[#f7f2ea] text-[#5c5348] hover:bg-[#efe6d8]"
  }`;
}

function formatDate(value) {
  if (!value) return "No date";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}
