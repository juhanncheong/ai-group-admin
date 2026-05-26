import { useEffect, useMemo, useState } from "react";
import { Copy, QrCode, X, ShieldCheck } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import Shell from "../components/Shell";
import { toast } from "react-toastify";
import { useTheme } from "../context/ThemeContext";
import { io } from "socket.io-client";

const API =
  import.meta.env.VITE_API_URL ||
  "https://slimy-xenia-jayjay122-018fd7f8.koyeb.app";

const PER_PAGE = 10;

function money(n) {
  const num = Number(n || 0);
  if (Number.isNaN(num)) return "0";
  return num.toFixed(0);
}

function balanceMoney(n) {
  const num = Number(n || 0);
  if (Number.isNaN(num)) return "0.00";
  return num.toFixed(2);
}

function fmtDate(d) {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "-";
  }
}

function cryptoLabel(t) {
  const map = {
    BTC_MAINNET: "Bitcoin (Mainnet)",
    ETH_ERC20: "Ethereum (ERC20)",
    SOL: "Solana (SOL)",
    USDC_ERC20: "USDC (ERC20)",
    USDT_TRC20: "USDT (TRC20)",
  };
  return map[t] || t || "-";
}

function methodLabel(method) {
  const map = {
    BANK_FASTER_PAYMENTS: "Faster Payments",
    BANK_SEPA: "SEPA Bank Transfer",
    WISE: "Wise",
    UAEFTS: "UAEFTS Bank Transfer",
  };

  return map[method] || cryptoLabel(method);
}

function methodFamily(method) {
  return ["BANK_FASTER_PAYMENTS", "BANK_SEPA", "WISE", "UAEFTS"].includes(method)
    ? "BANK"
    : "CRYPTO";
}

function withdrawalMethodOf(w) {
  return w?.paymentMethod || w?.cryptoType || "";
}

function bankSummary(method, bankDetails) {
  if (!bankDetails) return "-";

  if (method === "BANK_FASTER_PAYMENTS") {
    const bankName = String(bankDetails.bankName || "").trim();
    const accountNumber = String(bankDetails.accountNumber || "").trim();
    const sortCode = String(bankDetails.sortCode || "").trim();
    const maskedAcc = accountNumber ? `****${accountNumber.slice(-4)}` : "-";

    return [bankName, maskedAcc, sortCode].filter(Boolean).join(" • ");
  }

  if (method === "BANK_SEPA") {
    const iban = String(bankDetails.iban || "").trim();
    const country = String(bankDetails.country || "").trim();
    const maskedIban =
      iban.length > 8 ? `${iban.slice(0, 4)}****${iban.slice(-4)}` : iban || "-";

    return [maskedIban, country].filter(Boolean).join(" • ");
  }

  if (method === "WISE") {
    const wiseEmail = String(bankDetails.wiseEmail || "").trim();
    return wiseEmail || "-";
  }
  
  if (method === "UAEFTS") {
    const bankName = String(bankDetails.bankName || "").trim();
    const iban = String(bankDetails.iban || "").trim();
    const maskedIban =
      iban.length > 8 ? `${iban.slice(0, 4)}****${iban.slice(-4)}` : iban || "-";
  
    return [bankName, maskedIban, "AE"].filter(Boolean).join(" • ");
  }
  
  return "-";
}

const CRYPTO_OPTIONS = [
  "BTC_MAINNET",
  "ETH_ERC20",
  "SOL",
  "USDC_ERC20",
  "USDT_TRC20",
];

const CRYPTO_METHODS = [
  "BTC_MAINNET",
  "ETH_ERC20",
  "SOL",
  "USDC_ERC20",
  "USDT_TRC20",
];

const BANK_METHODS = ["BANK_FASTER_PAYMENTS", "BANK_SEPA", "WISE", "UAEFTS"];

const ALL_WITHDRAWAL_METHODS = [...CRYPTO_METHODS, ...BANK_METHODS];

const METHOD_GROUPS = [
  {
    key: "CRYPTO",
    label: "Crypto",
    description: "Bitcoin, Ethereum, Solana, USDC, and USDT withdrawals",
    methods: CRYPTO_METHODS,
  },
  {
    key: "BANK_FASTER_PAYMENTS",
    label: "Faster Payments",
    description: "UK bank withdrawal method",
    methods: ["BANK_FASTER_PAYMENTS"],
  },
  {
    key: "BANK_SEPA",
    label: "SEPA",
    description: "European IBAN bank withdrawal method",
    methods: ["BANK_SEPA"],
  },
  {
    key: "WISE",
    label: "Wise",
    description: "Wise email withdrawal method",
    methods: ["WISE"],
  },
  {
    key: "UAEFTS",
    label: "UAEFTS",
    description: "UAE bank transfer via UAE Funds Transfer System",
    methods: ["UAEFTS"],
  },
];

