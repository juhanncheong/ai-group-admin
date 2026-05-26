import { useEffect, useMemo, useState } from "react";
import Shell from "../components/Shell";
import { toast } from "react-toastify";
import { useTheme } from "../context/ThemeContext";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "https://slimy-xenia-jayjay122-018fd7f8.koyeb.app";

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

function getStatusClass(theme, status) {
  if (status === "reserved") {
    return theme === "dark"
      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "cancelled") {
    return theme === "dark"
      ? "border-red-400/20 bg-red-500/10 text-red-200"
      : "border-red-200 bg-red-50 text-red-700";
  }

  return theme === "dark"
    ? "border-blue-400/20 bg-blue-500/10 text-blue-200"
    : "border-blue-200 bg-blue-50 text-blue-700";
}

export default function TargetedBonusOffers() {
  const { theme } = useTheme();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const [confirmModal, setConfirmModal] = useState({
    open: false,
    type: "",
    title: "",
    message: "",
    confirmText: "",
    confirmStyle: "danger",
    offer: null,
  });

  const [filterUid, setFilterUid] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [form, setForm] = useState({
    uid: "",
    title: "",
    description: "",
    options: [
      {
        depositAmount: "",
        bonusAmount: "",
        isFull: false,
      },
    ],
  });

  const isDark = theme === "dark";

  const mutedText = isDark ? "text-white/50" : "text-gray-500";
  const softText = isDark ? "text-white/70" : "text-gray-600";
  const strongText = isDark ? "text-white" : "text-gray-900";

  const cardClass = isDark
    ? "rounded-2xl border border-white/10 bg-white/5"
    : "rounded-2xl border border-gray-200 bg-white shadow-sm";

  const inputClass = isDark
    ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/90 placeholder:text-white/30 outline-none focus:border-white/20"
    : "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-400";

  const textareaClass = isDark
    ? "min-h-[90px] w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/90 placeholder:text-white/30 outline-none focus:border-white/20"
    : "min-h-[90px] w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-400";

  const selectClass = isDark
    ? "appearance-none rounded-xl border border-white/10 bg-[#111827] px-3 py-2 text-xs text-white outline-none hover:bg-[#182236]"
    : "appearance-none rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 outline-none hover:bg-gray-50";

  const optionClass = isDark
    ? "bg-[#111827] text-white"
    : "bg-white text-gray-900";

  const buttonClass = isDark
    ? "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 hover:bg-white/10 disabled:opacity-50"
    : "rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50";

  const primaryButtonClass = isDark
    ? "rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/15 disabled:opacity-50"
    : "rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50";

  const dangerButtonClass = isDark
    ? "rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-100 hover:bg-red-500/15 disabled:opacity-50"
    : "rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50";

  const tableWrapClass = isDark
    ? "overflow-hidden rounded-2xl border border-white/10"
    : "overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm";

  const tableHeaderBarClass = isDark
    ? "bg-white/5 px-4 py-3 text-sm font-semibold text-white"
    : "bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900";

  const tableHeadClass = isDark
    ? "bg-white/5 text-xs text-white/60"
    : "bg-gray-50 text-xs text-gray-500";

  const tableBodyClass = isDark
    ? "divide-y divide-white/10"
    : "divide-y divide-gray-200";

  const tableRowClass = isDark ? "hover:bg-white/5" : "hover:bg-gray-50";

  const footerBarClass = isDark
    ? "flex flex-col gap-3 border-t border-white/10 bg-white/5 px-4 py-3 md:flex-row md:items-center md:justify-between"
    : "flex flex-col gap-3 border-t border-gray-200 bg-gray-50 px-4 py-3 md:flex-row md:items-center md:justify-between";

  const modalOverlayClass = `fixed inset-0 z-50 flex items-center justify-center overflow-y-auto px-4 py-6 ${
    isDark ? "bg-black/45" : "bg-slate-950/25"
  } backdrop-blur-xl`;

  const modalGlowClass = `pointer-events-none absolute inset-x-0 top-0 mx-auto h-56 max-w-3xl rounded-full blur-3xl ${
    isDark ? "bg-white/10" : "bg-slate-900/10"
  }`;

  function getAuthHeaders() {
    const token = localStorage.getItem("admin_token");
    if (!token) return null;

    return {
      Authorization: `Bearer ${token}`,
    };
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

    if (!res.ok || data?.ok === false) {
      throw new Error(data?.message || `Request failed (${res.status})`);
    }

    return data;
  }

  const cleanOptions = useMemo(() => {
    return form.options.map((item) => ({
      depositAmount: Number(item.depositAmount),
      bonusAmount: Number(item.bonusAmount),
      isFull: Boolean(item.isFull),
    }));
  }, [form.options]);

  function resetCreateForm() {
    setForm({
      uid: "",
      title: "",
      description: "",
      options: [
        {
          depositAmount: "",
          bonusAmount: "",
          isFull: false,
        },
      ],
    });
  }

  function openCreateModal() {
    resetCreateForm();
    setCreateModalOpen(true);
  }

  function closeCreateModal() {
    if (creating) return;
    setCreateModalOpen(false);
  }

  function updateOption(index, key, value) {
    setForm((prev) => {
      const nextOptions = [...prev.options];

      nextOptions[index] = {
        ...nextOptions[index],
        [key]: value,
      };

      return {
        ...prev,
        options: nextOptions,
      };
    });
  }

  function addOption() {
    setForm((prev) => ({
      ...prev,
      options: [
        ...prev.options,
        {
          depositAmount: "",
          bonusAmount: "",
          isFull: false,
        },
      ],
    }));
  }

  function removeOption(index) {
    setForm((prev) => {
      if (prev.options.length <= 1) {
        toast.error("At least one option is required");
        return prev;
      }

      return {
        ...prev,
        options: prev.options.filter((_, i) => i !== index),
      };
    });
  }

  async function loadOffers(nextPage = page) {
    setLoading(true);

    try {
      const params = new URLSearchParams();
      params.set("page", String(nextPage));
      params.set("limit", String(limit));

      const uid = String(filterUid || "").trim();
      if (uid) params.set("uid", uid);

      if (filterStatus) params.set("status", filterStatus);

      const data = await fetchJSON(
        `${API_BASE}/api/admin/targeted-bonus-offers?${params.toString()}`
      );

      setRows(Array.isArray(data.rows) ? data.rows : []);

      setPagination(
        data.pagination || {
          page: nextPage,
          limit,
          total: 0,
          totalPages: 1,
        }
      );
    } catch (err) {
      toast.error(err.message || "Failed to load targeted bonus offers");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function submitCreateOffer(e) {
    e.preventDefault();

    const uid = String(form.uid || "").trim();
    const title = String(form.title || "").trim();
    const description = String(form.description || "").trim();

    if (!uid) {
      toast.error("UID is required");
      return;
    }

    if (!title) {
      toast.error("Title is required");
      return;
    }

    if (!description) {
      toast.error("Description is required");
      return;
    }

    for (const option of cleanOptions) {
      if (!Number.isFinite(option.depositAmount) || option.depositAmount <= 0) {
        toast.error("Each deposit amount must be more than 0");
        return;
      }

      if (!Number.isFinite(option.bonusAmount) || option.bonusAmount < 0) {
        toast.error("Each bonus amount must be 0 or more");
        return;
      }
    }

    setCreating(true);

    try {
      await fetchJSON(
        `${API_BASE}/api/admin/users/${encodeURIComponent(
          uid
        )}/targeted-bonus-offers`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title,
            description,
            options: cleanOptions,
          }),
        }
      );

      toast.success("Targeted bonus offer created");

      resetCreateForm();
      setCreateModalOpen(false);

      setPage(1);
      await loadOffers(1);
    } catch (err) {
      toast.error(err.message || "Failed to create offer");
    } finally {
      setCreating(false);
    }
  }

  function openConfirmModal({
    type,
    title,
    message,
    confirmText,
    confirmStyle = "danger",
    offer,
  }) {
    setConfirmModal({
      open: true,
      type,
      title,
      message,
      confirmText,
      confirmStyle,
      offer,
    });
  }

  function closeConfirmModal(force = false) {
    if (busyId && !force) return;

    setConfirmModal({
      open: false,
      type: "",
      title: "",
      message: "",
      confirmText: "",
      confirmStyle: "danger",
      offer: null,
    });
  }

  async function handleConfirmAction() {
    const offer = confirmModal.offer;
    if (!offer?._id) return;

    if (confirmModal.type === "delete") {
      await runDeleteOffer(offer);
      return;
    }

    if (confirmModal.type === "reset") {
      await runResetSelectedOffer(offer);
      return;
    }

    if (confirmModal.type === "cancel") {
      await runCancelOffer(offer);
    }
  }

  function deleteOffer(offer) {
    if (!offer?._id) return;

    openConfirmModal({
      type: "delete",
      title: "Delete targeted bonus offer?",
      message:
        "This will permanently delete the offer from the database. This action cannot be undone.",
      confirmText: "Delete Offer",
      confirmStyle: "danger",
      offer,
    });
  }

  async function runDeleteOffer(offer) {
    setBusyId(offer._id);

    try {
      await fetchJSON(
        `${API_BASE}/api/admin/targeted-bonus-offers/${offer._id}`,
        {
          method: "DELETE",
        }
      );

      toast.success("Offer deleted");
      closeConfirmModal(true);
      await loadOffers(page);
    } catch (err) {
      toast.error(err.message || "Failed to delete offer");
    } finally {
      setBusyId(null);
    }
  }

  function resetSelectedOffer(offer) {
    if (!offer?._id) return;

    openConfirmModal({
      type: "reset",
      title: "Reset selected choice?",
      message:
        "This will remove the user's locked selection. The user will be able to open the event and select again.",
      confirmText: "Reset Selection",
      confirmStyle: "primary",
      offer,
    });
  }

  async function runResetSelectedOffer(offer) {
    setBusyId(offer._id);

    try {
      await fetchJSON(
        `${API_BASE}/api/admin/targeted-bonus-offers/${offer._id}/reset-selection`,
        {
          method: "PATCH",
        }
      );

      toast.success("Selected choice removed. User can select again.");
      closeConfirmModal(true);
      await loadOffers(page);
    } catch (err) {
      toast.error(err.message || "Failed to reset selected choice");
    } finally {
      setBusyId(null);
    }
  }

  function cancelOffer(offer) {
    if (!offer?._id) return;

    openConfirmModal({
      type: "cancel",
      title: "Cancel targeted bonus offer?",
      message:
        "This will cancel the active offer. The user will no longer be able to reserve this bonus.",
      confirmText: "Cancel Offer",
      confirmStyle: "danger",
      offer,
    });
  }

  async function runCancelOffer(offer) {
    setBusyId(offer._id);

    try {
      await fetchJSON(
        `${API_BASE}/api/admin/targeted-bonus-offers/${offer._id}/cancel`,
        {
          method: "PATCH",
        }
      );

      toast.success("Offer cancelled");
      closeConfirmModal(true);
      await loadOffers(page);
    } catch (err) {
      toast.error(err.message || "Failed to cancel offer");
    } finally {
      setBusyId(null);
    }
  }

  function applyFilters() {
    setPage(1);
    loadOffers(1);
  }

  function resetFilters() {
    setFilterUid("");
    setFilterStatus("");
    setPage(1);

    setTimeout(() => {
      loadOffers(1);
    }, 0);
  }

  function goPrev() {
    const next = Math.max(1, page - 1);
    setPage(next);
    loadOffers(next);
  }

  function goNext() {
    const next = Math.min(pagination.totalPages || 1, page + 1);
    setPage(next);
    loadOffers(next);
  }

  useEffect(() => {
    loadOffers(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  return (
    <Shell title="Targeted Bonus Offers">
      <div className="space-y-4">
        <div className={`${cardClass} p-4`}>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className={`text-sm font-semibold ${strongText}`}>
                Offer Records
              </div>
              <div className={`mt-1 text-xs ${mutedText}`}>
                View created offers and user reserved selections.
              </div>
            </div>

            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <input
                value={filterUid}
                onChange={(e) => setFilterUid(e.target.value)}
                placeholder="Search UID"
                className={`${inputClass} md:w-[150px]`}
              />

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className={selectClass}
              >
                <option value="" className={optionClass}>
                  All status
                </option>
                <option value="active" className={optionClass}>
                  Active
                </option>
                <option value="reserved" className={optionClass}>
                  Reserved
                </option>
                <option value="cancelled" className={optionClass}>
                  Cancelled
                </option>
              </select>

              <button
                type="button"
                onClick={applyFilters}
                disabled={loading}
                className={primaryButtonClass}
              >
                Search
              </button>

              <button
                type="button"
                onClick={resetFilters}
                disabled={loading}
                className={buttonClass}
              >
                Reset
              </button>

              <button
                type="button"
                onClick={openCreateModal}
                className={primaryButtonClass}
              >
                + Create Offer
              </button>
            </div>
          </div>
        </div>

        <div className={tableWrapClass}>
          <div className={tableHeaderBarClass}>
            Targeted Bonus Offers ({pagination.total || 0})
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[1150px] text-left text-sm">
              <thead className={tableHeadClass}>
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Offer</th>
                  <th className="px-4 py-3">Options</th>
                  <th className="px-4 py-3">Selected</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>

              <tbody className={tableBodyClass}>
                {loading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <tr key={index} className={tableRowClass}>
                      {Array.from({ length: 7 }).map((__, col) => (
                        <td key={col} className="px-4 py-4">
                          <div
                            className={`h-3 animate-pulse rounded-full ${
                              isDark ? "bg-white/10" : "bg-gray-200"
                            }`}
                            style={{
                              width: col === 1 ? "180px" : "90px",
                            }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className={`px-4 py-10 text-center text-sm ${mutedText}`}
                    >
                      No targeted bonus offers found.
                    </td>
                  </tr>
                ) : (
                  rows.map((offer) => {
                    const user = offer.user || {};
                    const selected = offer.selectedOption || {};
                    const hasSelected =
                      Number(selected.depositAmount) > 0 ||
                      Number(selected.bonusAmount) > 0;

                    return (
                      <tr key={offer._id} className={tableRowClass}>
                        <td className="px-4 py-4 align-top">
                          <div className={`font-semibold ${strongText}`}>
                            UID {user.uid || "-"}
                          </div>
                          <div className={`mt-1 text-xs ${mutedText}`}>
                            {user.phoneNumber || "-"}
                          </div>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <div className={`font-semibold ${strongText}`}>
                            {offer.title || "-"}
                          </div>
                          <div
                            className={`mt-1 max-w-[260px] text-xs ${mutedText}`}
                          >
                            {offer.description || "-"}
                          </div>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <div className="flex flex-col gap-1">
                            {(offer.options || []).map((item, index) => (
                              <div
                                key={index}
                                className={`inline-flex w-fit items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] ${
                                  item.isFull
                                    ? isDark
                                      ? "border-white/10 bg-white/5 text-white/35"
                                      : "border-gray-200 bg-gray-100 text-gray-400"
                                    : isDark
                                    ? "border-white/10 bg-white/[0.04] text-white/75"
                                    : "border-gray-200 bg-gray-100 text-gray-700"
                                }`}
                              >
                                <span>
                                  Deposit {money(item.depositAmount)} → Bonus{" "}
                                  {money(item.bonusAmount)}
                                </span>

                                {item.isFull ? (
                                  <span
                                    className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                                      isDark
                                        ? "bg-white/10 text-white/50"
                                        : "bg-gray-200 text-gray-500"
                                    }`}
                                  >
                                    FULL
                                  </span>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </td>

                        <td className="px-4 py-4 align-top">
                          {hasSelected ? (
                            <div>
                              <div className={`font-semibold ${strongText}`}>
                                Deposit {money(selected.depositAmount)}
                              </div>
                              <div className={`mt-1 text-xs ${mutedText}`}>
                                Bonus {money(selected.bonusAmount)}
                              </div>
                              <div className={`mt-1 text-[11px] ${mutedText}`}>
                                {formatDate(offer.reservedAt)}
                              </div>
                            </div>
                          ) : (
                            <span className={mutedText}>Not selected</span>
                          )}
                        </td>

                        <td className="px-4 py-4 align-top">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${getStatusClass(
                              theme,
                              offer.status
                            )}`}
                          >
                            {offer.status || "active"}
                          </span>
                        </td>

                        <td
                          className={`px-4 py-4 align-top text-xs ${mutedText}`}
                        >
                          {formatDate(offer.createdAt)}
                        </td>

                        <td className="px-4 py-4 align-top">
                          <div className="flex flex-col gap-2">
                            {offer.status === "reserved" ||
                            offer.isReserved ? (
                              <button
                                type="button"
                                onClick={() => resetSelectedOffer(offer)}
                                disabled={busyId === offer._id}
                                className={primaryButtonClass}
                              >
                                {busyId === offer._id
                                  ? "Resetting..."
                                  : "Reset"}
                              </button>
                            ) : null}

                            <button
                              type="button"
                              onClick={() => deleteOffer(offer)}
                              disabled={busyId === offer._id}
                              className={dangerButtonClass}
                            >
                              {busyId === offer._id ? "Deleting..." : "Delete"}
                            </button>

                            {offer.status === "active" && !offer.isReserved ? (
                              <button
                                type="button"
                                onClick={() => cancelOffer(offer)}
                                disabled={busyId === offer._id}
                                className={buttonClass}
                              >
                                Cancel Offer
                              </button>
                            ) : null}
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
              Page {pagination.page || page} of {pagination.totalPages || 1}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={limit}
                onChange={(e) => {
                  setPage(1);
                  setLimit(Number(e.target.value));
                }}
                className={selectClass}
              >
                <option value={10} className={optionClass}>
                  10 / page
                </option>
                <option value={20} className={optionClass}>
                  20 / page
                </option>
                <option value={50} className={optionClass}>
                  50 / page
                </option>
              </select>

              <button
                type="button"
                onClick={goPrev}
                disabled={loading || page <= 1}
                className={buttonClass}
              >
                Previous
              </button>

              <button
                type="button"
                onClick={goNext}
                disabled={loading || page >= (pagination.totalPages || 1)}
                className={buttonClass}
              >
                Next
              </button>

              <button
                type="button"
                onClick={() => loadOffers(page)}
                disabled={loading}
                className={buttonClass}
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {createModalOpen ? (
        <div
          className={modalOverlayClass}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeCreateModal();
          }}
        >
          <div className={modalGlowClass} />

          <form
            onSubmit={submitCreateOffer}
            className={`relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border shadow-2xl ${
              isDark
                ? "border-white/10 bg-[#0b1220]/90"
                : "border-gray-200 bg-white"
            }`}
          >
            <div
              className={`flex items-start justify-between gap-3 px-5 py-4 ${
                isDark ? "border-b border-white/10" : "border-b border-gray-200"
              }`}
            >
              <div>
                <div
                  className={
                    isDark
                      ? "text-base font-semibold text-white"
                      : "text-base font-semibold text-gray-900"
                  }
                >
                  Create Offer
                </div>

                <div
                  className={
                    isDark
                      ? "mt-1 text-xs text-white/50"
                      : "mt-1 text-xs text-gray-500"
                  }
                >
                  Create a private deposit bonus offer by user UID.
                </div>
              </div>

              <button
                type="button"
                onClick={closeCreateModal}
                disabled={creating}
                className={
                  isDark
                    ? "rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white/70 hover:bg-white/10 disabled:opacity-50"
                    : "rounded-xl border border-gray-200 bg-white px-2.5 py-2 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                }
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <div className="space-y-3">
                <div>
                  <label
                    className={`mb-1 block text-xs font-semibold ${softText}`}
                  >
                    User UID
                  </label>
                  <input
                    value={form.uid}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        uid: e.target.value,
                      }))
                    }
                    placeholder="Example: 100004"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    className={`mb-1 block text-xs font-semibold ${softText}`}
                  >
                    Title
                  </label>
                  <input
                    value={form.title}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    placeholder="Anniversary Bonus Offer"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    className={`mb-1 block text-xs font-semibold ${softText}`}
                  >
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Choose one deposit amount and reserve your bonus."
                    className={textareaClass}
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <label className={`text-xs font-semibold ${softText}`}>
                      Deposit / Bonus Options
                    </label>

                    <button
                      type="button"
                      onClick={addOption}
                      className={buttonClass}
                    >
                      + Add
                    </button>
                  </div>

                  <div className="space-y-2">
                    {form.options.map((option, index) => (
                      <div
                        key={index}
                        className={`grid gap-2 rounded-2xl border p-3 md:grid-cols-[1fr_1fr_auto_auto] ${
                          isDark
                            ? "border-white/10 bg-white/5"
                            : "border-gray-200 bg-gray-50"
                        }`}
                      >
                        <input
                          type="number"
                          min="0"
                          value={option.depositAmount}
                          onChange={(e) =>
                            updateOption(index, "depositAmount", e.target.value)
                          }
                          placeholder="Deposit"
                          className={inputClass}
                        />

                        <input
                          type="number"
                          min="0"
                          value={option.bonusAmount}
                          onChange={(e) =>
                            updateOption(index, "bonusAmount", e.target.value)
                          }
                          placeholder="Bonus"
                          className={inputClass}
                        />

                        <label
                          className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs ${
                            isDark
                              ? "border-white/10 bg-white/5 text-white/70"
                              : "border-gray-200 bg-white text-gray-700"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(option.isFull)}
                            onChange={(e) =>
                              updateOption(index, "isFull", e.target.checked)
                            }
                          />
                          FULL
                        </label>

                        <button
                          type="button"
                          onClick={() => removeOption(index)}
                          className={dangerButtonClass}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className={`mt-2 text-[11px] ${mutedText}`}>
                    FULL options will be shown as gray and not selectable on
                    user side.
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`border-t px-5 py-4 ${
                isDark
                  ? "border-white/10 bg-white/5"
                  : "border-gray-200 bg-gray-50"
              }`}
            >
              <div className="flex flex-col gap-2 md:flex-row md:justify-end">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={creating}
                  className={buttonClass}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creating}
                  className={primaryButtonClass}
                >
                  {creating ? "Creating..." : "Create Targeted Bonus Offer"}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}

      {confirmModal.open ? (
        <div
          className={modalOverlayClass}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeConfirmModal();
          }}
        >
          <div className={modalGlowClass} />

          <div
            className={`relative z-10 w-full max-w-md overflow-hidden rounded-3xl border shadow-2xl ${
              isDark
                ? "border-white/10 bg-[#0b1220]/95"
                : "border-gray-200 bg-white"
            }`}
          >
            <div className="px-5 pt-5">
              <div
                className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border ${
                  confirmModal.confirmStyle === "danger"
                    ? isDark
                      ? "border-red-400/20 bg-red-500/10 text-red-200"
                      : "border-red-200 bg-red-50 text-red-600"
                    : isDark
                    ? "border-cyan-400/20 bg-cyan-500/10 text-cyan-100"
                    : "border-blue-200 bg-blue-50 text-blue-700"
                }`}
              >
                {confirmModal.confirmStyle === "danger" ? "!" : "↻"}
              </div>

              <div className="mt-4 text-center">
                <div
                  className={`text-base font-semibold ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  {confirmModal.title}
                </div>

                <div
                  className={`mx-auto mt-2 max-w-sm text-sm leading-6 ${
                    isDark ? "text-white/55" : "text-gray-500"
                  }`}
                >
                  {confirmModal.message}
                </div>
              </div>

              {confirmModal.offer ? (
                <div
                  className={`mt-5 rounded-2xl border p-3 ${
                    isDark
                      ? "border-white/10 bg-white/5"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <div className={`text-xs font-semibold ${strongText}`}>
                    {confirmModal.offer.title || "Targeted Bonus Offer"}
                  </div>

                  <div className={`mt-1 text-[11px] ${mutedText}`}>
                    UID {confirmModal.offer.user?.uid || "-"} · Status{" "}
                    {confirmModal.offer.status || "active"}
                  </div>
                </div>
              ) : null}
            </div>

            <div
              className={`mt-5 flex flex-col-reverse gap-2 border-t px-5 py-4 sm:flex-row sm:justify-end ${
                isDark ? "border-white/10 bg-white/5" : "border-gray-200 bg-gray-50"
              }`}
            >
              <button
                type="button"
                onClick={() => closeConfirmModal()}
                disabled={Boolean(busyId)}
                className={buttonClass}
              >
                Keep Offer
              </button>

              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={Boolean(busyId)}
                className={
                  confirmModal.confirmStyle === "danger"
                    ? dangerButtonClass
                    : primaryButtonClass
                }
              >
                {busyId ? "Processing..." : confirmModal.confirmText || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </Shell>
  );
}