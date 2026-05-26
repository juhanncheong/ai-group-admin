import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Shell from "../components/Shell";
import { toast } from "react-toastify";
import { useTheme } from "../context/ThemeContext";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "https://slimy-xenia-jayjay122-018fd7f8.koyeb.app";

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
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

      <div
        ref={cardRef}
        className={`relative w-full max-w-lg overflow-hidden rounded-2xl shadow-2xl ${
          theme === "dark"
            ? "border border-white/10 bg-[#071120]"
            : "border border-gray-200 bg-white"
        }`}
      >
        <div
          className={`flex items-start justify-between gap-3 px-5 py-4 ${
            theme === "dark"
              ? "border-b border-white/10"
              : "border-b border-gray-200"
          }`}
        >
          <div>
            <div
              className={`text-base font-semibold ${
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
            className={`rounded-xl px-2.5 py-2 text-xs ${
              theme === "dark"
                ? "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            ✕
          </button>
        </div>

        <div className="px-5 pb-5 pt-4">{children}</div>

        {footer ? (
          <div
            className={`px-5 py-4 ${
              theme === "dark"
                ? "border-t border-white/10 bg-white/5"
                : "border-t border-gray-200 bg-gray-50"
            }`}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function TrialBonus() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();

  const mutedText = theme === "dark" ? "text-white/50" : "text-gray-500";
  const softText = theme === "dark" ? "text-white/70" : "text-gray-600";
  const strongText = theme === "dark" ? "text-white" : "text-gray-900";

  const inputClass =
    theme === "dark"
      ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none focus:border-white/20"
      : "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-400";

  const neutralButtonClass =
    theme === "dark"
      ? "rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 hover:bg-white/10"
      : "rounded-2xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 hover:bg-gray-50";

  const primaryButtonClass =
    theme === "dark"
      ? "rounded-2xl border border-white/10 bg-white px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-white/90"
      : "rounded-2xl border border-gray-900 bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800";

  const cardClass =
    theme === "dark"
      ? "overflow-hidden rounded-2xl border border-white/10 bg-white/5"
      : "overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm";

  const tableHeadClass =
    theme === "dark"
      ? "bg-white/5 text-xs text-white/60"
      : "bg-gray-50 text-xs text-gray-500";

  const tableBodyClass =
    theme === "dark"
      ? "divide-y divide-white/10"
      : "divide-y divide-gray-200";

  const topBarClass =
    theme === "dark"
      ? "flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold"
      : "flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold";

  const footerBarClass =
    theme === "dark"
      ? "flex flex-col gap-3 border-t border-white/10 bg-white/5 px-4 py-3 md:flex-row md:items-center md:justify-between"
      : "flex flex-col gap-3 border-t border-gray-200 bg-gray-50 px-4 py-3 md:flex-row md:items-center md:justify-between";

  const selectClass =
    theme === "dark"
      ? "appearance-none rounded-xl border border-white/10 bg-[#111827] px-3 py-2 text-xs text-white/90 outline-none hover:bg-[#182236]"
      : "appearance-none rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 outline-none hover:bg-gray-50";

  const statusBadgeClass = (status) => {
    if (theme === "dark") {
      if (status === "Active") {
        return "border border-emerald-500/20 bg-emerald-500/10 text-emerald-200";
      }
      if (status === "Revoked") {
        return "border border-red-500/20 bg-red-500/10 text-red-200";
      }
      return "border border-white/10 bg-white/5 text-white/60";
    }

    if (status === "Active") {
      return "border border-emerald-200 bg-emerald-50 text-emerald-700";
    }
    if (status === "Revoked") {
      return "border border-red-200 bg-red-50 text-red-700";
    }
    return "border border-gray-300 bg-gray-100 text-gray-700";
  };

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const [q, setQ] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [grantModal, setGrantModal] = useState({
    open: false,
    user: null,
    amount: "",
    note: "Trial bonus",
  });

  const [revokeModal, setRevokeModal] = useState({
    open: false,
    user: null,
    note: "Admin revoked trial bonus",
  });

  const [grantSearch, setGrantSearch] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const uidFromUrl = String(params.get("uid") || "").trim();
  
    if (uidFromUrl) {
      setGrantSearch(uidFromUrl);
    }
  }, [location.search]);

  const [allUsersLoaded, setAllUsersLoaded] = useState(false);
  const [allUsersLoading, setAllUsersLoading] = useState(false);
  const [allUsers, setAllUsers] = useState([]);

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
        "Content-Type": "application/json",
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

  async function loadRows(nextPage = page, nextQ = q, nextPageSize = pageSize) {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      params.set("page", String(nextPage));
      params.set("limit", String(nextPageSize));

      const cleanQ = String(nextQ || "").trim();
      if (cleanQ) params.set("q", cleanQ);

      const data = await fetchJSON(
        `${API_BASE}/api/admin/trial-users?${params.toString()}`
      );

      const list = Array.isArray(data?.rows) ? data.rows : [];
      const pg = data?.pagination || {};

      setRows(list);
      setPage(Number(pg.page || nextPage || 1));
      setPageSize(Number(pg.limit || nextPageSize || 10));
      setTotal(Number(pg.total || 0));
      setTotalPages(Number(pg.totalPages || 1));
    } catch (e) {
      setRows([]);
      setError(e.message || "Failed to load trial users");
      toast.error(e.message || "Failed to load trial users");
    } finally {
      setLoading(false);
    }
  }

  async function loadAllUsersForGrant() {
    if (allUsersLoaded || allUsersLoading) return;

    setAllUsersLoading(true);
    try {
      const data = await fetchJSON(`${API_BASE}/api/admin/users`);
      const users = Array.isArray(data?.users) ? data.users : [];
      setAllUsers(users);
      setAllUsersLoaded(true);
    } catch (e) {
      toast.error(e.message || "Failed to load users");
    } finally {
      setAllUsersLoading(false);
    }
  }

  async function grantTrial(userId, amount, note) {
    setBusyId(userId);
    try {
      const num = Number(amount);

      if (!Number.isFinite(num) || num <= 0) {
        toast.error("Amount must be greater than 0");
        return;
      }

      await fetchJSON(`${API_BASE}/api/admin/users/${userId}/trial-credit`, {
        method: "POST",
        body: JSON.stringify({
          amount: num,
          note: String(note || "Trial bonus"),
        }),
      });

      toast.success("Trial bonus granted");
      await loadRows(1, q, pageSize);
    } catch (e) {
      toast.error(e.message || "Failed to grant trial bonus");
    } finally {
      setBusyId(null);
    }
  }

  async function revokeTrial(userId, note) {
    setBusyId(userId);
    try {
      await fetchJSON(`${API_BASE}/api/admin/users/${userId}/trial-revoke`, {
        method: "POST",
        body: JSON.stringify({
          note: String(note || "Admin revoked trial bonus"),
        }),
      });

      toast.success("Trial bonus revoked");
      await loadRows(page, q, pageSize);
    } catch (e) {
      toast.error(e.message || "Failed to revoke trial bonus");
    } finally {
      setBusyId(null);
    }
  }

  useEffect(() => {
    loadRows(1, "", 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setQ(searchInput.trim());
    }, 400);

    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    loadRows(page, q, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, q, pageSize]);

  useEffect(() => {
    if (grantSearch.trim().length >= 2) {
      loadAllUsersForGrant();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grantSearch]);

  const pageInfo = useMemo(() => {
    if (total === 0) return { from: 0, to: 0 };
    return {
      from: (page - 1) * pageSize + 1,
      to: Math.min(page * pageSize, total),
    };
  }, [page, pageSize, total]);

  const grantFilteredUsers = useMemo(() => {
    const term = grantSearch.trim().toLowerCase();
    if (!term || term.length < 2) return [];

    return allUsers
      .filter((u) => {
        return (
          String(u.uid || "").toLowerCase().includes(term) ||
          String(u.phoneNumber || "").toLowerCase().includes(term) ||
          String(u._id || "").toLowerCase().includes(term)
        );
      })
      .slice(0, 12);
  }, [allUsers, grantSearch]);

  function getStatus(row) {
    if (!row?.hasTrial) return "None";
    if (row?.isFullyRevoked) return "Revoked";
    return "Active";
  }

  return (
    <Shell title="Trial Bonus">
      <div className="w-full max-w-none">
        <div className={`mb-5 ${cardClass}`}>
          <div className={topBarClass}>
            <div className={`text-sm font-semibold ${strongText}`}>
              Grant Trial Bonus To Any User
            </div>
          </div>

          <div className="p-4">
            <div className="grid gap-2">
              <label
                className={`text-xs ${
                  theme === "dark" ? "text-white/60" : "text-gray-500"
                }`}
              >
                Search any user by UID / phone / user ID
              </label>

              <input
                value={grantSearch}
                onChange={(e) => setGrantSearch(e.target.value)}
                className={inputClass}
                placeholder="Type at least 2 characters..."
              />
            </div>

            {grantSearch.trim().length >= 2 ? (
              <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
                <table className="min-w-full text-left text-xs">
                  <thead className={tableHeadClass}>
                    <tr>
                      <th className="px-4 py-3">UID</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3">User ID</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>

                  <tbody className={tableBodyClass}>
                    {allUsersLoading ? (
                      <tr>
                        <td colSpan={4} className={`px-4 py-8 text-center ${mutedText}`}>
                          Loading users...
                        </td>
                      </tr>
                    ) : grantFilteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className={`px-4 py-8 text-center ${mutedText}`}>
                          No users found.
                        </td>
                      </tr>
                    ) : (
                      grantFilteredUsers.map((u) => {
                        const isBusy = busyId === u._id;

                        return (
                          <tr
                            key={u._id}
                            className={theme === "dark" ? "hover:bg-white/5" : "hover:bg-gray-50"}
                          >
                            <td className={`px-4 py-3 ${strongText}`}>
                              {u.uid || "-"}
                            </td>

                            <td className={`px-4 py-3 ${softText}`}>
                              {u.phoneNumber || "-"}
                            </td>

                            <td className={`px-4 py-3 ${mutedText}`}>
                              {u._id || "-"}
                            </td>

                            <td className="px-4 py-3">
                              <div className="flex justify-end">
                                <button
                                  disabled={isBusy}
                                  onClick={() =>
                                    setGrantModal({
                                      open: true,
                                      user: {
                                        userId: u._id,
                                        uid: u.uid,
                                        phoneNumber: u.phoneNumber,
                                      },
                                      amount: "",
                                      note: "Trial bonus",
                                    })
                                  }
                                  className={classNames(
                                    primaryButtonClass,
                                    "disabled:opacity-50"
                                  )}
                                >
                                  Grant Trial
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className={`text-base font-semibold ${strongText}`}>
              Trial Bonus Records
            </div>
            <div className={`mt-1 text-xs ${mutedText}`}>
              Paginated table of users who already have trial bonus records.
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 md:w-[420px]">
            <label
              className={`text-xs ${
                theme === "dark" ? "text-white/60" : "text-gray-500"
              }`}
            >
              Search trial records by UID / phone
            </label>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className={inputClass}
              placeholder="Search UID / phone..."
            />
          </div>
        </div>

        {error ? (
          <div
            className={`mt-4 rounded-2xl px-4 py-3 text-xs ${
              theme === "dark"
                ? "border border-red-500/30 bg-red-500/10 text-red-200"
                : "border border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {error}
          </div>
        ) : null}

        <div className={`mt-5 ${cardClass}`}>
          <div className={topBarClass}>
            <div className={`text-sm ${softText}`}>
              {loading ? "Loading..." : `${total} total trial users`}
            </div>

            <button
              onClick={() => loadRows(page, q, pageSize)}
              disabled={loading}
              className={classNames(neutralButtonClass, "disabled:opacity-50")}
            >
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1280px] text-left text-xs">
              <thead className={tableHeadClass}>
                <tr>
                  <th className="px-4 py-3">UID</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Trial Status</th>
                  <th className="px-4 py-3">Credited</th>
                  <th className="px-4 py-3">Reversed</th>
                  <th className="px-4 py-3">Remaining</th>
                  <th className="px-4 py-3">Last Credit</th>
                  <th className="px-4 py-3">Last Reversal</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>

              <tbody className={tableBodyClass}>
                {loading ? (
                  <tr>
                    <td className={`px-4 py-10 text-center ${mutedText}`} colSpan={9}>
                      Loading trial users...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td className={`px-4 py-10 text-center ${mutedText}`} colSpan={9}>
                      No trial users found.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const status = getStatus(row);
                    const isBusy = busyId === row.userId;

                    return (
                      <tr
                        key={row.userId}
                        className={theme === "dark" ? "hover:bg-white/5" : "hover:bg-gray-50"}
                      >
                        <td className={`px-4 py-3 ${strongText}`}>
                          {row.uid || "-"}
                        </td>

                        <td className={`px-4 py-3 ${softText}`}>
                          {row.phoneNumber || "-"}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={classNames(
                              "rounded-xl px-2 py-1 text-xs",
                              statusBadgeClass(status)
                            )}
                          >
                            {status}
                          </span>
                        </td>

                        <td className={`px-4 py-3 ${softText}`}>
                          {safeNum(row.credited).toFixed(2)}
                        </td>

                        <td className={`px-4 py-3 ${softText}`}>
                          {safeNum(row.reversed).toFixed(2)}
                        </td>

                        <td className={`px-4 py-3 ${strongText}`}>
                          {safeNum(row.remaining).toFixed(2)}
                        </td>

                        <td className={`px-4 py-3 ${mutedText}`}>
                          {formatDate(row.lastCreditAt)}
                        </td>

                        <td className={`px-4 py-3 ${mutedText}`}>
                          {formatDate(row.lastReversalAt)}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              disabled={isBusy}
                              onClick={() =>
                                setGrantModal({
                                  open: true,
                                  user: row,
                                  amount: "",
                                  note: "Trial bonus",
                                })
                              }
                              className={classNames(
                                primaryButtonClass,
                                "disabled:opacity-50"
                              )}
                            >
                              Grant
                            </button>

                            <button
                              disabled={isBusy}
                              onClick={() =>
                                setRevokeModal({
                                  open: true,
                                  user: row,
                                  note: "Admin revoked trial bonus",
                                })
                              }
                              className={classNames(
                                neutralButtonClass,
                                "disabled:opacity-50"
                              )}
                            >
                              Revoke
                            </button>
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
              Showing {pageInfo.from} to {pageInfo.to} of {total} rows
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <span className={`text-xs ${mutedText}`}>Per page</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPage(1);
                    setPageSize(Number(e.target.value));
                  }}
                  className={selectClass}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={classNames(neutralButtonClass, "disabled:opacity-50")}
                >
                  Prev
                </button>

                <div className={`text-xs ${softText}`}>
                  Page {page} / {Math.max(1, totalPages)}
                </div>

                <button
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className={classNames(neutralButtonClass, "disabled:opacity-50")}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={grantModal.open}
        title="Grant Trial Bonus"
        subtitle={
          grantModal.user
            ? `UID: ${grantModal.user.uid || "-"} • Phone: ${
                grantModal.user.phoneNumber || "-"
              }`
            : ""
        }
        onClose={() =>
          setGrantModal({
            open: false,
            user: null,
            amount: "",
            note: "Trial bonus",
          })
        }
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() =>
                setGrantModal({
                  open: false,
                  user: null,
                  amount: "",
                  note: "Trial bonus",
                })
              }
              className={neutralButtonClass}
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                const userId =
                  grantModal.user?.userId || grantModal.user?._id || null;
                if (!userId) return;

                await grantTrial(userId, grantModal.amount, grantModal.note);

                setGrantModal({
                  open: false,
                  user: null,
                  amount: "",
                  note: "Trial bonus",
                });
              }}
              className={primaryButtonClass}
            >
              Grant
            </button>
          </div>
        }
      >
        <div className="grid gap-3">
          <div>
            <div
              className={`text-xs ${
                theme === "dark" ? "text-white/60" : "text-gray-500"
              }`}
            >
              Amount
            </div>
            <input
              value={grantModal.amount}
              onChange={(e) =>
                setGrantModal((p) => ({ ...p, amount: e.target.value }))
              }
              placeholder="e.g. 300"
              className={`mt-1 ${inputClass}`}
            />
          </div>

          <div>
            <div
              className={`text-xs ${
                theme === "dark" ? "text-white/60" : "text-gray-500"
              }`}
            >
              Note
            </div>
            <input
              value={grantModal.note}
              onChange={(e) =>
                setGrantModal((p) => ({ ...p, note: e.target.value }))
              }
              placeholder="Trial bonus"
              className={`mt-1 ${inputClass}`}
            />
          </div>

          <div
            className={`rounded-2xl px-4 py-3 text-xs ${
              theme === "dark"
                ? "border border-white/10 bg-white/5 text-white/60"
                : "border border-gray-200 bg-gray-50 text-gray-600"
            }`}
          >
            Backend prevents granting trial twice for the same user.
          </div>
        </div>
      </Modal>

      <Modal
        open={revokeModal.open}
        title="Revoke Trial Bonus"
        subtitle={
          revokeModal.user
            ? `UID: ${revokeModal.user.uid || "-"} • Phone: ${
                revokeModal.user.phoneNumber || "-"
              }`
            : ""
        }
        onClose={() =>
          setRevokeModal({
            open: false,
            user: null,
            note: "Admin revoked trial bonus",
          })
        }
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() =>
                setRevokeModal({
                  open: false,
                  user: null,
                  note: "Admin revoked trial bonus",
                })
              }
              className={neutralButtonClass}
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                const userId =
                  revokeModal.user?.userId || revokeModal.user?._id || null;
                if (!userId) return;

                await revokeTrial(userId, revokeModal.note);

                setRevokeModal({
                  open: false,
                  user: null,
                  note: "Admin revoked trial bonus",
                });
              }}
              className={primaryButtonClass}
            >
              Revoke Remaining
            </button>
          </div>
        }
      >
        <div className="grid gap-3">
          <div
            className={`rounded-2xl px-4 py-3 text-xs ${
              theme === "dark"
                ? "border border-white/10 bg-white/5 text-white/70"
                : "border border-gray-200 bg-gray-50 text-gray-700"
            }`}
          >
            This revokes only the remaining trial credit and does not touch earned balance.
          </div>

          <div>
            <div
              className={`text-xs ${
                theme === "dark" ? "text-white/60" : "text-gray-500"
              }`}
            >
              Note
            </div>
            <input
              value={revokeModal.note}
              onChange={(e) =>
                setRevokeModal((p) => ({ ...p, note: e.target.value }))
              }
              className={`mt-1 ${inputClass}`}
            />
          </div>
        </div>
      </Modal>
    </Shell>
  );
}