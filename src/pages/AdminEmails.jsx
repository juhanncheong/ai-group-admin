import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Shell from "../components/Shell";
import { toast } from "react-toastify";
import { useTheme } from "../context/ThemeContext";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "https://slimy-xenia-jayjay122-018fd7f8.koyeb.app";

const CACHE_KEY = "admin_emails_page_cache_v2";
const SUPPORT_URL = "https://additive-travel.com/chat";

function safeNum(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

function loadCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveCache(payload) {
  try {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        ...payload,
        savedAt: Date.now(),
      })
    );
  } catch {
    // ignore cache errors
  }
}

function Modal({ open, title, subtitle, children, onClose, footer }) {
  const cardRef = useRef(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e) {
      if (e.key === "Escape") onClose?.();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const cardClass =
    theme === "dark"
      ? "relative w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-[#0b1220]/95 shadow-2xl"
      : "relative w-full max-w-3xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl";

  const titleClass =
    theme === "dark"
      ? "text-base font-semibold text-white"
      : "text-base font-semibold text-gray-900";

  const subtitleClass =
    theme === "dark" ? "mt-1 text-xs text-white/50" : "mt-1 text-xs text-gray-500";

  const closeClass =
    theme === "dark"
      ? "rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white/70 hover:bg-white/10"
      : "rounded-xl border border-gray-200 bg-white px-2.5 py-2 text-xs text-gray-600 hover:bg-gray-50";

  const footerClass =
    theme === "dark"
      ? "border-t border-white/10 bg-white/5 px-5 py-4"
      : "border-t border-gray-200 bg-gray-50 px-5 py-4";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
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

      <div ref={cardRef} className={cardClass}>
        <div className="flex items-start justify-between gap-3 px-5 py-4">
          <div>
            <div className={titleClass}>{title}</div>
            {subtitle ? <div className={subtitleClass}>{subtitle}</div> : null}
          </div>

          <button onClick={onClose} className={closeClass}>
            ✕
          </button>
        </div>

        <div className="max-h-[72vh] overflow-y-auto px-5 pb-5">{children}</div>

        {footer ? <div className={footerClass}>{footer}</div> : null}
      </div>
    </div>
  );
}

