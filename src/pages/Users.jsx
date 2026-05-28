import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Shell from "../components/Shell";
import { toast } from "react-toastify";
import { useTheme } from "../context/ThemeContext";
import { io } from "socket.io-client";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "https://slimy-xenia-jayjay122-018fd7f8.koyeb.app";

const USERS_CACHE_KEY = "admin_users_page_cache_v1";

function loadUsersCache() {
  try {
    const raw = sessionStorage.getItem(USERS_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveUsersCache(payload) {
  try {
    sessionStorage.setItem(USERS_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore cache errors
  }
}

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

function safeNum(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function formatMoney(value) {
  return safeNum(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

function sortUsersList(list, sortBy) {
  const next = [...list];

  next.sort((a, b) => {
    if (sortBy === "createdAt_desc") {
      return (
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
      );
    }

    if (sortBy === "createdAt_asc") {
      return (
        new Date(a.createdAt || 0).getTime() -
        new Date(b.createdAt || 0).getTime()
      );
    }

    if (sortBy === "lastOnline_desc") {
      return (
        new Date(b.lastOnlineAt || 0).getTime() -
        new Date(a.lastOnlineAt || 0).getTime()
      );
    }

    if (sortBy === "balance_desc") {
      return safeNum(b.displayBalance ?? b.balance) - safeNum(a.displayBalance ?? a.balance);
    }

    if (sortBy === "balance_asc") {
      return safeNum(a.displayBalance ?? a.balance) - safeNum(b.displayBalance ?? b.balance);
    }

    if (sortBy === "orders_desc") {
      return safeNum(b.ordersCompleted) - safeNum(a.ordersCompleted);
    }

    if (sortBy === "orders_asc") {
      return safeNum(a.ordersCompleted) - safeNum(b.ordersCompleted);
    }

    if (sortBy === "pending_desc") {
      return safeNum(b.pendingAmount) - safeNum(a.pendingAmount);
    }

    return 0;
  });

  return next;
}

/** Premium modal (click outside + ESC to close) */
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

  const modalCardClass =
    theme === "dark"
      ? "relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-[#0b1220]/90 shadow-2xl"
      : "relative w-full max-w-lg overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl";

  const titleClass =
    theme === "dark" ? "text-base font-semibold text-white" : "text-base font-semibold text-gray-900";

  const subtitleClass =
    theme === "dark" ? "mt-1 text-xs text-white/50" : "mt-1 text-xs text-gray-500";

  const closeBtnClass =
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
        if (cardRef.current && !cardRef.current.contains(e.target)) onClose?.();
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

      <div ref={cardRef} className={modalCardClass}>
        <div className="flex items-start justify-between gap-3 px-5 py-4">
          <div>
            <div className={titleClass}>{title}</div>
            {subtitle ? <div className={subtitleClass}>{subtitle}</div> : null}
          </div>

          <button onClick={onClose} className={closeBtnClass}>✕</button>
        </div>

        <div className="px-5 pb-5">{children}</div>

        {footer ? <div className={footerClass}>{footer}</div> : null}
      </div>
    </div>
  );
}

/** Right sidebar drawer for More actions */
function Drawer({ open, title, subtitle, children, onClose }) {
  const panelRef = useRef(null);
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

  return (
    <div
      className="fixed inset-0 z-50"
      onMouseDown={(e) => {
        if (panelRef.current && !panelRef.current.contains(e.target)) {
          onClose?.();
        }
      }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="absolute inset-y-0 right-0 flex max-w-full">
        <div
          ref={panelRef}
          className={`relative flex h-full w-screen max-w-full flex-col shadow-2xl sm:w-[92vw] lg:max-w-[760px] ${
            theme === "dark"
              ? "border-l border-white/10 bg-[#071120]"
              : "border-l border-gray-200 bg-white"
          }`}
        >
          <div
            className={`sticky top-0 z-10 flex items-start justify-between gap-3 px-6 py-5 ${
              theme === "dark"
                ? "border-b border-white/10 bg-[#071120]/95"
                : "border-b border-gray-200 bg-white/95"
            } backdrop-blur`}
          >
            <div>
              <div
                className={`text-lg font-semibold ${
                  theme === "dark" ? "text-white" : "text-gray-900"
                }`}
              >
                {title}
              </div>
              {subtitle ? (
                <div
                  className={`mt-1 text-xs ${
                    theme === "dark" ? "text-white/50" : "text-gray-500"
                  }`}
                >
                  {subtitle}
                </div>
              ) : null}
            </div>

            <button
              onClick={onClose}
              className={`rounded-xl px-3 py-2 text-xs transition ${
                theme === "dark"
                  ? "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

function SelectMenu({
  value,
  onChange,
  options,
  className = "",
  width = "w-full",
  placement = "down",
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const { theme } = useTheme();

  const selected = options.find((x) => String(x.value) === String(value));

  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }

    function handleKey(e) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  return (
    <div ref={wrapRef} className={`relative ${width} ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((v) => !v);
        }}
        className={`flex h-10 w-full items-center justify-between gap-3 rounded-2xl border px-3 text-left text-xs font-semibold shadow-sm outline-none transition disabled:cursor-not-allowed disabled:opacity-50 ${
          theme === "dark"
            ? "border-white/10 bg-[#0f172a] text-white hover:border-white/20 hover:bg-[#111c31]"
            : "border-gray-200 bg-white text-gray-900 hover:border-gray-300 hover:bg-gray-50"
        }`}
      >
        <span className="truncate">{selected?.label || "Select"}</span>
        <span
          className={`text-[10px] transition ${
            open ? "rotate-180" : ""
          } ${theme === "dark" ? "text-white/50" : "text-gray-400"}`}
        >
          ▼
        </span>
      </button>

      {open ? (
        <div
          className={`absolute right-0 z-[9999] max-h-72 w-full overflow-hidden rounded-2xl border p-1 shadow-2xl ${
            placement === "up" ? "bottom-full mb-2" : "top-full mt-2"
          } ${
            theme === "dark"
              ? "border-white/10 bg-[#0b1220]"
              : "border-gray-200 bg-white"
          }`}
        >
          <div className="max-h-64 overflow-y-auto">
            {options.map((opt) => {
              const active = String(opt.value) === String(value);

              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition ${
                    active
                      ? theme === "dark"
                        ? "bg-blue-500/15 text-blue-200"
                        : "bg-blue-50 text-blue-700"
                      : theme === "dark"
                      ? "text-white/75 hover:bg-white/5 hover:text-white"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <span>{opt.label}</span>
                  {active ? <span className="text-[10px]">✓</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function Users() {
  const navigate = useNavigate();

  const { theme } = useTheme();

  const mutedText = theme === "dark" ? "text-white/50" : "text-gray-500";
  const softText = theme === "dark" ? "text-white/70" : "text-gray-600";
  const strongText = theme === "dark" ? "text-white" : "text-gray-900";
  
  const cardClass =
    theme === "dark"
      ? "rounded-2xl border border-white/10 bg-white/5"
      : "rounded-2xl border border-gray-200 bg-white shadow-sm";
  
  const inputClass =
    theme === "dark"
      ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/90 placeholder:text-white/30 outline-none focus:border-white/20"
      : "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-400";

  const buttonClass =
    theme === "dark"
      ? "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 hover:bg-white/10"
      : "rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 hover:bg-gray-50";
  
  const tableWrapClass =
    theme === "dark"
      ? "mt-4 rounded-2xl border border-white/10"
      : "mt-4 rounded-2xl border border-gray-200 bg-white shadow-sm";
  
  const tableHeaderBarClass =
    theme === "dark"
      ? "bg-white/5 px-4 py-3 text-sm font-semibold"
      : "bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900";
  
  const tableHeadClass =
    theme === "dark"
      ? "bg-white/5 text-xs text-white/60"
      : "bg-gray-50 text-xs text-gray-500";
  
  const tableBodyClass =
    theme === "dark"
      ? "divide-y divide-white/10"
      : "divide-y divide-gray-200";
  
  const tableRowClass =
    theme === "dark"
      ? "hover:bg-white/5"
      : "hover:bg-gray-50";
  
  const footerBarClass =
    theme === "dark"
      ? "flex flex-col gap-3 border-t border-white/10 bg-white/5 px-4 py-3 md:flex-row md:items-center md:justify-between"
      : "flex flex-col gap-3 border-t border-gray-200 bg-gray-50 px-4 py-3 md:flex-row md:items-center md:justify-between";
  
  const drawerSectionClass =
    theme === "dark"
    ? "rounded-3xl border border-white/10 bg-white/[0.03] p-4"
    : "rounded-3xl border border-gray-200 bg-gray-50 p-4";

  const drawerCardClass =
    theme === "dark"
    ? "rounded-2xl border border-white/10 bg-white/[0.04] p-4"
    : "rounded-2xl border border-gray-200 bg-white p-4";

  const drawerLabelClass =
    theme === "dark" ? "text-xs text-white/50" : "text-xs text-gray-500";

  const drawerValueClass =
    theme === "dark"
      ? "mt-1 text-sm font-semibold text-white"
      : "mt-1 text-sm font-semibold text-gray-900";
  
  const drawerMutedClass =
    theme === "dark" ? "text-[11px] text-white/50" : "text-[11px] text-gray-500";
  
  const drawerNeutralButtonClass =
    theme === "dark"
      ? "rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-xs text-white/80 hover:bg-white/[0.07]"
      : "rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left text-xs text-gray-800 hover:bg-gray-50";
  
  const pillNeutralClass =
    theme === "dark"
      ? "rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10px] text-white/80"
      : "rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-[10px] text-gray-700";

  const actionPlainClass =
    theme === "dark"
      ? "rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-xs text-white/85 hover:bg-white/[0.07]"
      : "rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left text-xs text-gray-900 hover:bg-gray-50";

  const statusPlainClass =
    theme === "dark"
      ? "inline-flex rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10px] font-semibold text-white/80"
      : "inline-flex rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-[10px] font-semibold text-gray-700";
  
  const skeletonCellClass =
    theme === "dark"
      ? "h-3 rounded-full bg-white/10"
      : "h-3 rounded-full bg-gray-200";
  
  function LoadingSkeletonRows() {
    return Array.from({ length: 8 }).map((_, rowIndex) => (
      <tr key={`skeleton-${rowIndex}`} className={tableRowClass}>
        {Array.from({ length: 15 }).map((__, colIndex) => (
          <td key={`skeleton-${rowIndex}-${colIndex}`} className="px-4 py-4">
            <div
              className={`${skeletonCellClass} animate-pulse`}
              style={{
                width:
                  colIndex === 0
                    ? "64px"
                    : colIndex === 1
                    ? "110px"
                    : colIndex === 2
                    ? "90px"
                    : colIndex === 8
                    ? "180px"
                    : "80px",
              }}
            />
          </td>
        ))}
      </tr>
    ));
  }    
    const initialCache = loadUsersCache();

    const [rows, setRows] = useState(() => initialCache?.rows || []);
    const [loading, setLoading] = useState(() => !initialCache?.rows?.length);
    const [busyId, setBusyId] = useState(null);
  
    const [q, setQ] = useState(() => initialCache?.q || "");
    const [roleFilter, setRoleFilter] = useState(() => initialCache?.roleFilter || "all");
    const [sortBy, setSortBy] = useState(() => initialCache?.sortBy || "createdAt_desc");

    const [orderEdit, setOrderEdit] = useState({});
    const [resetEdit, setResetEdit] = useState({});
    const [vipEdit, setVipEdit] = useState({});
    const [creditScoreEdit, setCreditScoreEdit] = useState({});
  
    const [walletSummary, setWalletSummary] = useState({
    loading: false,
    userId: null,
    totalDeposit: 0,
    totalWithdrawal: 0,
  });

  // pagination
  const [pageSize, setPageSize] = useState(() => initialCache?.pageSize || 10);
  const [page, setPage] = useState(() => initialCache?.page || 1);

  // Balance modal
  const [balanceModal, setBalanceModal] = useState({
    open: false,
    userId: null,
    uid: "",
    currentBalance: 0,
    creditType: "balance", // balance | bonus
    mode: "inc",
    amount: "",
    note: "Admin bonus",
  });

  // Actions drawer (More)
  const [actionsModal, setActionsModal] = useState({
    open: false,
    user: null,
  });

  // Ban modal
  const [banModal, setBanModal] = useState({
    open: false,
    userId: null,
    phoneNumber: "",
    isBanned: false,
    reason: "",
  });

  // Ban orders modal
  const [orderStartBlockModal, setOrderStartBlockModal] = useState({
    open: false,
    userId: null,
    phoneNumber: "",
    blocked: true,
    reason: "",
  });

  // Reset password modal
  const [passwordModal, setPasswordModal] = useState({
    open: false,
    userId: null,
    phoneNumber: "",
    newPassword: "",
  });

  // Reset phone modal
  const [phoneModal, setPhoneModal] = useState({
    open: false,
    userId: null,
    oldPhone: "",
    newPhone: "",
  });

  const [withdrawalBlockModal, setWithdrawalBlockModal] = useState({
    open: false,
    userId: null,
    phoneNumber: "",
    blocked: true,
    reason: "",
  });

  // Reset withdrawal PIN modal
  const [withdrawPinModal, setWithdrawPinModal] = useState({
    open: false,
    userId: null,
    phoneNumber: "",
    newPin: "",
  });

  // Delete confirm modal
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    userId: null,
    phoneNumber: "",
  });

  const [createUserModal, setCreateUserModal] = useState({
    open: false,
    phoneNumber: "",
    password: "",
    role: "user",
  });

  function getAuthHeaders() {
    const token = localStorage.getItem("admin_token");
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
  }

  async function fetchJSON(url, options = {}) {
    const auth = getAuthHeaders();

    console.log("[Users] fetchJSON request:", {
      url,
      method: options.method || "GET",
      hasAuth: !!auth,
    });

   if (!auth) {
      console.error("[Users] Missing admin_token for:", url);
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
      console.error("[Users] Non-JSON response from:", url);
      throw new Error("Server returned non-JSON response.");
    }

    console.log("[Users] fetchJSON response:", {
      url,
      status: res.status,
      ok: res.ok,
      data,
    });

  if (!res.ok) {
    const msg = data?.message || `Request failed (${res.status})`;

    if (res.status === 401) {
      console.error("[Users] 401 from:", url, data);
    }

    throw new Error(msg);
  }

  return data;
}

function resetBalanceModal() {
  setBalanceModal({
    open: false,
    userId: null,
    uid: "",
    currentBalance: 0,
    creditType: "balance",
    mode: "inc",
    amount: "",
    note: "Admin bonus",
  });
}

function applyWalletUserUpdate(userId, user) {
  if (!userId && !user?._id) return;

  const id = String(userId || user._id);

  setRows((prev) =>
    prev.map((u) =>
      String(u._id) === id
        ? {
            ...u,
            balance: Number(user?.balance ?? u.balance ?? 0),
            displayBalance: Number(
              user?.displayBalance ??
                user?.shortBalance ??
                user?.balance ??
                u.displayBalance ??
                u.balance ??
                0
            ),
            availableBalance: Number(
              user?.availableBalance ??
                u.availableBalance ??
                user?.balance ??
                0
            ),
            shortBalance: Number(
              user?.shortBalance ??
                user?.displayBalance ??
                u.shortBalance ??
                u.displayBalance ??
                0
            ),
            pendingAmount: Number(user?.pendingAmount ?? u.pendingAmount ?? 0),
          }
        : u
    )
  );

  setActionsModal((prev) =>
    prev.user && String(prev.user._id) === id
      ? {
          ...prev,
          user: {
            ...prev.user,
            balance: Number(user?.balance ?? prev.user.balance ?? 0),
            displayBalance: Number(
              user?.displayBalance ??
                user?.shortBalance ??
                user?.balance ??
                prev.user.displayBalance ??
                prev.user.balance ??
                0
            ),
            availableBalance: Number(
              user?.availableBalance ??
                prev.user.availableBalance ??
                user?.balance ??
                0
            ),
            shortBalance: Number(
              user?.shortBalance ??
                user?.displayBalance ??
                prev.user.shortBalance ??
                prev.user.displayBalance ??
                0
            ),
            pendingAmount: Number(
              user?.pendingAmount ?? prev.user.pendingAmount ?? 0
            ),
          },
        }
      : prev
  );
}

function goToTrialBonus(user) {
  const uid = String(user?.uid || "").trim();

  if (!uid) {
    toast.error("This user has no UID");
    return;
  }

  setActionsModal({ open: false, user: null });

  navigate(`/admin/trial-bonus?uid=${encodeURIComponent(uid)}`);
}

function goToEmailUser(user) {
  const uid = String(user?.uid || "").trim();

  if (!uid) {
    toast.error("This user has no UID");
    return;
  }

  setActionsModal({ open: false, user: null });

  navigate(`/admin/emails?uid=${encodeURIComponent(uid)}`);
}

async function copyUid(uid) {
  const clean = String(uid || "").trim();

  if (!clean) {
    toast.error("No UID to copy");
    return;
  }

  try {
    await navigator.clipboard.writeText(clean);
    toast.success("UID copied");
  } catch {
    toast.error("Failed to copy UID");
  }
}

async function toggleSigninReward(user) {
  if (!user?._id) return;

  const nextEnabled = !Boolean(user.signinRewardEnabled);
  setBusyId(user._id);

  try {
    const data = await fetchJSON(
      `${API_BASE}/api/admin/users/${user._id}/signin-reward`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: nextEnabled,
        }),
      }
    );

    setRows((prev) =>
      prev.map((u) =>
        u._id === user._id
          ? {
              ...u,
              signinRewardEnabled: data.signinRewardEnabled,
            }
          : u
      )
    );

    setActionsModal((prev) =>
      prev.user && prev.user._id === user._id
        ? {
            ...prev,
            user: {
              ...prev.user,
              signinRewardEnabled: data.signinRewardEnabled,
            },
          }
        : prev
    );

    toast.success(
      data.signinRewardEnabled
        ? "Sign-in reward enabled"
        : "Sign-in reward disabled"
    );
  } catch (e) {
    toast.error(e.message || "Failed to update sign-in reward");
  } finally {
    setBusyId(null);
  }
}

  async function loadUsers(forceRefresh = true) {
    if (forceRefresh) {
      setLoading(true);
    }
  
    try {
      const data = await fetchJSON(`${API_BASE}/api/admin/users`);
      const nextRows = data.users || [];
  
      setRows(nextRows);
  
      saveUsersCache({
        rows: nextRows,
        savedAt: Date.now(),
      });
    } catch (e) {
      if (!rows.length) {
        setRows([]);
      }
      toast.error(e.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  async function saveUserVipRank(userId) {
    const val = vipEdit[userId];
    const num = Number(val);

    if (![1, 2, 3].includes(num)) {
      toast.error("vipRank must be 1, 2, or 3");
      return;
    }

    setBusyId(userId);

    try {
      const data = await fetchJSON(`${API_BASE}/api/admin/users/${userId}/vip-rank`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vipRank: num }),
      });

      const newRank = data?.user?.vipRank ?? data?.vipRank ?? num;

      setRows((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, vipRank: newRank } : u))
      );

      toast.success("VIP rank updated");
    } catch (e) {
      toast.error(e.message || "Failed to update VIP rank");
    } finally {
      setBusyId(null);
    }
  }

  async function saveUserOrders(userId) {
    const val = orderEdit[userId];
    const num = Number(val);

    if (!Number.isFinite(num) || num < 0) {
      toast.error("ordersCompleted must be a number >= 0");
      return;
    }

    setBusyId(userId);

    try {
      const data = await fetchJSON(`${API_BASE}/api/admin/users/${userId}/orders/set`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ordersCompleted: num }),
      });

      setRows((prev) =>
        prev.map((u) =>
          u._id === userId
            ? {
                ...u,
                ordersCompleted: data.ordersCompleted ?? num,
              }
            : u
        )
      );

      toast.success("Orders updated");
    } catch (e) {
      toast.error(e.message || "Failed to update orders");
    } finally {
      setBusyId(null);
    }
  }

  async function saveUserResetCount(userId) {
    const val = resetEdit[userId];
    const num = Number(val);

    if (!Number.isFinite(num) || num < 1) {
      toast.error("totalResetCount must be a number >= 1");
      return;
    }

    setBusyId(userId);

    try {
      const data = await fetchJSON(`${API_BASE}/api/admin/users/${userId}/reset-count/set`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalResetCount: num }),
      });

      setRows((prev) =>
        prev.map((u) =>
          u._id === userId
            ? { ...u, totalResetCount: data.totalResetCount ?? num }
            : u
        )
      );

      toast.success("Reset count updated");
    } catch (e) {
      toast.error(e.message || "Failed to update reset count");
    } finally {
      setBusyId(null);
    }
  }

  async function resetUserOrdersCount(userId) {
    setBusyId(userId);

    try {
      const data = await fetchJSON(`${API_BASE}/api/admin/users/${userId}/orders/reset`, {
        method: "POST",
      });

      setRows((prev) =>
        prev.map((u) =>
          u._id === userId
            ? {
                ...u,
                ordersCompleted: data.ordersCompleted ?? 0,
              }
            : u
        )
      );

      setOrderEdit((p) => ({ ...p, [userId]: "0" }));
      toast.success("Orders reset to 0");
    } catch (e) {
      toast.error(e.message || "Failed to reset orders");
    } finally {
      setBusyId(null);
    }
  }

  async function changeRole(userId, role) {
    setBusyId(userId);

    try {
      const data = await fetchJSON(`${API_BASE}/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      setRows((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, role: data.user.role } : u))
      );

      toast.success("Role updated");
    } catch (e) {
      toast.error(e.message || "Failed to update role");
    } finally {
      setBusyId(null);
    }
  }

  async function submitBalance() {
    const userId = balanceModal.userId;
    if (!userId) return;
  
    const amount = Number(balanceModal.amount);
  
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Please enter a valid amount greater than 0.");
      return;
    }
  
    setBusyId(userId);
  
    try {
      const isBonus = balanceModal.creditType === "bonus";
  
      const url = isBonus
        ? `${API_BASE}/api/admin/users/${userId}/bonus`
        : `${API_BASE}/api/admin/users/${userId}/balance`;
  
      const body = isBonus
        ? {
            amount,
            note: String(balanceModal.note || "Admin bonus").trim() || "Admin bonus",
          }
        : {
            mode: balanceModal.mode,
            amount,
          };
  
      const data = await fetchJSON(url, {
        method: isBonus ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
  
      if (data?.user?._id) {
        applyWalletUserUpdate(userId, data.user);
      }
  
      toast.success(isBonus ? "Bonus credited successfully" : "Balance updated");
      resetBalanceModal();
    } catch (e) {
      toast.error(
        e.message ||
          (balanceModal.creditType === "bonus"
            ? "Failed to credit bonus"
            : "Failed to update balance")
      );
    } finally {
      setBusyId(null);
    }
  }

  async function saveUserCreditScore(userId) {
    const val = creditScoreEdit[userId];
    const score = Number(val);
  
    if (!Number.isFinite(score)) {
      toast.error("Credit score must be a number");
      return;
    }
  
    if (score < 0 || score > 100) {
      toast.error("Credit score must be between 0 and 100");
      return;
    }
  
    setBusyId(userId);
  
    try {
      const data = await fetchJSON(`${API_BASE}/api/admin/users/${userId}/credit-score`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creditScore: score }),
      });
  
      const newScore = Number(data?.user?.creditScore ?? score);
  
      setRows((prev) =>
        prev.map((u) =>
          u._id === userId
            ? {
                ...u,
                creditScore: newScore,
              }
            : u
        )
      );
  
      setActionsModal((prev) =>
        prev.user && prev.user._id === userId
          ? {
              ...prev,
              user: {
                ...prev.user,
                creditScore: newScore,
              },
            }
          : prev
      );
  
      setCreditScoreEdit((prev) => ({
        ...prev,
        [userId]: String(newScore),
      }));
  
      toast.success("Credit score updated");
    } catch (e) {
      toast.error(e.message || "Failed to update credit score");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleWithdrawalBlock(user, customReason = "") {
    if (!user?._id) return;

    const nextBlocked = !Boolean(user.withdrawalBlocked);
    const reason = nextBlocked ? String(customReason || "Manual review").trim() : "";

    setBusyId(user._id);

    try {
      const data = await fetchJSON(
        `${API_BASE}/api/admin/users/${user._id}/withdrawal-block`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blocked: nextBlocked,
            reason,
          }),
        }
      );

      setRows((prev) =>
        prev.map((u) =>
          u._id === user._id
            ? {
                ...u,
                withdrawalBlocked: data.user.withdrawalBlocked,
                withdrawalBlockedAt: data.user.withdrawalBlockedAt,
                withdrawalBlockedReason: data.user.withdrawalBlockedReason,
              }
            : u
        )
      );

      setActionsModal((prev) =>
        prev.user && prev.user._id === user._id
          ? {
              ...prev,
              user: {
                ...prev.user,
                withdrawalBlocked: data.user.withdrawalBlocked,
                withdrawalBlockedAt: data.user.withdrawalBlockedAt,
                withdrawalBlockedReason: data.user.withdrawalBlockedReason,
              },
            }
          : prev
      );

      toast.success(
        data.user.withdrawalBlocked
          ? "Withdrawal frozen"
          : "Withdrawal unfrozen"
      );
    } catch (e) {
      toast.error(e.message || "Failed to update withdrawal block");
    } finally {
      setBusyId(null);
    }
  }

  async function submitBan() {
    const userId = banModal.userId;
    if (!userId) return;

    setBusyId(userId);

    try {
      const data = await fetchJSON(`${API_BASE}/api/admin/users/${userId}/ban`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isBanned: banModal.isBanned,
          reason: banModal.reason,
        }),
      });

      setRows((prev) =>
        prev.map((u) =>
          u._id === userId
            ? {
                ...u,
                isBanned: data.user.isBanned,
                bannedAt: data.user.bannedAt,
                banReason: data.user.banReason,
              }
            : u
        )
      );

      toast.success("Ban status updated");

      setBanModal({
        open: false,
        userId: null,
        phoneNumber: "",
        isBanned: false,
        reason: "",
      });
    } catch (e) {
      toast.error(e.message || "Failed to update ban status");
    } finally {
      setBusyId(null);
    }
  }

  async function submitOrderStartBlock() {
    const userId = orderStartBlockModal.userId;
    if (!userId) return;
  
    const reason = String(orderStartBlockModal.reason || "").trim();
  
    if (orderStartBlockModal.blocked && !reason) {
      toast.error("Please enter a ban order reason.");
      return;
    }
  
    setBusyId(userId);
  
    try {
      const data = await fetchJSON(
        `${API_BASE}/api/admin/users/${userId}/order-start-block`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blocked: orderStartBlockModal.blocked,
            message: reason,
          }),
        }
      );
  
      setRows((prev) =>
        prev.map((u) =>
          u._id === userId
            ? {
                ...u,
                orderStartBlocked: data.user.orderStartBlocked,
                orderStartBlockMessage: data.user.orderStartBlockMessage,
                orderStartBlockedAt: data.user.orderStartBlockedAt,
              }
            : u
        )
      );
  
      setActionsModal((prev) =>
        prev.user && prev.user._id === userId
          ? {
              ...prev,
              user: {
                ...prev.user,
                orderStartBlocked: data.user.orderStartBlocked,
                orderStartBlockMessage: data.user.orderStartBlockMessage,
                orderStartBlockedAt: data.user.orderStartBlockedAt,
              },
            }
          : prev
      );
  
      toast.success(
        data.user.orderStartBlocked
          ? "User banned from starting orders"
          : "User unbanned from starting orders"
      );
  
      setOrderStartBlockModal({
        open: false,
        userId: null,
        phoneNumber: "",
        blocked: true,
        reason: "",
      });
    } catch (e) {
      toast.error(e.message || "Failed to update order ban");
    } finally {
      setBusyId(null);
    }
  }

  async function submitResetPassword() {
    const userId = passwordModal.userId;
    if (!userId) return;

    if (!passwordModal.newPassword || passwordModal.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setBusyId(userId);

    try {
      await fetchJSON(`${API_BASE}/api/admin/users/${userId}/reset-password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: passwordModal.newPassword }),
      });

      toast.success("Password reset successful");

      setPasswordModal({
        open: false,
        userId: null,
        phoneNumber: "",
        newPassword: "",
      });
    } catch (e) {
      toast.error(e.message || "Failed to reset password");
    } finally {
      setBusyId(null);
    }
  }

  async function submitResetWithdrawPin() {
    const userId = withdrawPinModal.userId;
    if (!userId) return;

    const pin = String(withdrawPinModal.newPin || "").trim();

    if (!/^\d{4,6}$/.test(pin)) {
      toast.error("Withdrawal PIN must be 4 to 6 digits.");
      return;
    }

    setBusyId(userId);

    try {
      const data = await fetchJSON(
        `${API_BASE}/api/admin/users/${userId}/withdraw-pin/reset`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newPin: pin }),
        }
      );

      setRows((prev) =>
        prev.map((u) =>
          u._id === userId
            ? {
                ...u,
                withdrawPinFailedAttempts: data?.user?.withdrawPinFailedAttempts ?? 0,
                withdrawPinLocked: data?.user?.withdrawPinLocked ?? false,
              }
            : u
        )
      );

      toast.success("Withdrawal PIN reset + unlocked");

      setWithdrawPinModal({
        open: false,
        userId: null,
        phoneNumber: "",
        newPin: "",
      });
    } catch (e) {
      toast.error(e.message || "Failed to reset withdrawal PIN");
    } finally {
      setBusyId(null);
    }
  }

  async function submitResetPhone() {
    const userId = phoneModal.userId;
    if (!userId) return;

    const clean = String(phoneModal.newPhone || "").trim();
    if (!clean) {
      toast.error("Please enter a valid new phone number.");
      return;
    }

    setBusyId(userId);

    try {
      const data = await fetchJSON(`${API_BASE}/api/admin/users/${userId}/reset-phone`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPhoneNumber: clean }),
      });

      setRows((prev) =>
        prev.map((u) =>
          u._id === userId ? { ...u, phoneNumber: data.user.phoneNumber } : u
        )
      );

      toast.success("Phone number updated");

      setPhoneModal({
        open: false,
        userId: null,
        oldPhone: "",
        newPhone: "",
      });
    } catch (e) {
      toast.error(e.message || "Failed to update phone number");
    } finally {
      setBusyId(null);
    }
  }

  async function loadWalletSummary(userId) {
  setWalletSummary({
    loading: true,
    userId,
    totalDeposit: 0,
    totalWithdrawal: 0,
  });

  try {
    const data = await fetchJSON(`${API_BASE}/api/admin/users/${userId}/wallet-summary`);

    setWalletSummary({
      loading: false,
      userId,
      totalDeposit: Number(data?.summary?.totalDeposit || 0),
      totalWithdrawal: Number(data?.summary?.totalWithdrawal || 0),
    });
  } catch (e) {
    setWalletSummary({
      loading: false,
      userId,
      totalDeposit: 0,
      totalWithdrawal: 0,
    });
    toast.error(e.message || "Failed to load wallet summary");
  }
}

  async function submitDelete() {
    const userId = deleteModal.userId;
    if (!userId) return;

    setBusyId(userId);

    try {
      await fetchJSON(`${API_BASE}/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      setRows((prev) => prev.filter((u) => u._id !== userId));
      toast.success("User deleted");

      setDeleteModal({ open: false, userId: null, phoneNumber: "" });
    } catch (e) {
      toast.error(e.message || "Failed to delete user");
    } finally {
      setBusyId(null);
    }
  }

  async function submitCreateUser() {
    const phoneNumber = String(createUserModal.phoneNumber || "").trim();
    const password = String(createUserModal.password || "");
    const role = createUserModal.role || "user";

    if (!phoneNumber) {
      toast.error("Phone number is required");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setBusyId("create-user");

    try {
      const data = await fetchJSON(`${API_BASE}/api/admin/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, password, role }),
      });

      setRows((prev) => {
        const exists = prev.some((u) => String(u._id) === String(data.user?._id));
        if (exists) return prev;
        return [data.user, ...prev];
      });

      toast.success("User created");

      setCreateUserModal({
        open: false,
        phoneNumber: "",
        password: "",
        role: "user",
      });
    } catch (e) {
      toast.error(e.message || "Failed to create user");
    } finally {
      setBusyId(null);
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;
  
    const socket = io(API_BASE);
  
    socket.on("connect", () => {
      console.log("[Users Socket] connected:", socket.id);
      socket.emit("admin:join");
    });
  
    socket.on("admin:userCreated", ({ user }) => {
      if (!user?._id) return;
  
      console.log("[Users Socket] admin:userCreated:", user);
  
      setRows((prev) => {
        const exists = prev.some((u) => String(u._id) === String(user._id));
        if (exists) return prev;
        return [user, ...prev];
      });
  
      toast.success("New user registered");
    });
  
    socket.on("admin:userBalanceUpdated", ({ userId, user }) => {
      console.log("[Users Socket] admin:userBalanceUpdated received:", {
        userId,
        user,
      });
    
      if (!userId && !user?._id) return;
    
      const id = String(userId || user._id);
    
      setRows((prev) =>
        prev.map((u) =>
          String(u._id) === id
            ? {
                ...u,
                balance: Number(user?.balance ?? u.balance ?? 0),
    
                displayBalance: Number(
                  user?.displayBalance ??
                    user?.shortBalance ??
                    user?.balance ??
                    u.displayBalance ??
                    u.balance ??
                    0
                ),
    
                availableBalance: Number(
                  user?.availableBalance ??
                    u.availableBalance ??
                    user?.balance ??
                    0
                ),
    
                shortBalance: Number(
                  user?.shortBalance ??
                    user?.displayBalance ??
                    u.shortBalance ??
                    u.displayBalance ??
                    0
                ),
    
                pendingAmount: Number(
                  user?.pendingAmount ??
                    u.pendingAmount ??
                    0
                ),
              }
            : u
        )
      );
    
      setActionsModal((prev) =>
        prev.user && String(prev.user._id) === id
          ? {
              ...prev,
              user: {
                ...prev.user,
                balance: Number(user?.balance ?? prev.user.balance ?? 0),
    
                displayBalance: Number(
                  user?.displayBalance ??
                    user?.shortBalance ??
                    user?.balance ??
                    prev.user.displayBalance ??
                    prev.user.balance ??
                    0
                ),
    
                availableBalance: Number(
                  user?.availableBalance ??
                    prev.user.availableBalance ??
                    user?.balance ??
                    0
                ),
    
                shortBalance: Number(
                  user?.shortBalance ??
                    user?.displayBalance ??
                    prev.user.shortBalance ??
                    prev.user.displayBalance ??
                    0
                ),
    
                pendingAmount: Number(
                  user?.pendingAmount ??
                    prev.user.pendingAmount ??
                    0
                ),
              },
            }
          : prev
      );
    });

    socket.on("admin:userOrdersUpdated", ({ userId, ordersCompleted, ordersLimit }) => {
      if (!userId) return;
    
      const id = String(userId);
    
      setRows((prev) =>
        prev.map((u) =>
          String(u._id) === id
            ? {
                ...u,
                ordersCompleted: Number(ordersCompleted ?? u.ordersCompleted ?? 0),
                ordersLimit: Number(ordersLimit ?? u.ordersLimit ?? 40),
              }
            : u
        )
      );
    
      setActionsModal((prev) =>
        prev.user && String(prev.user._id) === id
          ? {
              ...prev,
              user: {
                ...prev.user,
                ordersCompleted: Number(
                  ordersCompleted ?? prev.user.ordersCompleted ?? 0
                ),
                ordersLimit: Number(ordersLimit ?? prev.user.ordersLimit ?? 40),
              },
            }
          : prev
      );
    });
  
    socket.on("disconnect", (reason) => {
      console.log("[Users Socket] disconnected:", reason);
    });
  
    socket.on("connect_error", (err) => {
      console.error("[Users Socket] connect_error:", err.message);
    });
  
    return () => {
      socket.off("admin:userCreated");
      socket.off("admin:userBalanceUpdated");
      socket.off("admin:userOrdersUpdated");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    saveUsersCache({
      rows,
      q,
      roleFilter,
      sortBy,
      page,
      pageSize,
      savedAt: Date.now(),
    });
  }, [rows, q, roleFilter, sortBy, page, pageSize]);

  useEffect(() => {
    const cache = loadUsersCache();

    if (cache?.rows?.length) {
      setRows(cache.rows);
      setQ(cache.q || "");
      setRoleFilter(cache.roleFilter || "all");
      setSortBy(cache.sortBy || "createdAt_desc");
      setPage(cache.page || 1);
      setPageSize(cache.pageSize || 10);
      setLoading(false);
      return;
    }

  loadUsers(true);
}, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return rows.filter((u) => {
      const matchesQuery =
        !qq ||
        String(u.phoneNumber || "").toLowerCase().includes(qq) ||
        String(u.uid || "").toLowerCase().includes(qq) ||
        String(u._id || "").toLowerCase().includes(qq) ||
        String(u.registeredIp || "").toLowerCase().includes(qq);

      const matchesRole =
        roleFilter === "all" ? true : String(u.role) === roleFilter;

      return matchesQuery && matchesRole;
    });
  }, [rows, q, roleFilter]);

  useEffect(() => {
    setPage(1);
  }, [q, roleFilter, sortBy, pageSize]);

  const sortedFiltered = useMemo(() => {
    return sortUsersList(filtered, sortBy);
  }, [filtered, sortBy]);
  
  const totalPages = Math.max(1, Math.ceil(sortedFiltered.length / pageSize));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedFiltered.slice(start, start + pageSize);
  }, [sortedFiltered, page, pageSize]);

  const modalAmount = safeNum(balanceModal.amount);
  const modalCurrentBalance = safeNum(balanceModal.currentBalance);
  
  const balancePreviewAfter =
    balanceModal.creditType === "bonus"
      ? modalCurrentBalance + modalAmount
      : balanceModal.mode === "set"
      ? modalAmount
      : balanceModal.mode === "dec"
      ? modalCurrentBalance - modalAmount
      : modalCurrentBalance + modalAmount;
  
  const balancePreviewLabel =
    balanceModal.creditType === "bonus"
      ? "Balance After Bonus"
      : "Balance After Deposit";

  return (
    <Shell title="User Management">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className={`text-xs ${mutedText}`}>
          Manage users, balances, roles, and online activity
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search phone / UID / IP..."
            className={`${inputClass} md:w-64`}
          />

          <SelectMenu
            value={roleFilter}
            onChange={setRoleFilter}
            width="w-full md:w-36"
            options={[
              { value: "all", label: "All roles" },
              { value: "user", label: "User" },
              { value: "admin", label: "Admin" },
            ]}
          />

          <SelectMenu
            value={sortBy}
            onChange={setSortBy}
            width="w-full md:w-48"
            options={[
              { value: "createdAt_desc", label: "Sort: Newest" },
              { value: "createdAt_asc", label: "Sort: Oldest" },
              { value: "lastOnline_desc", label: "Sort: Last Online" },
              { value: "balance_desc", label: "Sort: Highest Balance" },
              { value: "balance_asc", label: "Sort: Lowest Balance" },
              { value: "orders_desc", label: "Sort: Most Orders" },
              { value: "orders_asc", label: "Sort: Fewest Orders" },
              { value: "pending_desc", label: "Sort: Highest Pending" },
            ]}
          />

          <button
            onClick={() =>
              setCreateUserModal({
                open: true,
                phoneNumber: "",
                password: "",
                role: "user",
              })
            }
            className={`rounded-xl border px-3 py-2 text-xs ${
              theme === "dark"
                ? "border-blue-500/25 bg-blue-500/10 text-blue-200 hover:bg-blue-500/15"
                : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
            }`}
          >
            + Create User
          </button>

          <button
            disabled={loading}
            onClick={loadUsers}
            className={`${buttonClass} disabled:opacity-50`}
          >
            Refresh
          </button>

        </div>
      </div>

      <div className={tableWrapClass}>
        <div className={tableHeaderBarClass}>
          Users ({filtered.length})
        </div>

        {/* only inner table scrolls horizontally */}
        <div className="users-table-scroll overflow-x-auto">
          <table className="min-w-[2200px] text-left text-sm">
            <thead className={tableHeadClass}>
              <tr>
                <th className="px-4 py-3">Actions</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">User ID</th>
                <th className="px-4 py-3">Referrer</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3">Pending</th>
                <th className="px-4 py-3">Balance</th>
                <th className="px-4 py-3">Add Balance</th>
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3">Order Controls</th>
                <th className="px-4 py-3">Rounds</th>
                <th className="px-4 py-3">Registered IP</th>
                <th className="px-4 py-3">Last Online</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Role</th>
              </tr>
            </thead>

            <tbody className={tableBodyClass}>
              {loading ? (
                <LoadingSkeletonRows />
              ) : filtered.length === 0 ? (
                <tr>
                  <td className={`px-4 py-5 ${softText}`} colSpan={15}>
                    No users found.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((u) => {
                  const isBusy = busyId === u._id;
                  const banned = Boolean(u.isBanned);

                  return (
                    <tr key={u._id} className={tableRowClass}>
                      {/* actions first */}
                      <td className="px-4 py-3">
                        <div className="flex">
                          <button
                            disabled={isBusy}
                            onClick={() => {
                              setActionsModal({ open: true, user: u });
                              loadWalletSummary(u._id);
                            }}
                            className={`rounded-xl px-3 py-2 text-xs disabled:opacity-50 ${
                              theme === "dark"
                                ? "border border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                                : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            More
                          </button>
                        </div>
                      </td>

                      {/* phone */}
                      <td className="px-4 py-3">
                        <div className={`  text-xs ${strongText}`}>
                          {u.phoneNumber || "-"}
                        </div>
                        {banned ? (
                          <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-red-500/25 bg-red-500/10 px-2 py-1 text-[10px] text-red-200">
                            BANNED
                          </div>
                        ) : null}
                      </td>

                      {/* user id */}
                      <td className="px-4 py-3">
                        <div
                          className={`cursor-pointer select-none text-xs ${softText}`}
                          title={u.uid ? "Double-click to copy UID" : ""}
                          onDoubleClick={() => copyUid(u.uid)}
                        >
                          {u.uid || "-"}
                        </div>
                      </td>

                      {/* invited by */}
                      <td className="px-4 py-3">
                       <div
                          className={`max-w-[140px] truncate text-xs ${softText}`}
                          title={u?.referredBy?.phoneNumber || "-"}
                        >
                          {u?.referredBy?.phoneNumber || "-"}
                        </div>
                      </td>

                      {/* registered country */}
                      <td className="px-4 py-3">
                        {String(u.registeredCountry || "").toUpperCase() === "ADMIN_CREATED" ? (
                          <div
                            className={`flex items-center gap-2 text-xs ${softText}`}
                            title="Admin registered user"
                          >
                            <span className="text-base leading-none">🌐</span>
                            <span>ADMIN_CREATED</span>
                          </div>
                        ) : u.registeredCountry ? (
                          <div
                            className={`flex items-center gap-2 text-xs ${softText}`}
                            title={u.registeredCountry}
                          >
                            <img
                              src={`https://flagcdn.com/24x18/${String(u.registeredCountry).toLowerCase()}.png`}
                              alt={String(u.registeredCountry).toUpperCase()}
                              className="h-[14px] w-[18px] rounded-[2px] object-cover"
                              loading="lazy"
                            />
                            <span>{String(u.registeredCountry).toUpperCase()}</span>
                          </div>
                        ) : (
                          <div className={`text-xs ${softText}`}>-</div>
                        )}
                      </td>
                      
                      {/* pending balance */}
                      <td className="px-4 py-3">
                        <div className={`  text-xs ${
                          theme === "dark" ? "text-blue-200" : "text-blue-700"
                        }`}>
                          {formatMoney(u.pendingAmount)}
                        </div>
                      </td>

                      {/* balance */}
                      <td className="px-4 py-3">
                        <div className={`text-xs ${strongText}`}>
                          {formatMoney(u.displayBalance)}
                        </div>
                      </td>

                      {/* add balance button */}
                      <td className="px-4 py-3">
                        <button
                          disabled={isBusy}
                          onClick={() =>
                            setBalanceModal({
                              open: true,
                              userId: u._id,
                              uid: u.uid || "",
                              currentBalance: safeNum(u.displayBalance ?? u.balance),
                              creditType: "balance",
                              mode: "inc",
                              amount: "",
                              note: "Admin bonus",
                            })
                          }
                          className={`rounded-xl border px-3 py-1.5 text-xs disabled:opacity-50 ${
                            theme === "dark"
                              ? "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                              : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                          }`}
                          title="Add / Subtract balance"
                        >
                          Add
                        </button>
                      </td>

                      {/* orders */}
                      <td className="px-4 py-3">
                        <div className={`text-xs ${strongText}`}>
                          {safeNum(u.ordersCompleted)}/
                          {Number.isFinite(Number(u.ordersLimit)) ? Number(u.ordersLimit) : "-"}
                        </div>
                      </td>
                      
                      {/* order controls */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <input
                            value={orderEdit[u._id] ?? String(u.ordersCompleted ?? 0)}
                            onChange={(e) =>
                              setOrderEdit((p) => ({ ...p, [u._id]: e.target.value }))
                            }
                            className={
                              theme === "dark"
                                ? "w-20 rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/90 outline-none focus:border-white/20"
                                : "w-20 rounded-xl border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 outline-none focus:border-gray-400"
                            }
                            placeholder="0"
                            disabled={isBusy}
                          />
                      
                          <button
                            disabled={isBusy}
                            onClick={() => saveUserOrders(u._id)}
                            className={`rounded-xl border px-2 py-1 text-xs disabled:opacity-50 ${
                              theme === "dark"
                                ? "border-blue-500/25 bg-blue-500/10 text-blue-200 hover:bg-blue-500/15"
                                : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                            }`}
                            title="Save ordersCompleted"
                          >
                            Save
                          </button>
                      
                          <button
                            disabled={isBusy}
                            onClick={() => resetUserOrdersCount(u._id)}
                            className={`rounded-xl border px-2 py-1 text-xs disabled:opacity-50 ${
                              theme === "dark"
                                ? "border-orange-500/25 bg-orange-500/10 text-orange-200 hover:bg-orange-500/15"
                                : "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
                            }`}
                            title="Reset to 0"
                          >
                            Reset
                          </button>
                        </div>
                      </td>

                      {/* rounds */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`  text-xs ${strongText}`}>
                            {safeNum(u.totalResetCount || 1)}
                          </div>

                          <input
                            value={resetEdit[u._id] ?? String(u.totalResetCount ?? 1)}
                            onChange={(e) =>
                              setResetEdit((p) => ({ ...p, [u._id]: e.target.value }))
                            }
                            className={
                              theme === "dark"
                                ? "w-16 rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/90 outline-none focus:border-white/20"
                                : "w-16 rounded-xl border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 outline-none focus:border-gray-400"
                            }
                            placeholder="1"
                            disabled={isBusy}
                          />

                          <button
                            disabled={isBusy}
                            onClick={() => saveUserResetCount(u._id)}
                            className={`rounded-xl border px-2 py-1 text-xs disabled:opacity-50 ${
                              theme === "dark"
                                ? "border-blue-500/25 bg-blue-500/10 text-blue-200 hover:bg-blue-500/15"
                                : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                            }`}
                            title="Save totalResetCount"
                          >
                            Save
                          </button>
                        </div>
                      </td>

                      {/* ip truncated */}
                      <td className="px-4 py-3">
                        <div
                          className={`max-w-[180px] truncate   text-xs ${softText}`}
                          title={u.registeredIp || "-"}
                        >
                          {u.registeredIp || "-"}
                        </div>
                      </td>

                      {/* last online */}
                      <td className={`px-4 py-3 text-xs ${softText}`}>
                        {formatDate(u.lastOnlineAt)}
                      </td>

                      {/* created */}
                      <td className={`px-4 py-3 text-xs ${softText}`}>
                        {formatDate(u.createdAt)}
                      </td>

                      {/* user role */}
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] ${
                            theme === "dark"
                              ? "border border-white/10 bg-white/5 text-white/80"
                              : "border border-gray-200 bg-gray-50 text-gray-700"
                          }`}
>
                          {u.role || "-"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* pagination bottom */}
        <div className={footerBarClass}>
          <div className={`text-xs ${mutedText}`}>
            Showing {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1} to{" "}
            {Math.min(page * pageSize, filtered.length)} of {filtered.length} users
          </div>
        
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <span className={`text-xs ${mutedText}`}>Per page</span>
              <SelectMenu
                value={pageSize}
                onChange={(val) => {
                  setPageSize(Number(val));
                  setPage(1);
                }}
                width="w-24"
                placement="up"
                options={[
                  { value: 10, label: "10" },
                  { value: 20, label: "20" },
                  { value: 100, label: "100" },
                ]}
              />
            </div>
        
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={`${buttonClass} disabled:opacity-40`}
              >
                Prev
              </button>
        
              <div className={`text-xs ${softText}`}>
                Page {totalPages === 0 ? 1 : page} / {totalPages}
              </div>
        
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className={`${buttonClass} disabled:opacity-40`}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
  
      <Modal
        open={withdrawalBlockModal.open}
        title="Freeze Withdrawal"
        subtitle={
          withdrawalBlockModal.userId
            ? `User: ${withdrawalBlockModal.phoneNumber}`
            : ""
        }
        onClose={() =>
          setWithdrawalBlockModal({
            open: false,
            userId: null,
            phoneNumber: "",
            blocked: true,
            reason: "",
          })
        }
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() =>
                setWithdrawalBlockModal({
                  open: false,
                  userId: null,
                  phoneNumber: "",
                  blocked: true,
                  reason: "",
                })
              }
              className={
                theme === "dark"
                  ? "rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/70 hover:bg-white/10"
                  : "rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs text-gray-700 hover:bg-gray-50"
              }
            >
              Cancel
            </button>
      
            <button
              disabled={busyId === withdrawalBlockModal.userId}
              onClick={async () => {
                const user = rows.find((x) => x._id === withdrawalBlockModal.userId);
                if (!user) {
                  toast.error("User not found");
                  return;
                }
      
                await toggleWithdrawalBlock(user, withdrawalBlockModal.reason);
      
                setWithdrawalBlockModal({
                  open: false,
                  userId: null,
                  phoneNumber: "",
                  blocked: true,
                  reason: "",
                });
              }}
              className={
                theme === "dark"
                  ? "rounded-xl border border-orange-500/25 bg-orange-500/15 px-4 py-2 text-xs text-orange-200 hover:bg-orange-500/20 disabled:opacity-50"
                  : "rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 text-xs text-orange-700 hover:bg-orange-100 disabled:opacity-50"
              }
            >
              {busyId === withdrawalBlockModal.userId ? "Saving..." : "Confirm Freeze"}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div
            className={
              theme === "dark"
                ? "rounded-2xl border border-orange-500/25 bg-orange-500/10 p-3 text-xs text-orange-200"
                : "rounded-2xl border border-orange-200 bg-orange-50 p-3 text-xs text-orange-700"
            }
          >
            This will block the user from creating withdrawals.
          </div>
      
          <div
            className={
              theme === "dark"
                ? "rounded-2xl border border-white/10 bg-white/5 p-3"
                : "rounded-2xl border border-gray-200 bg-gray-50 p-3"
            }
          >
            <div
              className={
                theme === "dark"
                  ? "text-xs font-semibold text-white"
                  : "text-xs font-semibold text-gray-900"
              }
            >
              Reason
            </div>
      
            <input
              value={withdrawalBlockModal.reason}
              onChange={(e) =>
                setWithdrawalBlockModal((p) => ({ ...p, reason: e.target.value }))
              }
              placeholder="Example: Risk review / Suspicious activity / Manual hold"
              className={
                theme === "dark"
                  ? "mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/90 placeholder:text-white/30 outline-none focus:border-white/20"
                  : "mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-400"
              }
            />
          </div>
        </div>
      </Modal>

      {/* Balance modal */}
      <Modal
        open={balanceModal.open}
        title="Add Balance Or Bonus"
        subtitle={
          balanceModal.uid
            ? `UID: ${balanceModal.uid}`
            : "Credit user wallet safely"
        }
        onClose={resetBalanceModal}
        footer={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={resetBalanceModal}
              className={buttonClass}
            >
              Cancel
            </button>
      
            <button
              type="button"
              disabled={busyId === balanceModal.userId}
              onClick={submitBalance}
              className={`rounded-xl px-4 py-2 text-xs font-semibold disabled:opacity-50 ${
                balanceModal.creditType === "bonus"
                  ? theme === "dark"
                    ? "border border-emerald-400/20 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/15"
                    : "border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  : theme === "dark"
                  ? "border border-white/10 bg-white text-slate-900 hover:bg-white/90"
                  : "border border-gray-900 bg-gray-900 text-white hover:bg-gray-800"
              }`}
            >
              {busyId === balanceModal.userId
                ? "Processing..."
                : balanceModal.creditType === "bonus"
                ? "Credit Bonus"
                : "Update Balance"}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div
            className={`grid grid-cols-2 gap-2 rounded-2xl border p-1 ${
              theme === "dark"
                ? "border-white/10 bg-white/5"
                : "border-gray-200 bg-gray-100"
            }`}
          >
            <button
              type="button"
              onClick={() =>
                setBalanceModal((p) => ({
                  ...p,
                  creditType: "balance",
                }))
              }
              className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                balanceModal.creditType === "balance"
                  ? theme === "dark"
                    ? "bg-white text-slate-900"
                    : "bg-gray-900 text-white"
                  : theme === "dark"
                  ? "text-white/60 hover:bg-white/5"
                  : "text-gray-500 hover:bg-white"
              }`}
            >
              Manual Balance
            </button>
      
            <button
              type="button"
              onClick={() =>
                setBalanceModal((p) => ({
                  ...p,
                  creditType: "bonus",
                  mode: "inc",
                }))
              }
              className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                balanceModal.creditType === "bonus"
                  ? theme === "dark"
                    ? "bg-emerald-400 text-slate-950"
                    : "bg-emerald-600 text-white"
                  : theme === "dark"
                  ? "text-white/60 hover:bg-white/5"
                  : "text-gray-500 hover:bg-white"
              }`}
            >
              Bonus Credit
            </button>
          </div>
      
          <div
            className={`rounded-2xl border p-4 ${
              theme === "dark"
                ? "border-white/10 bg-white/5"
                : "border-gray-200 bg-gray-50"
            }`}
          >
            <div className={`text-[11px] ${mutedText}`}>Current Balance</div>
            <div className={`mt-1 text-2xl font-semibold ${strongText}`}>
              {formatMoney(balanceModal.currentBalance)}
            </div>
          </div>
      
          {balanceModal.creditType === "balance" ? (
            <div>
              <div className={`text-xs font-semibold ${strongText}`}>Operation</div>
              <div className="mt-2">
                <SelectMenu
                  value={balanceModal.mode}
                  onChange={(val) =>
                    setBalanceModal((p) => ({
                      ...p,
                      mode: val,
                    }))
                  }
                  options={[
                    { value: "inc", label: "Add Balance" },
                    { value: "dec", label: "Deduct Balance" },
                    { value: "set", label: "Set Exact Balance" },
                  ]}
                />
              </div>
            </div>
          ) : (
            <div
              className={`rounded-2xl border p-4 ${
                theme === "dark"
                  ? "border-emerald-400/20 bg-emerald-400/10"
                  : "border-emerald-200 bg-emerald-50"
              }`}
            >
              <div
                className={`text-xs font-semibold ${
                  theme === "dark" ? "text-emerald-200" : "text-emerald-700"
                }`}
              >
                Bonus Credit Mode
              </div>
              <div
                className={`mt-1 text-[11px] ${
                  theme === "dark" ? "text-emerald-100/70" : "text-emerald-700/70"
                }`}
              >
                Credit users account with bonus.
              </div>
            </div>
          )}
      
          <div>
            <div className={`text-xs font-semibold ${strongText}`}>Amount</div>
            <input
              value={balanceModal.amount}
              onChange={(e) =>
                setBalanceModal((p) => ({
                  ...p,
                  amount: e.target.value,
                }))
              }
              placeholder="Example: 100"
              inputMode="decimal"
              className={`mt-2 ${inputClass}`}
            />
          </div>
      
          <div
            className={`rounded-3xl border p-4 ${
              theme === "dark"
                ? "border-white/10 bg-[#0f172a]"
                : "border-gray-200 bg-white"
            }`}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div
                className={`rounded-2xl border p-3 ${
                  theme === "dark"
                    ? "border-white/10 bg-white/[0.04]"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className={`text-[11px] ${mutedText}`}>Current Balance</div>
                <div className={`mt-1 text-sm font-semibold ${strongText}`}>
                  {formatMoney(modalCurrentBalance)}
                </div>
              </div>
          
              <div
                className={`rounded-2xl border p-3 ${
                  theme === "dark"
                    ? "border-white/10 bg-white/[0.04]"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className={`text-[11px] ${mutedText}`}>Amount</div>
                <div className={`mt-1 text-sm font-semibold ${strongText}`}>
                  {formatMoney(modalAmount)}
                </div>
              </div>
          
              <div
                className={`rounded-2xl border p-3 sm:col-span-2 ${
                  balanceModal.creditType === "bonus"
                    ? theme === "dark"
                      ? "border-emerald-400/20 bg-emerald-400/10"
                      : "border-emerald-200 bg-emerald-50"
                    : theme === "dark"
                    ? "border-blue-400/20 bg-blue-400/10"
                    : "border-blue-200 bg-blue-50"
                }`}
              >
                <div
                  className={`text-[11px] ${
                    balanceModal.creditType === "bonus"
                      ? theme === "dark"
                        ? "text-emerald-200/70"
                        : "text-emerald-700/70"
                      : theme === "dark"
                      ? "text-blue-200/70"
                      : "text-blue-700/70"
                  }`}
                >
                  {balancePreviewLabel}
                </div>
          
                <div
                  className={`font-semibold ${
                    balanceModal.creditType === "bonus"
                      ? theme === "dark"
                        ? "text-emerald-100"
                        : "text-emerald-700"
                      : theme === "dark"
                      ? "text-blue-100"
                      : "text-blue-700"
                  }`}
                >
                  {formatMoney(balancePreviewAfter)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Actions drawer */}
      <Drawer
        open={actionsModal.open}
        title="User Actions"
        subtitle={
          actionsModal.user
            ? `User: ${actionsModal.user.phoneNumber} • Email: ${
                actionsModal.user.emailVerified && actionsModal.user.email
                  ? actionsModal.user.email
                  : "Email not verified"
              }`
            : ""
        }
        onClose={() => {
          setActionsModal({ open: false, user: null });
          setWalletSummary({
            loading: false,
            userId: null,
            totalDeposit: 0,
            totalWithdrawal: 0,
          });
        }}
      >
        {actionsModal.user ? (
          <div className="space-y-5">
            {/* top summary */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className={drawerCardClass}>
                <div className={drawerLabelClass}>UID</div>
                <div className={`${drawerValueClass}`}>
                  {actionsModal.user.uid || "-"}
                </div>
              </div>
            
              <div className={drawerCardClass}>
                <div className="flex items-center justify-between gap-3">
                  <div className={drawerLabelClass}>Withdrawal Status</div>
                  <div className={statusPlainClass}>
                    {actionsModal.user.withdrawalBlocked ? "FROZEN" : "ACTIVE"}
                  </div>
                </div>
            
                {actionsModal.user.withdrawalBlockedReason ? (
                  <div className={`mt-2 ${drawerMutedClass}`}>
                    Reason: {actionsModal.user.withdrawalBlockedReason}
                  </div>
                ) : null}
            
                {actionsModal.user.withdrawalBlockedAt ? (
                  <div className={`mt-1 ${drawerMutedClass}`}>
                    Since: {formatDate(actionsModal.user.withdrawalBlockedAt)}
                  </div>
                ) : null}
              </div>
            </div>
      
            {/* wallet stats */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className={drawerCardClass}>
                <div className={drawerLabelClass}>Total Deposit</div>
                <div className={`mt-2   text-2xl font-semibold ${strongText}`}>
                  {walletSummary.loading && walletSummary.userId === actionsModal.user._id
                    ? "..."
                    : safeNum(walletSummary.totalDeposit).toFixed(2)}
                </div>
              </div>
      
              <div className={drawerCardClass}>
                <div className={drawerLabelClass}>Total Withdrawal</div>
                <div className={`mt-2   text-2xl font-semibold ${strongText}`}>
                  {walletSummary.loading && walletSummary.userId === actionsModal.user._id
                    ? "..."
                    : safeNum(walletSummary.totalWithdrawal).toFixed(2)}
                </div>
              </div>
            </div>
      
            {/* vip + pin */}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className={drawerSectionClass}>
                <div className={drawerLabelClass}>VIP Ranking</div>
      
                <div className="mt-3 flex items-center gap-2">
                  <SelectMenu
                    disabled={busyId === actionsModal.user._id}
                    value={
                      vipEdit[actionsModal.user._id] ??
                      String(actionsModal.user.vipRank ?? 1)
                    }
                    onChange={(val) =>
                      setVipEdit((p) => ({
                        ...p,
                        [actionsModal.user._id]: String(val),
                      }))
                    }
                    width="w-32"
                    options={[
                      { value: "1", label: "Rank 1" },
                      { value: "2", label: "Rank 2" },
                      { value: "3", label: "Rank 3" },
                    ]}
                  />
      
                  <button
                    disabled={busyId === actionsModal.user._id}
                    onClick={async () => {
                      const id = actionsModal.user._id;
                      await saveUserVipRank(id);
      
                      setActionsModal((prev) =>
                        prev.user
                          ? {
                              ...prev,
                              user: {
                                ...prev.user,
                                vipRank: Number(vipEdit[id] ?? prev.user.vipRank ?? 1),
                              },
                            }
                          : prev
                      );
                    }}
                    className={`rounded-xl border px-3 py-2 text-xs disabled:opacity-50 ${
                      theme === "dark"
                        ? "border-blue-500/25 bg-blue-500/10 text-blue-200 hover:bg-blue-500/15"
                        : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                    }`}
                  >
                    Save VIP
                  </button>
                </div>
              </div>
      
              <div className={drawerSectionClass}>
                <div className={drawerLabelClass}>Withdrawal PIN</div>
      
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <div className={pillNeutralClass}>
                    Locked:{" "}
                    <span
                      className={theme === "dark" ? "text-white" : "text-gray-900"}
                    >
                      {actionsModal.user.withdrawPinLocked ? "YES" : "NO"}
                    </span>
                  </div>
      
                  <div className={pillNeutralClass}>
                    Attempts left:{" "}
                    <span className={theme === "dark" ? "text-white" : "text-gray-900"}>
                      {Math.max(
                        0,
                        3 - Number(actionsModal.user.withdrawPinFailedAttempts || 0)
                      )}
                    </span>
                  </div>
      
                  <div className={pillNeutralClass}>
                    Failed: {Number(actionsModal.user.withdrawPinFailedAttempts || 0)}
                  </div>
                </div>
              </div>
            </div>
      
            {/* primary actions */}
            <div className={drawerSectionClass}>
              <div className={drawerLabelClass}>Account Actions</div>
      
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  disabled={busyId === actionsModal.user._id}
                  onClick={() => {
                    const u = actionsModal.user;
                    setActionsModal({ open: false, user: null });
      
                    setWithdrawPinModal({
                      open: true,
                      userId: u._id,
                      phoneNumber: u.phoneNumber || "",
                      newPin: "",
                    });
                  }}
                  className={`${actionPlainClass} disabled:opacity-50`}
                >
                  <div className="font-semibold">Reset Withdrawal PIN</div>
                  <div className="mt-1 text-[11px] opacity-70">
                    Reset attempts back to 3
                  </div>
                </button>
      
                <button
                  disabled={busyId === actionsModal.user._id}
                  onClick={() => {
                    const u = actionsModal.user;
                    setActionsModal({ open: false, user: null });
      
                    setPasswordModal({
                      open: true,
                      userId: u._id,
                      phoneNumber: u.phoneNumber || "",
                      newPassword: "",
                    });
                  }}
                  className={drawerNeutralButtonClass}
                >
                  <div className="font-semibold">Reset Password</div>
                  <div className={`mt-1 ${drawerMutedClass}`}>
                    Set a new password for the user
                  </div>
                </button>
      
                <button
                  disabled={busyId === actionsModal.user._id}
                  onClick={() => {
                    const u = actionsModal.user;
                    setActionsModal({ open: false, user: null });
      
                    setPhoneModal({
                      open: true,
                      userId: u._id,
                      oldPhone: u.phoneNumber || "",
                      newPhone: "",
                    });
                  }}
                  className={drawerNeutralButtonClass}
                >
                  <div className="font-semibold">Reset Phone Number</div>
                  <div className={`mt-1 ${drawerMutedClass}`}>Update phone number</div>
                </button>
      
                <button
                  disabled={busyId === actionsModal.user._id}
                  onClick={async () => {
                    const u = actionsModal.user;
                    setActionsModal({ open: false, user: null });
                    await changeRole(u._id, u.role === "admin" ? "user" : "admin");
                  }}
                  className={drawerNeutralButtonClass}
                >
                  <div className="font-semibold">
                    {actionsModal.user.role === "admin" ? "Make User" : "Make Admin"}
                  </div>
                  <div className={`mt-1 ${drawerMutedClass}`}>Change user role</div>
                </button>
              </div>
            </div>
      
            {/* growth / engagement */}
            <div className={drawerSectionClass}>
              <div className={drawerLabelClass}>Growth & Campaigns</div>
      
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <button
                  disabled={busyId === actionsModal.user._id}
                  onClick={() => {
                    const u = actionsModal.user;
                    setActionsModal({ open: false, user: null });
                    navigate(
                      `/admin/orders/bonus?uid=${encodeURIComponent(u.uid)}&currentOrder=${encodeURIComponent(
                        Number(u.ordersCompleted || 0)
                      )}`
                    );
                  }}
                  className={`${actionPlainClass} disabled:opacity-50`}
                >
                  <div className="font-semibold">Bonus Order</div>
                  <div className="mt-1 text-[11px] opacity-70">
                    Assign a bonus order for user
                  </div>
                </button>
      
                <button
                  disabled={busyId === actionsModal.user._id}
                  onClick={() => {
                    const u = actionsModal.user;
                    setActionsModal({ open: false, user: null });
                    navigate(
                      `/admin/lucky-draw?uid=${encodeURIComponent(u.uid)}&currentOrder=${encodeURIComponent(
                        Number(u.ordersCompleted || 0)
                      )}`
                    );
                  }}
                  className={`${actionPlainClass} disabled:opacity-50`}
                >
                  <div className="font-semibold">Lucky Draw</div>
                  <div className="mt-1 text-[11px] opacity-70">
                    Assign a lucky draw trigger
                  </div>
                </button>
      
                <button
                  disabled={busyId === actionsModal.user._id}
                  onClick={() => {
                    const u = actionsModal.user;
                    setActionsModal({ open: false, user: null });
                    navigate(`/admin/bonus-credit?userId=${u._id}&uid=${u.uid || ""}`);
                  }}
                  className={`${actionPlainClass} disabled:opacity-50`}
                >
                  <div className="font-semibold">Bonus Credit</div>
                  <div className="mt-1 text-[11px] opacity-70">
                    Credit bonus and view bonus history
                  </div>
                </button>
              </div>
            </div>
      
            {/* Other actions & risk */}
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              <div className={drawerSectionClass}>
                <div className={drawerLabelClass}>Other Actions</div>
            
                <div className="mt-3 grid grid-cols-1 gap-3">
                  <button
                    disabled={busyId === actionsModal.user._id}
                    onClick={() => {
                      const u = actionsModal.user;
                      setActionsModal({ open: false, user: null });
                      navigate(`/admin/chat?userId=${encodeURIComponent(u._id)}`);
                    }}
                    className={`${actionPlainClass} disabled:opacity-50`}
                  >
                    <div className="font-semibold">Start Chat</div>
                    <div className="mt-1 text-[11px] opacity-70">
                      Open support chat with this user
                    </div>
                  </button>
            
                  <button
                    disabled={busyId === actionsModal.user._id}
                    onClick={() => goToTrialBonus(actionsModal.user)}
                    className={`${actionPlainClass} disabled:opacity-50`}
                  >
                    <div className="font-semibold">Activate Trial</div>
                    <div className="mt-1 text-[11px] opacity-70">
                      Open trial bonus page with this user UID
                    </div>
                  </button>

                  <div className={drawerCardClass}>
                    <div className="flex items-center justify-between gap-3">
                      <div className={drawerLabelClass}>Sign-In Reward</div>
                      <div className={statusPlainClass}>
                        {actionsModal.user.signinRewardEnabled ? "ENABLED" : "DISABLED"}
                      </div>
                    </div>
                  
                    <button
                      disabled={busyId === actionsModal.user._id}
                      onClick={() => toggleSigninReward(actionsModal.user)}
                      className={`mt-3 w-full rounded-xl border px-3 py-2 text-xs font-semibold disabled:opacity-50 ${
                        actionsModal.user.signinRewardEnabled
                          ? theme === "dark"
                            ? "border-red-400/40 bg-red-500/20 text-red-100 hover:bg-red-500/25"
                            : "border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                          : theme === "dark"
                          ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/25"
                          : "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      }`}
                    >
                      {busyId === actionsModal.user._id
                        ? "Saving..."
                        : actionsModal.user.signinRewardEnabled
                        ? "Disable"
                        : "Enable"}
                    </button>
                  </div>

                  <button
                    disabled={
                      busyId === actionsModal.user._id ||
                      !actionsModal.user.emailVerified ||
                      !actionsModal.user.email
                    }
                    onClick={() => goToEmailUser(actionsModal.user)}
                    className={`${actionPlainClass} disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold">Email User</div>
                        <div className={`mt-1 ${drawerMutedClass}`}>
                          {actionsModal.user.emailVerified && actionsModal.user.email
                            ? `Send email to ${actionsModal.user.email}`
                            : "Email not verified"}
                        </div>
                      </div>
                  
                      <span className={statusPlainClass}>
                        {actionsModal.user.emailVerified && actionsModal.user.email
                          ? "READY"
                          : "LOCKED"}
                      </span>
                    </div>
                  </button>

                </div>
              </div>
            
              <div className={drawerSectionClass}>
                <div className={drawerLabelClass}>Risk Controls</div>
            
                <div className="mt-3 grid grid-cols-1 gap-3">
                  <div
                    className={
                      theme === "dark"
                        ? "rounded-2xl border border-white/10 bg-white/[0.04] p-3"
                        : "rounded-2xl border border-gray-200 bg-white p-3"
                    }
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className={`text-xs font-semibold ${strongText}`}>
                          Credit Score
                        </div>
                        <div className={`mt-1 ${drawerMutedClass}`}>
                          Below 95 will block withdrawal
                        </div>
                      </div>
            
                      <div
                        className={
                          Number(actionsModal.user.creditScore ?? 100) < 95
                            ? theme === "dark"
                              ? "rounded-full border border-red-400/30 bg-red-500/15 px-2.5 py-1 text-[10px] font-semibold text-red-200"
                              : "rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-semibold text-red-700"
                            : theme === "dark"
                            ? "rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold text-emerald-200"
                            : "rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700"
                        }
                      >
                        {Number(actionsModal.user.creditScore ?? 100) < 95
                          ? "RESTRICTED"
                          : "OK"}
                      </div>
                    </div>
            
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={
                          creditScoreEdit[actionsModal.user._id] ??
                          String(actionsModal.user.creditScore ?? 100)
                        }
                        onChange={(e) =>
                          setCreditScoreEdit((p) => ({
                            ...p,
                            [actionsModal.user._id]: e.target.value,
                          }))
                        }
                        disabled={busyId === actionsModal.user._id}
                        className={
                          theme === "dark"
                            ? "w-24 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/90 outline-none focus:border-white/20"
                            : "w-24 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-gray-400"
                        }
                        placeholder="100"
                      />
            
                      <button
                        disabled={busyId === actionsModal.user._id}
                        onClick={() => saveUserCreditScore(actionsModal.user._id)}
                        className={`rounded-xl border px-3 py-2 text-xs disabled:opacity-50 ${
                          theme === "dark"
                            ? "border-blue-500/25 bg-blue-500/10 text-blue-200 hover:bg-blue-500/15"
                            : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                        }`}
                      >
                        {busyId === actionsModal.user._id ? "Saving..." : "Save Score"}
                      </button>
                    </div>
                  </div>
            
                  <button
                    disabled={busyId === actionsModal.user._id}
                    onClick={() => {
                      const u = actionsModal.user;
            
                      if (u.withdrawalBlocked) {
                        toggleWithdrawalBlock(u);
                        return;
                      }
            
                      setActionsModal({ open: false, user: null });
                      setWithdrawalBlockModal({
                        open: true,
                        userId: u._id,
                        phoneNumber: u.phoneNumber || "",
                        blocked: true,
                        reason: u.withdrawalBlockedReason || "",
                      });
                    }}
                    className={`${actionPlainClass} disabled:opacity-50`}
                  >
                    <div className="font-semibold">
                      {actionsModal.user.withdrawalBlocked
                        ? "Unfreeze Withdrawal"
                        : "Freeze Withdrawal"}
                    </div>
                    <div className="mt-1 text-[11px] opacity-70">
                      {actionsModal.user.withdrawalBlocked
                        ? "Allow this user to withdraw again"
                        : "Block this user from withdrawing"}
                    </div>
                  </button>
            
                  <button
                    disabled={busyId === actionsModal.user._id}
                    onClick={() => {
                      const u = actionsModal.user;
                      const banned = Boolean(u.isBanned);
            
                      setActionsModal({ open: false, user: null });
            
                      setBanModal({
                        open: true,
                        userId: u._id,
                        phoneNumber: u.phoneNumber || "",
                        isBanned: !banned,
                        reason: banned ? "" : "Violation",
                      });
                    }}
                    className={`${actionPlainClass} disabled:opacity-50`}
                  >
                    <div className="font-semibold">
                      {actionsModal.user.isBanned ? "Unban User" : "Ban User"}
                    </div>
                    <div className="mt-1 text-[11px] opacity-70">
                      {actionsModal.user.isBanned
                        ? "Allow login again"
                        : "Block user from login"}
                    </div>
                  </button>
            
                  <button
                    disabled={busyId === actionsModal.user._id}
                    onClick={() => {
                      const u = actionsModal.user;
                      setActionsModal({ open: false, user: null });
            
                      setDeleteModal({
                        open: true,
                        userId: u._id,
                        phoneNumber: u.phoneNumber || "",
                      });
                    }}
                    className={`${actionPlainClass} disabled:opacity-50`}
                  >
                    <div className="font-semibold">Delete User</div>
                    <div className="mt-1 text-[11px] opacity-70">
                      Permanent removal (danger)
                    </div>
                  </button>

                  <button
                    disabled={busyId === actionsModal.user._id}
                    onClick={() => {
                      const u = actionsModal.user;
                      const currentlyBlocked = Boolean(u.orderStartBlocked);
                  
                      // If already banned from orders, unban directly.
                      if (currentlyBlocked) {
                        setOrderStartBlockModal({
                          open: true,
                          userId: u._id,
                          phoneNumber: u.phoneNumber || "",
                          blocked: false,
                          reason: "",
                        });
                        return;
                      }
                  
                      // If not banned, open modal and force admin to enter reason.
                      setActionsModal({ open: false, user: null });
                  
                      setOrderStartBlockModal({
                        open: true,
                        userId: u._id,
                        phoneNumber: u.phoneNumber || "",
                        blocked: true,
                        reason: "",
                      });
                    }}
                    className={`${actionPlainClass} disabled:opacity-50`}
                  >
                    <div className="font-semibold">
                      {actionsModal.user.orderStartBlocked ? "Unban Orders" : "Ban Orders"}
                    </div>
                  
                    <div className="mt-1 text-[11px] opacity-70">
                      {actionsModal.user.orderStartBlocked
                        ? "Allow this user to start orders again"
                        : "Block this user from clicking Start Order"}
                    </div>
                  
                    {actionsModal.user.orderStartBlocked ? (
                      <div className={`mt-2 ${drawerMutedClass}`}>
                        Reason: {actionsModal.user.orderStartBlockMessage || "-"}
                      </div>
                    ) : null}
                  </button>

                </div>
              </div>
            </div>
      
            <button
              onClick={() => {
                setActionsModal({ open: false, user: null });
                setWalletSummary({
                  loading: false,
                  userId: null,
                  totalDeposit: 0,
                  totalWithdrawal: 0,
                });
              }}
              className={`w-full rounded-2xl px-4 py-3 text-xs ${
                theme === "dark"
                  ? "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                  : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Close
            </button>
          </div>
        ) : null}
      </Drawer>

      <Modal
        open={orderStartBlockModal.open}
        title={orderStartBlockModal.blocked ? "Ban Orders" : "Unban Orders"}
        subtitle={
          orderStartBlockModal.userId
            ? `User: ${orderStartBlockModal.phoneNumber}`
            : ""
        }
        onClose={() =>
          setOrderStartBlockModal({
            open: false,
            userId: null,
            phoneNumber: "",
            blocked: true,
            reason: "",
          })
        }
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() =>
                setOrderStartBlockModal({
                  open: false,
                  userId: null,
                  phoneNumber: "",
                  blocked: true,
                  reason: "",
                })
              }
              className={
                theme === "dark"
                  ? "rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/70 hover:bg-white/10"
                  : "rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs text-gray-700 hover:bg-gray-50"
              }
            >
              Cancel
            </button>
      
            <button
              disabled={busyId === orderStartBlockModal.userId}
              onClick={submitOrderStartBlock}
              className={
                orderStartBlockModal.blocked
                  ? theme === "dark"
                    ? "rounded-xl border border-red-500/25 bg-red-500/15 px-4 py-2 text-xs text-red-200 hover:bg-red-500/20 disabled:opacity-50"
                    : "rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700 hover:bg-red-100 disabled:opacity-50"
                  : theme === "dark"
                  ? "rounded-xl border border-emerald-500/25 bg-emerald-500/15 px-4 py-2 text-xs text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
                  : "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
              }
            >
              {busyId === orderStartBlockModal.userId
                ? "Saving..."
                : orderStartBlockModal.blocked
                ? "Confirm Ban Orders"
                : "Confirm Unban Orders"}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div
            className={
              orderStartBlockModal.blocked
                ? theme === "dark"
                  ? "rounded-2xl border border-red-500/25 bg-red-500/10 p-3 text-xs text-red-200"
                  : "rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-700"
                : theme === "dark"
                ? "rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-xs text-emerald-200"
                : "rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700"
            }
          >
            {orderStartBlockModal.blocked
              ? "This will stop the user from starting new orders. When they click Start Order, they will see your custom message."
              : "This will allow the user to start orders again."}
          </div>
      
          {orderStartBlockModal.blocked ? (
            <div
              className={
                theme === "dark"
                  ? "rounded-2xl border border-white/10 bg-white/5 p-3"
                  : "rounded-2xl border border-gray-200 bg-gray-50 p-3"
              }
            >
              <div
                className={
                  theme === "dark"
                    ? "text-xs font-semibold text-white"
                    : "text-xs font-semibold text-gray-900"
                }
              >
                Reason / User Message
              </div>
      
              <textarea
                value={orderStartBlockModal.reason}
                onChange={(e) =>
                  setOrderStartBlockModal((p) => ({
                    ...p,
                    reason: e.target.value,
                  }))
                }
                rows={4}
                placeholder="Example: Your order function is temporarily restricted. Please contact customer service."
                className={
                  theme === "dark"
                    ? "mt-2 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/90 placeholder:text-white/30 outline-none focus:border-white/20"
                    : "mt-2 w-full resize-none rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-400"
                }
              />
            </div>
          ) : null}
        </div>
      </Modal>

      {/* Ban modal */}
      <Modal
        open={banModal.open}
        title={banModal.isBanned ? "Ban User" : "Unban User"}
        subtitle={banModal.userId ? `User: ${banModal.phoneNumber}` : ""}
        onClose={() =>
          setBanModal({
            open: false,
            userId: null,
            phoneNumber: "",
            isBanned: false,
            reason: "",
          })
        }
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() =>
                setBanModal({
                  open: false,
                  userId: null,
                  phoneNumber: "",
                  isBanned: false,
                  reason: "",
                })
              }
              className={
                theme === "dark"
                  ? "rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/70 hover:bg-white/10"
                  : "rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs text-gray-700 hover:bg-gray-50"
              }
            >
              Cancel
            </button>
      
            <button
              disabled={busyId === banModal.userId}
              onClick={submitBan}
              className={classNames(
                "rounded-xl border px-4 py-2 text-xs disabled:opacity-50",
                banModal.isBanned
                  ? theme === "dark"
                    ? "border-red-500/25 bg-red-500/15 text-red-200 hover:bg-red-500/20"
                    : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                  : theme === "dark"
                  ? "border-emerald-500/25 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/20"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              )}
            >
              {busyId === banModal.userId
                ? "Saving..."
                : banModal.isBanned
                ? "Confirm Ban"
                : "Confirm Unban"}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          {banModal.isBanned ? (
            <div
              className={
                theme === "dark"
                  ? "rounded-2xl border border-red-500/25 bg-red-500/10 p-3 text-xs text-red-200"
                  : "rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-700"
              }
            >
              This will block the user from logging in.
            </div>
          ) : (
            <div
              className={
                theme === "dark"
                  ? "rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-xs text-emerald-200"
                  : "rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700"
              }
            >
              This will allow the user to log in again.
            </div>
          )}
      
          {banModal.isBanned ? (
            <div
              className={
                theme === "dark"
                  ? "rounded-2xl border border-white/10 bg-white/5 p-3"
                  : "rounded-2xl border border-gray-200 bg-gray-50 p-3"
              }
            >
              <div
                className={
                  theme === "dark"
                    ? "text-xs font-semibold text-white"
                    : "text-xs font-semibold text-gray-900"
                }
              >
                Reason (optional)
              </div>
      
              <input
                value={banModal.reason}
                onChange={(e) => setBanModal((p) => ({ ...p, reason: e.target.value }))}
                placeholder="Example: Fraud / Abuse / Chargeback"
                className={
                  theme === "dark"
                    ? "mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/90 placeholder:text-white/30 outline-none focus:border-white/20"
                    : "mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-400"
                }
              />
            </div>
          ) : null}
        </div>
      </Modal>
      
      {/* Create user modal */}
      <Modal
        open={createUserModal.open}
        title="Create User"
        subtitle="Admin can create a user without invitation code"
        onClose={() =>
          setCreateUserModal({
            open: false,
            phoneNumber: "",
            password: "",
            role: "user",
          })
        }
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() =>
                setCreateUserModal({
                  open: false,
                  phoneNumber: "",
                  password: "",
                  role: "user",
                })
              }
              className={
                theme === "dark"
                  ? "rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/70 hover:bg-white/10"
                  : "rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs text-gray-700 hover:bg-gray-50"
              }
            >
              Cancel
            </button>
      
            <button
              disabled={busyId === "create-user"}
              onClick={submitCreateUser}
              className={
                theme === "dark"
                  ? "rounded-xl border border-emerald-500/25 bg-emerald-500/15 px-4 py-2 text-xs text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
                  : "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
              }
            >
              {busyId === "create-user" ? "Creating..." : "Create User"}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div
            className={
              theme === "dark"
                ? "rounded-2xl border border-white/10 bg-white/5 p-3"
                : "rounded-2xl border border-gray-200 bg-gray-50 p-3"
            }
          >
            <div
              className={
                theme === "dark"
                  ? "text-xs font-semibold text-white"
                  : "text-xs font-semibold text-gray-900"
              }
            >
              Phone Number
            </div>
      
            <input
              value={createUserModal.phoneNumber}
              type="text"
              onChange={(e) =>
                setCreateUserModal((p) => ({ ...p, phoneNumber: e.target.value }))
              }
              placeholder="Example: 60123456789"
              className={
                theme === "dark"
                  ? "mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/90 placeholder:text-white/30 outline-none focus:border-white/20"
                  : "mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-400"
              }
            />
          </div>
      
          <div
            className={
              theme === "dark"
                ? "rounded-2xl border border-white/10 bg-white/5 p-3"
                : "rounded-2xl border border-gray-200 bg-gray-50 p-3"
            }
          >
            <div
              className={
                theme === "dark"
                  ? "text-xs font-semibold text-white"
                  : "text-xs font-semibold text-gray-900"
              }
            >
              Password
            </div>
      
            <input
              type="password"
              value={createUserModal.password}
              onChange={(e) =>
                setCreateUserModal((p) => ({ ...p, password: e.target.value }))
              }
              placeholder="Minimum 6 characters"
              className={
                theme === "dark"
                  ? "mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/90 placeholder:text-white/30 outline-none focus:border-white/20"
                  : "mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-400"
              }
            />
          </div>
      
          <div
            className={
              theme === "dark"
                ? "rounded-2xl border border-white/10 bg-white/5 p-3"
                : "rounded-2xl border border-gray-200 bg-gray-50 p-3"
            }
          >
            <div
              className={
                theme === "dark"
                  ? "text-xs font-semibold text-white"
                  : "text-xs font-semibold text-gray-900"
              }
            >
              Role
            </div>
      
            <select
              value={createUserModal.role}
              onChange={(e) =>
                setCreateUserModal((p) => ({ ...p, role: e.target.value }))
              }
              className={
                theme === "dark"
                  ? "mt-2 w-full rounded-xl border border-white/10 bg-[#111827] px-3 py-2 text-xs text-white/90 outline-none hover:bg-[#182236]"
                  : "mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 outline-none hover:bg-gray-50"
              }
            >
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
          </div>
        </div>
      </Modal>
            
      {/* Reset password modal */}
      <Modal
        open={passwordModal.open}
        title="Reset Password"
        subtitle={passwordModal.userId ? `User: ${passwordModal.phoneNumber}` : ""}
        onClose={() =>
          setPasswordModal({
            open: false,
            userId: null,
            phoneNumber: "",
            newPassword: "",
          })
        }
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() =>
                setPasswordModal({
                  open: false,
                  userId: null,
                  phoneNumber: "",
                  newPassword: "",
                })
              }
              className={
                theme === "dark"
                  ? "rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/70 hover:bg-white/10"
                  : "rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs text-gray-700 hover:bg-gray-50"
              }
            >
              Cancel
            </button>
      
            <button
              disabled={busyId === passwordModal.userId}
              onClick={submitResetPassword}
              className={
                theme === "dark"
                  ? "rounded-xl border border-blue-500/25 bg-blue-500/15 px-4 py-2 text-xs text-blue-200 hover:bg-blue-500/20 disabled:opacity-50"
                  : "rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs text-blue-700 hover:bg-blue-100 disabled:opacity-50"
              }
            >
              {busyId === passwordModal.userId ? "Saving..." : "Reset Password"}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div
            className={
              theme === "dark"
                ? "rounded-2xl border border-white/10 bg-white/5 p-3"
                : "rounded-2xl border border-gray-200 bg-gray-50 p-3"
            }
          >
            <div
              className={
                theme === "dark"
                  ? "text-xs font-semibold text-white"
                  : "text-xs font-semibold text-gray-900"
              }
            >
              New Password
            </div>
      
            <input
              value={passwordModal.newPassword}
              onChange={(e) =>
                setPasswordModal((p) => ({ ...p, newPassword: e.target.value }))
              }
              placeholder="Minimum 6 characters"
              className={
                theme === "dark"
                  ? "mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/90 placeholder:text-white/30 outline-none focus:border-white/20"
                  : "mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-400"
              }
              type="text"
            />
      
            <div
              className={
                theme === "dark"
                  ? "mt-2 text-[11px] text-white/40"
                  : "mt-2 text-[11px] text-gray-500"
              }
            >
              Tip: Send the new password to the user securely.
            </div>
          </div>
        </div>
      </Modal>
      
      {/* Reset Withdrawal PIN modal */}
      <Modal
        open={withdrawPinModal.open}
        title="Reset Withdrawal PIN"
        subtitle={
          withdrawPinModal.userId ? `User: ${withdrawPinModal.phoneNumber}` : ""
        }
        onClose={() =>
          setWithdrawPinModal({
            open: false,
            userId: null,
            phoneNumber: "",
            newPin: "",
          })
        }
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() =>
                setWithdrawPinModal({
                  open: false,
                  userId: null,
                  phoneNumber: "",
                  newPin: "",
                })
              }
              className={
                theme === "dark"
                  ? "rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/70 hover:bg-white/10"
                  : "rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs text-gray-700 hover:bg-gray-50"
              }
            >
              Cancel
            </button>
      
            <button
              disabled={busyId === withdrawPinModal.userId}
              onClick={submitResetWithdrawPin}
              className={
                theme === "dark"
                  ? "rounded-xl border border-purple-500/25 bg-purple-500/15 px-4 py-2 text-xs text-purple-200 hover:bg-purple-500/20 disabled:opacity-50"
                  : "rounded-xl border border-purple-200 bg-purple-50 px-4 py-2 text-xs text-purple-700 hover:bg-purple-100 disabled:opacity-50"
              }
            >
              {busyId === withdrawPinModal.userId ? "Saving..." : "Reset PIN"}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div
            className={
              theme === "dark"
                ? "rounded-2xl border border-white/10 bg-white/5 p-3"
                : "rounded-2xl border border-gray-200 bg-gray-50 p-3"
            }
          >
            <div
              className={
                theme === "dark"
                  ? "text-xs font-semibold text-white"
                  : "text-xs font-semibold text-gray-900"
              }
            >
              New PIN
            </div>
      
            <input
              value={withdrawPinModal.newPin}
              onChange={(e) =>
                setWithdrawPinModal((p) => ({ ...p, newPin: e.target.value }))
              }
              placeholder="4-6 digits (example: 1234)"
              className={
                theme === "dark"
                  ? "mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/90 placeholder:text-white/30 outline-none focus:border-white/20"
                  : "mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-400"
              }
              type="text"
              inputMode="numeric"
            />
      
            <div
              className={
                theme === "dark"
                  ? "mt-2 text-[11px] text-white/40"
                  : "mt-2 text-[11px] text-gray-500"
              }
            >
              This will unlock withdrawals and reset failed attempts to 0.
            </div>
          </div>
        </div>
      </Modal>
      
      {/* Reset phone modal */}
      <Modal
        open={phoneModal.open}
        title="Reset Phone Number"
        subtitle={phoneModal.userId ? `Old: ${phoneModal.oldPhone}` : ""}
        onClose={() =>
          setPhoneModal({
            open: false,
            userId: null,
            oldPhone: "",
            newPhone: "",
          })
        }
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() =>
                setPhoneModal({
                  open: false,
                  userId: null,
                  oldPhone: "",
                  newPhone: "",
                })
              }
              className={
                theme === "dark"
                  ? "rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/70 hover:bg-white/10"
                  : "rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs text-gray-700 hover:bg-gray-50"
              }
            >
              Cancel
            </button>
      
            <button
              disabled={busyId === phoneModal.userId}
              onClick={submitResetPhone}
              className={
                theme === "dark"
                  ? "rounded-xl border border-emerald-500/25 bg-emerald-500/15 px-4 py-2 text-xs text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
                  : "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
              }
            >
              {busyId === phoneModal.userId ? "Saving..." : "Update Phone"}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div
            className={
              theme === "dark"
                ? "rounded-2xl border border-white/10 bg-white/5 p-3"
                : "rounded-2xl border border-gray-200 bg-gray-50 p-3"
            }
          >
            <div
              className={
                theme === "dark"
                  ? "text-xs font-semibold text-white"
                  : "text-xs font-semibold text-gray-900"
              }
            >
              New Phone Number
            </div>
      
            <input
              value={phoneModal.newPhone}
              type="text"
              onChange={(e) =>
                setPhoneModal((p) => ({ ...p, newPhone: e.target.value }))
              }
              placeholder="Example: 60123456789"
              className={
                theme === "dark"
                  ? "mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/90 placeholder:text-white/30 outline-none focus:border-white/20"
                  : "mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-400"
              }
            />
      
            <div
              className={
                theme === "dark"
                  ? "mt-2 text-[11px] text-white/40"
                  : "mt-2 text-[11px] text-gray-500"
              }
            >
              This must be unique. If it already exists, backend will reject it.
            </div>
          </div>
        </div>
      </Modal>
      
      {/* Delete modal */}
      <Modal
        open={deleteModal.open}
        title="Delete User"
        subtitle={deleteModal.userId ? `User: ${deleteModal.phoneNumber}` : ""}
        onClose={() => setDeleteModal({ open: false, userId: null, phoneNumber: "" })}
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() =>
                setDeleteModal({ open: false, userId: null, phoneNumber: "" })
              }
              className={
                theme === "dark"
                  ? "rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/70 hover:bg-white/10"
                  : "rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs text-gray-700 hover:bg-gray-50"
              }
            >
              Cancel
            </button>
      
            <button
              disabled={busyId === deleteModal.userId}
              onClick={submitDelete}
              className={
                theme === "dark"
                  ? "rounded-xl border border-red-500/25 bg-red-500/15 px-4 py-2 text-xs text-red-200 hover:bg-red-500/20 disabled:opacity-50"
                  : "rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700 hover:bg-red-100 disabled:opacity-50"
              }
            >
              {busyId === deleteModal.userId ? "Deleting..." : "Delete Permanently"}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div
            className={
              theme === "dark"
                ? "rounded-2xl border border-red-500/25 bg-red-500/10 p-3 text-xs text-red-200"
                : "rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-700"
            }
          >
            This action is permanent and cannot be undone.
          </div>
      
          <div
            className={
              theme === "dark" ? "text-xs text-white/60" : "text-xs text-gray-600"
            }
          >
            If you only want to block the user, use{" "}
            <span className={theme === "dark" ? "text-white" : "text-gray-900"}>
              Ban User
            </span>{" "}
            instead.
          </div>
        </div>
      </Modal>
    </Shell>
  );
}