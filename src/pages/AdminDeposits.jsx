import React, { useEffect, useMemo, useRef, useState } from "react";
import Shell from "../components/Shell";
import { toast } from "react-toastify";
import { useTheme } from "../context/ThemeContext";

const API =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE ||
  "https://slimy-xenia-jayjay122-018fd7f8.koyeb.app";

const PER_PAGE = 10;
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

function money(n) {
  const num = Number(n || 0);
  if (Number.isNaN(num)) return "0.00";
  return num.toFixed(2);
}

function localDateStartIso(ymd) {
  if (!ymd) return "";

  const [year, month, day] = ymd.split("-").map(Number);
  const d = new Date(year, month - 1, day, 0, 0, 0, 0);

  return d.toISOString();
}

function localDateEndIso(ymd) {
  if (!ymd) return "";

  const [year, month, day] = ymd.split("-").map(Number);
  const d = new Date(year, month - 1, day, 23, 59, 59, 999);

  return d.toISOString();
}

function fmtDate(d) {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "-";
  }
}

function shortId(id) {
  if (!id) return "-";
  return String(id).slice(0, 6) + "..." + String(id).slice(-5);
}

function getCache(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed?.savedAt || !parsed?.data) return null;

    const age = Date.now() - Number(parsed.savedAt);
    if (age > CACHE_TTL_MS) return null;

    return parsed.data;
  } catch {
    return null;
  }
}

function setCache(key, data) {
  try {
    sessionStorage.setItem(
      key,
      JSON.stringify({
        savedAt: Date.now(),
        data,
      })
    );
  } catch {
    // Ignore storage errors
  }
}

function clearDepositCaches() {
  try {
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith("adminDeposits:")) {
        sessionStorage.removeItem(key);
      }
    });
  } catch {
    // Ignore storage errors
  }
}