function PremiumDropdown({
  value,
  options,
  onChange,
  placeholder = "Select option",
  getLabel = (item) => item?.label || item?.name || item?.value || "",
  getValue = (item) => item?.value || item?.key || "",
  disabled = false,
}) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const isDark = theme === "dark";

  useEffect(() => {
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const selected = options.find((item) => String(getValue(item)) === String(value));

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-xs transition disabled:cursor-not-allowed disabled:opacity-50 ${
          isDark
            ? "border-white/10 bg-[#111827] text-white hover:bg-[#182236]"
            : "border-gray-300 bg-white text-gray-900 shadow-sm hover:bg-gray-50"
        }`}
      >
        <div className="min-w-0">
          <div className={`truncate font-semibold ${selected ? "" : "opacity-50"}`}>
            {selected ? getLabel(selected) : placeholder}
          </div>

          {selected?.subject ? (
            <div className={`mt-1 truncate text-[11px] ${isDark ? "text-white/45" : "text-gray-500"}`}>
              {selected.subject}
            </div>
          ) : null}
        </div>

        <span
          className={`shrink-0 text-sm transition ${
            open ? "rotate-180" : ""
          } ${isDark ? "text-white/50" : "text-gray-500"}`}
        >
          ⌄
        </span>
      </button>

      {open ? (
        <div
          className={`absolute left-0 right-0 top-[calc(100%+8px)] z-[70] overflow-hidden rounded-2xl border shadow-2xl ${
            isDark
              ? "border-white/10 bg-[#0b1220] text-white"
              : "border-gray-200 bg-white text-gray-900"
          }`}
        >
          <div className="max-h-64 overflow-y-auto p-1.5">
            {options.length === 0 ? (
              <div className={`px-3 py-3 text-xs ${isDark ? "text-white/45" : "text-gray-500"}`}>
                No options found
              </div>
            ) : (
              options.map((item) => {
                const itemValue = getValue(item);
                const active = String(itemValue) === String(value);

                return (
                  <button
                    key={itemValue}
                    type="button"
                    onClick={() => {
                      onChange(itemValue);
                      setOpen(false);
                    }}
                    className={`w-full rounded-xl px-3 py-3 text-left text-xs transition ${
                      active
                        ? isDark
                          ? "bg-blue-500/15 text-blue-100"
                          : "bg-blue-50 text-blue-700"
                        : isDark
                        ? "text-white/75 hover:bg-white/[0.07]"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{getLabel(item)}</div>

                        {item?.subject ? (
                          <div className={`mt-1 truncate text-[11px] ${isDark ? "text-white/45" : "text-gray-500"}`}>
                            {item.subject}
                          </div>
                        ) : null}
                      </div>

                      {active ? (
                        <span className="shrink-0 text-xs font-bold">✓</span>
                      ) : null}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function AdminEmails() {
  const { theme } = useTheme();
  const [searchParams] = useSearchParams();
  const initialUid = String(searchParams.get("uid") || "").trim();

  const cache = loadCache();

  const [templates, setTemplates] = useState(() => cache?.templates || []);
  const [logs, setLogs] = useState(() => cache?.logs || []);
  const [pagination, setPagination] = useState(
    () =>
      cache?.pagination || {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1,
      }
  );

  const [loading, setLoading] = useState(() => !cache?.logs?.length);
  const [templatesLoading, setTemplatesLoading] = useState(
    () => !cache?.templates?.length
  );
  const [busy, setBusy] = useState(false);
  const [searchBusy, setSearchBusy] = useState(false);

  const [q, setQ] = useState(() => cache?.q || "");

  const [modalOpen, setModalOpen] = useState(Boolean(initialUid));
  const [recipientType, setRecipientType] = useState(
    () => cache?.recipientType || "USER"
  );
  const [uid, setUid] = useState(() => initialUid || cache?.uid || "");
  const [guestEmail, setGuestEmail] = useState(() => cache?.guestEmail || "");
  const [selectedTemplateKey, setSelectedTemplateKey] = useState(
    () => cache?.selectedTemplateKey || ""
  );
  const [creditScore, setCreditScore] = useState(() => cache?.creditScore || "");
  const [withdrawalAmount, setWithdrawalAmount] = useState(() => cache?.withdrawalAmount || "");
  const [taxRate, setTaxRate] = useState(() => cache?.taxRate || "");
  const [pickedUser, setPickedUser] = useState(() => cache?.pickedUser || null);

  const isDark = theme === "dark";

  const mutedText = isDark ? "text-white/50" : "text-gray-500";
  const softText = isDark ? "text-white/70" : "text-gray-600";
  const strongText = isDark ? "text-white" : "text-gray-900";

  const cardClass = isDark
    ? "rounded-2xl border border-white/10 bg-white/5"
    : "rounded-2xl border border-gray-200 bg-white shadow-sm";

  const sectionClass = isDark
    ? "rounded-3xl border border-white/10 bg-white/[0.03] p-4"
    : "rounded-3xl border border-gray-200 bg-gray-50 p-4";

  const innerCardClass = isDark
    ? "rounded-2xl border border-white/10 bg-white/[0.04] p-4"
    : "rounded-2xl border border-gray-200 bg-white p-4";

  const inputClass = isDark
    ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/90 placeholder:text-white/30 outline-none focus:border-white/20"
    : "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-400";

  const buttonClass = isDark
    ? "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 hover:bg-white/10"
    : "rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 hover:bg-gray-50";

  const primaryButtonClass = isDark
    ? "rounded-xl border border-blue-500/25 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-200 hover:bg-blue-500/15 disabled:cursor-not-allowed disabled:opacity-50"
    : "rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50";

  const sendButtonClass = isDark
    ? "rounded-xl border border-emerald-500/25 bg-emerald-500/15 px-4 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
    : "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50";

  const dangerPanelClass = isDark
    ? "rounded-2xl border border-red-500/25 bg-red-500/10 p-3 text-xs text-red-200"
    : "rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-700";

  const successPanelClass = isDark
    ? "rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-xs text-emerald-200"
    : "rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700";

  const labelClass = isDark ? "text-xs text-white/50" : "text-xs text-gray-500";

  const valueClass = isDark
    ? "mt-1 text-sm font-semibold text-white"
    : "mt-1 text-sm font-semibold text-gray-900";

  const hintClass = isDark
    ? "mt-2 text-[11px] text-white/40"
    : "mt-2 text-[11px] text-gray-500";

  const statusReadyClass = isDark
    ? "inline-flex rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-200"
    : "inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700";

  const statusLockedClass = isDark
    ? "inline-flex rounded-full border border-red-500/25 bg-red-500/10 px-2.5 py-1 text-[10px] font-semibold text-red-200"
    : "inline-flex rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-semibold text-red-700";

  const statusNeutralClass = isDark
    ? "inline-flex rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10px] font-semibold text-white/80"
    : "inline-flex rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-[10px] font-semibold text-gray-700";

  const tableWrapClass = isDark
    ? "mt-4 overflow-hidden rounded-2xl border border-white/10"
    : "mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm";

  const tableHeaderClass = isDark
    ? "bg-white/5 px-4 py-3 text-sm font-semibold text-white"
    : "bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900";

  const tableHeadClass = isDark
    ? "bg-white/5 text-xs text-white/60"
    : "bg-gray-50 text-xs text-gray-500";

  const tableBodyClass = isDark ? "divide-y divide-white/10" : "divide-y divide-gray-200";

  const tableRowClass = isDark ? "hover:bg-white/5" : "hover:bg-gray-50";

  const footerClass = isDark
    ? "flex flex-col gap-3 border-t border-white/10 bg-white/5 px-4 py-3 md:flex-row md:items-center md:justify-between"
    : "flex flex-col gap-3 border-t border-gray-200 bg-gray-50 px-4 py-3 md:flex-row md:items-center md:justify-between";

  const skeletonClass = isDark ? "h-3 rounded-full bg-white/10" : "h-3 rounded-full bg-gray-200";

  const selectedTemplate = useMemo(() => {
    if (!templates.length) return null;

    return (
      templates.find((item) => item.key === selectedTemplateKey) ||
      templates[0]
    );
  }, [templates, selectedTemplateKey]);

  const isCreditScoreTemplate =
    selectedTemplate?.key === "credit_score_withdrawal_notice";
  
  const isTaxTemplate =
    selectedTemplate?.key === "tax_withholding_notice";
  
  const taxPreview = useMemo(() => {
    const amount = Number(withdrawalAmount);
    const rate = Number(taxRate);
  
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(rate) || rate < 0) {
      return {
        taxAmount: "",
      };
    }
    
    const taxAmount = Number((amount * (rate / 100)).toFixed(2));
    
    return {
      taxAmount: taxAmount.toFixed(2),
    };
  }, [withdrawalAmount, taxRate]);

  const finalUid = String(uid || pickedUser?.uid || "").trim();

  const finalRecipientEmail =
    recipientType === "USER"
      ? pickedUser?.emailVerified && pickedUser?.email
        ? pickedUser.email
        : ""
      : String(guestEmail || "").trim().toLowerCase();

  const finalCreditScore =
    creditScore !== ""
      ? String(creditScore)
      : pickedUser?.creditScore !== undefined && pickedUser?.creditScore !== null
      ? String(pickedUser.creditScore)
      : "";

  const canSend = Boolean(
    selectedTemplate?.key &&
      finalUid &&
      finalRecipientEmail &&
      !busy &&
      (
        isCreditScoreTemplate
          ? finalCreditScore !== ""
          : isTaxTemplate
          ? withdrawalAmount !== "" && taxRate !== ""
          : true
      )
  );

  function getAuthHeaders() {
    const token = localStorage.getItem("admin_token");
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
  }

  async function fetchJSON(url, options = {}) {
    const auth = getAuthHeaders();

    if (!auth) {
      throw new Error("Please login again.");
    }

    const res = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        ...auth,
      },
    });

    let data = {};
    try {
      data = await res.json();
    } catch {
      throw new Error("Server returned non-JSON response.");
    }

    if (!res.ok) {
      throw new Error(data?.message || `Request failed (${res.status})`);
    }

    return data;
  }

  async function loadTemplates({ silent = false } = {}) {
    if (!silent) setTemplatesLoading(true);

    try {
      const data = await fetchJSON(`${API_BASE}/api/admin/email/templates`);
      const nextTemplates = Array.isArray(data?.templates) ? data.templates : [];

      setTemplates(nextTemplates);

      if (!selectedTemplateKey && nextTemplates[0]?.key) {
        setSelectedTemplateKey(nextTemplates[0].key);
      }
    } catch (e) {
      toast.error(e.message || "Failed to load email templates");
    } finally {
      if (!silent) setTemplatesLoading(false);
    }
  }

  async function loadLogs(nextPage = pagination.page, { silent = false } = {}) {
    if (!silent) setLoading(true);

    try {
      const params = new URLSearchParams();
      params.set("page", String(nextPage || 1));
      params.set("limit", String(pagination.limit || 10));

      const cleanQ = String(q || "").trim();
      if (cleanQ) params.set("q", cleanQ);

      const data = await fetchJSON(`${API_BASE}/api/admin/email/logs?${params.toString()}`);

      setLogs(Array.isArray(data?.logs) ? data.logs : []);
      setPagination(
        data?.pagination || {
          page: nextPage || 1,
          limit: pagination.limit || 10,
          total: 0,
          totalPages: 1,
        }
      );
    } catch (e) {
      toast.error(e.message || "Failed to load email logs");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  async function searchUserByUid() {
    const cleanUid = String(uid || "").trim();

    if (!cleanUid) {
      toast.error("Enter UID first");
      return;
    }

    setSearchBusy(true);

    try {
      const data = await fetchJSON(
        `${API_BASE}/api/admin/email/users/search?uid=${encodeURIComponent(cleanUid)}`
      );

      const user = data?.user || null;

      setPickedUser(user);

      if (user?.creditScore !== undefined && user?.creditScore !== null) {
        setCreditScore(String(user.creditScore));
      }

      toast.success("User loaded");
    } catch (e) {
      setPickedUser(null);
      toast.error(e.message || "User not found");
    } finally {
      setSearchBusy(false);
    }
  }

  async function sendEmail() {
    if (!selectedTemplate?.key) {
      toast.error("Select a template");
      return;
    }

    if (!finalUid) {
      toast.error("UID is required");
      return;
    }

    if (!finalRecipientEmail) {
      toast.error("Recipient email is required");
      return;
    }

    if (recipientType === "USER" && !pickedUser) {
      toast.error("Search and select a user first");
      return;
    }

    if (recipientType === "USER" && (!pickedUser.emailVerified || !pickedUser.email)) {
      toast.error("This user does not have a verified email");
      return;
    }

    if (isCreditScoreTemplate && finalCreditScore === "") {
      toast.error("Credit score is required");
      return;
    }
    
    if (isTaxTemplate) {
      const amount = Number(withdrawalAmount);
      const rate = Number(taxRate);
    
      if (!Number.isFinite(amount) || amount <= 0) {
        toast.error("Withdrawal amount must be a positive number");
        return;
      }
    
      if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
        toast.error("Tax rate must be between 0 and 100");
        return;
      }
    }

    setBusy(true);

    try {
      await fetchJSON(`${API_BASE}/api/admin/email/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateKey: selectedTemplate.key,
          recipientType,
          uid: finalUid,
          guestEmail: recipientType === "GUEST" ? finalRecipientEmail : "",
          params: {
            uid: finalUid,
            supportUrl: SUPPORT_URL,
          
            ...(isCreditScoreTemplate
              ? {
                  creditScore: Number(finalCreditScore),
                }
              : {}),
          
            ...(isTaxTemplate
              ? {
                  withdrawalAmount: Number(withdrawalAmount),
                  taxRate: Number(taxRate),
                }
              : {}),
          },
        }),
      });

      toast.success("Email sent successfully");
      setModalOpen(false);
      resetForm(false);
      await loadLogs(1, { silent: true });
    } catch (e) {
      toast.error(e.message || "Failed to send email");
    } finally {
      setBusy(false);
    }
  }

  function resetForm(close = true) {
    setRecipientType("USER");
    setUid("");
    setGuestEmail("");
    setCreditScore("");
    setWithdrawalAmount("");
    setTaxRate("");
    setPickedUser(null);

    if (templates[0]?.key) {
      setSelectedTemplateKey(templates[0].key);
    }

    if (close) setModalOpen(false);
  }

  function openCreateModal() {
    setModalOpen(true);

    if (initialUid && !uid) {
      setUid(initialUid);
    }
  }

  useEffect(() => {
    const next = {
      templates,
      logs,
      pagination,
      q,
      recipientType,
      uid,
      guestEmail,
      creditScore,
      withdrawalAmount,
      taxRate,
      selectedTemplateKey,
      pickedUser,
    };
  
    saveCache(next);
  }, [
    templates,
    logs,
    pagination,
    q,
    recipientType,
    uid,
    guestEmail,
    creditScore,
    withdrawalAmount,
    taxRate,
    selectedTemplateKey,
    pickedUser,
  ]);

  useEffect(() => {
    loadTemplates({ silent: Boolean(cache?.templates?.length) });
    loadLogs(cache?.pagination?.page || 1, {
      silent: Boolean(cache?.logs?.length),
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (initialUid) {
      setModalOpen(true);
      setRecipientType("USER");
      setUid(initialUid);
    }
  }, [initialUid]);

  useEffect(() => {
    if (recipientType === "GUEST") {
      setPickedUser(null);
    }
  }, [recipientType]);

  function LoadingSkeletonRows() {
    return Array.from({ length: 8 }).map((_, rowIndex) => (
      <tr key={`email-skeleton-${rowIndex}`} className={tableRowClass}>
        {Array.from({ length: 8 }).map((__, colIndex) => (
          <td key={`email-skeleton-${rowIndex}-${colIndex}`} className="px-4 py-4">
            <div
              className={`${skeletonClass} animate-pulse`}
              style={{
                width:
                  colIndex === 0
                    ? "120px"
                    : colIndex === 1
                    ? "210px"
                    : colIndex === 2
                    ? "80px"
                    : colIndex === 4
                    ? "200px"
                    : "100px",
              }}
            />
          </td>
        ))}
      </tr>
    ));
  }

  return (
    <Shell title="Admin Emails">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className={`text-xs ${mutedText}`}>
          View sent emails and send selected subjects to verified users or guest recipients
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            disabled={loading || templatesLoading}
            onClick={() => {
              loadTemplates();
              loadLogs(1);
            }}
            className={`${buttonClass} disabled:opacity-50`}
          >
            Refresh
          </button>

          <button onClick={openCreateModal} className={primaryButtonClass}>
            + Create Email
          </button>
        </div>
      </div>

      <div className={tableWrapClass}>
        <div className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div className={`text-sm font-semibold ${strongText}`}>
            Sent Emails ({pagination.total || logs.length})
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search email / UID / subject..."
              className={`${inputClass} sm:w-72`}
            />

            <button
              disabled={loading}
              onClick={() => loadLogs(1)}
              className={`${buttonClass} disabled:opacity-50`}
            >
              Search
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1320px] table-fixed text-left text-sm">
            <thead className={tableHeadClass}>
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">To Email</th>
                <th className="px-4 py-3">UID</th>
                <th className="px-4 py-3">Recipient</th>
                <th className="px-4 py-3">Template</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Sent By</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>

            <tbody className={tableBodyClass}>
              {loading ? (
                <LoadingSkeletonRows />
              ) : logs.length === 0 ? (
                <tr>
                  <td className={`px-4 py-5 ${softText}`} colSpan={8}>
                    No sent emails found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className={tableRowClass}>
                    <td className={`px-4 py-3 text-xs ${softText}`}>
                      {formatDate(log.createdAt)}
                    </td>

                    <td className="px-4 py-3">
                      <div
                        className={`max-w-[240px] truncate text-xs ${strongText}`}
                        title={log.toEmail || "-"}
                      >
                        {log.toEmail || "-"}
                      </div>
                    </td>

                    <td className={`px-4 py-3 text-xs ${softText}`}>
                      {log.targetUid || "-"}
                    </td>

                    <td className="px-4 py-3">
                      <span className={statusNeutralClass}>
                        {log.recipientType || "-"}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div
                        className={`max-w-[220px] truncate text-xs ${softText}`}
                        title={log.templateName || log.templateKey || "-"}
                      >
                        {log.templateName || log.templateKey || "-"}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div
                        className={`max-w-[220px] truncate text-xs ${softText}`}
                        title={log.subject || "-"}
                      >
                        {log.subject || "-"}
                      </div>
                    </td>

                    <td className={`px-4 py-3 text-xs ${softText}`}>
                      {log?.sentBy?.uid ||
                        log?.sentBy?.phoneNumber ||
                        log?.sentBy?.role ||
                        "-"}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={
                          log.status === "SENT" ? statusReadyClass : statusLockedClass
                        }
                      >
                        {log.status || "-"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className={footerClass}>
          <div className={`text-xs ${mutedText}`}>
            Showing page {pagination.page || 1} of {pagination.totalPages || 1}
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={loading || Number(pagination.page || 1) <= 1}
              onClick={() => loadLogs(Math.max(1, Number(pagination.page || 1) - 1))}
              className={`${buttonClass} disabled:opacity-40`}
            >
              Prev
            </button>

            <div className={`text-xs ${softText}`}>
              Page {pagination.page || 1} / {pagination.totalPages || 1}
            </div>

            <button
              disabled={
                loading ||
                Number(pagination.page || 1) >= Number(pagination.totalPages || 1)
              }
              onClick={() =>
                loadLogs(
                  Math.min(
                    Number(pagination.totalPages || 1),
                    Number(pagination.page || 1) + 1
                  )
                )
              }
              className={`${buttonClass} disabled:opacity-40`}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <Modal
        open={modalOpen}
        title="Create Email"
        subtitle="Select recipient, choose a subject, verify details, then send"
        onClose={() => setModalOpen(false)}
        footer={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className={`text-[11px] ${mutedText}`}>
              UID, recipient email, subject, and template details are required.
            </div>

            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setModalOpen(false)} className={buttonClass}>
                Cancel
              </button>

              <button
                disabled={!canSend}
                onClick={sendEmail}
                className={sendButtonClass}
              >
                {busy ? "Sending..." : "Send Email"}
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div className={sectionClass}>
            <div className={labelClass}>Recipient Type</div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setRecipientType("USER")}
                className={classNames(
                  "rounded-2xl border px-4 py-3 text-left text-xs transition",
                  recipientType === "USER"
                    ? isDark
                      ? "border-blue-500/40 bg-blue-500/10 text-blue-200"
                      : "border-blue-300 bg-blue-50 text-blue-700"
                    : isDark
                    ? "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                )}
              >
                <div className="font-semibold">Existing User</div>
                <div className="mt-1 text-[11px] opacity-70">
                  Search UID and use verified email
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRecipientType("GUEST")}
                className={classNames(
                  "rounded-2xl border px-4 py-3 text-left text-xs transition",
                  recipientType === "GUEST"
                    ? isDark
                      ? "border-purple-500/40 bg-purple-500/10 text-purple-200"
                      : "border-purple-300 bg-purple-50 text-purple-700"
                    : isDark
                    ? "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                )}
              >
                <div className="font-semibold">Guest Email</div>
                <div className="mt-1 text-[11px] opacity-70">
                  Enter UID and email manually
                </div>
              </button>
            </div>
          </div>

          <div className={sectionClass}>
            <div className={labelClass}>Recipient Details</div>

            <div className="mt-3 grid grid-cols-1 gap-3">
              <div className={innerCardClass}>
                <div className={labelClass}>UID</div>

                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    value={uid}
                    onChange={(e) => {
                      setUid(e.target.value);
                      if (recipientType === "USER") setPickedUser(null);
                    }}
                    placeholder="Example: 100001"
                    className={inputClass}
                  />

                  {recipientType === "USER" ? (
                    <button
                      disabled={searchBusy || !uid.trim()}
                      onClick={searchUserByUid}
                      className={`${primaryButtonClass} sm:w-[120px]`}
                    >
                      {searchBusy ? "Searching..." : "Search"}
                    </button>
                  ) : null}
                </div>

                <div className={hintClass}>
                  UID is required because the email template displays the user UID.
                </div>
              </div>

              {recipientType === "GUEST" ? (
                <div className={innerCardClass}>
                  <div className={labelClass}>Guest Email</div>
                  <input
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="guest@example.com"
                    className={`mt-2 ${inputClass}`}
                  />
                </div>
              ) : null}

              {recipientType === "USER" ? (
                pickedUser ? (
                  <div
                    className={
                      pickedUser.emailVerified && pickedUser.email
                        ? successPanelClass
                        : dangerPanelClass
                    }
                  >
                    <div className="font-semibold">
                      {pickedUser.emailVerified && pickedUser.email
                        ? "Verified email found"
                        : "Email not verified"}
                    </div>

                    <div className="mt-2 leading-6">
                      UID: {pickedUser.uid || "-"}
                      <br />
                      Phone: {pickedUser.phoneNumber || "-"}
                      <br />
                      Email:{" "}
                      {pickedUser.emailVerified && pickedUser.email
                        ? pickedUser.email
                        : "Email not verified"}
                    </div>
                  </div>
                ) : (
                  <div className={innerCardClass}>
                    <div className={labelClass}>User Lookup</div>
                    <div className={`mt-2 text-xs leading-6 ${softText}`}>
                      Enter UID and click Search to load the verified email and current credit score.
                    </div>
                  </div>
                )
              ) : null}
            </div>
          </div>

          <div className={sectionClass}>
            <div className={labelClass}>Email Subject</div>

            <div className="mt-3">
              <PremiumDropdown
                value={selectedTemplate?.key || selectedTemplateKey || ""}
                options={templates}
                disabled={templatesLoading}
                placeholder={templatesLoading ? "Loading templates..." : "Select email subject"}
                getLabel={(template) => template.name}
                getValue={(template) => template.key}
                onChange={(key) => {
                  setSelectedTemplateKey(key);
              
                  if (key === "credit_score_withdrawal_notice") {
                    setWithdrawalAmount("");
                    setTaxRate("");
                  }
              
                  if (key === "tax_withholding_notice") {
                    setCreditScore("");
                  }
                }}
              />
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className={innerCardClass}>
                <div className={labelClass}>Subject</div>
                <div className={valueClass}>{selectedTemplate?.subject || "-"}</div>
              </div>
            
              {isCreditScoreTemplate ? (
                <div className={innerCardClass}>
                  <div className={labelClass}>Current Credit Score</div>
                  <input
                    value={creditScore}
                    onChange={(e) => setCreditScore(e.target.value)}
                    placeholder="Example: 82"
                    className={`mt-2 ${inputClass}`}
                  />
                  <div className={hintClass}>Required withdrawal score: 95</div>
                </div>
              ) : null}
            
              {isTaxTemplate ? (
                <>
                  <div className={innerCardClass}>
                    <div className={labelClass}>Withdrawal Amount</div>
                    <input
                      value={withdrawalAmount}
                      onChange={(e) => setWithdrawalAmount(e.target.value)}
                      placeholder="Example: 1000"
                      className={`mt-2 ${inputClass}`}
                    />
                  </div>
            
                  <div className={innerCardClass}>
                    <div className={labelClass}>Tax Rate (%)</div>
                    <input
                      value={taxRate}
                      onChange={(e) => setTaxRate(e.target.value)}
                      placeholder="Example: 10"
                      className={`mt-2 ${inputClass}`}
                    />
                  </div>
            
                  <div className={innerCardClass}>
                    <div className={labelClass}>Tax Amount Preview</div>
                    <div className={valueClass}>{taxPreview.taxAmount || "-"}</div>
                  </div>
                </>
              ) : null}
            </div>
          </div>

          <div className={sectionClass}>
            <div className={labelClass}>Preview Details</div>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className={innerCardClass}>
                <div className={labelClass}>To Email</div>
                <div className={valueClass}>{finalRecipientEmail || "-"}</div>
              </div>

              <div className={innerCardClass}>
                <div className={labelClass}>UID</div>
                <div className={valueClass}>{finalUid || "-"}</div>
              </div>

              <div className={innerCardClass}>
                <div className={labelClass}>Template</div>
                <div className={valueClass}>{selectedTemplate?.name || "-"}</div>
              </div>

              {isCreditScoreTemplate ? (
                <div className={innerCardClass}>
                  <div className={labelClass}>Credit Score</div>
                  <div className={valueClass}>
                    {finalCreditScore !== "" ? safeNum(finalCreditScore).toFixed(0) : "-"}
                  </div>
                </div>
              ) : null}
              
              {isTaxTemplate ? (
                <>
                  <div className={innerCardClass}>
                    <div className={labelClass}>Withdrawal Amount</div>
                    <div className={valueClass}>
                      {withdrawalAmount !== "" ? safeNum(withdrawalAmount).toFixed(2) : "-"}
                    </div>
                  </div>
              
                  <div className={innerCardClass}>
                    <div className={labelClass}>Tax Rate</div>
                    <div className={valueClass}>
                      {taxRate !== "" ? `${safeNum(taxRate).toFixed(2)}%` : "-"}
                    </div>
                  </div>
              
                  <div className={innerCardClass}>
                    <div className={labelClass}>Tax Amount</div>
                    <div className={valueClass}>{taxPreview.taxAmount || "-"}</div>
                  </div>
                </>
              ) : null}
            </div>

            <div className={`mt-3 ${canSend ? successPanelClass : dangerPanelClass}`}>
              {canSend
                ? "All details are ready. Click Send Email to send the selected template."
                : "Complete all required details before sending this email."}
            </div>
          </div>
        </div>
      </Modal>
    </Shell>
  );
}