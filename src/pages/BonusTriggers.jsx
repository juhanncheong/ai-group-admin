import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Shell from "../components/Shell";
import { toast } from "react-toastify";
import { useTheme } from "../context/ThemeContext";

const API =
  import.meta.env.VITE_API_URL || "https://slimy-xenia-jayjay122-018fd7f8.koyeb.app";

function money(n) {
  const num = Number(n || 0);
  if (Number.isNaN(num)) return "0";
  return num.toFixed(0);
}

function ConfirmModal({
  open,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  busy = false,
  onClose,
  onConfirm,
}) {
  const { theme } = useTheme();

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[998] bg-black/50" onClick={onClose} />
      <div className="fixed inset-0 z-[999] flex items-center justify-center px-4">
        <div
          className={`w-full max-w-md rounded-2xl shadow-2xl ${
            theme === "dark"
              ? "border border-white/10 bg-[#0B1220]"
              : "border border-gray-200 bg-white"
          }`}
        >
          <div
            className={`px-5 py-4 ${
              theme === "dark" ? "border-b border-white/10" : "border-b border-gray-200"
            }`}
          >
            <div className={`text-sm font-semibold ${theme === "dark" ? "text-white/90" : "text-gray-900"}`}>
              {title}
            </div>
            <div className={`mt-1 text-xs ${theme === "dark" ? "text-white/50" : "text-gray-500"}`}>
              {message}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 px-5 py-4">
            <button
              onClick={onClose}
              disabled={busy}
              className={`rounded-xl px-4 py-2 text-xs disabled:opacity-50 ${
                theme === "dark"
                  ? "border border-white/10 bg-[#121B2D] text-white/70 hover:bg-[#182645]"
                  : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {cancelText}
            </button>

            <button
              onClick={onConfirm}
              disabled={busy}
              className={`rounded-xl px-4 py-2 text-xs disabled:opacity-50 ${
                theme === "dark"
                  ? "border border-white/10 bg-white/10 text-white/85 hover:bg-white/15"
                  : "border border-gray-900 bg-gray-900 text-white hover:bg-gray-800"
              }`}
            >
              {busy ? "Processing..." : confirmText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function BonusTriggersPage() {
  const [params] = useSearchParams();
  const { theme } = useTheme();

  const mutedText = theme === "dark" ? "text-white/50" : "text-gray-500";
  const softText = theme === "dark" ? "text-white/70" : "text-gray-600";
  const strongText = theme === "dark" ? "text-white" : "text-gray-900";

  const cardClass =
    theme === "dark"
      ? "rounded-2xl border border-white/10 bg-white/5 p-5"
      : "rounded-2xl border border-gray-200 bg-white p-5 shadow-sm";

  const inputClass =
    theme === "dark"
      ? "mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/90 outline-none focus:border-white/20"
      : "mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-gray-400";

  const selectClass =
    theme === "dark"
      ? "mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/90 outline-none hover:bg-white/10"
      : "mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 outline-none hover:bg-gray-50";

  const buttonClass =
    theme === "dark"
      ? "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/75 hover:bg-white/10"
      : "rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 hover:bg-gray-50";

  const primaryButtonClass =
    theme === "dark"
      ? "rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-xs text-white/85 hover:bg-white/15"
      : "rounded-xl border border-gray-900 bg-gray-900 px-4 py-2 text-xs text-white hover:bg-gray-800";

  const drawerClass =
    theme === "dark"
      ? "fixed right-0 top-0 z-[999] h-full w-full max-w-md border-l border-white/10 bg-[#0B1220] shadow-2xl"
      : "fixed right-0 top-0 z-[999] h-full w-full max-w-md border-l border-gray-200 bg-white shadow-2xl";

  const [uid, setUid] = useState("");
  const [triggerCount, setTriggerCount] = useState("");
  const [useCustomCommissionRate, setUseCustomCommissionRate] = useState(false);
  const [customCommissionRate, setCustomCommissionRate] = useState("");
  const [currentOrder, setCurrentOrder] = useState(0);

  const [poolOrders, setPoolOrders] = useState([]);
  const [poolOrderId, setPoolOrderId] = useState("");
  const [selectedPoolOrder, setSelectedPoolOrder] = useState(null);

  const [busy, setBusy] = useState(false);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const [bonusList, setBonusList] = useState([]);
  const [listBusy, setListBusy] = useState(false);

  const [confirmModal, setConfirmModal] = useState({
    open: false,
    type: null,
    ruleId: null,
    busy: false,
  });

  useEffect(() => {
    const qUid = params.get("uid") || params.get("userId");
    const qCurrentOrder = params.get("currentOrder");

    if (qUid) setUid(qUid);

    if (qCurrentOrder !== null) {
      const parsed = Number(qCurrentOrder);
      setCurrentOrder(Number.isFinite(parsed) ? parsed : 0);
    } else {
      setCurrentOrder(0);
    }
  }, [params]);

  async function fetchPoolOrders() {
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API}/api/admin/orders/pool/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) setPoolOrders(data.orders || []);
    } catch (e) {
      console.error("fetchPoolOrders error:", e);
    }
  }

  async function fetchBonusList(uId) {
    if (!uId) {
      setBonusList([]);
      return;
    }

    try {
      setListBusy(true);

      const token = localStorage.getItem("admin_token");

      const res = await fetch(`${API}/api/admin/orders/bonus/user/${uId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to fetch bonus list");
      }

      setBonusList(data?.rules || []);
    } catch (err) {
      console.error("fetchBonusList error:", err);
      setBonusList([]);
      toast.error(err.message || "Failed to fetch bonus list");
    } finally {
      setListBusy(false);
    }
  }

  useEffect(() => {
    fetchPoolOrders();
  }, []);

  useEffect(() => {
    if (uid) fetchBonusList(uid);
  }, [uid]);

  const filteredOrders = useMemo(() => {
    let list = [...poolOrders].filter((o) => o.isActive);

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((o) => {
        const name = String(o.orderName || "").toLowerCase();
        const num = String(o.orderNumber || "").toLowerCase();
        return name.includes(q) || num.includes(q);
      });
    }

    const min = minPrice === "" ? null : Number(minPrice);
    const max = maxPrice === "" ? null : Number(maxPrice);

    if (min !== null && !Number.isNaN(min)) {
      list = list.filter((o) => Number(o.price || 0) >= min);
    }
    if (max !== null && !Number.isNaN(max)) {
      list = list.filter((o) => Number(o.price || 0) <= max);
    }

    list.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    return list;
  }, [poolOrders, search, minPrice, maxPrice]);

  const visibleOrders = useMemo(() => {
    return filteredOrders.slice(0, 100);
  }, [filteredOrders]);

  function openPicker() {
    setPickerOpen(true);
  }

  function closePicker() {
    setPickerOpen(false);
  }

  function chooseOrder(order) {
    setPoolOrderId(order._id);
    setSelectedPoolOrder(order);
    closePicker();
  }

  async function saveBonus(e) {
    e.preventDefault();

    if (!uid || !triggerCount || !poolOrderId) {
      toast.error("Please fill in all fields.");
      return;
    }

    if (useCustomCommissionRate) {
      const rate = Number(customCommissionRate);
      if (!Number.isFinite(rate) || rate < 0) {
        toast.error("Please enter a valid custom commission rate.");
        return;
      }
    }

    setBusy(true);
    try {
      const token = localStorage.getItem("admin_token");

      const res = await fetch(`${API}/api/admin/orders/bonus/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          uid,
          triggerCount: Number(triggerCount),
          poolOrderId,
          useCustomCommissionRate,
          customCommissionRate: useCustomCommissionRate
            ? Number(customCommissionRate)
            : null,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        toast.success("Bonus trigger saved");
        setTriggerCount("");
        setPoolOrderId("");
        setSelectedPoolOrder(null);
        setUseCustomCommissionRate(false);
        setCustomCommissionRate("");
        fetchBonusList(uid);
      } else {
        toast.error(data.message || "Failed to save bonus trigger");
      }
    } catch (e) {
      console.error("saveBonus error:", e);
      toast.error("Server error saving bonus trigger.");
    } finally {
      setBusy(false);
    }
  }

  function openDisableModal(ruleId) {
    setConfirmModal({
      open: true,
      type: "disable",
      ruleId,
      busy: false,
    });
  }

  function openDeleteModal(ruleId) {
    setConfirmModal({
      open: true,
      type: "delete",
      ruleId,
      busy: false,
    });
  }

  function closeConfirmModal() {
    if (confirmModal.busy) return;
    setConfirmModal({
      open: false,
      type: null,
      ruleId: null,
      busy: false,
    });
  }

  async function disableBonusRuleItem(ruleId) {
    try {
      setConfirmModal((prev) => ({ ...prev, busy: true }));

      const token = localStorage.getItem("admin_token");

      const res = await fetch(`${API}/api/admin/orders/bonus/${ruleId}/disable`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to disable bonus rule");
      }

      toast.success("Bonus rule disabled");
      closeConfirmModal();
      fetchBonusList(uid);
    } catch (err) {
      console.error("disableBonusRuleItem error:", err);
      toast.error(err.message || "Failed to disable bonus rule");
      setConfirmModal((prev) => ({ ...prev, busy: false }));
    }
  }

  async function deleteBonusRuleItem(ruleId) {
    try {
      setConfirmModal((prev) => ({ ...prev, busy: true }));

      const token = localStorage.getItem("admin_token");

      const res = await fetch(`${API}/api/admin/orders/bonus/${ruleId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to delete bonus rule");
      }

      toast.success("Bonus rule deleted");
      closeConfirmModal();
      fetchBonusList(uid);
    } catch (err) {
      console.error("deleteBonusRuleItem error:", err);
      toast.error(err.message || "Failed to delete bonus rule");
      setConfirmModal((prev) => ({ ...prev, busy: false }));
    }
  }

  async function handleConfirmAction() {
    if (!confirmModal.ruleId) return;

    if (confirmModal.type === "disable") {
      await disableBonusRuleItem(confirmModal.ruleId);
      return;
    }

    if (confirmModal.type === "delete") {
      await deleteBonusRuleItem(confirmModal.ruleId);
    }
  }

  function getRealStatus(b) {
    if (!b?.isActive) return "INACTIVE";

    const s = String(b?.status || "").toLowerCase();
    if (s === "pending") return "PENDING";
    if (s === "completed") return "COMPLETED";

    return "ACTIVE";
  }

  function badgeClasses(statusText) {
    if (theme === "dark") {
      return "bg-white/10 border-white/10 text-white/80";
    }
    return "bg-gray-100 border-gray-300 text-gray-700";
  }

  return (
    <Shell title="Bonus Order Trigger Settings">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 items-start">
        <div className={cardClass}>
          <div className={`text-sm font-semibold ${strongText}`}>Assign Bonus Trigger</div>
          <div className={`mt-1 text-xs ${mutedText}`}>
            Coming from “More Modal” will auto-fill UID, but you can edit it.
          </div>

          <form onSubmit={saveBonus} className="mt-4 space-y-3">
            <div>
              <div className={`text-xs ${softText}`}>UID</div>
              <input
                value={uid}
                onChange={(e) => setUid(e.target.value)}
                placeholder="Paste UID here..."
                className={inputClass}
                required
              />
            </div>

            <div
              className={`mt-3 rounded-xl px-3 py-3 text-xs ${
                theme === "dark"
                  ? "border border-white/10 bg-white/5 text-white/80"
                  : "border border-gray-200 bg-gray-50 text-gray-800"
              }`}
            >
              <span className={softText}>User current order:</span>{" "}
              <span className={`font-semibold ${strongText}`}>{currentOrder}</span>
            </div>

            <div>
              <div className={`text-xs ${softText}`}>Trigger Order Count</div>
              <input
                value={triggerCount}
                onChange={(e) => setTriggerCount(e.target.value)}
                type="number"
                min="1"
                className={inputClass}
                required
              />
            </div>

            <div>
              <div className={`text-xs ${softText}`}>Select Pool Order</div>

              <button
                type="button"
                onClick={openPicker}
                className={`mt-2 w-full rounded-xl border px-3 py-2 text-left text-xs ${
                  theme === "dark"
                    ? "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                    : "border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
                }`}
              >
                {selectedPoolOrder ? (
                  <div className="flex items-center justify-between gap-2">
                    <div className={`font-semibold ${strongText}`}>
                      {selectedPoolOrder.orderName}{" "}
                      <span className={mutedText}>({selectedPoolOrder.orderNumber})</span>
                    </div>
                    <div className={mutedText}>
                      Price: {money(selectedPoolOrder.price)}
                    </div>
                  </div>
                ) : (
                  "Click to choose an order..."
                )}
              </button>

              <input value={poolOrderId} readOnly className="hidden" required />
            </div>

            <div
              className={`rounded-xl p-3 ${
                theme === "dark"
                  ? "border border-white/10 bg-white/5"
                  : "border border-gray-200 bg-gray-50"
              }`}
            >
              <label className={`flex items-center gap-2 text-xs ${theme === "dark" ? "text-white/80" : "text-gray-800"}`}>
                <input
                  type="checkbox"
                  checked={useCustomCommissionRate}
                  onChange={(e) => {
                    setUseCustomCommissionRate(e.target.checked);
                    if (!e.target.checked) setCustomCommissionRate("");
                  }}
                />
                Override default bonus commission %
              </label>

              {useCustomCommissionRate && (
                <div className="mt-3">
                  <div className={`text-xs ${softText}`}>Custom Commission Rate</div>

                  <input
                    value={customCommissionRate}
                    onChange={(e) => setCustomCommissionRate(e.target.value)}
                    type="number"
                    step="0.0001"
                    min="0"
                    placeholder="Example: 0.10 = 10%"
                    className={inputClass}
                  />

                  <div className="mt-2 flex flex-wrap gap-2">
                    {[
                      { label: "10%", value: "0.10" },
                      { label: "15%", value: "0.15" },
                      { label: "20%", value: "0.20" },
                    ].map((pill) => (
                      <button
                        key={pill.value}
                        type="button"
                        onClick={() => {
                          setUseCustomCommissionRate(true);
                          setCustomCommissionRate(pill.value);
                        }}
                        className={`rounded-full border px-3 py-1 text-[11px] transition ${
                          String(customCommissionRate) === pill.value
                            ? theme === "dark"
                              ? "border-white/20 bg-white/10 text-white/90"
                              : "border-gray-400 bg-gray-200 text-gray-900"
                            : theme === "dark"
                            ? "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {pill.label}
                      </button>
                    ))}
                  </div>

                  <div className={`mt-2 text-[11px] ${mutedText}`}>
                    Stored as decimal. Example: 0.10 = 10%
                  </div>
                </div>
              )}
            </div>

            <button
              disabled={busy}
              className={`${primaryButtonClass} disabled:opacity-50`}
            >
              {busy ? "Saving..." : "Save Bonus Trigger"}
            </button>
          </form>
        </div>

        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-sm font-semibold ${strongText}`}>Saved Bonus Orders</div>
              <div className={`mt-1 text-xs ${mutedText}`}>
                Shows whether user has triggered it, or if it’s pending/completed.
              </div>
            </div>

            <button
              onClick={() => fetchBonusList(uid)}
              className={buttonClass}
            >
              Refresh
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {listBusy && (
              <div
                className={`rounded-xl px-3 py-3 text-xs ${
                  theme === "dark"
                    ? "border border-white/10 bg-white/5 text-white/60"
                    : "border border-gray-200 bg-gray-50 text-gray-600"
                }`}
              >
                Loading bonus list...
              </div>
            )}

            {!listBusy && bonusList.length === 0 && (
              <div
                className={`rounded-xl px-3 py-3 text-xs ${
                  theme === "dark"
                    ? "border border-white/10 bg-white/5 text-white/60"
                    : "border border-gray-200 bg-gray-50 text-gray-600"
                }`}
              >
                No bonus triggers saved for this user.
              </div>
            )}

            {!listBusy &&
              bonusList.map((b) => {
                const realStatus = getRealStatus(b);

                return (
                  <div
                    key={b._id}
                    className={`flex items-center justify-between gap-3 rounded-xl px-3 py-3 ${
                      theme === "dark"
                        ? "border border-white/10 bg-white/5"
                        : "border border-gray-200 bg-gray-50"
                    }`}
                  >
                    <div>
                      <div className={`text-xs font-semibold ${strongText}`}>
                        {b.poolOrder?.orderName || "Unknown order"}{" "}
                        <span className={mutedText}>
                          ({b.poolOrder?.orderNumber || "?"})
                        </span>
                      </div>

                      <div className={`mt-1 flex flex-wrap items-center gap-2 text-[11px] ${mutedText}`}>
                        <span>Trigger at: {b.triggerCount}</span>
                        <span>•</span>
                        <span>Price: {money(b.poolOrder?.price)}</span>
                        <span>•</span>
                        <span>
                          Commission:{" "}
                          <span className={theme === "dark" ? "text-white/80" : "text-gray-900"}>
                            {Number(b.finalCommissionRate || 0) * 100}%
                          </span>{" "}
                          <span className={mutedText}>
                            ({b.commissionSource === "CUSTOM" ? "Custom" : "Global"})
                          </span>
                        </span>
                        <span>•</span>
                        <span>
                          Rule:{" "}
                          <span className={theme === "dark" ? "text-white/80" : "text-gray-900"}>
                            {b.isActive ? "ON" : "OFF"}
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 text-[11px] ${badgeClasses(
                          realStatus
                        )}`}
                      >
                        {realStatus}
                      </span>

                      {b.isActive && (
                        <button
                          onClick={() => openDisableModal(b._id)}
                          className={buttonClass}
                        >
                          Disable
                        </button>
                      )}

                      <button
                        onClick={() => openDeleteModal(b._id)}
                        className={buttonClass}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {pickerOpen && (
        <>
          <div className="fixed inset-0 z-[998] bg-black/50" onClick={closePicker} />

          <div className={theme === "dark"
            ? "fixed right-0 top-0 z-[999] h-full w-full max-w-md border-l border-white/10 bg-[#0B1220] shadow-2xl"
            : "fixed right-0 top-0 z-[999] h-full w-full max-w-md border-l border-gray-200 bg-white shadow-2xl"}>
            <div className="flex h-full flex-col">
              <div className={`flex items-start justify-between gap-3 p-5 ${
                theme === "dark" ? "border-b border-white/10" : "border-b border-gray-200"
              }`}>
                <div>
                  <div className={`text-sm font-semibold ${strongText}`}>Select Bonus Order</div>
                  <div className={`mt-1 text-xs ${mutedText}`}>
                    Filter by price range + search. Only active pool orders are shown.
                  </div>
                </div>

                <button
                  onClick={closePicker}
                  className={buttonClass}
                >
                  ✕
                </button>
              </div>

              <div className={`p-5 ${
                theme === "dark" ? "border-b border-white/10" : "border-b border-gray-200"
              }`}>
                <div className="space-y-2">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name / number..."
                    className={
                      theme === "dark"
                        ? "w-full rounded-xl border border-white/10 bg-[#121B2D] px-3 py-2 text-xs text-white/90 outline-none focus:border-white/20"
                        : "w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-900 outline-none focus:border-gray-400"
                    }
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <input
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    placeholder="Min price"
                    type="text"
                    inputMode="numeric"
                      className={
                        theme === "dark"
                          ? "w-full rounded-xl border border-white/10 bg-[#121B2D] px-3 py-2 text-xs text-white/90 outline-none focus:border-white/20"
                          : "w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-900 outline-none focus:border-gray-400"
                      }
                    />
                    <input
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="Max price"
                    type="text"
                    inputMode="numeric"
                      className={
                        theme === "dark"
                          ? "w-full rounded-xl border border-white/10 bg-[#121B2D] px-3 py-2 text-xs text-white/90 outline-none focus:border-white/20"
                          : "w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-900 outline-none focus:border-gray-400"
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="bonus-drawer-scroll flex-1 overflow-auto space-y-2 p-5">
                {filteredOrders.length > 100 && (
                  <div className={`rounded-xl px-3 py-3 text-xs ${
                    theme === "dark"
                      ? "border border-white/10 bg-[#121B2D] text-white/60"
                      : "border border-gray-200 bg-gray-50 text-gray-600"
                  }`}>
                    Showing first 100 of {filteredOrders.length} matching orders. Use search or price range to narrow results.
                  </div>
                )}
                {filteredOrders.length === 0 && (
                  <div
                    className={`rounded-xl px-3 py-3 text-xs ${
                      theme === "dark"
                        ? "border border-white/10 bg-[#121B2D] text-white/60"
                        : "border border-gray-200 bg-gray-50 text-gray-600"
                    }`}
                  >
                    No matching orders.
                  </div>
                )}

                {visibleOrders.map((o) => (
                  <button
                    key={o._id}
                    onClick={() => chooseOrder(o)}
                    className={`w-full rounded-xl border px-3 py-3 text-left ${
                      theme === "dark"
                        ? "border-white/10 bg-[#121B2D] hover:bg-[#182645]"
                        : "border-gray-200 bg-gray-50 hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className={`text-xs font-semibold ${strongText}`}>
                        {o.orderName} <span className={mutedText}>({o.orderNumber})</span>
                      </div>
                      <div className={`text-xs ${mutedText}`}>Price: {money(o.price)}</div>
                    </div>
                  </button>
                ))}
              </div>

              <div className={`p-5 ${
                theme === "dark" ? "border-t border-white/10" : "border-t border-gray-200"
              }`}>
                <div className="flex justify-end">
                  <button
                    onClick={closePicker}
                    className={buttonClass}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <ConfirmModal
        open={confirmModal.open}
        title={confirmModal.type === "delete" ? "Delete Bonus Rule" : "Disable Bonus Rule"}
        message={
          confirmModal.type === "delete"
            ? "This will permanently delete this bonus rule."
            : "This will turn off this bonus rule so it can no longer trigger."
        }
        confirmText={confirmModal.type === "delete" ? "Delete" : "Disable"}
        busy={confirmModal.busy}
        onClose={closeConfirmModal}
        onConfirm={handleConfirmAction}
      />
    </Shell>
  );
}