export default function AdminDeposits() {
  const { theme } = useTheme();

  const mutedText = theme === "dark" ? "text-white/50" : "text-gray-500";
  const softText = theme === "dark" ? "text-white/70" : "text-gray-600";
  const strongText = theme === "dark" ? "text-white" : "text-gray-900";

  const subtleButtonClass =
    theme === "dark"
      ? "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
      : "rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50";

  const primaryButtonClass =
    theme === "dark"
      ? "rounded-xl border border-white/10 bg-white px-3 py-2 text-xs font-semibold text-black hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
      : "rounded-xl border border-gray-900 bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50";

  const inputClass =
    theme === "dark"
      ? "w-full mt-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[16px] md:text-xs text-white outline-none focus:border-white/20"
      : "w-full mt-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-[16px] md:text-xs text-gray-900 outline-none focus:border-gray-400";

  const filterCardClass =
    theme === "dark"
      ? "mt-5 rounded-2xl border border-white/10 bg-white/5 p-4"
      : "mt-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm";

  const tableWrapClass =
    theme === "dark"
      ? "mt-5 rounded-2xl border border-white/10 bg-white/5 overflow-hidden"
      : "mt-5 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden";

  const tableHeaderBarClass =
    theme === "dark"
      ? "px-4 py-3 border-b border-white/10 bg-white/5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between text-sm font-semibold"
      : "px-4 py-3 border-b border-gray-200 bg-gray-50 flex flex-col gap-2 md:flex-row md:items-center md:justify-between text-sm font-semibold";

  const tableHeadClass =
    theme === "dark"
      ? "bg-white/5 text-left text-xs text-white/60"
      : "bg-gray-50 text-left text-xs text-gray-500";

  const tableBodyClass =
    theme === "dark"
      ? "divide-y divide-white/10"
      : "divide-y divide-gray-200";

  const pillWrapClass =
    theme === "dark"
      ? "inline-flex rounded-2xl border border-white/10 bg-black/20 p-1"
      : "inline-flex rounded-2xl border border-gray-200 bg-gray-100 p-1";

  const activePillClass =
    theme === "dark"
      ? "bg-white text-black shadow-sm"
      : "bg-white text-gray-900 shadow-sm";

  const inactivePillClass =
    theme === "dark"
      ? "text-white/60 hover:text-white"
      : "text-gray-500 hover:text-gray-900";

  const cachePillClass =
    theme === "dark"
      ? "rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white/50"
      : "rounded-full border border-gray-200 bg-white px-2 py-1 text-[10px] text-gray-500";

  function typeBadgeClasses(type) {
    if (theme === "dark") {
      return "border border-white/10 bg-white/5 text-white/80";
    }
    return "border border-gray-300 bg-gray-100 text-gray-700";
  }

  function rankBadgeClass(rank) {
    if (rank === 1) {
      return theme === "dark"
        ? "bg-yellow-400/15 text-yellow-200 border border-yellow-300/20"
        : "bg-yellow-50 text-yellow-700 border border-yellow-200";
    }
    if (rank === 2) {
      return theme === "dark"
        ? "bg-white/10 text-white border border-white/20"
        : "bg-gray-100 text-gray-700 border border-gray-200";
    }
    if (rank === 3) {
      return theme === "dark"
        ? "bg-orange-400/15 text-orange-200 border border-orange-300/20"
        : "bg-orange-50 text-orange-700 border border-orange-200";
    }

    return theme === "dark"
      ? "bg-white/5 text-white/70 border border-white/10"
      : "bg-gray-50 text-gray-600 border border-gray-200";
  }

  const requestIdRef = useRef(0);

  const [view, setView] = useState("list"); // list | ranks
  const [busy, setBusy] = useState(false);
  const [cacheHit, setCacheHit] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [rows, setRows] = useState([]);
  const [rankRows, setRankRows] = useState([]);

  const [q, setQ] = useState("");
  const [appliedQ, setAppliedQ] = useState("");

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [appliedFromDate, setAppliedFromDate] = useState("");
  const [appliedToDate, setAppliedToDate] = useState("");

  const [page, setPage] = useState(1);
  const [rankPage, setRankPage] = useState(1);
  const [rankSort, setRankSort] = useState("amount"); // amount | quantity

  const [stats, setStats] = useState({
    totalCount: 0,
    totalAmount: 0,
    todayCount: 0,
    todayAmount: 0,
  });

  const [rankSummary, setRankSummary] = useState({
    rankedUsers: 0,
    totalDeposits: 0,
    totalAmount: 0,
  });

  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [rankPages, setRankPages] = useState(1);
  const [rankTotal, setRankTotal] = useState(0);

  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userModalBusy, setUserModalBusy] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserDeposits, setSelectedUserDeposits] = useState([]);
  const [selectedUserStats, setSelectedUserStats] = useState({
    totalCount: 0,
    totalAmount: 0,
    todayCount: 0,
    todayAmount: 0,
    fullRecordCount: 0,
  });

  const activePage = view === "ranks" ? rankPage : page;
  const activePageCount = view === "ranks" ? rankPages : pages;

  const listCacheKey = useMemo(() => {
    return `adminDeposits:list:p=${page}:q=${encodeURIComponent(
      appliedQ
    )}:from=${encodeURIComponent(appliedFromDate)}:to=${encodeURIComponent(
      appliedToDate
    )}`;
  }, [page, appliedQ, appliedFromDate, appliedToDate]);

  const rankCacheKey = useMemo(() => {
    return `adminDeposits:ranks:p=${rankPage}:sort=${rankSort}:q=${encodeURIComponent(
      appliedQ
    )}`;
  }, [rankPage, rankSort, appliedQ]);

  async function fetchDeposits({ force = false } = {}) {
    const myRequestId = ++requestIdRef.current;

    try {
      setBusy(true);
      setCacheHit(false);

      if (!force) {
        const cached = getCache(listCacheKey);
        if (cached) {
          setRows(Array.isArray(cached.rows) ? cached.rows : []);
          setStats(cached.stats || stats);
          setPages(Number(cached.pages || 1));
          setTotal(Number(cached.total || 0));
          setLastUpdated(cached.lastUpdated || null);
          setCacheHit(true);
        }
      }

      const token = localStorage.getItem("admin_token");

      const url = new URL(`${API}/api/admin/deposits`);
      url.searchParams.set("page", String(page));
      url.searchParams.set("limit", String(PER_PAGE));
      if (appliedQ.trim()) url.searchParams.set("q", appliedQ.trim());
      if (appliedFromDate) {
        url.searchParams.set("fromDate", localDateStartIso(appliedFromDate));
      }

      if (appliedToDate) {
        url.searchParams.set("toDate", localDateEndIso(appliedToDate));
      }

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to load deposits");
      }

      if (myRequestId !== requestIdRef.current) return;

      const list = Array.isArray(data.deposits) ? data.deposits : [];
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      const s = data.stats || {};
      const nextStats = {
        totalCount: Number(s.totalDeposits ?? 0),
        totalAmount: Number(s.totalDepositAmount ?? 0),
        todayCount: Number(s.todayDeposits ?? 0),
        todayAmount: Number(s.todayDepositAmount ?? 0),
      };

      const nextPages = Number(
        data.pagination?.pages || data.pagination?.totalPages || 1
      );
      const nextTotal = Number(data.pagination?.total || 0);
      const updatedAt = new Date().toISOString();

      setRows(list);
      setStats(nextStats);
      setPages(nextPages);
      setTotal(nextTotal);
      setLastUpdated(updatedAt);
      setCacheHit(false);

      setCache(listCacheKey, {
        rows: list,
        stats: nextStats,
        pages: nextPages,
        total: nextTotal,
        lastUpdated: updatedAt,
      });
    } catch (err) {
      console.error("fetchDeposits error:", err);
      toast.error(err.message || "Failed to load deposits");
      setRows([]);
      setStats({
        totalCount: 0,
        totalAmount: 0,
        todayCount: 0,
        todayAmount: 0,
      });
      setPages(1);
      setTotal(0);
    } finally {
      if (myRequestId === requestIdRef.current) {
        setBusy(false);
      }
    }
  }

  async function fetchDepositRanks({ force = false } = {}) {
    const myRequestId = ++requestIdRef.current;

    try {
      setBusy(true);
      setCacheHit(false);

      if (!force) {
        const cached = getCache(rankCacheKey);
        if (cached) {
          setRankRows(Array.isArray(cached.rankRows) ? cached.rankRows : []);
          setRankSummary(cached.rankSummary || rankSummary);
          setRankPages(Number(cached.rankPages || 1));
          setRankTotal(Number(cached.rankTotal || 0));
          setLastUpdated(cached.lastUpdated || null);
          setCacheHit(true);
        }
      }

      const token = localStorage.getItem("admin_token");

      const url = new URL(`${API}/api/admin/deposits/ranks`);
      url.searchParams.set("page", String(rankPage));
      url.searchParams.set("limit", String(PER_PAGE));
      url.searchParams.set("sortBy", rankSort);
      if (appliedQ.trim()) url.searchParams.set("q", appliedQ.trim());

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to load deposit ranks");
      }

      if (myRequestId !== requestIdRef.current) return;

      const list = Array.isArray(data.ranks) ? data.ranks : [];
      const summary = data.summary || {};
      const nextSummary = {
        rankedUsers: Number(summary.rankedUsers || 0),
        totalDeposits: Number(summary.totalDeposits || 0),
        totalAmount: Number(summary.totalAmount || 0),
      };

      const nextPages = Number(
        data.pagination?.pages || data.pagination?.totalPages || 1
      );
      const nextTotal = Number(data.pagination?.total || 0);
      const updatedAt = new Date().toISOString();

      setRankRows(list);
      setRankSummary(nextSummary);
      setRankPages(nextPages);
      setRankTotal(nextTotal);
      setLastUpdated(updatedAt);
      setCacheHit(false);

      setCache(rankCacheKey, {
        rankRows: list,
        rankSummary: nextSummary,
        rankPages: nextPages,
        rankTotal: nextTotal,
        lastUpdated: updatedAt,
      });
    } catch (err) {
      console.error("fetchDepositRanks error:", err);
      toast.error(err.message || "Failed to load deposit ranks");
      setRankRows([]);
      setRankSummary({
        rankedUsers: 0,
        totalDeposits: 0,
        totalAmount: 0,
      });
      setRankPages(1);
      setRankTotal(0);
    } finally {
      if (myRequestId === requestIdRef.current) {
        setBusy(false);
      }
    }
  }

  async function openUserDepositModal(user) {
    const userId = String(user?._id || user?.userId || "").trim();
    const uid = String(user?.uid || "Unknown");

    if (!userId) {
      toast.error("Missing user id");
      return;
    }

    const cacheKey = `adminDeposits:userModal:${userId}`;

    try {
      setSelectedUser({
        _id: userId,
        uid,
        phoneNumber: user?.phoneNumber || "-",
        balance: Number(user?.balance || 0),
      });
      setSelectedUserDeposits([]);
      setSelectedUserStats({
        totalCount: 0,
        totalAmount: 0,
        todayCount: 0,
        todayAmount: 0,
        fullRecordCount: 0,
      });
      setUserModalOpen(true);
      setUserModalBusy(true);

      const cached = getCache(cacheKey);
      if (cached) {
        setSelectedUser(cached.user);
        setSelectedUserDeposits(Array.isArray(cached.deposits) ? cached.deposits : []);
        setSelectedUserStats(cached.stats || {});
      }

      const token = localStorage.getItem("admin_token");

      const url = new URL(`${API}/api/admin/deposits`);
      url.searchParams.set("userId", userId);
      url.searchParams.set("limit", "all");

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to load user deposit history");
      }

      const list = Array.isArray(data.deposits) ? data.deposits : [];
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      const s = data.stats || {};
      const nextUser = {
        _id: userId,
        uid,
        phoneNumber:
          user?.phoneNumber ||
          list[0]?.userId?.phoneNumber ||
          "-",
        balance: Number(user?.balance || list[0]?.userId?.balance || 0),
      };

      const nextStats = {
        totalCount: Number(s.totalDeposits ?? 0),
        totalAmount: Number(s.totalDepositAmount ?? 0),
        todayCount: Number(s.todayDeposits ?? 0),
        todayAmount: Number(s.todayDepositAmount ?? 0),
        fullRecordCount: list.length,
      };

      setSelectedUser(nextUser);
      setSelectedUserDeposits(list);
      setSelectedUserStats(nextStats);

      setCache(cacheKey, {
        user: nextUser,
        deposits: list,
        stats: nextStats,
      });
    } catch (err) {
      console.error("openUserDepositModal error:", err);
      toast.error(err.message || "Failed to load user deposit history");
    } finally {
      setUserModalBusy(false);
    }
  }

  function closeUserDepositModal() {
    setUserModalOpen(false);
    setUserModalBusy(false);
  }

  function refreshCurrent({ force = false } = {}) {
    if (view === "ranks") {
      fetchDepositRanks({ force });
    } else {
      fetchDeposits({ force });
    }
  }

  function applySearch() {
    setAppliedQ(q.trim());
    setAppliedFromDate(fromDate);
    setAppliedToDate(toDate);
    setPage(1);
    setRankPage(1);
  }

  function clearFilters() {
    setQ("");
    setAppliedQ("");
  
    setFromDate("");
    setToDate("");
    setAppliedFromDate("");
    setAppliedToDate("");
  
    setPage(1);
    setRankPage(1);
  }

  function forceRefresh() {
    clearDepositCaches();
    refreshCurrent({ force: true });
  }

  useEffect(() => {
    if (view === "ranks") {
      fetchDepositRanks();
    } else {
      fetchDeposits();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, page, rankPage, rankSort, appliedQ, appliedFromDate, appliedToDate]);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") {
        closeUserDepositModal();
      }
    }

    if (userModalOpen) {
      window.addEventListener("keydown", onKeyDown);
    }

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [userModalOpen]);

  const topRank = rankRows[0] || null;

  const pageSafe = Math.min(Math.max(1, activePage), Math.max(1, activePageCount));
  const pageCount = Math.max(1, activePageCount || 1);

  return (
    <Shell title="Deposits">
      <div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className={`text-xs ${mutedText}`}>
              Deposit records, user rankings, totals, search, pagination and cached reloads
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={cachePillClass}>
                {busy ? "Syncing..." : cacheHit ? "Showing cached data" : "Live data"}
              </span>

              {lastUpdated ? (
                <span className={cachePillClass}>
                  Updated {fmtDate(lastUpdated)}
                </span>
              ) : null}

              <span className={cachePillClass}>
                Double-click UID to view history
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className={pillWrapClass}>
              <button
                type="button"
                onClick={() => {
                  setView("list");
                  setPage(1);
                }}
                className={[
                  "rounded-xl px-3 py-2 text-xs font-semibold transition",
                  view === "list" ? activePillClass : inactivePillClass,
                ].join(" ")}
              >
                Deposit List
              </button>

              <button
                type="button"
                onClick={() => {
                  setView("ranks");
                  setRankPage(1);
                }}
                className={[
                  "rounded-xl px-3 py-2 text-xs font-semibold transition",
                  view === "ranks" ? activePillClass : inactivePillClass,
                ].join(" ")}
              >
                Deposit Ranks
              </button>
            </div>

            <button
              disabled={busy}
              onClick={() => refreshCurrent({ force: false })}
              className={subtleButtonClass}
            >
              {busy ? "Loading..." : "Refresh"}
            </button>

            <button
              disabled={busy}
              onClick={forceRefresh}
              className={primaryButtonClass}
            >
              Force refresh
            </button>
          </div>
        </div>

        {view === "list" ? (
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              theme={theme}
              title="Total Deposits"
              value={stats.totalCount}
              sub={`Amount: ${money(stats.totalAmount)}`}
            />
            <StatCard
              theme={theme}
              title="Today"
              value={stats.todayCount}
              sub={`Amount: ${money(stats.todayAmount)}`}
            />
            <StatCard
              theme={theme}
              title="Showing"
              value={rows.length}
              sub={`Of ${total || rows.length}`}
            />
            <StatCard
              theme={theme}
              title="Page"
              value={`${pageSafe}`}
              sub={`${pageCount} total pages`}
            />
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              theme={theme}
              title="Ranked Users"
              value={rankSummary.rankedUsers}
              sub={`${rankSummary.totalDeposits} deposit records`}
            />
            <StatCard
              theme={theme}
              title="Ranked Amount"
              value={money(rankSummary.totalAmount)}
              sub={rankSort === "amount" ? "Sorted by amount" : "Sorted by quantity"}
            />
            <StatCard
              theme={theme}
              title="Top User"
              value={topRank?.uid || "-"}
              sub={
                topRank
                  ? `${money(topRank.totalAmount)} / ${topRank.totalDeposits} deposits`
                  : "No ranked user"
              }
            />
            <StatCard
              theme={theme}
              title="Page"
              value={`${pageSafe}`}
              sub={`${pageCount} total pages`}
            />
          </div>
        )}

        <div className={filterCardClass}>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
            <div className={view === "ranks" ? "lg:col-span-6" : "lg:col-span-4"}>
              <label className={`text-xs ${mutedText}`}>
                {view === "ranks" ? "Search user" : "Search deposits"}
              </label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applySearch();
                }}
                placeholder={
                  view === "ranks"
                    ? "Search UID / phone / user id..."
                    : "Search UID / deposit id / UID / type / note..."
                }
                className={inputClass}
              />
            </div>
            
            {view === "list" ? (
              <>
                <div className="lg:col-span-2">
                  <SmartDatePicker
                    label="From date"
                    value={fromDate}
                    onChange={setFromDate}
                    theme={theme}
                  />
                </div>
                
                <div className="lg:col-span-2">
                  <SmartDatePicker
                    label="To date"
                    value={toDate}
                    onChange={setToDate}
                    theme={theme}
                  />
                </div>
              </>
            ) : null}

            {view === "ranks" ? (
              <div className="lg:col-span-3">
                <label className={`text-xs ${mutedText}`}>Rank Sort</label>
                <div className={`${pillWrapClass} mt-1 w-full`}>
                  <button
                    type="button"
                    onClick={() => {
                      setRankSort("amount");
                      setRankPage(1);
                    }}
                    className={[
                      "flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition",
                      rankSort === "amount" ? activePillClass : inactivePillClass,
                    ].join(" ")}
                  >
                    Amount
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRankSort("quantity");
                      setRankPage(1);
                    }}
                    className={[
                      "flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition",
                      rankSort === "quantity" ? activePillClass : inactivePillClass,
                    ].join(" ")}
                  >
                    Quantity
                  </button>
                </div>
              </div>
            ) : null}

            <div
              className={[
                "flex items-end justify-end gap-2",
                view === "ranks" ? "lg:col-span-3" : "lg:col-span-4",
              ].join(" ")}
            >
              <button onClick={applySearch} className={primaryButtonClass}>
                Apply
              </button>

              <button onClick={clearFilters} className={subtleButtonClass}>
                Clear filters
              </button>
            </div>
          </div>

          {appliedQ || appliedFromDate || appliedToDate ? (
            <div className={`mt-3 flex flex-wrap gap-2 text-xs ${mutedText}`}>
              {appliedQ ? (
                <span>
                  Active search:{" "}
                  <span className={`font-semibold ${strongText}`}>{appliedQ}</span>
                </span>
              ) : null}
          
              {appliedFromDate ? (
                <span>
                  From:{" "}
                  <span className={`font-semibold ${strongText}`}>{appliedFromDate}</span>
                </span>
              ) : null}
          
              {appliedToDate ? (
                <span>
                  To:{" "}
                  <span className={`font-semibold ${strongText}`}>{appliedToDate}</span>
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        {view === "list" ? (
          <DepositListTable
            rows={rows}
            busy={busy}
            total={total}
            pageSafe={pageSafe}
            pageCount={pageCount}
            theme={theme}
            strongText={strongText}
            softText={softText}
            mutedText={mutedText}
            tableWrapClass={tableWrapClass}
            tableHeaderBarClass={tableHeaderBarClass}
            tableHeadClass={tableHeadClass}
            tableBodyClass={tableBodyClass}
            subtleButtonClass={subtleButtonClass}
            typeBadgeClasses={typeBadgeClasses}
            setPage={setPage}
            onOpenUser={openUserDepositModal}
          />
        ) : (
          <DepositRanksTable
            rows={rankRows}
            busy={busy}
            total={rankTotal}
            rankSort={rankSort}
            pageSafe={pageSafe}
            pageCount={pageCount}
            theme={theme}
            strongText={strongText}
            softText={softText}
            mutedText={mutedText}
            tableWrapClass={tableWrapClass}
            tableHeaderBarClass={tableHeaderBarClass}
            tableHeadClass={tableHeadClass}
            tableBodyClass={tableBodyClass}
            subtleButtonClass={subtleButtonClass}
            rankBadgeClass={rankBadgeClass}
            setRankPage={setRankPage}
            onOpenUser={openUserDepositModal}
          />
        )}

        <UserDepositModal
          open={userModalOpen}
          busy={userModalBusy}
          user={selectedUser}
          rows={selectedUserDeposits}
          stats={selectedUserStats}
          theme={theme}
          strongText={strongText}
          softText={softText}
          mutedText={mutedText}
          typeBadgeClasses={typeBadgeClasses}
          onClose={closeUserDepositModal}
        />
      </div>
    </Shell>
  );
}

function DepositListTable({
  rows,
  busy,
  total,
  pageSafe,
  pageCount,
  theme,
  strongText,
  softText,
  mutedText,
  tableWrapClass,
  tableHeaderBarClass,
  tableHeadClass,
  tableBodyClass,
  subtleButtonClass,
  typeBadgeClasses,
  setPage,
  onOpenUser,
}) {
  return (
    <div className={tableWrapClass}>
      <div className={tableHeaderBarClass}>
        <div className={strongText}>Deposits ({total || rows.length})</div>
        <div className={`text-xs ${mutedText}`}>
          Page {pageSafe} / {pageCount}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead className={tableHeadClass}>
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Before</th>
              <th className="px-4 py-3">After</th>
              <th className="px-4 py-3">Note</th>
            </tr>
          </thead>

          <tbody className={tableBodyClass}>
            {!busy && rows.length === 0 ? (
              <tr>
                <td className={`px-4 py-10 text-center ${mutedText}`} colSpan={7}>
                  No deposits found.
                </td>
              </tr>
            ) : (
              rows.map((d) => (
                <tr
                  key={d._id}
                  className={theme === "dark" ? "hover:bg-white/5" : "hover:bg-gray-50"}
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className={strongText}>{fmtDate(d.createdAt)}</div>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={[
                        "inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold",
                        typeBadgeClasses(d.type),
                      ].join(" ")}
                    >
                      {d.type || "-"}
                    </span>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    <button
                      type="button"
                      onDoubleClick={() =>
                        onOpenUser({
                          _id: d?.userId?._id,
                          uid: d?.userId?.uid || "Unknown",
                          phoneNumber: d?.userId?.phoneNumber || "-",
                          balance: d?.balanceAfter || 0,
                        })
                      }
                      title="Double-click to view full deposit history"
                      className={[
                        "cursor-pointer rounded-lg px-2 py-1 text-left font-semibold transition",
                        theme === "dark"
                          ? "text-white hover:bg-white/10"
                          : "text-gray-900 hover:bg-gray-100",
                      ].join(" ")}
                    >
                      {d?.userId?.uid || "Unknown"}
                    </button>
                  </td>

                  <td className={`px-4 py-3 whitespace-nowrap font-semibold ${strongText}`}>
                    {Number(d.amount || 0) >= 0 ? "+" : "-"}
                    {money(Math.abs(Number(d.amount || 0)))}
                  </td>

                  <td className={`px-4 py-3 whitespace-nowrap ${softText}`}>
                    {money(d.balanceBefore)}
                  </td>

                  <td className={`px-4 py-3 whitespace-nowrap ${softText}`}>
                    {money(d.balanceAfter)}
                  </td>

                  <td className="px-4 py-3">
                    <div
                      className={`max-w-[360px] truncate ${softText}`}
                      title={d.note || "-"}
                    >
                      {d.note || "-"}
                    </div>
                  </td>
                </tr>
              ))
            )}

            {busy && rows.length === 0 ? (
              <tr>
                <td className={`px-4 py-10 text-center ${mutedText}`} colSpan={7}>
                  Loading deposits...
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <PaginationBar
        theme={theme}
        mutedText={mutedText}
        strongText={strongText}
        subtleButtonClass={subtleButtonClass}
        pageSafe={pageSafe}
        pageCount={pageCount}
        total={total}
        currentCount={rows.length}
        setPage={setPage}
      />
    </div>
  );
}

function DepositRanksTable({
  rows,
  busy,
  total,
  rankSort,
  pageSafe,
  pageCount,
  theme,
  strongText,
  softText,
  mutedText,
  tableWrapClass,
  tableHeaderBarClass,
  tableHeadClass,
  tableBodyClass,
  subtleButtonClass,
  rankBadgeClass,
  setRankPage,
  onOpenUser,
}) {
  return (
    <div className={tableWrapClass}>
      <div className={tableHeaderBarClass}>
        <div>
          <div className={strongText}>Deposit Ranks ({total || rows.length})</div>
          <div className={`mt-1 text-xs ${mutedText}`}>
            Sorting top users by{" "}
            {rankSort === "amount" ? "total deposit amount" : "deposit quantity"}
          </div>
        </div>

        <div className={`text-xs ${mutedText}`}>
          Page {pageSafe} / {pageCount}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead className={tableHeadClass}>
            <tr>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Total Amount</th>
              <th className="px-4 py-3">Quantity</th>
              <th className="px-4 py-3">Current Balance</th>
              <th className="px-4 py-3">First Deposit</th>
              <th className="px-4 py-3">Last Deposit</th>
            </tr>
          </thead>

          <tbody className={tableBodyClass}>
            {!busy && rows.length === 0 ? (
              <tr>
                <td className={`px-4 py-10 text-center ${mutedText}`} colSpan={7}>
                  No deposit ranks found.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={String(r.userId)}
                  className={theme === "dark" ? "hover:bg-white/5" : "hover:bg-gray-50"}
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={[
                        "inline-flex min-w-[42px] justify-center rounded-full px-2 py-1 text-[10px] font-bold",
                        rankBadgeClass(Number(r.rank)),
                      ].join(" ")}
                    >
                      #{r.rank}
                    </span>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    <button
                      type="button"
                      onDoubleClick={() =>
                        onOpenUser({
                          _id: r.userId,
                          userId: r.userId,
                          uid: r.uid || "Unknown",
                          phoneNumber: r.phoneNumber || "-",
                          balance: r.balance || 0,
                        })
                      }
                      title="Double-click to view full deposit history"
                      className={[
                        "cursor-pointer rounded-lg px-2 py-1 text-left font-semibold transition",
                        theme === "dark"
                          ? "text-white hover:bg-white/10"
                          : "text-gray-900 hover:bg-gray-100",
                      ].join(" ")}
                    >
                      {r.uid || "Unknown"}
                    </button>
                  </td>

                  <td className={`px-4 py-3 whitespace-nowrap font-semibold ${strongText}`}>
                    {money(r.totalAmount)}
                  </td>

                  <td className={`px-4 py-3 whitespace-nowrap ${softText}`}>
                    {money(r.totalDeposits)}
                  </td>

                  <td className={`px-4 py-3 whitespace-nowrap ${softText}`}>
                    {money(r.balance)}
                  </td>

                  <td className={`px-4 py-3 whitespace-nowrap ${softText}`}>
                    {fmtDate(r.firstDepositAt)}
                  </td>

                  <td className={`px-4 py-3 whitespace-nowrap ${softText}`}>
                    {fmtDate(r.lastDepositAt)}
                  </td>
                </tr>
              ))
            )}

            {busy && rows.length === 0 ? (
              <tr>
                <td className={`px-4 py-10 text-center ${mutedText}`} colSpan={7}>
                  Loading deposit ranks...
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <PaginationBar
        theme={theme}
        mutedText={mutedText}
        strongText={strongText}
        subtleButtonClass={subtleButtonClass}
        pageSafe={pageSafe}
        pageCount={pageCount}
        total={total}
        currentCount={rows.length}
        setPage={setRankPage}
      />
    </div>
  );
}

function UserDepositModal({
  open,
  busy,
  user,
  rows,
  stats,
  theme,
  strongText,
  softText,
  mutedText,
  typeBadgeClasses,
  onClose,
}) {
  if (!open) return null;

  const modalBg =
    theme === "dark"
      ? "border-white/10 bg-[#0b1220]/90 text-white shadow-2xl"
      : "border-gray-200 bg-white text-gray-900 shadow-2xl";

  const panelClass =
    theme === "dark"
      ? "rounded-2xl border border-white/10 bg-white/5 p-4"
      : "rounded-2xl border border-gray-200 bg-gray-50 p-4";

  const tableHeadClass =
    theme === "dark"
      ? "bg-white/5 text-left text-xs text-white/50"
      : "bg-gray-50 text-left text-xs text-gray-500";

  const tableBodyClass =
    theme === "dark"
      ? "divide-y divide-white/10"
      : "divide-y divide-gray-200";

  const closeButtonClass =
    theme === "dark"
      ? "rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white/70 hover:bg-white/10"
      : "rounded-xl border border-gray-200 bg-white px-2.5 py-2 text-xs text-gray-600 hover:bg-gray-50";

  const modalOverlayClass =
    `fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-4 ${
      theme === "dark"
        ? "bg-black/75"
        : "bg-slate-950/45"
    } backdrop-blur-xl`;
  
  return (
    <div
      className={modalOverlayClass}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={[
          "relative max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-3xl border",
          modalBg,
        ].join(" ")}
      >
        <div
          className={
            theme === "dark"
              ? "border-b border-white/10 bg-white/5 px-5 py-4"
              : "border-b border-gray-200 bg-gray-50 px-5 py-4"
          }
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className={`text-xs ${mutedText}`}>User Deposit Intelligence</div>
              <div className={`mt-1 text-xl font-bold ${strongText}`}>
                {user?.uid || "Unknown User"}
              </div>
              <div className={`mt-1 flex flex-wrap gap-2 text-xs ${mutedText}`}>
                <span className="break-all">User ID: {user?._id || "-"}</span>
                <span>•</span>
                <span>Phone: {user?.phoneNumber || "-"}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={
                  theme === "dark"
                    ? "rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] text-white/60"
                    : "rounded-full border border-gray-200 bg-white px-3 py-1 text-[10px] text-gray-500"
                }
              >
                {busy ? "Loading..." : `${rows.length} records loaded`}
              </span>

              <button type="button" onClick={onClose} className={closeButtonClass}>
                Close
              </button>
            </div>
          </div>
        </div>

        <div className="max-h-[calc(92vh-82px)] overflow-y-auto p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <MiniStat
              theme={theme}
              title="Total Real Deposits"
              value={stats.totalCount}
              sub="DEPOSIT only"
            />
            <MiniStat
              theme={theme}
              title="Total Amount"
              value={money(stats.totalAmount)}
              sub="DEPOSIT only"
            />
            <MiniStat
              theme={theme}
              title="Today Count"
              value={stats.todayCount}
              sub={`Amount: ${money(stats.todayAmount)}`}
            />
            <MiniStat
              theme={theme}
              title="Full Records"
              value={stats.fullRecordCount}
              sub="Deposit + admin adjust"
            />
            <MiniStat
              theme={theme}
              title="Current Balance"
              value={money(user?.balance)}
              sub="From selected row"
            />
          </div>

          <div className={`${panelClass} mt-5`}>
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <div className={`text-sm font-semibold ${strongText}`}>
                  Full Deposit History
                </div>
                <div className={`mt-1 text-xs ${mutedText}`}>
                  Showing all balance records returned by the deposit endpoint for this user.
                </div>
              </div>

              <div className={`text-xs ${mutedText}`}>
                Double-click outside or press Close to exit
              </div>
            </div>

            <div className="mt-4 overflow-x-auto rounded-2xl border border-black/5 dark:border-white/10">
              <table className="min-w-full text-xs">
                <thead className={tableHeadClass}>
                  <tr>
                    <th className="px-4 py-3">Deposit ID</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Before</th>
                    <th className="px-4 py-3">After</th>
                    <th className="px-4 py-3">Note</th>
                  </tr>
                </thead>

                <tbody className={tableBodyClass}>
                  {busy && rows.length === 0 ? (
                    <tr>
                      <td className={`px-4 py-10 text-center ${mutedText}`} colSpan={7}>
                        Loading user deposit history...
                      </td>
                    </tr>
                  ) : null}

                  {!busy && rows.length === 0 ? (
                    <tr>
                      <td className={`px-4 py-10 text-center ${mutedText}`} colSpan={7}>
                        No deposit history found for this user.
                      </td>
                    </tr>
                  ) : null}

                  {rows.map((d) => (
                    <tr
                      key={d._id}
                      className={theme === "dark" ? "hover:bg-white/5" : "hover:bg-white"}
                    >
                      <td className={`px-4 py-3 min-w-[220px] break-all font-mono text-[11px] ${softText}`}>
                        {d._id || "-"}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className={strongText}>{fmtDate(d.createdAt)}</div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={[
                            "inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold",
                            typeBadgeClasses(d.type),
                          ].join(" ")}
                        >
                          {d.type || "-"}
                        </span>
                      </td>

                      <td className={`px-4 py-3 whitespace-nowrap font-semibold ${strongText}`}>
                        {Number(d.amount || 0) >= 0 ? "+" : "-"}
                        {money(Math.abs(Number(d.amount || 0)))}
                      </td>

                      <td className={`px-4 py-3 whitespace-nowrap ${softText}`}>
                        {money(d.balanceBefore)}
                      </td>

                      <td className={`px-4 py-3 whitespace-nowrap ${softText}`}>
                        {money(d.balanceAfter)}
                      </td>

                      <td className="px-4 py-3">
                        <div
                          className={`max-w-[420px] truncate ${softText}`}
                          title={d.note || "-"}
                        >
                          {d.note || "-"}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

function SmartDatePicker({ label, value, onChange, theme }) {
  const [open, setOpen] = useState(false);
  const parsedValue = parseYmd(value);
  const [viewDate, setViewDate] = useState(parsedValue || new Date());
  const wrapRef = useRef(null);

  const isDark = theme === "dark";

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(e) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const next = parseYmd(value);
    if (next) setViewDate(next);
  }, [value]);

  const monthLabel = viewDate.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  const days = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const mondayIndex = (firstDay.getDay() + 6) % 7;

    const start = new Date(year, month, 1);
    start.setDate(start.getDate() - mondayIndex);

    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [viewDate]);

  const selected = parseYmd(value);
  const today = new Date();

  function pickDate(date) {
    onChange(toYmd(date));
    setOpen(false);
  }

  function goMonth(amount) {
    setViewDate((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + amount);
      return next;
    });
  }

  function clearDate() {
    onChange("");
    setOpen(false);
  }

  function pickToday() {
    const now = new Date();
    onChange(toYmd(now));
    setViewDate(now);
    setOpen(false);
  }

  return (
    <div className="relative" ref={wrapRef}>
      <label className={isDark ? "text-xs text-white/50" : "text-xs text-gray-500"}>
        {label}
      </label>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={[
          "mt-1 flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-[16px] md:text-xs outline-none transition",
          isDark
            ? "border-white/10 bg-black/20 text-white hover:border-white/20 hover:bg-white/[0.07] focus:border-white/20"
            : "border-gray-300 bg-white text-gray-900 hover:border-gray-400 focus:border-gray-400",
        ].join(" ")}
      >
        <span className={value ? "" : isDark ? "text-white/35" : "text-gray-400"}>
          {value ? formatDisplayDate(value) : "dd/mm/yyyy"}
        </span>

        <span
          className={[
            "grid h-4 w-4 place-items-center rounded-lg border transition",
            isDark
              ? "border-none text-white/70"
              : "border-none text-gray-600",
          ].join(" ")}
        >
          <CalendarIcon />
        </span>
      </button>

      {open ? (
        <div
          className={[
            "absolute left-0 top-full z-[80] mt-2 w-[330px] overflow-hidden rounded-3xl border p-4 shadow-2xl",
            isDark
              ? "border-white/10 bg-[#080d18]/95 text-white shadow-black/50 backdrop-blur-2xl"
              : "border-gray-200 bg-white text-gray-900 shadow-gray-300/60",
          ].join(" ")}
        >
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => goMonth(-1)}
              className={[
                "grid h-9 w-9 place-items-center rounded-xl border transition",
                isDark
                  ? "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                  : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100",
              ].join(" ")}
            >
              ‹
            </button>

            <div>
              <div className="text-sm font-bold">{monthLabel}</div>
              <div className={isDark ? "text-center text-[11px] text-white/40" : "text-center text-[11px] text-gray-400"}>
                Select date
              </div>
            </div>

            <button
              type="button"
              onClick={() => goMonth(1)}
              className={[
                "grid h-9 w-9 place-items-center rounded-xl border transition",
                isDark
                  ? "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                  : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100",
              ].join(" ")}
            >
              ›
            </button>
          </div>

          <div className={isDark ? "grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-white/40" : "grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-gray-400"}>
            {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1">
            {days.map((day) => {
              const isCurrentMonth = day.getMonth() === viewDate.getMonth();
              const isSelected = selected && sameDate(day, selected);
              const isToday = sameDate(day, today);

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => pickDate(day)}
                  className={[
                    "relative grid h-10 place-items-center rounded-xl text-sm font-semibold transition",
                    !isCurrentMonth
                      ? isDark
                        ? "text-white/20 hover:text-white/60"
                        : "text-gray-300 hover:text-gray-500"
                      : isDark
                        ? "text-white hover:bg-white/10"
                        : "text-gray-800 hover:bg-gray-100",
                    isToday && !isSelected
                      ? isDark
                        ? "ring-1 ring-white/20"
                        : "ring-1 ring-gray-300"
                      : "",
                    isSelected
                      ? isDark
                        ? "bg-white text-black shadow-lg shadow-white/10 hover:bg-white"
                        : "bg-gray-900 text-white shadow-lg shadow-gray-300 hover:bg-gray-900"
                      : "",
                  ].join(" ")}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          <div className={isDark ? "mt-4 flex items-center justify-between border-t border-white/10 pt-3" : "mt-4 flex items-center justify-between border-t border-gray-100 pt-3"}>
            <button
              type="button"
              onClick={clearDate}
              className={isDark ? "rounded-xl px-3 py-2 text-xs font-semibold text-white/50 hover:bg-white/10 hover:text-white" : "rounded-xl px-3 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-900"}
            >
              Clear
            </button>

            <button
              type="button"
              onClick={pickToday}
              className={isDark ? "rounded-xl bg-white px-3 py-2 text-xs font-bold text-black hover:bg-white/90" : "rounded-xl bg-gray-900 px-3 py-2 text-xs font-bold text-white hover:bg-gray-800"}
            >
              Today
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7 3v3M17 3v3M4.5 9.5h15M6.5 5h11A2.5 2.5 0 0 1 20 7.5v10A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-10A2.5 2.5 0 0 1 6.5 5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function parseYmd(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function toYmd(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value) {
  const date = parseYmd(value);
  if (!date) return "dd/mm/yyyy";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

function sameDate(a, b) {
  return (
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function PaginationBar({
  theme,
  mutedText,
  strongText,
  subtleButtonClass,
  pageSafe,
  pageCount,
  total,
  currentCount,
  setPage,
}) {
  const from = (pageSafe - 1) * PER_PAGE + (currentCount ? 1 : 0);
  const to = (pageSafe - 1) * PER_PAGE + currentCount;

  return (
    <div
      className={`flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between ${
        theme === "dark" ? "border-t border-white/10" : "border-t border-gray-200"
      }`}
    >
      <div className={`text-xs ${mutedText}`}>
        Showing{" "}
        <span className={`font-semibold ${strongText}`}>{from}</span>
        {" - "}
        <span className={`font-semibold ${strongText}`}>{to}</span>
        {" of "}
        <span className={`font-semibold ${strongText}`}>
          {total || currentCount}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setPage(1)}
          disabled={pageSafe === 1}
          className={subtleButtonClass}
        >
          First
        </button>

        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={pageSafe === 1}
          className={subtleButtonClass}
        >
          Prev
        </button>

        <button
          onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
          disabled={pageSafe === pageCount}
          className={subtleButtonClass}
        >
          Next
        </button>

        <button
          onClick={() => setPage(pageCount)}
          disabled={pageSafe === pageCount}
          className={subtleButtonClass}
        >
          Last
        </button>
      </div>
    </div>
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
      <div className={`mt-1 truncate text-xl font-bold ${strongText}`}>
        {value}
      </div>
      <div className={`mt-1 truncate text-xs ${mutedText}`} title={sub}>
        {sub}
      </div>
    </div>
  );
}

function MiniStat({ title, value, sub, theme }) {
  const mutedText = theme === "dark" ? "text-white/50" : "text-gray-500";
  const strongText = theme === "dark" ? "text-white" : "text-gray-900";

  return (
    <div
      className={
        theme === "dark"
          ? "rounded-2xl border border-white/10 bg-white/[0.04] p-4"
          : "rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
      }
    >
      <div className={`text-[11px] ${mutedText}`}>{title}</div>
      <div className={`mt-1 truncate text-lg font-bold ${strongText}`}>
        {value}
      </div>
      <div className={`mt-1 truncate text-[11px] ${mutedText}`} title={sub}>
        {sub}
      </div>
    </div>
  );
}