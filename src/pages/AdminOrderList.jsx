import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import Shell from "../components/Shell";
import { useTheme } from "../context/ThemeContext";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "https://slimy-xenia-jayjay122-018fd7f8.koyeb.app";

const CACHE_KEY = "admin_order_list_page_cache_v1";

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
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore cache errors
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

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

function getStatusTone(status, theme) {
  const s = String(status || "").toUpperCase();

  if (s === "COMPLETED") {
    return theme === "dark"
      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (s === "PENDING") {
    return theme === "dark"
      ? "border-amber-500/25 bg-amber-500/10 text-amber-200"
      : "border-amber-200 bg-amber-50 text-amber-700";
  }

  return theme === "dark"
    ? "border-white/10 bg-white/5 text-white/75"
    : "border-gray-200 bg-gray-100 text-gray-700";
}

export default function AdminOrderList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { theme } = useTheme();

  const initialCache = loadCache();

  const [userId, setUserId] = useState(
    () => searchParams.get("userId") || initialCache?.userId || ""
  );
  const [statusFilter, setStatusFilter] = useState(
    () => searchParams.get("status") || initialCache?.statusFilter || "all"
  );
  const [localQuery, setLocalQuery] = useState(() => initialCache?.localQuery || "");
  const [page, setPage] = useState(() => {
    const fromUrl = Number(searchParams.get("page") || "");
    return Number.isFinite(fromUrl) && fromUrl > 0
      ? fromUrl
      : initialCache?.page || 1;
  });
  const [limit, setLimit] = useState(() => {
    const fromUrl = Number(searchParams.get("limit") || "");
    return Number.isFinite(fromUrl) && fromUrl > 0
      ? fromUrl
      : initialCache?.limit || 10;
  });

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState(() => initialCache?.rows || []);
  const [pickedUser, setPickedUser] = useState(() => initialCache?.pickedUser || null);
  const [pagination, setPagination] = useState(
    () =>
      initialCache?.pagination || {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1,
      }
  );

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
      ? "appearance-none rounded-xl border border-white/10 bg-[#111827] px-3 py-2 text-xs text-white outline-none hover:bg-[#182236]"
      : "appearance-none rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 outline-none hover:bg-gray-50";

  const buttonClass =
    theme === "dark"
      ? "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 hover:bg-white/10"
      : "rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 hover:bg-gray-50";

  const tableWrapClass =
    theme === "dark"
      ? "overflow-hidden rounded-2xl border border-white/10"
      : "overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm";

  const tableHeaderBarClass =
    theme === "dark"
      ? "bg-white/5 px-4 py-3 text-sm font-semibold text-white"
      : "bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900";

  const tableHeadClass =
    theme === "dark"
      ? "bg-white/5 text-xs text-white/60"
      : "bg-gray-50 text-xs text-gray-500";

  const tableBodyClass =
    theme === "dark" ? "divide-y divide-white/10" : "divide-y divide-gray-200";

  const tableRowClass = theme === "dark" ? "hover:bg-white/5" : "hover:bg-gray-50";

  const footerBarClass =
    theme === "dark"
      ? "flex flex-col gap-3 border-t border-white/10 bg-white/5 px-4 py-3 md:flex-row md:items-center md:justify-between"
      : "flex flex-col gap-3 border-t border-gray-200 bg-gray-50 px-4 py-3 md:flex-row md:items-center md:justify-between";

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

  async function loadOrders(forceRefresh = true, overrides = {}) {
    const nextUserId = String(overrides.userId ?? userId).trim();
    const nextStatus = String(overrides.statusFilter ?? statusFilter).trim();
    const nextPage = Number(overrides.page ?? page ?? 1);
    const nextLimit = Number(overrides.limit ?? limit ?? 10);

    if (!nextUserId) {
      setRows([]);
      setPickedUser(null);
      setPagination({ page: 1, limit: nextLimit, total: 0, totalPages: 1 });
      if (forceRefresh) {
        toast.error("Enter a user ID first");
      }
      return;
    }

    if (forceRefresh) setLoading(true);
    else setRefreshing(true);

    try {
      const params = new URLSearchParams();
      params.set("page", String(nextPage));
      params.set("limit", String(nextLimit));
      if (nextStatus !== "all") {
        params.set("status", nextStatus.toUpperCase());
      }

      const data = await fetchJSON(
        `${API_BASE}/api/admin/orders/users/${encodeURIComponent(nextUserId)}/orders?${params.toString()}`
      );

      const nextRows = Array.isArray(data?.orders) ? data.orders : [];
      const nextPickedUser = data?.user || null;
      const nextPagination = data?.pagination || {
        page: nextPage,
        limit: nextLimit,
        total: nextRows.length,
        totalPages: 1,
      };

      setRows(nextRows);
      setPickedUser(nextPickedUser);
      setPagination(nextPagination);

      saveCache({
        userId: nextUserId,
        statusFilter: nextStatus,
        localQuery,
        page: nextPagination.page,
        limit: nextPagination.limit,
        rows: nextRows,
        pickedUser: nextPickedUser,
        pagination: nextPagination,
        savedAt: Date.now(),
      });
    } catch (e) {
      setRows([]);
      setPickedUser(null);
      setPagination({ page: 1, limit: nextLimit, total: 0, totalPages: 1 });
      toast.error(e.message || "Failed to load order list");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    saveCache({
      userId,
      statusFilter,
      localQuery,
      page,
      limit,
      rows,
      pickedUser,
      pagination,
      savedAt: Date.now(),
    });
  }, [userId, statusFilter, localQuery, page, limit, rows, pickedUser, pagination]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);

    if (userId) next.set("userId", userId);
    else next.delete("userId");

    if (statusFilter && statusFilter !== "all") next.set("status", statusFilter);
    else next.delete("status");

    next.set("page", String(page));
    next.set("limit", String(limit));

    setSearchParams(next, { replace: true });
  }, [userId, statusFilter, page, limit]);

  useEffect(() => {
    const initialUserId = searchParams.get("userId") || initialCache?.userId || "";
    if (initialUserId) {
      loadOrders(true, {
        userId: initialUserId,
        statusFilter,
        page,
        limit,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRows = useMemo(() => {
    const qq = localQuery.trim().toLowerCase();
    if (!qq) return rows;

    return rows.filter((row) => {
      return (
        String(row.orderNumber || "").toLowerCase().includes(qq) ||
        String(row.orderName || "").toLowerCase().includes(qq) ||
        String(row.status || "").toLowerCase().includes(qq) ||
        String(row._id || "").toLowerCase().includes(qq)
      );
    });
  }, [rows, localQuery]);

  const stats = useMemo(() => {
    const totalOrders = rows.length;
    const pendingOrders = rows.filter((x) => String(x.status).toUpperCase() === "PENDING").length;
    const completedOrders = rows.filter((x) => String(x.status).toUpperCase() === "COMPLETED").length;
    const bonusOrders = rows.filter((x) => Boolean(x.isBonus)).length;
    const totalPrice = rows.reduce((sum, x) => sum + safeNum(x.price), 0);
    const totalCommission = rows.reduce((sum, x) => sum + safeNum(x.commission), 0);

    return {
      totalOrders,
      pendingOrders,
      completedOrders,
      bonusOrders,
      totalPrice,
      totalCommission,
    };
  }, [rows]);

  return (
    <Shell title="Admin Order List">
      <div className="space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className={`text-xs ${mutedText}`}>
              View a specific user’s order history with server pagination and status filters
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className={buttonClass}
              type="button"
            >
              Back
            </button>

            <button
              onClick={() => loadOrders(false)}
              disabled={loading || refreshing || !userId.trim()}
              className={`${buttonClass} disabled:opacity-50`}
              type="button"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
          <div className={`${cardClass} xl:col-span-7`}>
            <div className="p-4">
              <div className={`mb-3 text-sm font-semibold ${strongText}`}>Filters</div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <div className={`mb-2 text-[11px] font-semibold ${mutedText}`}>UID</div>
                  <input
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="Paste UID"
                    className={inputClass}
                  />
                </div>

                <div>
                  <div className={`mb-2 text-[11px] font-semibold ${mutedText}`}>Status</div>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setPage(1);
                    }}
                    className={selectClass}
                  >
                    <option value="all">All statuses</option>
                    <option value="pending">PENDING</option>
                    <option value="completed">COMPLETED</option>
                  </select>
                </div>

                <div>
                  <div className={`mb-2 text-[11px] font-semibold ${mutedText}`}>Search loaded rows</div>
                  <input
                    value={localQuery}
                    onChange={(e) => setLocalQuery(e.target.value)}
                    placeholder="Order no / name / status"
                    className={inputClass}
                  />
                </div>

                <div>
                  <div className={`mb-2 text-[11px] font-semibold ${mutedText}`}>Per page</div>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    className={selectClass}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPage(1);
                    loadOrders(true, { page: 1 });
                  }}
                  className={classNames(
                    "rounded-xl border px-3 py-2 text-xs",
                    theme === "dark"
                      ? "border-blue-500/25 bg-blue-500/10 text-blue-200 hover:bg-blue-500/15"
                      : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                  )}
                >
                  {loading ? "Loading..." : "Load Orders"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUserId("");
                    setStatusFilter("all");
                    setLocalQuery("");
                    setPage(1);
                    setRows([]);
                    setPickedUser(null);
                    setPagination({ page: 1, limit, total: 0, totalPages: 1 });
                  }}
                  className={buttonClass}
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          <div className={`${cardClass} xl:col-span-5`}>
            <div className="p-4">
              <div className={`mb-3 text-sm font-semibold ${strongText}`}>Picked User</div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <div className={`text-[11px] font-semibold ${mutedText}`}>Phone</div>
                  <div className={`mt-1 text-sm font-semibold break-all ${strongText}`}>
                    {pickedUser?.phoneNumber || "-"}
                  </div>
                </div>

                <div>
                  <div className={`text-[11px] font-semibold ${mutedText}`}>UID</div>
                  <div className={`mt-1 text-sm font-semibold break-all ${strongText}`}>
                    {pickedUser?.uid || "-"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          <div className={`${cardClass} p-4`}>
            <div className={`text-[11px] font-semibold ${mutedText}`}>Loaded Orders</div>
            <div className={`mt-2 text-2xl font-semibold ${strongText}`}>{stats.totalOrders}</div>
          </div>

          <div className={`${cardClass} p-4`}>
            <div className={`text-[11px] font-semibold ${mutedText}`}>Pending</div>
            <div className={`mt-2 text-2xl font-semibold ${strongText}`}>{stats.pendingOrders}</div>
          </div>

          <div className={`${cardClass} p-4`}>
            <div className={`text-[11px] font-semibold ${mutedText}`}>Completed</div>
            <div className={`mt-2 text-2xl font-semibold ${strongText}`}>{stats.completedOrders}</div>
          </div>

          <div className={`${cardClass} p-4`}>
            <div className={`text-[11px] font-semibold ${mutedText}`}>Bonus Orders</div>
            <div className={`mt-2 text-2xl font-semibold ${strongText}`}>{stats.bonusOrders}</div>
          </div>

          <div className={`${cardClass} p-4`}>
            <div className={`text-[11px] font-semibold ${mutedText}`}>Total Price</div>
            <div className={`mt-2 text-2xl font-semibold ${strongText}`}>{stats.totalPrice.toFixed(2)}</div>
          </div>

          <div className={`${cardClass} p-4`}>
            <div className={`text-[11px] font-semibold ${mutedText}`}>Total Commission</div>
            <div className={`mt-2 text-2xl font-semibold ${strongText}`}>{stats.totalCommission.toFixed(2)}</div>
          </div>
        </div>

        <div className={tableWrapClass}>
          <div className={tableHeaderBarClass}>
            Orders ({filteredRows.length})
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1450px] text-left text-sm">
              <thead className={tableHeadClass}>
                <tr>
                  <th className="px-4 py-3">Order #</th>
                  <th className="px-4 py-3">Order Name</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Commission</th>
                  <th className="px-4 py-3">Bonus</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Completed</th>
                  <th className="px-4 py-3">Pool Order ID</th>
                  <th className="px-4 py-3">Order ID</th>
                </tr>
              </thead>

              <tbody className={tableBodyClass}>
                {loading ? (
                  <tr>
                    <td className={`px-4 py-5 ${softText}`} colSpan={10}>
                      Loading orders...
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td className={`px-4 py-5 ${softText}`} colSpan={10}>
                      {userId.trim()
                        ? "No orders found for this user / filter."
                        : "Enter a user ID and load orders."}
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => {
                    const tone = getStatusTone(row.status, theme);

                    return (
                      <tr key={row._id} className={tableRowClass}>
                        <td className={`px-4 py-3 text-xs font-semibold ${strongText}`}>
                          {row.orderNumber || "-"}
                        </td>

                        <td className="px-4 py-3">
                          <div className={`max-w-[340px] truncate text-xs ${strongText}`} title={row.orderName || "-"}>
                            {row.orderName || "-"}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${tone}`}>
                            {row.status || "-"}
                          </span>
                        </td>

                        <td className={`px-4 py-3 text-xs ${strongText}`}>
                          {safeNum(row.price).toFixed(2)}
                        </td>

                        <td className={`px-4 py-3 text-xs ${strongText}`}>
                          {safeNum(row.commission).toFixed(2)}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={classNames(
                              "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold",
                              row.isBonus
                                ? theme === "dark"
                                  ? "border-violet-500/25 bg-violet-500/10 text-violet-200"
                                  : "border-violet-200 bg-violet-50 text-violet-700"
                                : theme === "dark"
                                ? "border-white/10 bg-white/5 text-white/70"
                                : "border-gray-200 bg-gray-100 text-gray-700"
                            )}
                          >
                            {row.isBonus ? "YES" : "NO"}
                          </span>
                        </td>

                        <td className={`px-4 py-3 text-xs ${softText}`}>
                          {formatDate(row.createdAt)}
                        </td>

                        <td className={`px-4 py-3 text-xs ${softText}`}>
                          {formatDate(row.completedAt)}
                        </td>

                        <td className="px-4 py-3">
                          <div className={`max-w-[220px] truncate text-xs ${softText}`} title={row.poolOrder || "-"}>
                            {row.poolOrder || "-"}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className={`max-w-[220px] truncate text-xs ${softText}`} title={row._id || "-"}>
                            {row._id || "-"}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className={footerBarClass}>
            <div className={`text-xs ${mutedText}`}>
              Showing {filteredRows.length} local rows • Server total {pagination.total || 0}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className={`text-xs ${softText}`}>
                Page {pagination.page || 1} / {Math.max(1, pagination.totalPages || 1)}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={(pagination.page || 1) <= 1 || loading}
                  onClick={() => {
                    const nextPage = Math.max(1, (pagination.page || 1) - 1);
                    setPage(nextPage);
                    loadOrders(true, { page: nextPage });
                  }}
                  className={`${buttonClass} disabled:opacity-40`}
                >
                  Prev
                </button>

                <button
                  type="button"
                  disabled={(pagination.page || 1) >= Math.max(1, pagination.totalPages || 1) || loading}
                  onClick={() => {
                    const nextPage = Math.min(
                      Math.max(1, pagination.totalPages || 1),
                      (pagination.page || 1) + 1
                    );
                    setPage(nextPage);
                    loadOrders(true, { page: nextPage });
                  }}
                  className={`${buttonClass} disabled:opacity-40`}
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
