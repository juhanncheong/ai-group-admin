import { useEffect, useMemo, useRef, useState } from "react";
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

function badgeClasses(statusText, theme) {
  if (theme === "dark") {
    return "bg-white/10 border-white/10 text-white/80";
  }
  return "bg-gray-100 border-gray-300 text-gray-700";
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
        className={`relative w-full max-w-lg overflow-hidden rounded-3xl shadow-2xl ${
          theme === "dark"
            ? "border border-white/10 bg-[#0b1220]/95"
            : "border border-gray-200 bg-white"
        }`}
      >
        <div
          className={`flex items-start justify-between gap-3 px-5 py-4 ${
            theme === "dark" ? "border-b border-white/10" : "border-b border-gray-200"
          }`}
        >
          <div>
            <div className={`text-base font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              {title}
            </div>
            {subtitle ? (
              <div className={`mt-1 text-xs ${theme === "dark" ? "text-white/50" : "text-gray-500"}`}>
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
        className={`flex h-10 w-full items-center justify-between gap-3 rounded-2xl border px-3 text-left text-xs font-medium shadow-sm outline-none transition disabled:cursor-not-allowed disabled:opacity-50 ${
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
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-medium transition ${
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

export default function AdminLuckyDrawPage() {
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
  const [rewardType, setRewardType] = useState("cash");
  const [cashAmount, setCashAmount] = useState("");
  const [title, setTitle] = useState("Diamond Mystery Gift");
  const [description, setDescription] = useState("Pick 1 diamond and win your reward");
  const [currentOrder, setCurrentOrder] = useState(0);

  const [poolOrders, setPoolOrders] = useState([]);
  const [poolOrderId, setPoolOrderId] = useState("");
  const [selectedPoolOrder, setSelectedPoolOrder] = useState(null);
  const [bonusCommissionRateOverride, setBonusCommissionRateOverride] = useState("");

  const [busy, setBusy] = useState(false);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const [rules, setRules] = useState([]);
  const [listBusy, setListBusy] = useState(false);

  const [confirmModal, setConfirmModal] = useState({
    open: false,
    mode: null,
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

  async function fetchLuckyDrawRules(uId) {
    if (!uId) {
      setRules([]);
      return;
    }

    try {
      setListBusy(true);

      const token = localStorage.getItem("admin_token");

      const res = await fetch(`${API}/api/admin/lucky-draw/user/${uId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to fetch lucky draw rules");
      }

      setRules(data?.rules || []);
    } catch (err) {
      console.error("fetchLuckyDrawRules error:", err);
      setRules([]);
      toast.error(err.message || "Failed to fetch lucky draw rules");
    } finally {
      setListBusy(false);
    }
  }

  useEffect(() => {
    fetchPoolOrders();
  }, []);

  useEffect(() => {
    if (uid) fetchLuckyDrawRules(uid);
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

  async function saveLuckyDrawRule(e) {
    e.preventDefault();

    if (!uid || !triggerCount || !rewardType) {
      toast.error("Please fill in UID, trigger count, and reward type.");
      return;
    }

    if (rewardType === "cash") {
      const amt = Number(cashAmount);
      if (!Number.isFinite(amt) || amt <= 0) {
        toast.error("Please enter a valid cash amount.");
        return;
      }
    }

    if (rewardType === "bonus_order" && !poolOrderId) {
      toast.error("Please choose a bonus order.");
      return;
    }

    if (rewardType === "bonus_order" && String(bonusCommissionRateOverride).trim() !== "") {
      const rate = Number(bonusCommissionRateOverride);

      if (!Number.isFinite(rate) || rate < 0) {
        toast.error("Bonus commission rate must be a number 0 or above.");
        return;
      }

      if (rate > 1) {
        toast.error("Use decimal format. Example: 0.15 = 15%.");
        return;
      }
    }

    setBusy(true);
    try {
      const token = localStorage.getItem("admin_token");

      const res = await fetch(`${API}/api/admin/lucky-draw`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          uid,
          triggerCount: Number(triggerCount),
          rewardType,
          cashAmount: rewardType === "cash" ? Number(cashAmount) : 0,
          poolOrderId: rewardType === "bonus_order" ? poolOrderId : null,
          bonusCommissionRateOverride:
            rewardType === "bonus_order" && String(bonusCommissionRateOverride).trim() !== ""
              ? Number(bonusCommissionRateOverride)
              : null,
          title,
          description,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        toast.success("Lucky draw rule saved");
        setTriggerCount("");
        setCashAmount("");
        setPoolOrderId("");
        setSelectedPoolOrder(null);
        setBonusCommissionRateOverride("");
        fetchLuckyDrawRules(uid);
      } else {
        toast.error(data.message || "Failed to save lucky draw rule");
      }
    } catch (e) {
      console.error("saveLuckyDrawRule error:", e);
      toast.error("Server error saving lucky draw rule.");
    } finally {
      setBusy(false);
    }
  }

  function openConfirmModal(mode, ruleId) {
    setConfirmModal({
      open: true,
      mode,
      ruleId,
      busy: false,
    });
  }

  function closeConfirmModal() {
    if (confirmModal.busy) return;
    setConfirmModal({
      open: false,
      mode: null,
      ruleId: null,
      busy: false,
    });
  }

  async function disableLuckyDrawRuleItem(ruleId) {
    try {
      setConfirmModal((prev) => ({ ...prev, busy: true }));

      const token = localStorage.getItem("admin_token");

      const res = await fetch(`${API}/api/admin/lucky-draw/${ruleId}/disable`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to disable lucky draw rule");
      }

      toast.success("Lucky draw rule disabled");
      closeConfirmModal();
      fetchLuckyDrawRules(uid);
    } catch (err) {
      console.error("disableLuckyDrawRuleItem error:", err);
      toast.error(err.message || "Failed to disable lucky draw rule");
      setConfirmModal((prev) => ({ ...prev, busy: false }));
    }
  }

  async function deleteLuckyDrawRuleItem(ruleId) {
    try {
      setConfirmModal((prev) => ({ ...prev, busy: true }));

      const token = localStorage.getItem("admin_token");

      const res = await fetch(`${API}/api/admin/lucky-draw/${ruleId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to delete lucky draw rule");
      }

      toast.success("Lucky draw rule deleted");
      closeConfirmModal();
      fetchLuckyDrawRules(uid);
    } catch (err) {
      console.error("deleteLuckyDrawRuleItem error:", err);
      toast.error(err.message || "Failed to delete lucky draw rule");
      setConfirmModal((prev) => ({ ...prev, busy: false }));
    }
  }

  async function handleConfirmAction() {
    if (!confirmModal.ruleId) return;

    if (confirmModal.mode === "disable") {
      await disableLuckyDrawRuleItem(confirmModal.ruleId);
      return;
    }

    if (confirmModal.mode === "delete") {
      await deleteLuckyDrawRuleItem(confirmModal.ruleId);
    }
  }

  function getRealStatus(rule) {
    if (!rule?.isActive) return "DISABLED";
    if (rule?.claimedAt) return "CLAIMED";
    return "ACTIVE";
  }

  return (
    <Shell title="Lucky Draw Trigger Settings">
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
        <div className={cardClass}>
          <div className={`text-sm font-semibold ${strongText}`}>Assign Lucky Draw Trigger</div>
          <div className={`mt-1 text-xs ${mutedText}`}>
            Set a trigger count and one fixed reward. User chooses 1 egg visually, but reward is the one you set here.
          </div>

          <form onSubmit={saveLuckyDrawRule} className="mt-4 space-y-3">
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
              className={`rounded-xl px-3 py-3 text-xs ${
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
              <div className={`text-xs ${softText}`}>Popup Title</div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <div className={`text-xs ${softText}`}>Popup Description</div>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Pick 1 diamond and win your reward"
                className={inputClass}
              />
            </div>

            <div>
              <div className={`text-xs ${softText}`}>Reward Type</div>
            
              <div className="mt-2">
                <SelectMenu
                  value={rewardType}
                  onChange={(next) => {
                    setRewardType(next);
            
                    if (next === "cash") {
                      setPoolOrderId("");
                      setSelectedPoolOrder(null);
                      setBonusCommissionRateOverride("");
                    } else {
                      setCashAmount("");
                    }
                  }}
                  options={[
                    { value: "cash", label: "Cash Reward" },
                    { value: "bonus_order", label: "Bonus Order" },
                  ]}
                />
              </div>
            </div>

            {rewardType === "cash" ? (
              <div>
                <div className={`text-xs ${softText}`}>Cash Amount</div>
                <input
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  type="number"
                  min="0"
                  className={inputClass}
                  placeholder="Enter cash amount"
                  required
                />
              </div>
            ) : (
              <div>
                <div className={`text-xs ${softText}`}>Select Bonus Order</div>

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
                      <div className={mutedText}>Price: {money(selectedPoolOrder.price)}</div>
                    </div>
                  ) : (
                    "Click to choose an order..."
                  )}
                </button>

                <input value={poolOrderId} readOnly className="hidden" required />

                <div className="mt-3">
                  <div className={`text-xs ${softText}`}>Bonus Order Commission Rate</div>

                  <input
                    value={bonusCommissionRateOverride}
                    onChange={(e) => setBonusCommissionRateOverride(e.target.value)}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Leave empty = use global rate, e.g. 0.15 = 15%"
                    className={inputClass}
                  />

                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBonusCommissionRateOverride("0.15")}
                      className={buttonClass}
                    >
                      15%
                    </button>

                    <button
                      type="button"
                      onClick={() => setBonusCommissionRateOverride("0.10")}
                      className={buttonClass}
                    >
                      10%
                    </button>
                  </div>

                  <div className={`mt-2 text-[11px] ${mutedText}`}>
                    Use decimal format. Example: 0.15 = 15%, 0.10 = 10%, 0.05 = 5%.
                  </div>
                </div>
              </div>
            )}

            <button disabled={busy} className={`${primaryButtonClass} disabled:opacity-50`}>
              {busy ? "Saving..." : "Save Lucky Draw Rule"}
            </button>
          </form>
        </div>

        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-sm font-semibold ${strongText}`}>Saved Lucky Draw Rules</div>
              <div className={`mt-1 text-xs ${mutedText}`}>
                Shows the fixed reward rule for each trigger count.
              </div>
            </div>

            <button onClick={() => fetchLuckyDrawRules(uid)} className={buttonClass}>
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
                Loading lucky draw rules...
              </div>
            )}

            {!listBusy && rules.length === 0 && (
              <div
                className={`rounded-xl px-3 py-3 text-xs ${
                  theme === "dark"
                    ? "border border-white/10 bg-white/5 text-white/60"
                    : "border border-gray-200 bg-gray-50 text-gray-600"
                }`}
              >
                No lucky draw rules saved for this user.
              </div>
            )}

            {!listBusy &&
              rules.map((r) => {
                const realStatus = getRealStatus(r);

                return (
                  <div
                    key={r._id}
                    className={`flex items-center justify-between gap-3 rounded-xl px-3 py-3 ${
                      theme === "dark"
                        ? "border border-white/10 bg-white/5"
                        : "border border-gray-200 bg-gray-50"
                    }`}
                  >
                    <div>
                      <div className={`text-xs font-semibold ${strongText}`}>
                        Trigger at order {r.triggerCount}
                      </div>

                      <div className={`mt-1 flex flex-wrap items-center gap-2 text-[11px] ${mutedText}`}>
                        <span>
                          Reward:{" "}
                          {r.rewardType === "cash"
                            ? `Cash ${money(r.cashAmount)}`
                            : `${r.poolOrder?.orderName || "Unknown order"} (${r.poolOrder?.orderNumber || "?"})`}
                        </span>

                        {r.rewardType === "bonus_order" ? (
                          <>
                            <span>•</span>
                            <span>
                              Rate:{" "}
                              <span className={strongText}>
                                {r.bonusCommissionRateOverride == null
                                  ? "Global rate"
                                  : `${(Number(r.bonusCommissionRateOverride) * 100).toFixed(2)}%`}
                              </span>
                            </span>
                          </>
                        ) : null}

                        <span>•</span>

                        <span>
                          Rule: <span className={strongText}>{r.isActive ? "ON" : "OFF"}</span>
                        </span>

                        <span>•</span>

                        <span>
                          Claimed: <span className={strongText}>{r.claimedAt ? "YES" : "NO"}</span>
                        </span>

                        {r.selectedEggIndex !== null && r.selectedEggIndex !== undefined ? (
                          <>
                            <span>•</span>
                            <span>
                              Picked Egg: <span className={strongText}>{Number(r.selectedEggIndex) + 1}</span>
                            </span>
                          </>
                        ) : null}
                      </div>

                      <div className={`mt-1 text-[11px] ${softText}`}>
                        Title: {r.title || "Lucky Draw"}
                      </div>

                      <div className={`mt-1 text-[11px] ${mutedText}`}>
                        {r.claimedAt
                          ? `Claimed at: ${new Date(r.claimedAt).toLocaleString()}`
                          : "Not claimed yet"}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 text-[11px] ${badgeClasses(
                          realStatus,
                          theme
                        )}`}
                      >
                        {realStatus}
                      </span>

                      {r.isActive && !r.claimedAt && (
                        <button
                          onClick={() => openConfirmModal("disable", r._id)}
                          className={buttonClass}
                        >
                          Disable
                        </button>
                      )}

                      <button
                        onClick={() => openConfirmModal("delete", r._id)}
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

          <div className={drawerClass}>
            <div className="flex h-full flex-col">
              <div
                className={`flex items-start justify-between gap-3 p-5 ${
                  theme === "dark" ? "border-b border-white/10" : "border-b border-gray-200"
                }`}
              >
                <div>
                  <div className={`text-sm font-semibold ${strongText}`}>Select Bonus Order</div>
                  <div className={`mt-1 text-xs ${mutedText}`}>
                    Filter by price range + search. Only active pool orders are shown.
                  </div>
                </div>

                <button onClick={closePicker} className={buttonClass}>
                  ✕
                </button>
              </div>

              <div
                className={`p-5 ${theme === "dark" ? "border-b border-white/10" : "border-b border-gray-200"}`}
              >
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
                  <div
                    className={`rounded-xl px-3 py-3 text-xs ${
                      theme === "dark"
                        ? "border border-white/10 bg-white/5 text-white/60"
                        : "border border-gray-200 bg-gray-50 text-gray-600"
                    }`}
                  >
                    Showing first 100 of {filteredOrders.length} matching orders. Use search or price range to narrow results.
                  </div>
                )}
              
                {filteredOrders.length === 0 && (
                  <div
                    className={`rounded-xl px-3 py-3 text-xs ${
                      theme === "dark"
                        ? "border border-white/10 bg-white/5 text-white/60"
                        : "border border-gray-200 bg-gray-50 text-gray-600"
                    }`}
                  >
                    No active pool orders found.
                  </div>
                )}

                {visibleOrders.map((o) => (
                  <button
                    key={o._id}
                    onClick={() => chooseOrder(o)}
                    className={`block w-full rounded-xl border px-3 py-3 text-left ${
                      theme === "dark"
                        ? "border-white/10 bg-white/5 hover:bg-white/10"
                        : "border-gray-200 bg-gray-50 hover:bg-gray-100"
                    }`}
                  >
                    <div className={`text-xs font-semibold ${strongText}`}>
                      {o.orderName} <span className={mutedText}>({o.orderNumber})</span>
                    </div>
                    <div className={`mt-1 text-[11px] ${mutedText}`}>
                      Price: {money(o.price)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      <Modal
        open={confirmModal.open}
        title={confirmModal.mode === "delete" ? "Delete Lucky Draw Rule" : "Disable Lucky Draw Rule"}
        subtitle={
          confirmModal.mode === "delete"
            ? "This will permanently remove the lucky draw rule."
            : "This will turn off the lucky draw rule so it can no longer be triggered."
        }
        onClose={closeConfirmModal}
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={closeConfirmModal}
              disabled={confirmModal.busy}
              className={`${buttonClass} disabled:opacity-50`}
            >
              Cancel
            </button>

            <button
              onClick={handleConfirmAction}
              disabled={confirmModal.busy}
              className={`${primaryButtonClass} disabled:opacity-50`}
            >
              {confirmModal.busy
                ? confirmModal.mode === "delete"
                  ? "Deleting..."
                  : "Disabling..."
                : confirmModal.mode === "delete"
                ? "Delete"
                : "Disable"}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div
            className={`rounded-2xl p-3 text-xs ${
              theme === "dark"
                ? "border border-white/10 bg-white/5 text-white/70"
                : "border border-gray-200 bg-gray-50 text-gray-700"
            }`}
          >
            {confirmModal.mode === "delete"
              ? "This action is permanent and cannot be undone."
              : "The rule will remain in history, but it will no longer trigger."}
          </div>
        </div>
      </Modal>
    </Shell>
  );
}