export default function AdminWithdrawalsPage() {
  const { theme } = useTheme();

  const mutedText = theme === "dark" ? "text-white/50" : "text-gray-500";
  const strongText = theme === "dark" ? "text-white" : "text-gray-900";

  const cardClass =
    theme === "dark"
      ? "rounded-2xl border border-white/10 bg-white/5"
      : "rounded-2xl border border-gray-200 bg-white shadow-sm";

  const filterCardClass =
    theme === "dark"
      ? "mt-5 rounded-2xl border border-white/10 bg-white/5 p-4"
      : "mt-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm";

  const inputClass =
    theme === "dark"
      ? "w-full mt-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white outline-none focus:border-white/20"
      : "w-full mt-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-gray-400";
  
  const selectClass =
    theme === "dark"
      ? "w-full mt-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white outline-none focus:border-white/20"
      : "w-full mt-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-gray-400";

  const subtleButtonClass =
    theme === "dark"
      ? "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10"
      : "rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 hover:bg-gray-50";

  const tableWrapClass =
    theme === "dark"
      ? "mt-5 overflow-hidden rounded-2xl border border-white/10 bg-white/5"
      : "mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm";

  const tableHeaderBarClass =
    theme === "dark"
      ? "flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold"
      : "flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold";

  const tableHeadClass =
    theme === "dark"
      ? "bg-white/5 text-left text-xs text-white/60"
      : "bg-gray-50 text-left text-xs text-gray-500";

  const tableBodyClass =
    theme === "dark"
      ? "divide-y divide-white/10"
      : "divide-y divide-gray-200";

  const modalOverlayClass =
    `fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-4 ${
      theme === "dark"
        ? "bg-black/75"
        : "bg-slate-950/45"
    } backdrop-blur-xl`;

  const modalCardClass =
    theme === "dark"
      ? "my-4 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#071120] p-4 shadow-2xl sm:p-8"
      : "my-4 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl sm:p-8";

  const bankModalCardClass =
    theme === "dark"
      ? "my-4 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-700/60 bg-[#07111f] shadow-[0_30px_90px_rgba(0,0,0,0.65)] ring-1 ring-white/[0.03] sm:rounded-[28px]"
      : "my-4 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl sm:rounded-[28px]";

  const rejectModalCardClass =
    theme === "dark"
      ? "my-4 w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-[#071120] shadow-[0_30px_90px_rgba(0,0,0,0.65)] ring-1 ring-white/[0.03]"
      : "my-4 w-full max-w-xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl";
  
  const rejectDangerButtonClass =
    theme === "dark"
      ? "rounded-xl border border-red-400/30 bg-red-500/15 px-4 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-50"
      : "rounded-xl border border-red-200 bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50";
  
  const rejectInfoCardClass =
    theme === "dark"
      ? "rounded-2xl border border-white/10 bg-white/[0.04] p-4"
      : "rounded-2xl border border-gray-200 bg-gray-50 p-4";

  const approvePrimaryButtonClass =
    theme === "dark"
      ? "rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
      : "rounded-xl border border-emerald-200 bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50";
  
  const approveInfoCardClass =
    theme === "dark"
      ? "rounded-2xl border border-white/10 bg-white/[0.04] p-4"
      : "rounded-2xl border border-gray-200 bg-gray-50 p-4";

  const bankFieldClass =
    theme === "dark"
      ? "mt-1 flex min-h-[58px] flex-col items-stretch justify-between gap-2 rounded-2xl border border-slate-700/60 bg-[#081321] px-3 py-3 text-white shadow-inner sm:flex-row sm:items-center sm:px-4"
      : "mt-1 flex min-h-[58px] flex-col items-stretch justify-between gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3 text-gray-900 sm:flex-row sm:items-center sm:px-4";
  
  const bankPlainFieldClass =
    theme === "dark"
      ? "mt-1 break-words rounded-2xl border border-slate-700/60 bg-[#081321] px-3 py-3 text-xs font-semibold text-white shadow-inner sm:px-4 sm:py-4"
      : "mt-1 break-words rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3 text-xs font-semibold text-gray-900 sm:px-4 sm:py-4";
  
  const bankCopyButtonClass =
    theme === "dark"
      ? "shrink-0 rounded-xl border border-slate-600/70 bg-slate-800/80 px-2.5 py-1.5 text-xs font-semibold text-slate-100 hover:bg-slate-700 sm:w-auto"
      : "shrink-0 rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 sm:w-auto";
  
  const bankDoneButtonClass =
    theme === "dark"
      ? "rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-950 shadow-lg shadow-black/20 hover:bg-white"
      : "rounded-xl bg-gray-900 px-4 py-2 text-xs font-semibold text-white shadow-lg hover:bg-gray-800";
          
  const largeModalCardClass =
    theme === "dark"
      ? "w-full max-w-2xl rounded-2xl border border-white/10 bg-[#071120] p-8 shadow-2xl"
      : "w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-8 shadow-2xl";

  const tabWrapClass =
    theme === "dark"
      ? "inline-flex rounded-2xl border border-white/10 bg-white/5 p-1"
      : "inline-flex rounded-2xl border border-gray-200 bg-white p-1";

  function badgeClasses(status) {
    const s = String(status || "").toUpperCase();

    if (s === "PENDING") {
      return theme === "dark"
        ? "border border-amber-400/20 bg-amber-400/10 text-amber-200"
        : "border border-amber-200 bg-amber-50 text-amber-700";
    }

    if (s === "APPROVED") {
      return theme === "dark"
        ? "border border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
        : "border border-emerald-200 bg-emerald-50 text-emerald-700";
    }

    if (s === "REJECTED") {
      return theme === "dark"
        ? "border border-red-400/20 bg-red-400/10 text-red-200"
        : "border border-red-200 bg-red-50 text-red-700";
    }

    return theme === "dark"
      ? "border border-white/10 bg-white/5 text-white/80"
      : "border border-gray-200 bg-gray-50 text-gray-700";
  }

  const [tab, setTab] = useState("withdrawals");
  const [busy, setBusy] = useState(false);
  const [actionBusyId, setActionBusyId] = useState(null);

  const [withdrawals, setWithdrawals] = useState([]);
  const [recentAddresses, setRecentAddresses] = useState([]);
  const [withdrawalMethods, setWithdrawalMethods] = useState([]);
  const [methodToggleBusy, setMethodToggleBusy] = useState("");

  const [status, setStatus] = useState("ALL");
  const [method, setMethod] = useState("ALL");
  const [methodFamilyFilter, setMethodFamilyFilter] = useState("ALL");
  const [q, setQ] = useState("");

  const [recentCrypto, setRecentCrypto] = useState("ALL");
  const [recentQ, setRecentQ] = useState("");

  const [page, setPage] = useState(1);

  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editAddress, setEditAddress] = useState("");
  const [editCryptoType, setEditCryptoType] = useState("BTC_MAINNET");
  const [saveBusy, setSaveBusy] = useState(false);

  const [bankViewOpen, setBankViewOpen] = useState(false);
  const [bankViewItem, setBankViewItem] = useState(null);

  const [cryptoAddressModal, setCryptoAddressModal] = useState({
    open: false,
    item: null,
    address: "",
    method: "",
  });

  const [rejectModal, setRejectModal] = useState({
    open: false,
    item: null,
    reason: "",
  });
  
  const [approveModal, setApproveModal] = useState({
    open: false,
    item: null,
  });
  
  const [progressModal, setProgressModal] = useState({
    open: false,
    item: null,
    progressPercent: "",
  });

  const [paymentMethodsOpen, setPaymentMethodsOpen] = useState(false);

  useEffect(() => {
  const token = localStorage.getItem("admin_token");
  if (!token) return;

  const socket = io(API, {
    auth: {
      token,
    },
  });

  socket.on("connect", () => {
    console.log("[AdminWithdrawals] socket connected:", socket.id);
    socket.emit("admin:join");
  });

  socket.on("admin:withdrawalCreated", ({ withdrawal, user }) => {
    console.log("[AdminWithdrawals] new withdrawal:", withdrawal);

    if (!withdrawal?._id) return;

    const newRow = {
      ...withdrawal,
      user: user || withdrawal.user,
    };

    setWithdrawals((prev) => {
      const exists = prev.some(
        (w) => String(w._id) === String(withdrawal._id)
      );

      if (exists) return prev;

      return [newRow, ...prev];
    });

    setPage(1);
    toast.success("New withdrawal submitted");
  });

  socket.on("admin:withdrawalUpdated", ({ withdrawal, user }) => {
    if (!withdrawal?._id) return;

    setWithdrawals((prev) =>
      prev.map((w) =>
        String(w._id) === String(withdrawal._id)
          ? {
              ...w,
              ...withdrawal,
              user: user || withdrawal.user || w.user,
            }
          : w
      )
    );
  });

  return () => {
    socket.off("connect");
    socket.off("admin:withdrawalCreated");
    socket.off("admin:withdrawalUpdated");
    socket.disconnect();
  };
}, []);

  async function fetchWithdrawals() {
    setBusy(true);
    try {
      const token = localStorage.getItem("admin_token");

      const url =
        status === "ALL"
          ? `${API}/api/admin/withdrawals`
          : `${API}/api/admin/withdrawals?status=${encodeURIComponent(status)}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to load withdrawals");
      }

      const list = Array.isArray(data.withdrawals) ? data.withdrawals : [];
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setWithdrawals(list);
      setPage(1);
    } catch (err) {
      console.error("fetchWithdrawals error:", err);
      toast.error(err.message || "Failed to load withdrawals");
      setWithdrawals([]);
    } finally {
      setBusy(false);
    }
  }

  async function fetchRecentAddresses() {
    setBusy(true);
    try {
      const token = localStorage.getItem("admin_token");

      const res = await fetch(`${API}/api/admin/recent-withdrawal-addresses`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to load recent addresses");
      }

      const list = Array.isArray(data.items) ? data.items : [];
      list.sort((a, b) => new Date(b.lastUsedAt) - new Date(a.lastUsedAt));

      setRecentAddresses(list);
      setPage(1);
    } catch (err) {
      console.error("fetchRecentAddresses error:", err);
      toast.error(err.message || "Failed to load recent addresses");
      setRecentAddresses([]);
    } finally {
      setBusy(false);
    }
  }

  async function fetchWithdrawalMethods() {
    try {
      const token = localStorage.getItem("admin_token");

      const res = await fetch(`${API}/api/admin/withdrawal-methods`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to load withdrawal methods");
      }

      const rows = Array.isArray(data.methods) ? data.methods : [];
      rows.sort((a, b) => {
        const ai = ALL_WITHDRAWAL_METHODS.indexOf(a.method);
        const bi = ALL_WITHDRAWAL_METHODS.indexOf(b.method);
        return ai - bi;
      });

      setWithdrawalMethods(rows);
    } catch (err) {
      console.error("fetchWithdrawalMethods error:", err);
      toast.error(err.message || "Failed to load withdrawal methods");
      setWithdrawalMethods([]);
    }
  }

  useEffect(() => {
    fetchWithdrawalMethods();
  }, []);

  useEffect(() => {
    if (tab === "withdrawals") {
      fetchWithdrawals();
    } else {
      fetchRecentAddresses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, status]);

  const methodSummary = useMemo(() => {
    const available = METHOD_GROUPS.filter((group) =>
      group.methods.some((m) => {
        const item = withdrawalMethods.find((x) => x.method === m);
        return Boolean(item?.isAvailable);
      })
    ).length;

    return `${available}/${METHOD_GROUPS.length} available`;
  }, [withdrawalMethods]);

  const filteredWithdrawals = useMemo(() => {
    let list = [...withdrawals];

    if (methodFamilyFilter === "CRYPTO") {
      list = list.filter((w) => methodFamily(withdrawalMethodOf(w)) === "CRYPTO");
    }

    if (methodFamilyFilter === "BANK") {
      list = list.filter((w) => methodFamily(withdrawalMethodOf(w)) === "BANK");
    }

    if (method !== "ALL") {
      list = list.filter((w) => withdrawalMethodOf(w) === method);
    }

    const s = q.trim().toLowerCase();

    if (s) {
      list = list.filter((w) => {
        const id = String(w._id || "").toLowerCase();
        const addr = String(w.address || "").toLowerCase();
        const userUid = String(w?.user?.uid || "").toLowerCase();
        const phone = String(w?.user?.phoneNumber || "").toLowerCase();
        const selectedMethod = String(withdrawalMethodOf(w) || "").toLowerCase();

        const bankName = String(w?.bankDetails?.bankName || "").toLowerCase();
        const accountNumber = String(w?.bankDetails?.accountNumber || "").toLowerCase();
        const sortCode = String(w?.bankDetails?.sortCode || "").toLowerCase();
        const accountName = String(w?.bankDetails?.accountName || "").toLowerCase();
        const iban = String(w?.bankDetails?.iban || "").toLowerCase();
        const bicSwift = String(w?.bankDetails?.bicSwift || "").toLowerCase();
        const country = String(w?.bankDetails?.country || "").toLowerCase();
        const wiseEmail = String(w?.bankDetails?.wiseEmail || "").toLowerCase();

        return (
          id.includes(s) ||
          addr.includes(s) ||
          userUid.includes(s) ||
          phone.includes(s) ||
          selectedMethod.includes(s) ||
          bankName.includes(s) ||
          accountNumber.includes(s) ||
          sortCode.includes(s) ||
          accountName.includes(s) ||
          iban.includes(s) ||
          bicSwift.includes(s) ||
          country.includes(s) ||
          wiseEmail.includes(s)
        );
      });
    }

    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return list;
  }, [withdrawals, method, q, methodFamilyFilter]);

  const filteredRecentAddresses = useMemo(() => {
    let list = [...recentAddresses];

    if (recentCrypto !== "ALL") {
      list = list.filter((x) => String(x.cryptoType) === recentCrypto);
    }

    const s = recentQ.trim().toLowerCase();

    if (s) {
      list = list.filter((x) => {
        const id = String(x._id || "").toLowerCase();
        const addr = String(x.address || "").toLowerCase();
        const uid = String(x?.user?.uid || "").toLowerCase();
        const phone = String(x?.user?.phoneNumber || "").toLowerCase();
        const c = String(x.cryptoType || "").toLowerCase();

        return (
          id.includes(s) ||
          addr.includes(s) ||
          uid.includes(s) ||
          phone.includes(s) ||
          c.includes(s)
        );
      });
    }

    list.sort((a, b) => new Date(b.lastUsedAt) - new Date(a.lastUsedAt));
    return list;
  }, [recentAddresses, recentCrypto, recentQ]);

  const withdrawalStats = useMemo(() => {
    const total = filteredWithdrawals.length;

    const pending = filteredWithdrawals.filter((x) => x.status === "PENDING");
    const approved = filteredWithdrawals.filter((x) => x.status === "APPROVED");
    const rejected = filteredWithdrawals.filter((x) => x.status === "REJECTED");

    const cryptoCount = filteredWithdrawals.filter(
      (x) => methodFamily(withdrawalMethodOf(x)) === "CRYPTO"
    ).length;

    const bankCount = filteredWithdrawals.filter(
      (x) => methodFamily(withdrawalMethodOf(x)) === "BANK"
    ).length;

    const sum = (arr) => arr.reduce((acc, x) => acc + Number(x.amount || 0), 0);

    return {
      total,
      pendingCount: pending.length,
      approvedCount: approved.length,
      rejectedCount: rejected.length,
      cryptoCount,
      bankCount,
      pendingAmount: sum(pending),
      approvedAmount: sum(approved),
      rejectedAmount: sum(rejected),
    };
  }, [filteredWithdrawals]);

  const recentStats = useMemo(() => {
    const total = filteredRecentAddresses.length;

    const byCrypto = CRYPTO_OPTIONS.reduce((acc, type) => {
      acc[type] = filteredRecentAddresses.filter((x) => x.cryptoType === type).length;
      return acc;
    }, {});

    return {
      total,
      btc: byCrypto.BTC_MAINNET || 0,
      eth: byCrypto.ETH_ERC20 || 0,
      sol: byCrypto.SOL || 0,
      usdc: byCrypto.USDC_ERC20 || 0,
      usdt: byCrypto.USDT_TRC20 || 0,
    };
  }, [filteredRecentAddresses]);

  const activeList =
    tab === "withdrawals" ? filteredWithdrawals : filteredRecentAddresses;

  const pageCount = Math.max(1, Math.ceil(activeList.length / PER_PAGE));
  const pageSafe = Math.min(Math.max(1, page), pageCount);

  const pageItems = useMemo(() => {
    const start = (pageSafe - 1) * PER_PAGE;
    return activeList.slice(start, start + PER_PAGE);
  }, [activeList, pageSafe]);

  function openApproveModal(item) {
    if (!item?._id) return;
  
    setApproveModal({
      open: true,
      item,
    });
  }
  
  function closeApproveModal() {
    if (actionBusyId) return;
  
    setApproveModal({
      open: false,
      item: null,
    });
  }
  
  async function submitApproveWithdrawal() {
    const item = approveModal.item;
    if (!item?._id) return;
  
    setActionBusyId(item._id);
  
    try {
      const token = localStorage.getItem("admin_token");
  
      const res = await fetch(`${API}/api/admin/withdrawals/${item._id}/approve`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
  
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Approve failed");
  
      toast.success("Withdrawal approved");
  
      setApproveModal({
        open: false,
        item: null,
      });
  
      await fetchWithdrawals();
    } catch (err) {
      console.error("submitApproveWithdrawal error:", err);
      toast.error(err.message || "Approve failed");
    } finally {
      setActionBusyId(null);
    }
  }

  function openRejectModal(item) {
    if (!item?._id) return;
  
    setRejectModal({
      open: true,
      item,
      reason: "",
    });
  }
  
  function closeRejectModal() {
    if (actionBusyId) return;
  
    setRejectModal({
      open: false,
      item: null,
      reason: "",
    });
  }
  
  async function submitRejectWithdrawal() {
    const item = rejectModal.item;
    if (!item?._id) return;
  
    setActionBusyId(item._id);
  
    try {
      const token = localStorage.getItem("admin_token");
  
      const res = await fetch(`${API}/api/admin/withdrawals/${item._id}/reject`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          adminNote: String(rejectModal.reason || "").trim(),
        }),
      });
  
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Reject failed");
  
      toast.success("Withdrawal rejected");
  
      setRejectModal({
        open: false,
        item: null,
        reason: "",
      });
  
      await fetchWithdrawals();
    } catch (err) {
      console.error("submitRejectWithdrawal error:", err);
      toast.error(err.message || "Reject failed");
    } finally {
      setActionBusyId(null);
    }
  }

  function openProgressModal(item) {
    if (!item?._id) return;
  
    setProgressModal({
      open: true,
      item,
      progressPercent: Number(item?.progressPercent || 0).toFixed(2),
    });
  }
  
  function closeProgressModal() {
    if (actionBusyId) return;
  
    setProgressModal({
      open: false,
      item: null,
      progressPercent: "",
    });
  }
  
  async function submitProgressUpdate() {
    const item = progressModal.item;
    if (!item?._id) return;
  
    const percent = Number(progressModal.progressPercent);
  
    if (!Number.isFinite(percent)) {
      toast.error("Percentage must be a valid number");
      return;
    }
  
    if (percent < 0 || percent > 100) {
      toast.error("Percentage must be between 0 and 100");
      return;
    }
  
    setActionBusyId(item._id);
  
    try {
      const token = localStorage.getItem("admin_token");
  
      const res = await fetch(`${API}/api/admin/withdrawals/${item._id}/progress`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          progressPercent: percent,
        }),
      });
  
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to update progress");
  
      toast.success("Withdrawal progress updated");
  
      setProgressModal({
        open: false,
        item: null,
        progressPercent: "",
      });
  
      await fetchWithdrawals();
    } catch (err) {
      console.error("submitProgressUpdate error:", err);
      toast.error(err.message || "Failed to update progress");
    } finally {
      setActionBusyId(null);
    }
  }

  function openEditModal(item) {
    setEditItem(item);
    setEditAddress(String(item?.address || ""));
    setEditCryptoType(String(item?.cryptoType || "BTC_MAINNET"));
    setEditOpen(true);
  }

  function closeEditModal() {
    if (saveBusy) return;
    setEditOpen(false);
    setEditItem(null);
    setEditAddress("");
    setEditCryptoType("BTC_MAINNET");
  }

  function openCryptoAddressModal(item) {
    const selectedMethod = withdrawalMethodOf(item);
    const address = String(item?.address || "").trim();
  
    if (!address) {
      toast.error("No wallet address found");
      return;
    }
  
    setCryptoAddressModal({
      open: true,
      item,
      address,
      method: selectedMethod,
    });
  }
  
  function closeCryptoAddressModal() {
    setCryptoAddressModal({
      open: false,
      item: null,
      address: "",
      method: "",
    });
  }

  function openBankModal(item) {
    setBankViewItem(item);
    setBankViewOpen(true);
  }

  function closeBankModal() {
    setBankViewOpen(false);
    setBankViewItem(null);
  }

  function openPaymentMethodsModal() {
    fetchWithdrawalMethods();
    setPaymentMethodsOpen(true);
  }

  function closePaymentMethodsModal() {
    if (methodToggleBusy) return;
    setPaymentMethodsOpen(false);
  }

  async function saveRecentAddressEdit() {
    if (!editItem?._id) return;

    const cleanAddress = String(editAddress || "").trim();

    if (cleanAddress.length < 8) {
      toast.error("Address must be at least 8 characters");
      return;
    }

    setSaveBusy(true);

    try {
      const token = localStorage.getItem("admin_token");

      const res = await fetch(
        `${API}/api/admin/recent-withdrawal-addresses/${editItem._id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            address: cleanAddress,
            cryptoType: editCryptoType,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Update failed");
      }

      toast.success("Recent address updated");
      closeEditModal();
      await fetchRecentAddresses();
    } catch (err) {
      console.error("saveRecentAddressEdit error:", err);
      toast.error(err.message || "Update failed");
    } finally {
      setSaveBusy(false);
    }
  }

  async function deleteRecentAddress(id) {
    if (!id) return;

    const ok = confirm("Delete this recent withdrawal address record?");
    if (!ok) return;

    setActionBusyId(id);

    try {
      const token = localStorage.getItem("admin_token");

      const res = await fetch(
        `${API}/api/admin/recent-withdrawal-addresses/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Delete failed");
      }

      toast.success("Recent address deleted");
      await fetchRecentAddresses();
    } catch (err) {
      console.error("deleteRecentAddress error:", err);
      toast.error(err.message || "Delete failed");
    } finally {
      setActionBusyId(null);
    }
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(String(text || ""));
      toast.success("Copied");
    } catch {
      toast.error("Copy failed");
    }
  }

  function isGroupAvailable(group) {
    return group.methods.some((m) => {
      const item = withdrawalMethods.find((x) => x.method === m);
      return Boolean(item?.isAvailable);
    });
  }

  async function toggleMethodGroup(group, nextValue) {
    if (!group?.methods?.length) return;

    setMethodToggleBusy(group.key);

    try {
      const token = localStorage.getItem("admin_token");

      await Promise.all(
        group.methods.map(async (m) => {
          const res = await fetch(`${API}/api/admin/withdrawal-methods/${m}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              isAvailable: nextValue,
              note: nextValue ? "" : "Disabled by admin",
            }),
          });

          const data = await res.json().catch(() => ({}));

          if (!res.ok) {
            throw new Error(data?.message || `Failed to update ${m}`);
          }
        })
      );

      toast.success(`${group.label} ${nextValue ? "enabled" : "disabled"}`);
      await fetchWithdrawalMethods();
    } catch (err) {
      console.error("toggleMethodGroup error:", err);
      toast.error(err.message || "Toggle failed");
    } finally {
      setMethodToggleBusy("");
    }
  }

  function ModalSoftGlow() {
    return (
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 mx-auto h-56 max-w-3xl rounded-full blur-3xl ${
          theme === "dark" ? "bg-white/10" : "bg-slate-900/10"
        }`}
      />
    );
  }

  function InfoRow({ label, value }) {
    const displayValue = String(value || "-").trim() || "-";
  
    return (
      <div>
        <label className={`text-xs font-medium ${mutedText}`}>{label}</label>
  
        <div className={bankFieldClass}>
          <span className="min-w-0 break-all text-xs font-semibold tracking-wide">
            {displayValue}
          </span>
  
          <button
            type="button"
            onClick={() => copy(value || "")}
            className={`${bankCopyButtonClass} w-full sm:w-auto`}
          >
            Copy
          </button>
        </div>
      </div>
    );
  }

  return (
    <Shell title="Withdrawals">
      <div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className={`text-xs ${mutedText}`}>
            Admin withdrawals, payment methods, and recent withdrawal address records
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className={tabWrapClass}>
              <button
                onClick={() => {
                  setTab("withdrawals");
                  setPage(1);
                }}
                className={[
                  "rounded-xl px-4 py-2 text-xs transition",
                  tab === "withdrawals"
                    ? theme === "dark"
                      ? "bg-white text-slate-900 font-semibold"
                      : "bg-gray-900 text-white font-semibold"
                    : theme === "dark"
                    ? "text-white/70 hover:bg-white/10"
                    : "text-gray-600 hover:bg-gray-100",
                ].join(" ")}
              >
                Withdrawals
              </button>

              <button
                onClick={() => {
                  setTab("recent-addresses");
                  setPage(1);
                }}
                className={[
                  "rounded-xl px-4 py-2 text-xs transition",
                  tab === "recent-addresses"
                    ? theme === "dark"
                      ? "bg-white text-slate-900 font-semibold"
                      : "bg-gray-900 text-white font-semibold"
                    : theme === "dark"
                    ? "text-white/70 hover:bg-white/10"
                    : "text-gray-600 hover:bg-gray-100",
                ].join(" ")}
              >
                Recent Withdrawal Addresses
              </button>
            </div>

            <button
              type="button"
              onClick={openPaymentMethodsModal}
              className={subtleButtonClass}
            >
              Payment Methods
              <span className={`ml-2 text-xs ${mutedText}`}>{methodSummary}</span>
            </button>

            <button
              disabled={busy}
              onClick={() => {
                fetchWithdrawalMethods();

                if (tab === "withdrawals") {
                  fetchWithdrawals();
                } else {
                  fetchRecentAddresses();
                }
              }}
              className={`${subtleButtonClass} disabled:opacity-50`}
            >
              {busy ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>

        {tab === "withdrawals" ? (
          <>
            <div className="grid grid-cols-1 gap-3 mt-5 sm:grid-cols-2 lg:grid-cols-5">
              <StatCard
                theme={theme}
                title="Total"
                value={withdrawalStats.total}
                sub={`Showing: ${withdrawalStats.total}`}
              />
              <StatCard
                theme={theme}
                title="Crypto"
                value={withdrawalStats.cryptoCount}
                sub="Crypto withdrawals"
              />
              <StatCard
                theme={theme}
                title="Bank"
                value={withdrawalStats.bankCount}
                sub="Bank / Wise withdrawals"
              />
              <StatCard
                theme={theme}
                title="Pending"
                value={withdrawalStats.pendingCount}
                sub={`Amount: ${money(withdrawalStats.pendingAmount)}`}
              />
              <StatCard
                theme={theme}
                title="Approved"
                value={withdrawalStats.approvedCount}
                sub={`Amount: ${money(withdrawalStats.approvedAmount)}`}
              />
            </div>

            <div className={filterCardClass}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {["ALL", "CRYPTO", "BANK"].map((pill) => {
                    const active = methodFamilyFilter === pill;
              
                    return (
                      <button
                        key={pill}
                        onClick={() => {
                          setMethodFamilyFilter(pill);
                          setMethod("ALL");
                          setPage(1);
                        }}
                        className={[
                          "rounded-full px-4 py-2 text-xs font-semibold transition",
                          active
                            ? theme === "dark"
                              ? "bg-white text-slate-900"
                              : "bg-gray-900 text-white"
                            : theme === "dark"
                            ? "border border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                            : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
                        ].join(" ")}
                      >
                        {pill === "ALL" ? "All" : pill === "CRYPTO" ? "Crypto" : "Bank / Wise"}
                      </button>
                    );
                  })}
                </div>
              
                <button
                  onClick={() => {
                    setQ("");
                    setMethod("ALL");
                    setMethodFamilyFilter("ALL");
                    setPage(1);
                  }}
                  className={subtleButtonClass}
                >
                  Clear filters
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <div className="md:col-span-2">
                  <label className={`text-xs ${mutedText}`}>Search</label>
                  <input
                    value={q}
                    onChange={(e) => {
                      setQ(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search UID / phone / address / bank / IBAN / Wise / id / method..."
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={`text-xs ${mutedText}`}>Method</label>
                  <select
                    value={method}
                    onChange={(e) => {
                      setMethod(e.target.value);
                      setPage(1);
                    }}
                    className={selectClass}
                  >
                    <option value="ALL">All</option>
                    {ALL_WITHDRAWAL_METHODS.filter((x) =>
                      methodFamilyFilter === "CRYPTO"
                        ? methodFamily(x) === "CRYPTO"
                        : methodFamilyFilter === "BANK"
                        ? methodFamily(x) === "BANK"
                        : true
                    ).map((x) => (
                      <option key={x} value={x}>
                        {methodLabel(x)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`text-xs ${mutedText}`}>Status (server filter)</label>
                  <select
                    value={status}
                    onChange={(e) => {
                      setStatus(e.target.value);
                      setPage(1);
                    }}
                    className={selectClass}
                  >
                    <option value="ALL">ALL</option>
                    <option value="PENDING">PENDING</option>
                    <option value="APPROVED">APPROVED</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </div>
              </div>
            </div>

            <div className={tableWrapClass}>
              <div className={tableHeaderBarClass}>
                <div className={`font-semibold ${strongText}`}>
                  Withdrawals ({filteredWithdrawals.length})
                </div>
                <div className={`text-xs ${mutedText}`}>
                  Page {pageSafe} / {pageCount}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className={tableHeadClass}>
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">UID</th>
                      <th className="px-4 py-3">Balance</th>
                      <th className="px-4 py-3">Amount</th>                      
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Details</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>

                  <tbody className={tableBodyClass}>
                    {pageItems.map((w) => {
                      const isPending = w.status === "PENDING";
                      const acting = actionBusyId === w._id;
                      const selectedMethod = withdrawalMethodOf(w);
                      const family = methodFamily(selectedMethod);

                      return (
                        <tr key={w._id}>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className={strongText}>{fmtDate(w.createdAt)}</div>
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className={strongText}>
                              {w?.user?.uid || "Unknown"}
                            </div>
                          </td>
                          
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className={`font-semibold ${strongText}`}>
                              {balanceMoney(w?.balanceAfter)}
                            </div>
                          </td>
                          
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className={`font-semibold ${strongText}`}>
                              {money(w.amount)}
                            </div>
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className={strongText}>
                              {methodLabel(selectedMethod)}
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            {family === "BANK" ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => openBankModal(w)}
                                  className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                                    theme === "dark"
                                      ? "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                                      : "border border-gray-200 bg-white text-gray-800 hover:bg-gray-50"
                                  }`}
                                >
                                  Show
                                </button>

                                <div className={`text-xs ${mutedText}`}>
                                  {bankSummary(selectedMethod, w.bankDetails)}
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <div className={`max-w-[320px] truncate ${strongText}`}>
                                  {w.address}
                                </div>

                                <button
                                  onClick={() => openCryptoAddressModal(w)}
                                  className={`inline-flex items-center justify-center rounded-xl p-2 ${
                                    theme === "dark"
                                      ? "border border-cyan-400/20 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/15"
                                      : "border border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100"
                                  }`}
                                  title="View QR and copy address"
                                >
                                  <QrCode className="h-4 w-4" />
                                </button>
                              </div>
                            )}

                            {w.adminNote ? (
                              <div className={`mt-1 text-xs ${mutedText}`}>
                                Note: {w.adminNote}
                              </div>
                            ) : null}
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={[
                                "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold",
                                badgeClasses(w.status),
                              ].join(" ")}
                            >
                              {w.status}
                            </span>
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex justify-start gap-2">
                              <button
                                onClick={() => openApproveModal(w)}
                                disabled={!isPending || acting}
                                className={`rounded-xl px-3 py-2 text-xs font-semibold disabled:opacity-50 ${
                                  theme === "dark"
                                    ? "border border-emerald-400/30 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/20"
                                    : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                }`}
                              >
                                {acting && isPending ? "..." : "Approve"}
                              </button>
                            
                              <button
                                onClick={() => openRejectModal(w)}
                                disabled={!isPending || acting}
                                className={subtleButtonClass + " disabled:opacity-50"}
                              >
                                Reject
                              </button>
                            
                              <button
                                onClick={() => openProgressModal(w)}
                                disabled={!isPending || acting}
                                className={`rounded-xl px-3 py-2 text-xs font-semibold disabled:opacity-50 ${
                                  theme === "dark"
                                    ? "border border-sky-400/30 bg-sky-500/15 text-sky-200 hover:bg-sky-500/20"
                                    : "border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
                                }`}
                              >
                                More
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {!busy && pageItems.length === 0 ? (
                      <tr>
                        <td
                          className={`px-4 py-10 text-center ${mutedText}`}
                          colSpan={8}
                        >
                          No withdrawals found.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 mt-5 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                theme={theme}
                title="Total Records"
                value={recentStats.total}
                sub="Recent withdrawal address records"
              />
              <StatCard
                theme={theme}
                title="BTC / ETH"
                value={`${recentStats.btc} / ${recentStats.eth}`}
                sub="Bitcoin / Ethereum"
              />
              <StatCard
                theme={theme}
                title="SOL / USDC"
                value={`${recentStats.sol} / ${recentStats.usdc}`}
                sub="Solana / USDC"
              />
              <StatCard
                theme={theme}
                title="USDT"
                value={recentStats.usdt}
                sub="USDT (TRC20)"
              />
            </div>

            <div className={filterCardClass}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <div className="md:col-span-3">
                  <label className={`text-xs ${mutedText}`}>Search</label>
                  <input
                    value={recentQ}
                    onChange={(e) => {
                      setRecentQ(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search UID / phone / address / id / crypto..."
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={`text-xs ${mutedText}`}>Crypto Type</label>
                  <select
                    value={recentCrypto}
                    onChange={(e) => {
                      setRecentCrypto(e.target.value);
                      setPage(1);
                    }}
                    className={selectClass}
                  >
                    <option value="ALL">All</option>
                    {CRYPTO_OPTIONS.map((x) => (
                      <option key={x} value={x}>
                        {cryptoLabel(x)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-3 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setRecentQ("");
                    setRecentCrypto("ALL");
                    setPage(1);
                  }}
                  className={subtleButtonClass}
                >
                  Clear filters
                </button>
              </div>
            </div>

            <div className={tableWrapClass}>
              <div className={tableHeaderBarClass}>
                <div className={`font-semibold ${strongText}`}>
                  Recent Withdrawal Addresses ({filteredRecentAddresses.length})
                </div>
                <div className={`text-xs ${mutedText}`}>
                  Page {pageSafe} / {pageCount}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className={tableHeadClass}>
                    <tr>
                      <th className="px-4 py-3">Last Used</th>
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3">Crypto</th>
                      <th className="px-4 py-3">Address</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>

                  <tbody className={tableBodyClass}>
                    {pageItems.map((item) => {
                      const acting = actionBusyId === item._id;

                      return (
                        <tr key={item._id}>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className={strongText}>{fmtDate(item.lastUsedAt)}</div>
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className={strongText}>
                              {item?.user?.uid || "Unknown"}
                            </div>
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className={strongText}>
                              {cryptoLabel(item.cryptoType)}
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className={`max-w-[360px] truncate ${strongText}`}>
                                {item.address}
                              </div>

                              <button
                                onClick={() => copy(item.address)}
                                className={`inline-flex items-center justify-center rounded-xl p-2 ${
                                  theme === "dark"
                                    ? "border border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                                    : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                                }`}
                                title="Copy address"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                            </div>
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex justify-end gap-2">
                              <button
                                 onClick={() => openEditModal(item)}
                                 disabled={acting}
                                 className={subtleButtonClass + " disabled:opacity-50"}
                               >
                                 Edit
                               </button>
                               
                               <button
                                 onClick={() => deleteRecentAddress(item._id)}
                                 disabled={acting}
                                 className={subtleButtonClass + " disabled:opacity-50"}
                               >
                                 {acting ? "..." : "Delete"}
                               </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {!busy && pageItems.length === 0 ? (
                      <tr>
                        <td
                          className={`px-4 py-10 text-center ${mutedText}`}
                          colSpan={5}
                        >
                          No recent withdrawal address records found.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        <div
          className={`mt-5 flex items-center justify-between px-1 py-3 ${
            theme === "dark" ? "border-t border-white/10" : "border-t border-gray-200"
          }`}
        >
          <div className={`text-xs ${mutedText}`}>
            Showing{" "}
            <span className={`font-semibold ${strongText}`}>
              {(pageSafe - 1) * PER_PAGE + (pageItems.length ? 1 : 0)}
            </span>{" "}
            -{" "}
            <span className={`font-semibold ${strongText}`}>
              {(pageSafe - 1) * PER_PAGE + pageItems.length}
            </span>{" "}
            of{" "}
            <span className={`font-semibold ${strongText}`}>
              {activeList.length}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setPage(1)}
              disabled={pageSafe === 1}
              className={subtleButtonClass + " disabled:opacity-50"}
            >
              First
            </button>

            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pageSafe === 1}
              className={subtleButtonClass + " disabled:opacity-50"}
            >
              Prev
            </button>

            <button
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={pageSafe === pageCount}
              className={subtleButtonClass + " disabled:opacity-50"}
            >
              Next
            </button>

            <button
              onClick={() => setPage(pageCount)}
              disabled={pageSafe === pageCount}
              className={subtleButtonClass + " disabled:opacity-50"}
            >
              Last
            </button>
          </div>
        </div>

        {cryptoAddressModal.open ? (
          <div
            className={modalOverlayClass}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeCryptoAddressModal();
            }}
          >
            <ModalSoftGlow />
        
            <div
              className={
                theme === "dark"
                  ? "relative my-4 w-full max-w-xl overflow-hidden rounded-[32px] border border-cyan-400/20 bg-[#06111f] shadow-[0_30px_100px_rgba(0,0,0,0.75)] ring-1 ring-cyan-300/10"
                  : "relative my-4 w-full max-w-xl overflow-hidden rounded-[32px] border border-gray-200 bg-white shadow-2xl"
              }
            >
              <div
                className={
                  theme === "dark"
                    ? "relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-cyan-400/15 via-blue-500/10 to-purple-500/10 px-6 py-6"
                    : "relative overflow-hidden border-b border-gray-200 bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 px-6 py-6"
                }
              >
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-400/20 blur-3xl" />
                <div className="absolute -bottom-12 -left-10 h-32 w-32 rounded-full bg-blue-500/20 blur-3xl" />
        
                <div className="relative flex items-start justify-between gap-4">
                  <div>
                    <div
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold ${
                        theme === "dark"
                          ? "border border-cyan-300/20 bg-cyan-300/10 text-cyan-100"
                          : "border border-cyan-200 bg-white/80 text-cyan-700"
                      }`}
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Crypto withdrawal address
                    </div>
        
                    <h3 className={`mt-4 text-xl font-bold ${strongText}`}>
                      Scan or copy wallet address
                    </h3>
        
                    <p className={`mt-2 text-xs leading-5 ${mutedText}`}>
                      Verify the network and wallet address before approving this withdrawal.
                    </p>
                  </div>
        
                  <button
                    type="button"
                    onClick={closeCryptoAddressModal}
                    className={`rounded-2xl p-2 transition ${
                      theme === "dark"
                        ? "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                        : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
        
              <div className="px-6 py-6">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-[220px_1fr]">
                  <div
                    className={
                      theme === "dark"
                        ? "rounded-[28px] border border-white/10 bg-white p-4 shadow-2xl shadow-black/40"
                        : "rounded-[28px] border border-gray-200 bg-white p-4 shadow-xl"
                    }
                  >
                    <div className="flex aspect-square items-center justify-center rounded-3xl bg-white">
                      <QRCodeSVG
                        value={cryptoAddressModal.address}
                        size={180}
                        level="H"
                        includeMargin={false}
                      />
                    </div>
                  </div>
        
                  <div className="flex flex-col justify-between gap-4">
                    <div className="grid grid-cols-1 gap-3">
                      <div
                        className={
                          theme === "dark"
                            ? "rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                            : "rounded-2xl border border-gray-200 bg-gray-50 p-4"
                        }
                      >
                        <div className={`text-[11px] ${mutedText}`}>Network</div>
                        <div className={`mt-1 text-sm font-bold ${strongText}`}>
                          {methodLabel(cryptoAddressModal.method)}
                        </div>
                      </div>
        
                      <div
                        className={
                          theme === "dark"
                            ? "rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                            : "rounded-2xl border border-gray-200 bg-gray-50 p-4"
                        }
                      >
                        <div className={`text-[11px] ${mutedText}`}>User UID</div>
                        <div className={`mt-1 text-sm font-bold ${strongText}`}>
                          {cryptoAddressModal.item?.user?.uid || "Unknown"}
                        </div>
                      </div>
        
                      <div
                        className={
                          theme === "dark"
                            ? "rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                            : "rounded-2xl border border-gray-200 bg-gray-50 p-4"
                        }
                      >
                        <div className={`text-[11px] ${mutedText}`}>Amount</div>
                        <div className={`mt-1 text-sm font-bold ${strongText}`}>
                          {balanceMoney(cryptoAddressModal.item?.amount)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
        
                <div className="mt-5">
                  <div className={`mb-2 text-xs font-medium ${mutedText}`}>
                    Wallet address
                  </div>
        
                  <div
                    className={
                      theme === "dark"
                        ? "rounded-3xl border border-cyan-300/15 bg-black/20 p-4"
                        : "rounded-3xl border border-gray-200 bg-gray-50 p-4"
                    }
                  >
                    <div className={`break-all text-sm font-semibold leading-6 ${strongText}`}>
                      {cryptoAddressModal.address}
                    </div>
        
                    <button
                      type="button"
                      onClick={() => copy(cryptoAddressModal.address)}
                      className={
                        theme === "dark"
                          ? "mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-950/30 hover:bg-cyan-200"
                          : "mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 px-4 py-3 text-sm font-bold text-white shadow-lg hover:bg-gray-800"
                      }
                    >
                      <Copy className="h-4 w-4" />
                      Copy wallet address
                    </button>
                  </div>
                </div>
        
                <div
                  className={
                    theme === "dark"
                      ? "mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-xs leading-5 text-amber-100"
                      : "mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800"
                  }
                >
                  Always confirm the selected network matches the wallet address before approving.
                  Wrong-network transfers may not be recoverable.
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {rejectModal.open ? (
          <div
            className={modalOverlayClass}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeRejectModal();
            }}
          >
            <ModalSoftGlow />
        
            <div className={`relative ${rejectModalCardClass}`}>
              <div
                className={`flex items-start justify-between gap-4 px-5 py-5 ${
                  theme === "dark" ? "border-b border-white/10" : "border-b border-gray-200"
                }`}
              >
                <div>
                  <div className={`text-base font-semibold ${strongText}`}>
                    Reject withdrawal
                  </div>
                  <div className={`mt-1 text-xs ${mutedText}`}>
                    Confirm rejection and return the withdrawal amount to the user balance.
                  </div>
                </div>
        
                <button
                  type="button"
                  onClick={closeRejectModal}
                  disabled={Boolean(actionBusyId)}
                  className={subtleButtonClass + " disabled:opacity-50"}
                >
                  ✕
                </button>
              </div>
        
              <div className="space-y-4 px-5 py-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className={rejectInfoCardClass}>
                    <div className={`text-[11px] ${mutedText}`}>UID</div>
                    <div className={`mt-1 truncate text-xs font-semibold ${strongText}`}>
                      {rejectModal.item?.user?.uid || "Unknown"}
                    </div>
                  </div>
        
                  <div className={rejectInfoCardClass}>
                    <div className={`text-[11px] ${mutedText}`}>Current Balance</div>
                    <div className={`mt-1 text-xs font-semibold ${strongText}`}>
                      {balanceMoney(rejectModal.item?.user?.balance)}
                    </div>
                  </div>
        
                  <div className={rejectInfoCardClass}>
                    <div className={`text-[11px] ${mutedText}`}>Withdrawal amount</div>
                    <div
                      className={`mt-1 text-xs font-semibold ${
                        theme === "dark" ? "text-red-200" : "text-red-700"
                      }`}
                    >
                      -{balanceMoney(rejectModal.item?.amount)}
                    </div>
                  </div>
                </div>
        
                <div
                  className={`rounded-2xl border px-4 py-3 ${
                    theme === "dark"
                      ? "border-amber-400/20 bg-amber-400/10 text-amber-100"
                      : "border-amber-200 bg-amber-50 text-amber-800"
                  }`}
                >
                  <div className="mt-1 text-xs">
                    Estimated balance after refund:{" "}
                    <span className="font-semibold">
                      {balanceMoney(
                        Number(rejectModal.item?.user?.balance || 0) +
                          Number(rejectModal.item?.amount || 0)
                      )}
                    </span>
                  </div>
                </div>
        
                <div>
                  <textarea
                    value={rejectModal.reason}
                    onChange={(e) =>
                      setRejectModal((prev) => ({
                        ...prev,
                        reason: e.target.value,
                      }))
                    }
                    rows={4}
                    placeholder="Admin Note (optional)"
                    className={`${inputClass} min-h-[110px] resize-none`}
                  />
                </div>
              </div>
        
              <div
                className={`flex items-center justify-end gap-2 px-5 py-4 ${
                  theme === "dark" ? "border-t border-white/10 bg-white/[0.03]" : "border-t border-gray-200 bg-gray-50"
                }`}
              >
                <button
                  type="button"
                  onClick={closeRejectModal}
                  disabled={Boolean(actionBusyId)}
                  className={subtleButtonClass + " disabled:opacity-50"}
                >
                  Cancel
                </button>
        
                <button
                  type="button"
                  onClick={submitRejectWithdrawal}
                  disabled={actionBusyId === rejectModal.item?._id}
                  className={rejectDangerButtonClass}
                >
                  {actionBusyId === rejectModal.item?._id ? "Rejecting..." : "Reject withdrawal"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {progressModal.open ? (
          <div
            className={modalOverlayClass}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeProgressModal();
            }}
          >
            <ModalSoftGlow />
        
            <div
              className={
                theme === "dark"
                  ? "relative  my-4 w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-[#071120] shadow-[0_30px_90px_rgba(0,0,0,0.65)] ring-1 ring-white/[0.03]"
                  : "relative  my-4 w-full max-w-xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl"
              }
            >
              <div
                className={`flex items-start justify-between gap-4 px-5 py-5 ${
                  theme === "dark" ? "border-b border-white/10" : "border-b border-gray-200"
                }`}
              >
                <div>
                  <div className={`text-base font-semibold ${strongText}`}>
                    Withdrawal progress control
                  </div>
                  <div className={`mt-1 text-xs ${mutedText}`}>
                    Set the withdrawal status percentage shown to the user.
                  </div>
                </div>
        
                <button
                  type="button"
                  onClick={closeProgressModal}
                  disabled={Boolean(actionBusyId)}
                  className={subtleButtonClass + " disabled:opacity-50"}
                >
                  ✕
                </button>
              </div>
        
              <div className="space-y-5 px-5 py-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className={approveInfoCardClass}>
                    <div className={`text-[11px] ${mutedText}`}>User UID</div>
                    <div className={`mt-1 truncate text-xs font-semibold ${strongText}`}>
                      {progressModal.item?.user?.uid || "Unknown"}
                    </div>
                  </div>
        
                  <div className={approveInfoCardClass}>
                    <div className={`text-[11px] ${mutedText}`}>Withdrawal amount</div>
                    <div className={`mt-1 text-xs font-semibold ${strongText}`}>
                      {balanceMoney(progressModal.item?.amount)}
                    </div>
                  </div>
        
                  <div className={approveInfoCardClass}>
                    <div className={`text-[11px] ${mutedText}`}>Current progress</div>
                    <div
                      className={`mt-1 text-xs font-semibold ${
                        theme === "dark" ? "text-sky-200" : "text-sky-700"
                      }`}
                    >
                      {Number(progressModal.item?.progressPercent || 0).toFixed(2)}%
                    </div>
                  </div>
                </div>
        
                <div
                  className={`rounded-3xl border p-4 ${
                    theme === "dark"
                      ? "border-sky-400/20 bg-sky-400/10"
                      : "border-sky-200 bg-sky-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className={`text-xs font-semibold ${strongText}`}>
                        Live user display percentage
                      </div>
                      <div className={`mt-1 text-xs ${mutedText}`}>
                        Enter any value from 0.00 to 100.00.
                      </div>
                    </div>
        
                    <div
                      className={`rounded-2xl px-4 py-2 text-lg font-bold ${
                        theme === "dark"
                          ? "bg-black/20 text-sky-100"
                          : "bg-white text-sky-700 shadow-sm"
                      }`}
                    >
                      {Number(progressModal.progressPercent || 0).toFixed(2)}%
                    </div>
                  </div>
        
                  <div
                    className={`mt-4 h-3 overflow-hidden rounded-full ${
                      theme === "dark" ? "bg-white/10" : "bg-gray-200"
                    }`}
                  >
                    <div
                      className={`h-full rounded-full transition-all ${
                        theme === "dark" ? "bg-sky-300" : "bg-sky-600"
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(0, Number(progressModal.progressPercent || 0))
                        )}%`,
                      }}
                    />
                  </div>
                </div>
        
                <div>
                  <label className={`text-xs font-medium ${mutedText}`}>
                    Set percentage
                  </label>
        
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={progressModal.progressPercent}
                    onChange={(e) =>
                      setProgressModal((prev) => ({
                        ...prev,
                        progressPercent: e.target.value,
                      }))
                    }
                    placeholder="Example: 50.00"
                    className={`${inputClass} text-sm font-semibold`}
                  />
        
                  <div className={`mt-2 text-xs ${mutedText}`}>
                    Examples: 50.00, 99.99, 100.00
                  </div>
                </div>
        
                <div className="grid grid-cols-3 gap-2">
                  {[50, 75, 99.99].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setProgressModal((prev) => ({
                          ...prev,
                          progressPercent: Number(value).toFixed(2),
                        }))
                      }
                      className={subtleButtonClass}
                    >
                      {Number(value).toFixed(2)}%
                    </button>
                  ))}
                </div>
              </div>
        
              <div
                className={`flex items-center justify-end gap-2 px-5 py-4 ${
                  theme === "dark"
                    ? "border-t border-white/10 bg-white/[0.03]"
                    : "border-t border-gray-200 bg-gray-50"
                }`}
              >
                <button
                  type="button"
                  onClick={closeProgressModal}
                  disabled={Boolean(actionBusyId)}
                  className={subtleButtonClass + " disabled:opacity-50"}
                >
                  Cancel
                </button>
        
                <button
                  type="button"
                  onClick={submitProgressUpdate}
                  disabled={actionBusyId === progressModal.item?._id}
                  className={
                    theme === "dark"
                      ? "rounded-xl border border-sky-400/30 bg-sky-500/15 px-4 py-2 text-xs font-semibold text-sky-200 hover:bg-sky-500/20 disabled:opacity-50"
                      : "rounded-xl border border-sky-200 bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
                  }
                >
                  {actionBusyId === progressModal.item?._id
                    ? "Saving..."
                    : "Save percentage"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {approveModal.open ? (
          <div
            className={modalOverlayClass}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeApproveModal();
            }}
          >
            <div className={rejectModalCardClass}>
              <div
                className={`flex items-start justify-between gap-4 px-5 py-5 ${
                  theme === "dark" ? "border-b border-white/10" : "border-b border-gray-200"
                }`}
              >
                <div>
                  <div className={`text-base font-semibold ${strongText}`}>
                    Approve withdrawal
                  </div>
                  <div className={`mt-1 text-xs ${mutedText}`}>
                    Confirm this withdrawal as paid/approved. The user balance will not be refunded.
                  </div>
                </div>
        
                <button
                  type="button"
                  onClick={closeApproveModal}
                  disabled={Boolean(actionBusyId)}
                  className={subtleButtonClass + " disabled:opacity-50"}
                >
                  ✕
                </button>
              </div>
        
              <div className="space-y-4 px-5 py-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className={approveInfoCardClass}>
                    <div className={`text-[11px] ${mutedText}`}>User UID</div>
                    <div className={`mt-1 truncate text-xs font-semibold ${strongText}`}>
                      {approveModal.item?.user?.uid || "Unknown"}
                    </div>
                  </div>
        
                  <div className={approveInfoCardClass}>
                    <div className={`text-[11px] ${mutedText}`}>Balance after withdrawal</div>
                    <div className={`mt-1 text-xs font-semibold ${strongText}`}>
                      {balanceMoney(approveModal.item?.balanceAfter)}
                    </div>
                  </div>
        
                  <div className={approveInfoCardClass}>
                    <div className={`text-[11px] ${mutedText}`}>Withdrawal amount</div>
                    <div
                      className={`mt-1 text-xs font-semibold ${
                        theme === "dark" ? "text-emerald-200" : "text-emerald-700"
                      }`}
                    >
                      {balanceMoney(approveModal.item?.amount)}
                    </div>
                  </div>
                </div>
        
                <div
                  className={`rounded-2xl border px-4 py-3 ${
                    theme === "dark"
                      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                      : "border-emerald-200 bg-emerald-50 text-emerald-800"
                  }`}
                >
                  <div className="mt-1 text-xs">
                    This confirms the withdrawal request as approved. No balance is returned to the user.
                  </div>
                </div>
        
                <div className={approveInfoCardClass}>
                  <div className={`text-[11px] ${mutedText}`}>Method</div>
                  <div className={`mt-1 text-xs font-semibold ${strongText}`}>
                    {methodLabel(withdrawalMethodOf(approveModal.item))}
                  </div>
                </div>
              </div>
        
              <div
                className={`flex items-center justify-end gap-2 px-5 py-4 ${
                  theme === "dark"
                    ? "border-t border-white/10 bg-white/[0.03]"
                    : "border-t border-gray-200 bg-gray-50"
                }`}
              >
                <button
                  type="button"
                  onClick={closeApproveModal}
                  disabled={Boolean(actionBusyId)}
                  className={subtleButtonClass + " disabled:opacity-50"}
                >
                  Cancel
                </button>
        
                <button
                  type="button"
                  onClick={submitApproveWithdrawal}
                  disabled={actionBusyId === approveModal.item?._id}
                  className={approvePrimaryButtonClass}
                >
                  {actionBusyId === approveModal.item?._id
                    ? "Approving..."
                    : "Approve withdrawal"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {paymentMethodsOpen ? (
          <div className={modalOverlayClass}>
            <div className={largeModalCardClass}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className={`text-lg font-semibold ${strongText}`}>
                    Payment Methods Availability
                  </h3>
                  <p className={`mt-1 text-sm ${mutedText}`}>
                    Enable or disable withdrawal methods shown to users.
                  </p>
                </div>

                <button onClick={closePaymentMethodsModal} className={subtleButtonClass}>
                  Close
                </button>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {METHOD_GROUPS.map((group) => {
                  const checked = isGroupAvailable(group);
                  const isBusy = methodToggleBusy === group.key;

                  return (
                    <div key={group.key} className={`${cardClass} p-4 min-h-[150px]`}>
                      <div className="flex h-full flex-col justify-between">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 pr-2">
                            <div className={`text-sm font-semibold ${strongText}`}>
                              {group.label}
                            </div>
                    
                            <div className={`mt-2 max-w-[260px] text-xs leading-5 ${mutedText}`}>
                              {group.description}
                            </div>
                          </div>
                    
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => toggleMethodGroup(group, !checked)}
                            className={[
                              "relative h-8 w-16 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-50",
                              checked
                                ? "bg-emerald-500"
                                : theme === "dark"
                                ? "bg-white/20"
                                : "bg-gray-300",
                            ].join(" ")}
                            title={checked ? "Disable method" : "Enable method"}
                          >
                            <span
                              className={[
                                "absolute top-1 h-6 w-6 rounded-full bg-white shadow transition",
                                checked ? "left-9" : "left-1",
                              ].join(" ")}
                            />
                          </button>
                        </div>
                    
                        <div className="mt-5 flex items-center justify-between gap-3">
                          <span
                            className={[
                              "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
                              checked
                                ? theme === "dark"
                                  ? "border border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                                  : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                                : theme === "dark"
                                ? "border border-red-400/20 bg-red-400/10 text-red-200"
                                : "border border-red-200 bg-red-50 text-red-700",
                            ].join(" ")}
                          >
                            {checked ? "Available" : "Unavailable"}
                          </span>
                    
                          <span className={`max-w-[170px] truncate text-xs ${mutedText}`}>
                            {isBusy ? "Saving..." : group.key}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  onClick={closePaymentMethodsModal}
                  className={`rounded-xl px-5 py-3 text-sm font-semibold ${
                    theme === "dark"
                      ? "bg-white text-slate-900 hover:bg-white/90"
                      : "bg-gray-900 text-white hover:bg-gray-800"
                  }`}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {editOpen ? (
          <div className={modalOverlayClass}>
            <div className={modalCardClass}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`text-base font-semibold ${strongText}`}>
                    Edit Recent Withdrawal Address
                  </h3>
                  <p className={`mt-1 text-xs ${mutedText}`}>
                    Update crypto type or address record
                  </p>
                </div>

                <button onClick={closeEditModal} className={subtleButtonClass}>
                  Close
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label className={`text-xs ${mutedText}`}>User</label>
                  <div
                    className={`mt-1 rounded-xl px-3 py-2 ${
                      theme === "dark"
                        ? "border border-white/10 bg-black/20 text-white"
                        : "border border-gray-200 bg-gray-50 text-gray-900"
                    }`}
                  >
                    {editItem?.user?.uid || "Unknown"}{" "}
                    <span className={mutedText}>
                      ({editItem?.user?.phoneNumber || "-"})
                    </span>
                  </div>
                </div>

                <div>
                  <label className={`text-xs ${mutedText}`}>Crypto Type</label>
                  <select
                    value={editCryptoType}
                    onChange={(e) => setEditCryptoType(e.target.value)}
                    className={selectClass}
                  >
                    {CRYPTO_OPTIONS.map((x) => (
                      <option key={x} value={x}>
                        {cryptoLabel(x)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`text-xs ${mutedText}`}>Address</label>
                  <textarea
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    rows={4}
                    placeholder="Enter withdrawal address"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={closeEditModal}
                  disabled={saveBusy}
                  className={subtleButtonClass + " disabled:opacity-50"}
                >
                  Cancel
                </button>

                <button
                  onClick={saveRecentAddressEdit}
                  disabled={saveBusy}
                  className={`rounded-xl px-4 py-2 text-white disabled:opacity-50 ${
                    theme === "dark"
                      ? "bg-white text-slate-900 hover:bg-white/90"
                      : "bg-gray-900 hover:bg-gray-800"
                  }`}
                >
                  {saveBusy ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {bankViewOpen ? (
          <div className={modalOverlayClass}>
            <div className={bankModalCardClass}>
              <div
                className={`flex shrink-0 items-center justify-between gap-3 px-4 py-4 sm:px-8 sm:py-6 ${
                  theme === "dark" ? "border-b border-slate-700/60" : "border-b border-gray-200"
                }`}
              >
                <div>
                  <h3 className={`text-base font-semibold ${strongText}`}>
                    {methodLabel(withdrawalMethodOf(bankViewItem))} Details
                  </h3>
                </div>

                <button onClick={closeBankModal} className={subtleButtonClass}>
                  Close
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-8 sm:py-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className={`text-xs font-medium ${mutedText}`}>User</label>
                  <div className={bankPlainFieldClass}>
                    {bankViewItem?.user?.uid || "Unknown"}
                  </div>
                </div>

                <InfoRow
                  label="Account Name"
                  value={bankViewItem?.bankDetails?.accountName || ""}
                />

                {withdrawalMethodOf(bankViewItem) === "BANK_FASTER_PAYMENTS" ? (
                  <>
                    <InfoRow
                      label="Bank Name"
                      value={bankViewItem?.bankDetails?.bankName || ""}
                    />
                    <InfoRow
                      label="Account Number"
                      value={bankViewItem?.bankDetails?.accountNumber || ""}
                    />
                    <InfoRow
                      label="Sort Code"
                      value={bankViewItem?.bankDetails?.sortCode || ""}
                    />
                  </>
                ) : null}

                {["BANK_SEPA", "UAEFTS"].includes(withdrawalMethodOf(bankViewItem)) ? (
                  <>
                    <InfoRow
                      label="Bank Name"
                      value={bankViewItem?.bankDetails?.bankName || ""}
                    />
                    <InfoRow label="IBAN" value={bankViewItem?.bankDetails?.iban || ""} />
                    <InfoRow
                      label="BIC / SWIFT"
                      value={bankViewItem?.bankDetails?.bicSwift || ""}
                    />
                    <InfoRow
                      label="Country"
                      value={bankViewItem?.bankDetails?.country || ""}
                    />
                  </>
                ) : null}

                {withdrawalMethodOf(bankViewItem) === "WISE" ? (
                  <>
                    <InfoRow
                      label="Wise Email"
                      value={bankViewItem?.bankDetails?.wiseEmail || ""}
                    />
                    <InfoRow
                      label="Country"
                      value={bankViewItem?.bankDetails?.country || ""}
                    />
                  </>
                ) : null}

                <InfoRow
                  label="Reference Note"
                  value={bankViewItem?.bankDetails?.referenceNote || ""}
                />

                <div>
                  <label className={`text-xs font-medium ${mutedText}`}>Amount</label>
                  <div className={bankPlainFieldClass}>
                    {money(bankViewItem?.amount)}
                  </div>
                </div>

                {bankViewItem?.adminNote ? (
                  <div>
                    <label className={`text-xs ${mutedText}`}>Admin Note</label>
                    <div
                      className={`mt-1 rounded-xl px-3 py-2 ${
                        theme === "dark"
                          ? "border border-white/10 bg-black/20 text-white"
                          : "border border-gray-200 bg-gray-50 text-gray-900"
                      }`}
                    >
                      {bankViewItem.adminNote}
                    </div>
                  </div>
                ) : null}
           </div>
            </div>

              <div
                className={`flex shrink-0 justify-end px-4 py-4 sm:px-8 sm:py-5 ${
                  theme === "dark" ? "border-t border-slate-700/60" : "border-t border-gray-200"
                }`}
              >
                <button onClick={closeBankModal} className={bankDoneButtonClass}>
                  Done
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Shell>
  );
}

function StatCard({ title, value, sub, theme }) {
  const mutedText = theme === "dark" ? "text-white/50" : "text-gray-500";
  const strongText = theme === "dark" ? "text-white" : "text-gray-900";

  return (
    <div
      className={
        theme === "dark"
          ? "rounded-2xl border border-white/10 bg-white/5 p-4"
          : "rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
      }
    >
      <div className={`text-xs ${mutedText}`}>{title}</div>
      <div className={`mt-1 text-xl font-bold ${strongText}`}>{value}</div>
      <div className={`mt-1 text-xs ${mutedText}`}>{sub}</div>
    </div>
  );
}