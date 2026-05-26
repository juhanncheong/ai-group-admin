import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Shell from "../components/Shell";
import { toast } from "react-toastify";
import { useTheme } from "../context/ThemeContext";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "https://slimy-xenia-jayjay122-018fd7f8.koyeb.app";

const USERS_CACHE_KEY = "admin_users_page_cache_v1";

function updateUsersCacheBalance(user) {
  if (!user?._id) return;

  try {
    const raw = sessionStorage.getItem(USERS_CACHE_KEY);
    if (!raw) return;

    const cache = JSON.parse(raw);
    if (!Array.isArray(cache.rows)) return;

    const userId = String(user._id);
    const balance = Number(user.balance || 0);

    const nextRows = cache.rows.map((u) =>
      String(u._id) === userId
        ? {
            ...u,
            balance,
            displayBalance: balance,
            availableBalance: balance,
          }
        : u
    );

    sessionStorage.setItem(
      USERS_CACHE_KEY,
      JSON.stringify({
        ...cache,
        rows: nextRows,
        savedAt: Date.now(),
      })
    );
  } catch (err) {
    console.warn("Failed to update users cache after bonus/borrow:", err);
  }
}

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

export default function BonusCredit() {
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

  const selectClass =
    theme === "dark"
      ? "rounded-xl border border-white/10 bg-[#111827] px-3 py-2 text-xs text-white/90 outline-none hover:bg-[#182236]"
      : "rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 outline-none hover:bg-gray-50";

  const neutralButtonClass =
    theme === "dark"
      ? "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 hover:bg-white/10"
      : "rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 hover:bg-gray-50";

  const primaryButtonClass =
    theme === "dark"
      ? "rounded-xl border border-white/10 bg-white px-4 py-3 text-xs font-semibold text-slate-900 hover:bg-white/90"
      : "rounded-xl border border-gray-900 bg-gray-900 px-4 py-3 text-xs font-semibold text-white hover:bg-gray-800";

  const secondaryActionClass =
    theme === "dark"
      ? "rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-semibold text-white/80 hover:bg-white/10"
      : "rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs font-semibold text-gray-800 hover:bg-gray-50";

  const borrowButtonClass =
    theme === "dark"
      ? "rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-xs font-semibold text-amber-200 hover:bg-amber-400/15"
      : "rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800 hover:bg-amber-100";

  const tableHeadClass =
    theme === "dark"
      ? "bg-white/5 text-xs text-white/60"
      : "bg-gray-50 text-xs text-gray-500";

  const tableBodyClass =
    theme === "dark"
      ? "divide-y divide-white/10"
      : "divide-y divide-gray-200";

  const footerBarClass =
    theme === "dark"
      ? "flex flex-col gap-3 border-t border-white/10 bg-white/5 px-4 py-3 md:flex-row md:items-center md:justify-between"
      : "flex flex-col gap-3 border-t border-gray-200 bg-gray-50 px-4 py-3 md:flex-row md:items-center md:justify-between";

  const toggleWrapClass =
    theme === "dark"
      ? "inline-flex rounded-xl border border-white/10 bg-white/5 p-1"
      : "inline-flex rounded-xl border border-gray-200 bg-gray-100 p-1";

  const activeToggleClass =
    theme === "dark"
      ? "bg-white text-slate-900 shadow-sm"
      : "bg-gray-900 text-white shadow-sm";

  const inactiveToggleClass =
    theme === "dark"
      ? "text-white/60 hover:bg-white/5 hover:text-white"
      : "text-gray-500 hover:bg-white hover:text-gray-900";

  function typeBadge(type) {
    if (type === "BORROW") {
      return theme === "dark"
        ? "border-amber-400/20 bg-amber-400/10 text-amber-200"
        : "border-amber-300 bg-amber-50 text-amber-700";
    }

    if (type === "BONUS") {
      return theme === "dark"
        ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
        : "border-emerald-300 bg-emerald-50 text-emerald-700";
    }

    return theme === "dark"
      ? "border-white/10 bg-white/5 text-white/70"
      : "border-gray-300 bg-gray-100 text-gray-700";
  }

  const [activeType, setActiveType] = useState("BONUS");

  const [loadingHistory, setLoadingHistory] = useState(true);
  const [submittingBonus, setSubmittingBonus] = useState(false);
  const [submittingBorrow, setSubmittingBorrow] = useState(false);

  const [selectedUser, setSelectedUser] = useState(null);
  const [uidInput, setUidInput] = useState("");

  const [amount, setAmount] = useState("");

  const [history, setHistory] = useState([]);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [searchParams] = useSearchParams();
  const uidFromUrl = String(searchParams.get("uid") || "").trim();

  const activeHistoryEndpoint =
    activeType === "BORROW" ? "borrow-history" : "bonus-history";

  const activeTitle = activeType === "BORROW" ? "Borrow Money" : "Bonus Credit";

  const activeHistoryTitle =
    activeType === "BORROW" ? "Borrow Money History" : "Bonus Credit History";

  function getAuthHeaders() {
    const token = localStorage.getItem("admin_token");
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
  }

  async function fetchJSON(url, options = {}) {
    const auth = getAuthHeaders();
    if (!auth) throw new Error("Please login again.");

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

  async function loadHistory({
    keepPage = true,
    type = activeType,
    uidOverride = null,
  } = {}) {
    const nextPage = keepPage ? page : 1;
    if (!keepPage) setPage(1);

    const endpoint = type === "BORROW" ? "borrow-history" : "bonus-history";

    const searchUid =
      uidOverride !== null ? String(uidOverride || "").trim() : uidInput.trim();

    setLoadingHistory(true);

    try {
      const qs = new URLSearchParams();
      qs.set("page", String(nextPage));
      qs.set("limit", String(pageSize));

      if (searchUid) qs.set("uid", searchUid);

      const data = await fetchJSON(
        `${API_BASE}/api/admin/${endpoint}?${qs.toString()}`
      );

      const rows = Array.isArray(data?.rows) ? data.rows : [];

      setHistory(rows);
      setSelectedUser(data?.user || null);
      setTotalRows(Number(data?.pagination?.total || 0));
      setTotalPages(Math.max(1, Number(data?.pagination?.totalPages || 1)));
    } catch (e) {
      setHistory([]);
      setSelectedUser(null);
      setTotalRows(0);
      setTotalPages(1);
      toast.error(e.message || `Failed to load ${activeTitle.toLowerCase()} history`);
    } finally {
      setLoadingHistory(false);
    }
  }

  async function clearUserFilter() {
    setUidInput("");
    setSelectedUser(null);
    setAmount("");
    setPage(1);

    setLoadingHistory(true);

    try {
      const data = await fetchJSON(
        `${API_BASE}/api/admin/${activeHistoryEndpoint}?page=1&limit=${pageSize}`
      );

      const rows = Array.isArray(data?.rows) ? data.rows : [];

      setHistory(rows);
      setSelectedUser(null);
      setTotalRows(Number(data?.pagination?.total || 0));
      setTotalPages(Math.max(1, Number(data?.pagination?.totalPages || 1)));
    } catch (e) {
      setHistory([]);
      setTotalRows(0);
      setTotalPages(1);
      toast.error(e.message || "Failed to load history");
    } finally {
      setLoadingHistory(false);
    }
  }

  async function submitCredit(kind) {
    if (!selectedUser?._id) {
      toast.error("Enter a valid UID and wait for the user to be selected");
      return;
    }

    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    const isBorrow = kind === "BORROW";
    const endpoint = isBorrow ? "borrow" : "bonus";
    const defaultNote = isBorrow ? "Borrow money" : "Admin bonus";

    if (isBorrow) {
      setSubmittingBorrow(true);
    } else {
      setSubmittingBonus(true);
    }

    try {
      const data = await fetchJSON(
        `${API_BASE}/api/admin/users/${selectedUser._id}/${endpoint}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: num,
            note: defaultNote,
          }),
        }
      );
      
      if (data?.user?._id) {
        updateUsersCacheBalance(data.user);
      }

      setAmount("");

      toast.success(
        isBorrow
          ? "Borrow money credited successfully"
          : "Bonus credited successfully"
      );

      setActiveType(kind);

      await loadHistory({
        keepPage: false,
        type: kind,
        uidOverride: uidInput,
      });
    } catch (e) {
      toast.error(
        e.message ||
          (isBorrow ? "Failed to credit borrow money" : "Failed to credit bonus")
      );
    } finally {
      if (isBorrow) {
        setSubmittingBorrow(false);
      } else {
        setSubmittingBonus(false);
      }
    }
  }

  function handleToggle(nextType) {
    if (nextType === activeType) return;

    setActiveType(nextType);
    setPage(1);
    setHistory([]);
    setTotalRows(0);
    setTotalPages(1);
  }

  useEffect(() => {
    if (uidFromUrl) {
      setUidInput(uidFromUrl);
    }
  }, [uidFromUrl]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadHistory({
        keepPage: false,
        uidOverride: uidInput,
      });
    }, 450);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uidInput, activeType, pageSize]);

  useEffect(() => {
    loadHistory({
      keepPage: true,
      uidOverride: uidInput,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const displayRows = useMemo(() => history, [history]);

  return (
    <Shell title="Bonus / Borrow Credit">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className={`text-xs ${mutedText}`}>
          Toggle between bonus and borrow history. Enter UID and the page will search automatically.
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className={toggleWrapClass}>
            <button
              type="button"
              onClick={() => handleToggle("BONUS")}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                activeType === "BONUS" ? activeToggleClass : inactiveToggleClass
              }`}
            >
              Bonus
            </button>

            <button
              type="button"
              onClick={() => handleToggle("BORROW")}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                activeType === "BORROW" ? activeToggleClass : inactiveToggleClass
              }`}
            >
              Borrow
            </button>
          </div>

          <button
            onClick={() =>
              loadHistory({
                keepPage: false,
                uidOverride: uidInput,
              })
            }
            className={neutralButtonClass}
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-1">
          <div className={`${cardClass} p-4`}>
            <div className={`text-sm font-semibold ${strongText}`}>
              Smart Search User by UID
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <div className={`text-xs font-semibold ${strongText}`}>UID</div>
                <input
                  value={uidInput}
                  onChange={(e) => {
                    setUidInput(e.target.value);
                    setSelectedUser(null);
                    setPage(1);
                  }}
                  placeholder="Example: 100008"
                  className={`mt-2 ${inputClass}`}
                />
              </div>

              <button onClick={clearUserFilter} className={`w-full ${secondaryActionClass}`}>
                Clear
              </button>
            </div>
          </div>

          <div className={`${cardClass} p-4`}>
            <div className={`text-sm font-semibold ${strongText}`}>User Details</div>

            {!selectedUser ? (
              <div className={`mt-4 text-xs ${mutedText}`}>
                {uidInput.trim()
                  ? "Searching user automatically..."
                  : "No user selected. History below is showing all users."}
              </div>
            ) : (
              <div className="mt-4">
                <div
                  className={`rounded-2xl p-3 ${
                    theme === "dark"
                      ? "border border-white/10 bg-[#0f172a]"
                      : "border border-gray-200 bg-gray-50"
                  }`}
                >
                  <div className={`text-[11px] ${mutedText}`}>UID</div>
                  <div className={`mt-1 text-sm ${strongText}`}>
                    {selectedUser.uid || "-"}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className={`${cardClass} p-4`}>
            <div className={`text-sm font-semibold ${strongText}`}>Credit User</div>

            <div className={`mt-1 text-xs ${mutedText}`}>
              Bonus and borrow use separate wallet transaction categories.
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <div className={`text-xs font-semibold ${strongText}`}>Amount</div>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Example: 100"
                  className={`mt-2 ${inputClass}`}
                />
              </div>

              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <button
                  disabled={!selectedUser?._id || submittingBonus || submittingBorrow}
                  onClick={() => submitCredit("BONUS")}
                  className={`w-full ${primaryButtonClass} disabled:opacity-50`}
                >
                  {submittingBonus ? "Crediting..." : "Bonus Credit"}
                </button>

                <button
                  disabled={!selectedUser?._id || submittingBonus || submittingBorrow}
                  onClick={() => submitCredit("BORROW")}
                  className={`w-full ${borrowButtonClass} disabled:opacity-50`}
                >
                  {submittingBorrow ? "Crediting..." : "Borrow Money"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-2">
          <div className={cardClass}>
            <div
              className={`flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between ${
                theme === "dark" ? "border-b border-white/10" : "border-b border-gray-200"
              }`}
            >
              <div>
                <div className={`text-sm font-semibold ${strongText}`}>
                  {activeHistoryTitle}
                </div>
                <div className={`mt-1 text-xs ${mutedText}`}>
                  Currently showing {activeType === "BORROW" ? "borrow" : "bonus"} records only.
                </div>
              </div>

              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className={selectClass}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="users-table-scroll overflow-x-auto">
              <table className="min-w-[880px] text-left text-sm">
                <thead className={tableHeadClass}>
                  <tr>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">UID</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Before</th>
                    <th className="px-4 py-3">After</th>
                  </tr>
                </thead>

                <tbody className={tableBodyClass}>
                  {loadingHistory ? (
                    <tr>
                      <td className={`px-4 py-5 ${softText}`} colSpan={6}>
                        Loading history...
                      </td>
                    </tr>
                  ) : displayRows.length === 0 ? (
                    <tr>
                      <td className={`px-4 py-5 ${softText}`} colSpan={6}>
                        No {activeType === "BORROW" ? "borrow" : "bonus"} history found.
                      </td>
                    </tr>
                  ) : (
                    displayRows.map((row) => (
                      <tr
                        key={row._id}
                        className={theme === "dark" ? "hover:bg-white/5" : "hover:bg-gray-50"}
                      >
                        <td className={`px-4 py-3 text-xs ${softText}`}>
                          {formatDate(row.createdAt)}
                        </td>

                        <td className="px-4 py-3">
                          <div className={`text-xs ${strongText}`}>
                            {row?.userId?.uid || "-"}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full border px-2 py-1 text-[10px] ${typeBadge(row.type)}`}
                          >
                            {row.type || "-"}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className={`text-xs ${strongText}`}>
                            {safeNum(row.amount).toFixed(2)}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className={`text-xs ${softText}`}>
                            {safeNum(row.balanceBefore).toFixed(2)}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className={`text-xs ${strongText}`}>
                            {safeNum(row.balanceAfter).toFixed(2)}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className={footerBarClass}>
              <div className={`text-xs ${mutedText}`}>
                Showing {totalRows === 0 ? 0 : (page - 1) * pageSize + 1} to{" "}
                {Math.min(page * pageSize, totalRows)} of {totalRows}
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={`${neutralButtonClass} disabled:opacity-40`}
                >
                  Prev
                </button>

                <div className={`text-xs ${softText}`}>
                  Page {page} / {totalPages}
                </div>

                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className={`${neutralButtonClass} disabled:opacity-40`}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}