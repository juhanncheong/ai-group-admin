import { useEffect, useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Loader2,
  RefreshCw,
  Send,
  Smartphone,
  XCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import Shell from "../components/Shell";
import { api } from "../api";
import { useTheme } from "../context/ThemeContext";

const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

const CACHE_KEYS = {
  accounts: "messageLogs:accounts",
  logs: "messageLogs:logs",
  telegramAccountId: "messageLogs:telegramAccountId",
  statusFilter: "messageLogs:statusFilter",
  pageSize: "messageLogs:pageSize",
};

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

function getLogsCacheKey(accountId = "") {
  return `${CACHE_KEYS.logs}:${accountId || "all"}`;
}

export default function MessageLogs() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [accounts, setAccounts] = useState(() => {
    return cacheGet(CACHE_KEYS.accounts) || [];
  });

  const [telegramAccountId, setTelegramAccountId] = useState(() => {
    return getRememberedValue(CACHE_KEYS.telegramAccountId, "");
  });

  const [statusFilter, setStatusFilter] = useState(() => {
    return getRememberedValue(CACHE_KEYS.statusFilter, "all");
  });

  const [pageSize, setPageSize] = useState(() => {
    return Number(getRememberedValue(CACHE_KEYS.pageSize, "10")) || 10;
  });

  const [logs, setLogs] = useState(() => {
    const accountId = getRememberedValue(CACHE_KEYS.telegramAccountId, "");
    return cacheGet(getLogsCacheKey(accountId)) || [];
  });

  const [loading, setLoading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [pageSizeDropdownOpen, setPageSizeDropdownOpen] = useState(false);

  const [page, setPage] = useState(1);

  const selectedAccount = useMemo(() => {
    return (
      accounts.find((account) => account._id === telegramAccountId) || null
    );
  }, [accounts, telegramAccountId]);

  const filteredLogs = useMemo(() => {
    if (statusFilter === "all") return logs;
    return logs.filter((log) => log.status === statusFilter);
  }, [logs, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: logs.length,
      sent: logs.filter((log) => log.status === "sent").length,
      failed: logs.filter((log) => log.status === "failed").length,
    };
  }, [logs]);

  const accountOptions = useMemo(() => {
    return [
      {
        value: "",
        label: "All accounts",
        description: "",
      },
      ...accounts.map((account) => ({
        value: account._id,
        label: `${account.label || "Telegram Account"} - ${
          account.phoneNumber || "No phone"
        } - ${account.status || "unknown"}`,
        description: "",
      })),
    ];
  }, [accounts]);

  const statusOptions = useMemo(() => {
    return [
      {
        value: "all",
        label: "All logs",
      },
      {
        value: "sent",
        label: "Sent",
      },
      {
        value: "failed",
        label: "Failed",
      },
    ];
  }, []);

  const pageSizeOptions = useMemo(() => {
    return [
      { value: "10", label: "10 per page" },
      { value: "25", label: "25 per page" },
      { value: "50", label: "50 per page" },
      { value: "100", label: "100 per page" },
    ];
  }, []);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));

  const paginatedLogs = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, page, pageSize]);

  const pageStart = filteredLogs.length ? (page - 1) * pageSize + 1 : 0;
  const pageEnd = Math.min(page * pageSize, filteredLogs.length);

  useEffect(() => {
    loadPageData({
      silent: accounts.length > 0,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    rememberValue(CACHE_KEYS.telegramAccountId, telegramAccountId);
  }, [telegramAccountId]);

  useEffect(() => {
    rememberValue(CACHE_KEYS.statusFilter, statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    rememberValue(CACHE_KEYS.pageSize, pageSize);
  }, [pageSize]);

  useEffect(() => {
    setPage(1);
  }, [telegramAccountId, statusFilter, pageSize]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    loadLogs(telegramAccountId, {
      silent: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telegramAccountId]);

  async function loadPageData(options = {}) {
    const cachedAccounts = cacheGet(CACHE_KEYS.accounts);
    const hasCache = Array.isArray(cachedAccounts);
    const silent = options.silent ?? hasCache;

    try {
      if (hasCache) {
        setAccounts(cachedAccounts);
      }

      if (!silent) {
        setLoadingAccounts(true);
      }

      const res = await api.get("/api/telegram-auth/accounts");
      const accountList = Array.isArray(res.data?.data) ? res.data.data : [];

      cacheSet(CACHE_KEYS.accounts, accountList);
      setAccounts(accountList);

      setTelegramAccountId((current) => {
        if (!current) return "";

        const stillExists = accountList.some(
          (account) => account._id === current,
        );

        return stillExists ? current : "";
      });
    } catch (err) {
      console.error("Load message logs page error:", err);

      if (!silent) {
        toast.error(
          err?.response?.data?.message ||
            err?.response?.data?.error ||
            "Failed to load message logs page",
        );
      }
    } finally {
      if (!silent) {
        setLoadingAccounts(false);
      }
    }
  }

  async function loadLogs(accountId = telegramAccountId, options = {}) {
    const cacheKey = getLogsCacheKey(accountId);
    const cached = cacheGet(cacheKey);
    const hasCache = Array.isArray(cached);
    const silent = options.silent ?? hasCache;

    try {
      if (hasCache) {
        setLogs(cached);
      }

      if (!silent) {
        setLoading(true);
      }

      const url = accountId
        ? `/api/message-logs?telegramAccountId=${accountId}`
        : "/api/message-logs";

      const res = await api.get(url);
      const list = Array.isArray(res.data?.data) ? res.data.data : [];

      cacheSet(cacheKey, list);
      setLogs(list);
    } catch (err) {
      console.error("Load message logs error:", err);

      if (!silent) {
        toast.error(
          err?.response?.data?.message ||
            err?.response?.data?.error ||
            "Failed to load message logs",
        );
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }

  async function refreshAll() {
    await loadPageData({
      silent: false,
    });

    await loadLogs(telegramAccountId, {
      silent: false,
    });
  }

  return (
    <Shell title="Message Logs">
      <div
        className={`-mx-3 -my-3 min-h-[calc(100vh-78px)] px-6 py-6 ${
          isDark ? "bg-[#202127]" : "bg-[#f4efe6]"
        }`}
      >
        <section className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                  isDark
                    ? "bg-white/[0.06] text-white/65"
                    : "bg-white text-[#6d6254]"
                }`}
              >
                <Send className="h-4 w-4" />
              </div>

              <div className="min-w-0">
                <div
                  className={`text-[11px] font-medium uppercase tracking-[0.18em] ${
                    isDark ? "text-white/38" : "text-[#8a8176]"
                  }`}
                >
                  Delivery history
                </div>

                <h2
                  className={`mt-0.5 truncate text-[22px] font-semibold tracking-[-0.04em] ${
                    isDark ? "text-white" : "text-[#201d19]"
                  }`}
                >
                  Message Logs
                </h2>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={refreshAll}
                disabled={loading || loadingAccounts}
                className={topSoftButtonClass(isDark)}
              >
                {loading || loadingAccounts ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Refresh
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <MiniStat label="Total logs" value={stats.total} isDark={isDark} />

            <MiniStat label="Sent" value={stats.sent} isDark={isDark} active />

            <MiniStat label="Failed" value={stats.failed} isDark={isDark} />
          </div>

          <div
            className={`rounded-[24px] border p-4 ${
              isDark
                ? "border-white/[0.06] bg-[#282a30]"
                : "border-[#eee4d5] bg-white"
            }`}
          >
            <div className="grid gap-3 lg:grid-cols-[1fr_260px]">
              <div>
                <label className={labelClass(isDark)}>Telegram account</label>

                <CustomDropdown
                  isDark={isDark}
                  value={telegramAccountId}
                  open={accountDropdownOpen}
                  setOpen={setAccountDropdownOpen}
                  options={accountOptions}
                  placeholder="All accounts"
                  onChange={(value) => {
                    setTelegramAccountId(value);
                    setStatusFilter("all");
                  }}
                />

                {selectedAccount && (
                  <div className={hintClass(isDark)}>
                    Showing logs for:{" "}
                    {selectedAccount.label ||
                      selectedAccount.phoneNumber ||
                      "Selected account"}
                  </div>
                )}
              </div>

              <div>
                <label className={labelClass(isDark)}>Status filter</label>

                <CustomDropdown
                  isDark={isDark}
                  value={statusFilter}
                  open={statusDropdownOpen}
                  setOpen={setStatusDropdownOpen}
                  options={statusOptions}
                  placeholder="All logs"
                  onChange={setStatusFilter}
                />
              </div>
            </div>

            {selectedAccount && (
              <div
                className={`mt-4 inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs ${
                  isDark
                    ? "bg-white/[0.06] text-white/45"
                    : "bg-[#f7f2ea] text-[#70675c]"
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                Account:{" "}
                {selectedAccount.label ||
                  selectedAccount.phoneNumber ||
                  "Selected account"}
              </div>
            )}
          </div>

          <div
            className={`overflow-hidden rounded-[24px] border ${
              isDark
                ? "border-white/[0.06] bg-[#282a30]"
                : "border-[#eee4d5] bg-white"
            }`}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] border-collapse">
                <thead>
                  <tr
                    className={
                      isDark
                        ? "border-b border-white/[0.05] bg-[#24252b] text-white/42"
                        : "border-b border-[#eee4d5] bg-[#fbf8f2] text-[#8a8176]"
                    }
                  >
                    <Th>Status</Th>
                    <Th>Date</Th>
                    <Th>Account</Th>
                    <Th>Chat</Th>
                    <Th>Message</Th>
                    <Th>Telegram ID</Th>
                    <Th>Scheduled ID</Th>
                    <Th>Error</Th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-16 text-center">
                        <div
                          className={`inline-flex items-center gap-2 text-sm ${
                            isDark ? "text-white/50" : "text-[#746b61]"
                          }`}
                        >
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading message logs...
                        </div>
                      </td>
                    </tr>
                  ) : filteredLogs.length ? (
                    paginatedLogs.map((log) => (
                      <LogRow key={log._id} log={log} isDark={isDark} />
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-5 py-16 text-center">
                        <EmptyTableState isDark={isDark} />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {filteredLogs.length > 0 && (
              <div
                className={`flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
                  isDark ? "border-white/[0.06]" : "border-[#eee4d5]"
                }`}
              >
                <div className={`text-[12px] ${mutedTextClass(isDark)}`}>
                  Showing {pageStart} - {pageEnd} of {filteredLogs.length}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="w-[150px]">
                    <CustomDropdown
                      isDark={isDark}
                      value={String(pageSize)}
                      open={pageSizeDropdownOpen}
                      setOpen={setPageSizeDropdownOpen}
                      options={pageSizeOptions}
                      placeholder="10 per page"
                      onChange={(value) => {
                        setPageSize(Number(value) || 10);
                        setPage(1);
                      }}
                      compact
                      dropUp
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={page <= 1}
                    className={paginationButtonClass(isDark)}
                  >
                    Prev
                  </button>

                  <div
                    className={`inline-flex h-9 min-w-[88px] items-center justify-center rounded-[12px] px-3 text-[12px] ${
                      isDark
                        ? "bg-white/[0.055] text-white/55"
                        : "bg-[#f7f2ea] text-[#70675c]"
                    }`}
                  >
                    {page} / {totalPages}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    disabled={page >= totalPages}
                    className={paginationButtonClass(isDark)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </Shell>
  );
}

function LogRow({ log, isDark }) {
  const accountLabel =
    log.telegramAccountId?.label ||
    log.telegramAccountId?.phoneNumber ||
    "Unknown account";

  const chatLabel = log.chatId?.title || "Unknown chat";
  const chatType = log.chatId?.type || "unknown";

  return (
    <tr className={tableRowClass(isDark)}>
      <td className="px-5 py-4">
        <StatusBadge status={log.status} />
      </td>

      <td className={`px-5 py-4 text-[12px] ${mutedTextClass(isDark)}`}>
        {formatDate(log.sentAt || log.createdAt)}
      </td>

      <td className="px-5 py-4">
        <div
          className={`max-w-[180px] truncate text-[13px] font-medium ${
            isDark ? "text-white" : "text-[#201d19]"
          }`}
        >
          {accountLabel}
        </div>
      </td>

      <td className="px-5 py-4">
        <div
          className={`max-w-[190px] truncate text-[13px] font-medium ${
            isDark ? "text-white" : "text-[#201d19]"
          }`}
        >
          {chatLabel}
        </div>

        <div className={hintNoMarginClass(isDark)}>{chatType}</div>
      </td>

      <td className="px-5 py-4">
        <div
          className={`max-w-[360px] whitespace-pre-wrap text-[12px] leading-5 ${
            isDark ? "text-white/65" : "text-[#70675c]"
          }`}
        >
          {log.finalMessage || "-"}
        </div>
      </td>

      <td className={`px-5 py-4 text-[12px] ${mutedTextClass(isDark)}`}>
        {log.telegramMessageId || "-"}
      </td>

      <td className={`px-5 py-4 text-[12px] ${mutedTextClass(isDark)}`}>
        {log.scheduledMessageId?._id || log.scheduledMessageId || "-"}
      </td>

      <td className="px-5 py-4">
        <div className="max-w-[260px] truncate text-[12px] text-red-300">
          {log.status === "failed" ? log.error || "Failed" : "-"}
        </div>
      </td>
    </tr>
  );
}

function StatusBadge({ status }) {
  const isSent = status === "sent";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-normal ${
        isSent
          ? "bg-emerald-400/10 text-emerald-300"
          : "bg-red-400/10 text-red-300"
      }`}
    >
      {isSent ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : (
        <XCircle className="h-3.5 w-3.5" />
      )}
      {isSent ? "Sent" : "Failed"}
    </span>
  );
}

function CustomDropdown({
  isDark,
  value,
  options = [],
  open,
  setOpen,
  onChange,
  placeholder = "Select option",
  disabled = false,
  compact = false,
  dropUp = false,
}) {
  const selected = options.find((item) => String(item.value) === String(value));

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => !prev);
        }}
        className={`flex w-full items-center justify-between gap-3 rounded-[16px] border px-4 text-left outline-none transition ${
          compact ? "min-h-[38px] text-[12px]" : "min-h-[48px] text-[14px]"
        } ${
          disabled
            ? "cursor-not-allowed opacity-60"
            : isDark
              ? "hover:bg-[#202126]"
              : "hover:bg-white"
        } ${
          isDark
            ? "border-white/[0.10] bg-[#24252b] text-white focus:border-[#d8c49a]/70 focus:ring-4 focus:ring-[#d8c49a]/10"
            : "border-[#eadfce] bg-[#fbf7f0] text-[#201d19] focus:border-[#d8c49a] focus:ring-4 focus:ring-[#d8c49a]/16"
        }`}
      >
        <span className="min-w-0">
          <span
            className={`block truncate ${
              selected
                ? isDark
                  ? "text-white"
                  : "text-[#201d19]"
                : isDark
                  ? "text-white/28"
                  : "text-[#aaa096]"
            }`}
          >
            {selected ? selected.label : placeholder}
          </span>

          {!compact && selected?.description && (
            <span
              className={`mt-0.5 block truncate text-[11px] ${
                isDark ? "text-white/35" : "text-[#8d8375]"
              }`}
            >
              {selected.description}
            </span>
          )}
        </span>

        <ChevronDown
          className={`h-4 w-4 shrink-0 transition ${
            open ? "rotate-180" : ""
          } ${isDark ? "text-white/35" : "text-[#8d8375]"}`}
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
            className={`absolute left-0 right-0 z-[106] overflow-hidden rounded-[18px] border shadow-2xl ${
              dropUp ? "bottom-[calc(100%+8px)]" : "top-[calc(100%+8px)]"
            } ${
              isDark
                ? "border-white/[0.08] bg-[#202126]"
                : "border-[#efe6d8] bg-white"
            }`}
          >
            <div className="max-h-[260px] overflow-y-auto p-2">
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
                    className={`flex min-h-[40px] w-full items-center justify-between gap-3 rounded-[13px] px-3 text-left transition ${
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
                    </span>

                    {active && <Check className="h-4 w-4 shrink-0" />}
                  </button>
                );
              })}

              {!options.length && (
                <div
                  className={`flex min-h-[90px] items-center justify-center rounded-[14px] px-3 text-center text-[12px] ${
                    isDark
                      ? "bg-white/[0.03] text-white/35"
                      : "bg-[#f7f2ea] text-[#8d8375]"
                  }`}
                >
                  No options
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MiniStat({ label, value, isDark, active = false }) {
  return (
    <div
      className={`rounded-[22px] border p-4 ${
        active
          ? isDark
            ? "border-emerald-400/10 bg-emerald-400/10"
            : "border-emerald-100 bg-emerald-50"
          : isDark
            ? "border-white/[0.06] bg-[#282a30]"
            : "border-[#eee4d5] bg-white"
      }`}
    >
      <div
        className={`text-[11px] font-normal uppercase tracking-[0.18em] ${
          active
            ? isDark
              ? "text-emerald-300/80"
              : "text-emerald-700"
            : isDark
              ? "text-white/32"
              : "text-[#9b9081]"
        }`}
      >
        {label}
      </div>

      <div
        className={`mt-2 text-xl font-medium ${
          active
            ? isDark
              ? "text-emerald-200"
              : "text-emerald-700"
            : isDark
              ? "text-white"
              : "text-[#201d19]"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function EmptyTableState({ isDark }) {
  return (
    <div className="mx-auto max-w-sm text-center">
      <div
        className={`mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] ${
          isDark
            ? "bg-white/[0.06] text-white/45"
            : "bg-[#f7f2ea] text-[#746b61]"
        }`}
      >
        <Send className="h-6 w-6" />
      </div>

      <div
        className={`mt-3 text-sm font-medium ${
          isDark ? "text-white" : "text-[#201d19]"
        }`}
      >
        No logs found
      </div>

      <p
        className={`mt-1 text-xs leading-5 ${
          isDark ? "text-white/42" : "text-[#70675c]"
        }`}
      >
        Logs will appear after the scheduler sends or fails a message.
      </p>
    </div>
  );
}

function Th({ children, align = "left" }) {
  return (
    <th
      className={`px-5 py-4 text-${align} text-[11px] font-semibold uppercase tracking-[0.16em]`}
    >
      {children}
    </th>
  );
}

function tableRowClass(isDark) {
  return `border-b last:border-b-0 ${
    isDark
      ? "border-white/[0.045] text-white hover:bg-white/[0.03]"
      : "border-[#eee4d5]/80 text-[#201d19] hover:bg-[#fbf8f2]"
  }`;
}

function labelClass(isDark) {
  return `mb-1.5 block text-[12px] font-normal ${
    isDark ? "text-white/55" : "text-[#70675c]"
  }`;
}

function hintClass(isDark) {
  return `mt-1.5 text-[11px] ${isDark ? "text-white/32" : "text-[#8d8375]"}`;
}

function hintNoMarginClass(isDark) {
  return `text-[11px] ${isDark ? "text-white/32" : "text-[#8d8375]"}`;
}

function mutedTextClass(isDark) {
  return isDark ? "text-white/45" : "text-[#70675c]";
}

function topSoftButtonClass(isDark) {
  return `inline-flex h-10 items-center justify-center gap-2 rounded-[14px] px-4 text-[12px] font-medium leading-none transition disabled:cursor-not-allowed disabled:opacity-60 ${
    isDark
      ? "border border-white/[0.07] bg-white/[0.045] text-white/58 hover:bg-white/[0.08] hover:text-white/75"
      : "border border-[#eee4d5] bg-white text-[#5c5348] hover:bg-[#f7f2ea]"
  }`;
}

function paginationButtonClass(isDark) {
  return `inline-flex h-9 min-w-[70px] items-center justify-center rounded-[12px] px-3 text-[12px] font-medium transition disabled:cursor-not-allowed disabled:opacity-45 ${
    isDark
      ? "border border-white/[0.07] bg-white/[0.045] text-white/58 hover:bg-white/[0.08]"
      : "border border-[#eee4d5] bg-white text-[#5c5348] hover:bg-[#f7f2ea]"
  }`;
}

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}
