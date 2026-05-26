import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Shell from "../components/Shell";
import { useTheme } from "../context/ThemeContext";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE ||
  "https://slimy-xenia-jayjay122-018fd7f8.koyeb.app";

function safeNum(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function money(n) {
  return safeNum(n).toFixed(2);
}

function shortId(id) {
  if (!id) return "-";
  const s = String(id);
  if (s.length < 12) return s;
  return `${s.slice(0, 6)}...${s.slice(-5)}`;
}

function formatDateLocal(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(d);
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function getLocalTodayRangeForInput() {
  const now = new Date();

  const year = now.getFullYear();
  const month = pad2(now.getMonth() + 1);
  const day = pad2(now.getDate());

  return {
    start: `${year}-${month}-${day}T00:00`,
    end: `${year}-${month}-${day}T23:59`,
  };
}

function localInputToDate(input) {
  if (!input) return null;
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

function inRange(value, startInput, endInput) {
  if (!value) return false;

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;

  const start = localInputToDate(startInput);
  const end = localInputToDate(endInput);

  if (start && d < start) return false;
  if (end && d > end) return false;

  return true;
}

function DashboardCard({ children, className = "", theme = "dark" }) {
  const base =
    theme === "dark"
      ? "rounded-[28px] border border-white/10 bg-white/[0.04] shadow-[0_10px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl"
      : "rounded-[28px] border border-gray-200 bg-white/90 shadow-[0_10px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl";

  return <div className={`${base} ${className}`}>{children}</div>;
}

function StatCard({ title, value, sub, accent = "violet", theme = "dark" }) {
  const accentMap = {
    violet:
      theme === "dark"
        ? "from-violet-500/20 to-fuchsia-500/5"
        : "from-violet-100 to-fuchsia-50",
    blue:
      theme === "dark"
        ? "from-sky-500/20 to-cyan-500/5"
        : "from-sky-100 to-cyan-50",
    green:
      theme === "dark"
        ? "from-emerald-500/20 to-lime-500/5"
        : "from-emerald-100 to-lime-50",
    amber:
      theme === "dark"
        ? "from-amber-500/20 to-yellow-500/5"
        : "from-amber-100 to-yellow-50",
    red:
      theme === "dark"
        ? "from-rose-500/20 to-red-500/5"
        : "from-rose-100 to-red-50",
  };

  const titleClass = theme === "dark" ? "text-white/60" : "text-gray-500";
  const valueClass = theme === "dark" ? "text-white" : "text-gray-900";
  const subClass = theme === "dark" ? "text-white/55" : "text-gray-500";
  const dotClass = {
    violet: "bg-violet-400",
    blue: "bg-sky-400",
    green: "bg-emerald-400",
    amber: "bg-amber-400",
    red: "bg-rose-400",
  };

  return (
    <DashboardCard
      theme={theme}
      className={`relative overflow-hidden p-5 bg-gradient-to-br ${accentMap[accent] || accentMap.violet}`}
    >
      <div
        className={`absolute right-4 top-4 h-2.5 w-2.5 rounded-full ${
          dotClass[accent] || dotClass.violet
        } shadow-[0_0_18px_currentColor]`}
      />
      <div className={`text-[12px] font-medium tracking-wide ${titleClass}`}>
        {title}
      </div>
      <div className={`mt-3 text-3xl font-semibold leading-none ${valueClass}`}>
        {value}
      </div>
      <div className={`mt-3 text-xs leading-relaxed ${subClass}`}>{sub}</div>
    </DashboardCard>
  );
}

function RingSummary({
  totalUsers,
  pendingWithdrawalCount,
  bannedUsers,
  theme,
}) {
  const strongText = theme === "dark" ? "text-white" : "text-gray-900";
  const mutedText = theme === "dark" ? "text-white/55" : "text-gray-500";
  const track = theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)";

  const safeTotal = Math.max(totalUsers, 1);
  const pendingPct = Math.min((pendingWithdrawalCount / safeTotal) * 100, 100);
  const bannedPct = Math.min((bannedUsers / safeTotal) * 100, 100);

  return (
    <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center justify-center">
        <div
          className="relative h-44 w-44 rounded-full"
          style={{
            background: `conic-gradient(
              rgb(139 92 246) 0% ${Math.max(pendingPct, 8)}%,
              rgb(34 197 94) ${Math.max(pendingPct, 8)}% ${Math.min(
              Math.max(pendingPct, 8) + Math.max(bannedPct, 5),
              100
            )}%,
              ${track} ${Math.min(
              Math.max(pendingPct, 8) + Math.max(bannedPct, 5),
              100
            )}% 100%
            )`,
          }}
        >
          <div
            className={`absolute inset-[16px] rounded-full ${
              theme === "dark"
                ? "bg-[#0b0b14] border border-white/10"
                : "bg-white border border-gray-200"
            } flex flex-col items-center justify-center`}
          >
            <div className={`text-3xl font-semibold ${strongText}`}>
              {totalUsers}
            </div>
            <div className={`mt-1 text-xs ${mutedText}`}>Total Users</div>
          </div>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-violet-500" />
            <span className={`text-sm ${mutedText}`}>Pending Withdraw</span>
          </div>
          <div className={`mt-3 text-2xl font-semibold ${strongText}`}>
            {pendingWithdrawalCount}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-emerald-500" />
            <span className={`text-sm ${mutedText}`}>Banned Users</span>
          </div>
          <div className={`mt-3 text-2xl font-semibold ${strongText}`}>
            {bannedUsers}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span
              className={`h-3 w-3 rounded-full ${
                theme === "dark" ? "bg-white/35" : "bg-gray-300"
              }`}
            />
            <span className={`text-sm ${mutedText}`}>Available Users</span>
          </div>
          <div className={`mt-3 text-2xl font-semibold ${strongText}`}>
            {Math.max(totalUsers - bannedUsers, 0)}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniBarChart({ depositAmount, withdrawalAmount, theme }) {
  const strongText = theme === "dark" ? "text-white" : "text-gray-900";
  const mutedText = theme === "dark" ? "text-white/55" : "text-gray-500";

  const max = Math.max(depositAmount, withdrawalAmount, 1);
  const depositHeight = `${Math.max((depositAmount / max) * 100, 12)}%`;
  const withdrawalHeight = `${Math.max((withdrawalAmount / max) * 100, 12)}%`;

  return (
    <div className="flex h-[260px] flex-col">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className={`text-xl font-semibold ${strongText}`}>
            Range Performance $
          </div>
        </div>
        <div
          className={`rounded-2xl px-4 py-2 text-xs ${
            theme === "dark"
              ? "border border-white/10 bg-white/5 text-white/70"
              : "border border-gray-200 bg-gray-50 text-gray-600"
          }`}
        >
          Live Summary
        </div>
      </div>

      <div className="flex flex-1 items-end gap-6">
        <div className="flex h-full flex-1 flex-col justify-end">
          <div
            className="w-full rounded-t-2xl bg-gradient-to-t from-violet-600/95 to-fuchsia-400/90 shadow-[0_12px_30px_rgba(139,92,246,0.25)]"
            style={{ height: depositHeight }}
          />
          <div className={`mt-4 text-sm font-medium ${strongText}`}>Deposits</div>
          <div className={`mt-1 text-xs ${mutedText}`}>{money(depositAmount)}</div>
        </div>

        <div className="flex h-full flex-1 flex-col justify-end">
          <div
            className="w-full rounded-t-2xl bg-gradient-to-t from-sky-600/95 to-cyan-400/90 shadow-[0_12px_30px_rgba(14,165,233,0.25)]"
            style={{ height: withdrawalHeight }}
          />
          <div className={`mt-4 text-sm font-medium ${strongText}`}>
            Withdrawals
          </div>
          <div className={`mt-1 text-xs ${mutedText}`}>{money(withdrawalAmount)}</div>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ title, desc, onClick, theme }) {
  const strongText = theme === "dark" ? "text-white" : "text-gray-900";
  const mutedText = theme === "dark" ? "text-white/55" : "text-gray-500";

  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden rounded-[24px] border p-5 text-left transition-all duration-200 hover:-translate-y-0.5 ${
        theme === "dark"
          ? "border-white/10 bg-white/[0.04] hover:bg-white/[0.06]"
          : "border-gray-200 bg-white hover:bg-gray-50"
      }`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      <div className={`relative text-base font-semibold ${strongText}`}>{title}</div>
      <div className={`relative mt-2 text-sm leading-relaxed ${mutedText}`}>
        {desc}
      </div>
    </button>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const mutedText = theme === "dark" ? "text-white/55" : "text-gray-500";
  const softText = theme === "dark" ? "text-white/70" : "text-gray-600";
  const strongText = theme === "dark" ? "text-white" : "text-gray-900";

  const buttonClass =
    theme === "dark"
      ? "rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/80 transition hover:bg-white/10"
      : "rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50";

  const inputClass =
    theme === "dark"
      ? "mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-violet-400/40 focus:bg-white/[0.04]"
      : "mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-violet-300";

  const tableHeadClass =
    theme === "dark"
      ? "bg-white/[0.04] text-xs text-white/55"
      : "bg-gray-50 text-xs text-gray-500";

  const tableRowClass =
    theme === "dark" ? "hover:bg-white/[0.03]" : "hover:bg-gray-50";

  const tableDivideClass =
    theme === "dark"
      ? "divide-y divide-white/10"
      : "divide-y divide-gray-200";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [users, setUsers] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [error, setError] = useState("");

  const localToday = useMemo(() => getLocalTodayRangeForInput(), []);
  const [rangeStart, setRangeStart] = useState(localToday.start);
  const [rangeEnd, setRangeEnd] = useState(localToday.end);

  function getAuthHeaders() {
    const token = localStorage.getItem("admin_token");
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
  }

  async function fetchJSON(url, options = {}) {
    const auth = getAuthHeaders();

    if (!auth) {
      localStorage.removeItem("admin_token");
      navigate("/admin/login", { replace: true });
      throw new Error("Please login again.");
    }

    const res = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        ...auth,
      },
    });

    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error("Server returned non-JSON response.");
    }

    if (!res.ok) {
      const msg = data?.message || `Request failed (${res.status})`;

      if (res.status === 401) {
        localStorage.removeItem("admin_token");
        navigate("/admin/login", { replace: true });
      }

      throw new Error(msg);
    }

    return data;
  }

  async function loadDashboard(showRefreshOnly = false) {
    if (showRefreshOnly) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const [usersData, withdrawalsData, depositsData] = await Promise.all([
        fetchJSON(`${API_BASE}/api/admin/users`),
        fetchJSON(`${API_BASE}/api/admin/withdrawals`),
        fetchJSON(`${API_BASE}/api/admin/deposits?page=1&limit=all`),
      ]);

      const usersList = Array.isArray(usersData?.users) ? usersData.users : [];
      const withdrawalsList = Array.isArray(withdrawalsData?.withdrawals)
        ? withdrawalsData.withdrawals
        : [];
      const depositsListRaw = Array.isArray(depositsData?.deposits)
        ? depositsData.deposits
        : [];

      withdrawalsList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      depositsListRaw.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setUsers(usersList);
      setWithdrawals(withdrawalsList);
      setDeposits(depositsListRaw);
    } catch (e) {
      setUsers([]);
      setWithdrawals([]);
      setDeposits([]);
      setError(e.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadDashboard(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const depositOnlyRows = useMemo(() => {
    return deposits.filter((d) => String(d?.type || "").toUpperCase() === "DEPOSIT");
  }, [deposits]);

  const rangeWithdrawals = useMemo(() => {
    return withdrawals.filter((w) => {
      const status = String(w.status || "").toUpperCase();
  
      return (
        status === "APPROVED" &&
        inRange(w.createdAt, rangeStart, rangeEnd)
      );
    });
  }, [withdrawals, rangeStart, rangeEnd]);

  const rangeDeposits = useMemo(() => {
    return depositOnlyRows.filter((d) => inRange(d.createdAt, rangeStart, rangeEnd));
  }, [depositOnlyRows, rangeStart, rangeEnd]);

  const stats = useMemo(() => {
    const totalUsers = users.length;
    const admins = users.filter((u) => String(u.role) === "admin").length;
    const bannedUsers = users.filter((u) => Boolean(u.isBanned)).length;

    const pendingWithdrawals = withdrawals.filter((w) => w.status === "PENDING");

    const pendingWithdrawalAmount = pendingWithdrawals.reduce(
      (acc, w) => acc + safeNum(w.amount),
      0
    );

    const rangeDepositAmount = rangeDeposits.reduce(
      (acc, d) => acc + safeNum(d.amount),
      0
    );

    const rangeWithdrawalAmount = rangeWithdrawals.reduce(
      (acc, w) => acc + safeNum(w.amount),
      0
    );

    return {
      totalUsers,
      admins,
      bannedUsers,
      pendingWithdrawalCount: pendingWithdrawals.length,
      pendingWithdrawalAmount,
      rangeDepositQty: rangeDeposits.length,
      rangeDepositAmount,
      rangeWithdrawalQty: rangeWithdrawals.length,
      rangeWithdrawalAmount,
    };
  }, [users, withdrawals, rangeDeposits, rangeWithdrawals]);

  const recentWithdrawals = useMemo(() => withdrawals.slice(0, 5), [withdrawals]);

  const invalidRange =
    !!rangeStart &&
    !!rangeEnd &&
    localInputToDate(rangeStart) &&
    localInputToDate(rangeEnd) &&
    localInputToDate(rangeStart) > localInputToDate(rangeEnd);

  return (
    <Shell title="Dashboard">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className={`text-2xl font-semibold tracking-tight ${strongText}`}>
              Dashboard Overview
            </h1>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              disabled={loading || refreshing}
              onClick={() => loadDashboard(true)}
              className={`${buttonClass} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {refreshing ? "Refreshing..." : "Refresh Data"}
            </button>
          </div>
        </div>

        {error ? (
          <div
            className={`rounded-[24px] border p-4 text-sm ${
              theme === "dark"
                ? "border-red-500/25 bg-red-500/10 text-red-200"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
          <StatCard
            theme={theme}
            title="Total Users"
            value={loading ? "..." : stats.totalUsers}
            sub={`Admins: ${stats.admins} • Banned: ${stats.bannedUsers}`}
            accent="violet"
          />
          <StatCard
            theme={theme}
            title="Pending Withdrawals"
            value={loading ? "..." : stats.pendingWithdrawalCount}
            sub={`Pending amount: ${money(stats.pendingWithdrawalAmount)}`}
            accent="amber"
          />
          <StatCard
            theme={theme}
            title="Deposit Qty"
            value={loading ? "..." : stats.rangeDepositQty}
            sub="DEPOSIT records in selected date range"
            accent="blue"
          />
          <StatCard
            theme={theme}
            title="Withdrawal Qty"
            value={loading ? "..." : stats.rangeWithdrawalQty}
            sub="Withdrawal records in selected date range"
            accent="red"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[1fr_1.5fr]">
          <DashboardCard theme={theme} className="p-6">
            <MiniBarChart
              depositAmount={stats.rangeDepositAmount}
              withdrawalAmount={stats.rangeWithdrawalAmount}
              theme={theme}
            />
          </DashboardCard>

          <DashboardCard theme={theme} className="p-6">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <div className={`text-xl font-semibold ${strongText}`}>
                  Core Account Health
                </div>
              </div>
              <div
                className={`rounded-2xl px-4 py-2 text-xs ${
                  theme === "dark"
                    ? "border border-white/10 bg-white/5 text-white/70"
                    : "border border-gray-200 bg-gray-50 text-gray-600"
                }`}
              >
                Real-time
              </div>
            </div>

            <RingSummary
              totalUsers={stats.totalUsers}
              pendingWithdrawalCount={stats.pendingWithdrawalCount}
              bannedUsers={stats.bannedUsers}
              theme={theme}
            />

            <button
              onClick={() => navigate("/admin/withdrawals")}
              className={`mt-6 w-full rounded-[22px] border px-4 py-3 text-sm font-medium transition ${
                theme === "dark"
                  ? "border-white/10 bg-white/5 text-white hover:bg-white/10"
                  : "border-gray-200 bg-gray-50 text-gray-900 hover:bg-gray-100"
              }`}
            >
              View Full Details
            </button>
          </DashboardCard>
        </div>

        <DashboardCard theme={theme} className="p-6">
          <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className={`text-xl font-semibold ${strongText}`}>
                Deposit & Withdrawal Range Summary
              </div>
              <div className={`mt-1 text-sm ${mutedText}`}>
                Filter records by your local PC time
              </div>
            </div>

            <button
              onClick={() => {
                const t = getLocalTodayRangeForInput();
                setRangeStart(t.start);
                setRangeEnd(t.end);
              }}
              className={buttonClass}
            >
              Reset to Today
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            <div>
              <label className={`text-xs font-medium ${mutedText}`}>
                Start Date & Time
              </label>
              <input
                type="datetime-local"
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={`text-xs font-medium ${mutedText}`}>
                End Date & Time
              </label>
              <input
                type="datetime-local"
                value={rangeEnd}
                onChange={(e) => setRangeEnd(e.target.value)}
                className={inputClass}
              />
            </div>

            <div
              className={`rounded-[24px] border p-4 ${
                theme === "dark"
                  ? "border-white/10 bg-black/20"
                  : "border-gray-200 bg-gray-50"
              }`}
            >
              <div className={`text-xs ${mutedText}`}>Range Start</div>
              <div className={`mt-2 text-sm font-medium ${strongText}`}>
                {rangeStart ? rangeStart.replace("T", " ") : "-"}
              </div>
            </div>

            <div
              className={`rounded-[24px] border p-4 ${
                theme === "dark"
                  ? "border-white/10 bg-black/20"
                  : "border-gray-200 bg-gray-50"
              }`}
            >
              <div className={`text-xs ${mutedText}`}>Range End</div>
              <div className={`mt-2 text-sm font-medium ${strongText}`}>
                {rangeEnd ? rangeEnd.replace("T", " ") : "-"}
              </div>
            </div>
          </div>

          {invalidRange ? (
            <div
              className={`mt-4 rounded-[20px] border p-4 text-sm ${
                theme === "dark"
                  ? "border-red-500/25 bg-red-500/10 text-red-200"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              Start date/time cannot be later than end date/time.
            </div>
          ) : null}

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div
              className={`rounded-[24px] border p-4 ${
                theme === "dark"
                  ? "border-white/10 bg-white/[0.03]"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className={`text-xs ${mutedText}`}>Deposit Amount</div>
              <div className={`mt-2 text-2xl font-semibold ${strongText}`}>
                {loading ? "..." : money(stats.rangeDepositAmount)}
              </div>
            </div>

            <div
              className={`rounded-[24px] border p-4 ${
                theme === "dark"
                  ? "border-white/10 bg-white/[0.03]"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className={`text-xs ${mutedText}`}>Approved Withdrawal Amount</div>
              <div className={`mt-2 text-2xl font-semibold ${strongText}`}>
                {loading ? "..." : money(stats.rangeWithdrawalAmount)}
              </div>
            </div>

            <div
              className={`rounded-[24px] border p-4 ${
                theme === "dark"
                  ? "border-white/10 bg-white/[0.03]"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className={`text-xs ${mutedText}`}>Deposit Records</div>
              <div className={`mt-2 text-2xl font-semibold ${strongText}`}>
                {loading ? "..." : stats.rangeDepositQty}
              </div>
            </div>

            <div
              className={`rounded-[24px] border p-4 ${
                theme === "dark"
                  ? "border-white/10 bg-white/[0.03]"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className={`text-xs ${mutedText}`}>Withdrawal Records</div>
              <div className={`mt-2 text-2xl font-semibold ${strongText}`}>
                {loading ? "..." : stats.rangeWithdrawalQty}
              </div>
            </div>
          </div>
        </DashboardCard>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <QuickAction
            theme={theme}
            title="User Management"
            desc="Manage balances, roles, rounds, bans, and account control settings."
            onClick={() => navigate("/admin/users")}
          />
          <QuickAction
            theme={theme}
            title="Withdrawals"
            desc="Review pending requests and move quickly into approve or reject workflows."
            onClick={() => navigate("/admin/withdrawals")}
          />
        </div>

        <DashboardCard theme={theme} className="overflow-hidden">
          <div
            className={`flex items-center justify-between px-6 py-5 ${
              theme === "dark" ? "bg-white/[0.03]" : "bg-gray-50"
            }`}
          >
            <div>
              <div className={`text-xl font-semibold ${strongText}`}>
                Recent Withdrawals
              </div>
              <div className={`mt-1 text-sm ${mutedText}`}>
                Latest 5 withdrawal records
              </div>
            </div>

            <button
              onClick={() => navigate("/admin/withdrawals")}
              className={buttonClass}
            >
              View all
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className={tableHeadClass}>
                <tr>
                  <th className="px-6 py-4 text-left font-medium">Date</th>
                  <th className="px-6 py-4 text-left font-medium">User</th>
                  <th className="px-6 py-4 text-left font-medium">Amount</th>
                  <th className="px-6 py-4 text-left font-medium">Status</th>
                </tr>
              </thead>

              <tbody className={tableDivideClass}>
                {!loading && recentWithdrawals.length === 0 ? (
                  <tr>
                    <td className={`px-6 py-10 text-center ${mutedText}`} colSpan={4}>
                      No withdrawals found.
                    </td>
                  </tr>
                ) : (
                  recentWithdrawals.map((w) => {
                    const status = String(w.status || "-").toUpperCase();

                    const statusClass =
                      status === "PENDING"
                        ? theme === "dark"
                          ? "border-amber-400/20 bg-amber-400/10 text-amber-200"
                          : "border-amber-200 bg-amber-50 text-amber-700"
                        : status === "APPROVED"
                        ? theme === "dark"
                          ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : status === "REJECTED"
                        ? theme === "dark"
                          ? "border-red-400/20 bg-red-400/10 text-red-200"
                          : "border-red-200 bg-red-50 text-red-700"
                        : theme === "dark"
                        ? "border-white/10 bg-white/5 text-white/80"
                        : "border-gray-200 bg-gray-50 text-gray-700";

                    return (
                      <tr key={w._id} className={tableRowClass}>
                        <td className="px-6 py-4 align-top">
                          <div className={`text-sm ${strongText}`}>
                            {formatDateLocal(w.createdAt)}
                          </div>
                          <div className={`mt-1 text-xs ${mutedText}`}>
                            {shortId(w._id)}
                          </div>
                        </td>

                        <td className="px-6 py-4 align-top">
                          <div className={`text-sm font-medium ${strongText}`}>
                            {w?.user?.uid || "Unknown"}
                          </div>
                          <div className={`mt-1 text-xs ${mutedText}`}>
                            {w?.cryptoType || "-"}
                          </div>
                        </td>

                        <td className="px-6 py-4 align-top">
                          <div className={`text-sm font-semibold ${strongText}`}>
                            {money(w.amount)}
                          </div>
                        </td>

                        <td className="px-6 py-4 align-top">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusClass}`}
                          >
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </DashboardCard>
      </div>
    </Shell>
  );
}