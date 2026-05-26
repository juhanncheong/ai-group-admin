import { useEffect, useMemo, useState } from "react";
import Shell from "../components/Shell";
import { toast } from "react-toastify";
import { useTheme } from "../context/ThemeContext";

const API = "https://slimy-xenia-jayjay122-018fd7f8.koyeb.app";

function money(n) {
  const num = Number(n || 0);
  if (Number.isNaN(num)) return "0";
  return num.toFixed(0);
}

export default function OrdersPoolPage() {
  const { theme } = useTheme();

  const mutedText = theme === "dark" ? "text-white/50" : "text-gray-500";
  const softText = theme === "dark" ? "text-white/70" : "text-gray-600";
  const strongText = theme === "dark" ? "text-white" : "text-gray-900";

  const cardClass =
    theme === "dark"
      ? "rounded-2xl border border-white/10 bg-white/5 p-4"
      : "rounded-2xl border border-gray-200 bg-white p-4 shadow-sm";

  const inputClass =
    theme === "dark"
      ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/90 outline-none focus:border-white/20"
      : "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-gray-400";

  const buttonClass =
    theme === "dark"
      ? "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10"
      : "rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 hover:bg-gray-50";

  const primaryButtonClass =
    theme === "dark"
      ? "rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-xs text-white/90 hover:bg-white/15"
      : "rounded-xl border border-gray-900 bg-gray-900 px-4 py-2 text-xs text-white hover:bg-gray-800";

  const infoChipClass =
    theme === "dark"
      ? "rounded-xl border border-white/10 bg-white/5 px-3 py-2"
      : "rounded-xl border border-gray-200 bg-gray-50 px-3 py-2";

  const overlayClass = "fixed inset-0 z-[999] flex items-center justify-center bg-black/50 px-4";

  const modalClass =
    theme === "dark"
      ? "w-full max-w-lg rounded-2xl border border-white/10 bg-[#1a2233] p-5 shadow-2xl"
      : "w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl";

  const [orderNumber, setOrderNumber] = useState("");
  const [orderName, setOrderName] = useState("");
  const [price, setPrice] = useState("");
  const [imageKey, setImageKey] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [orders, setOrders] = useState([]);
  const [busy, setBusy] = useState(false);

  const [bulkText, setBulkText] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkLog, setBulkLog] = useState("");

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("none");

  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState(null);

  const [editOrderNumber, setEditOrderNumber] = useState("");
  const [editOrderName, setEditOrderName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editImageKey, setEditImageKey] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);

  const [editBusy, setEditBusy] = useState(false);

  const [maps, setMaps] = useState([]);
  const [mapBusy, setMapBusy] = useState(false);
  const [mapKey, setMapKey] = useState("");
  const [mapImageUrl, setMapImageUrl] = useState("");

  const [mapEditId, setMapEditId] = useState(null);
  const [mapEditKey, setMapEditKey] = useState("");
  const [mapEditImageUrl, setMapEditImageUrl] = useState("");
  const [mapEditIsActive, setMapEditIsActive] = useState(true);
  const [mapEditBusy, setMapEditBusy] = useState(false);

  const [mapQuery, setMapQuery] = useState("");
  const [mapPage, setMapPage] = useState(1);
  const [mapPageSize, setMapPageSize] = useState(5);

  async function fetchPool() {
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API}/api/admin/orders/pool/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (data.ok) {
        setOrders(data.orders || []);
      } else {
        toast.error(data.message || "Failed to load orders");
      }
    } catch {
      toast.error("Failed to load orders");
    }
  }

  async function fetchImageMaps() {
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API}/api/admin/orders/pool-image/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (data.ok) {
        setMaps(data.maps || []);
      } else {
        toast.error(data.message || "Failed to load image keys");
      }
    } catch {
      toast.error("Failed to load image keys");
    }
  }

  useEffect(() => {
    fetchPool();
    fetchImageMaps();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [query, sort, pageSize]);

  useEffect(() => {
    setMapPage(1);
  }, [mapQuery, mapPageSize]);

  async function addOrder(e) {
    e.preventDefault();
    setBusy(true);

    try {
      const token = localStorage.getItem("admin_token");

      const res = await fetch(`${API}/api/admin/orders/pool/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderNumber: orderNumber.trim(),
          orderName: orderName.trim(),
          price: Number(price),
          imageKey: imageKey.trim(),
          imageUrl: imageUrl.trim(),
        }),
      });

      const data = await res.json();

      if (data.ok) {
        setOrderNumber("");
        setOrderName("");
        setPrice("");
        setImageKey("");
        setImageUrl("");
        await fetchPool();
        toast.success("Order created");
      } else {
        toast.error(data.message || "Failed to create order");
      }
    } catch {
      toast.error("Failed to create order");
    } finally {
      setBusy(false);
    }
  }

  async function toggleOrder(id) {
    try {
      const token = localStorage.getItem("admin_token");

      const res = await fetch(`${API}/api/admin/orders/pool/${id}/toggle`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.ok === false) {
        toast.error(data.message || "Failed to update order status");
        return;
      }

      await fetchPool();
      toast.success("Order status updated");
    } catch {
      toast.error("Failed to update order status");
    }
  }

  function openEditModal(order) {
    setEditId(order._id);
    setEditOrderNumber(order.orderNumber || "");
    setEditOrderName(order.orderName || "");
    setEditPrice(String(order.price ?? ""));
    setEditImageKey(order.imageKey || "");
    setEditImageUrl(order.imageUrl || "");
    setEditIsActive(Boolean(order.isActive));
    setEditOpen(true);
  }

  function closeEditModal() {
    setEditOpen(false);
    setEditId(null);
  }

  async function saveEdit() {
    if (!editId) return;

    setEditBusy(true);
    try {
      const token = localStorage.getItem("admin_token");

      const res = await fetch(`${API}/api/admin/orders/pool/${editId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderNumber: editOrderNumber.trim(),
          orderName: editOrderName.trim(),
          price: Number(editPrice),
          imageKey: editImageKey.trim(),
          imageUrl: editImageUrl.trim(),
          isActive: editIsActive,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        toast.error(data.message || "Failed to update order");
        return;
      }

      closeEditModal();
      await fetchPool();
      toast.success("Order updated");
    } catch {
      toast.error("Failed to update order");
    } finally {
      setEditBusy(false);
    }
  }

  async function deleteOrder(id) {
    const sure = window.confirm("Delete this hotel order permanently?");
    if (!sure) return;

    try {
      const token = localStorage.getItem("admin_token");

      const res = await fetch(`${API}/api/admin/orders/pool/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!data.ok) {
        toast.error(data.message || "Failed to delete order");
        return;
      }

      await fetchPool();
      toast.success("Order deleted");
    } catch {
      toast.error("Failed to delete order");
    }
  }

  function parseBulkLines(text) {
    const lines = String(text || "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const rows = [];
    const errors = [];

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const parts = raw.split(",").map((x) => x.trim());

      const orderNumber = parts[0] || "";
      const orderName = parts[1] || "";
      const priceStr = parts[2] || "";
      const imageKey = parts[3] || "";

      if (!orderNumber || !orderName || !priceStr || !imageKey) {
        errors.push(`Line ${i + 1}: Missing fields → "${raw}"`);
        continue;
      }

      const priceNum = Number(priceStr);
      if (Number.isNaN(priceNum) || priceNum <= 0) {
        errors.push(`Line ${i + 1}: Invalid price → "${raw}"`);
        continue;
      }

      rows.push({
        orderNumber,
        orderName,
        price: priceNum,
        imageKey: imageKey.toLowerCase(),
      });
    }

    return { rows, errors };
  }

  async function bulkAddOrders() {
    if (!bulkText.trim()) return;

    const { rows, errors } = parseBulkLines(bulkText);

    if (!rows.length) {
      setBulkLog(errors.join("\n") || "Nothing valid to import.");
      return;
    }

    setBulkBusy(true);
    setBulkLog("");

    try {
      const token = localStorage.getItem("admin_token");

      let okCount = 0;
      let failCount = 0;
      const failLines = [];

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];

        try {
          const res = await fetch(`${API}/api/admin/orders/pool/create`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              orderNumber: r.orderNumber,
              orderName: r.orderName,
              price: Number(r.price),
              imageKey: r.imageKey,
            }),
          });

          const data = await res.json();

          if (data.ok) {
            okCount++;
          } else {
            failCount++;
            failLines.push(`${r.orderNumber} → ${data.message || "Failed"}`);
          }
        } catch {
          failCount++;
          failLines.push(`${r.orderNumber} → Network error`);
        }
      }

      await fetchPool();

      let msg = `✅ Imported: ${okCount}\n❌ Failed: ${failCount}`;
      if (errors.length) msg += `\n\n⚠️ Skipped Lines:\n${errors.join("\n")}`;
      if (failLines.length) msg += `\n\n❌ Failed Orders:\n${failLines.join("\n")}`;

      setBulkLog(msg);

      if (okCount > 0) {
        toast.success(`Imported ${okCount} order${okCount > 1 ? "s" : ""}`);
      }
      if (failCount > 0 || errors.length > 0) {
        toast.error("Some bulk orders failed");
      }
    } finally {
      setBulkBusy(false);
    }
  }

  async function addImageMap(e) {
    e.preventDefault();
    if (!mapKey.trim() || !mapImageUrl.trim()) return;

    setMapBusy(true);
    try {
      const token = localStorage.getItem("admin_token");

      const res = await fetch(`${API}/api/admin/orders/pool-image/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          key: mapKey.trim().toLowerCase(),
          imageUrl: mapImageUrl.trim(),
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        toast.error(data.message || "Failed to create image key");
        return;
      }

      setMapKey("");
      setMapImageUrl("");
      await fetchImageMaps();
      await fetchPool();
      toast.success("Image key created");
    } catch {
      toast.error("Failed to create image key");
    } finally {
      setMapBusy(false);
    }
  }

  function startEditMap(map) {
    setMapEditId(map._id);
    setMapEditKey(map.key || "");
    setMapEditImageUrl(map.imageUrl || "");
    setMapEditIsActive(Boolean(map.isActive));
  }

  function cancelEditMap() {
    setMapEditId(null);
    setMapEditKey("");
    setMapEditImageUrl("");
    setMapEditIsActive(true);
  }

  async function saveMapEdit() {
    if (!mapEditId) return;

    setMapEditBusy(true);
    try {
      const token = localStorage.getItem("admin_token");

      const res = await fetch(`${API}/api/admin/orders/pool-image/${mapEditId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          key: mapEditKey.trim().toLowerCase(),
          imageUrl: mapEditImageUrl.trim(),
          isActive: mapEditIsActive,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        toast.error(data.message || "Failed to update image key");
        return;
      }

      cancelEditMap();
      await fetchImageMaps();
      await fetchPool();
      toast.success("Image key updated");
    } catch {
      toast.error("Failed to update image key");
    } finally {
      setMapEditBusy(false);
    }
  }

  async function deleteMap(id) {
    const sure = window.confirm("Delete this image key?");
    if (!sure) return;

    try {
      const token = localStorage.getItem("admin_token");

      const res = await fetch(`${API}/api/admin/orders/pool-image/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!data.ok) {
        toast.error(data.message || "Failed to delete image key");
        return;
      }

      await fetchImageMaps();
      await fetchPool();
      toast.success("Image key deleted");
    } catch {
      toast.error("Failed to delete image key");
    }
  }

  const filteredOrders = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = [...orders];

    if (q) {
      list = list.filter((o) => {
        const name = String(o.orderName || "").toLowerCase();
        const num = String(o.orderNumber || "").toLowerCase();
        const key = String(o.imageKey || "").toLowerCase();
        const url = String(o.resolvedImageUrl || o.imageUrl || "").toLowerCase();
        return (
          name.includes(q) ||
          num.includes(q) ||
          key.includes(q) ||
          url.includes(q)
        );
      });
    }

    if (sort === "asc") {
      list.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    } else if (sort === "desc") {
      list.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    }

    return list;
  }, [orders, query, sort]);

  const filteredMaps = useMemo(() => {
    const q = mapQuery.trim().toLowerCase();
    let list = [...maps];

    if (q) {
      list = list.filter((m) => {
        const key = String(m.key || "").toLowerCase();
        const url = String(m.imageUrl || "").toLowerCase();
        const active = m.isActive ? "active yes true" : "inactive no false";
        return key.includes(q) || url.includes(q) || active.includes(q);
      });
    }

    list.sort((a, b) => String(a.key || "").localeCompare(String(b.key || "")));
    return list;
  }, [maps, mapQuery]);

  const stats = useMemo(() => {
    const total = orders.length;
    const active = orders.filter((o) => o.isActive).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [orders]);

  const mapStats = useMemo(() => {
    const total = maps.length;
    const active = maps.filter((m) => m.isActive).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [maps]);

  const totalFiltered = filteredOrders.length;

  const totalPages = useMemo(() => {
    const pages = Math.ceil(totalFiltered / pageSize);
    return pages <= 0 ? 1 : pages;
  }, [totalFiltered, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
    if (page < 1) setPage(1);
  }, [page, totalPages]);

  const pageOrders = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filteredOrders.slice(start, end);
  }, [filteredOrders, page, pageSize]);

  const showingStart = totalFiltered === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingEnd = Math.min(page * pageSize, totalFiltered);

  const totalFilteredMaps = filteredMaps.length;

  const mapTotalPages = useMemo(() => {
    const pages = Math.ceil(totalFilteredMaps / mapPageSize);
    return pages <= 0 ? 1 : pages;
  }, [totalFilteredMaps, mapPageSize]);

  useEffect(() => {
    if (mapPage > mapTotalPages) setMapPage(mapTotalPages);
    if (mapPage < 1) setMapPage(1);
  }, [mapPage, mapTotalPages]);

  const pageMaps = useMemo(() => {
    const start = (mapPage - 1) * mapPageSize;
    const end = start + mapPageSize;
    return filteredMaps.slice(start, end);
  }, [filteredMaps, mapPage, mapPageSize]);

  const mapShowingStart =
    totalFilteredMaps === 0 ? 0 : (mapPage - 1) * mapPageSize + 1;
  const mapShowingEnd = Math.min(mapPage * mapPageSize, totalFilteredMaps);

  return (
    <Shell title="Order Pool Settings">
      <div className="space-y-6">
        <form onSubmit={addOrder} className={cardClass}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className={`text-sm font-semibold ${strongText}`}>Add Hotel Order</div>
              <div className={`mt-1 text-[11px] ${mutedText}`}>
                Create orders that users will randomly receive in Search Hotel.
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2">
              <div className={infoChipClass}>
                <div className={`text-[10px] ${mutedText}`}>Total</div>
                <div className={`text-xs font-semibold ${strongText}`}>{stats.total}</div>
              </div>
              <div className={infoChipClass}>
                <div className={`text-[10px] ${mutedText}`}>Active</div>
                <div className={`text-xs font-semibold ${strongText}`}>{stats.active}</div>
              </div>
              <div className={infoChipClass}>
                <div className={`text-[10px] ${mutedText}`}>Inactive</div>
                <div className={`text-xs font-semibold ${strongText}`}>{stats.inactive}</div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="Order Number (unique)"
              className={inputClass}
              required
            />
            <input
              value={orderName}
              onChange={(e) => setOrderName(e.target.value)}
              placeholder="Hotel Name"
              className={inputClass}
              required
            />
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Price"
              type="number"
              className={inputClass}
              required
            />
            <input
              value={imageKey}
              onChange={(e) => setImageKey(e.target.value)}
              placeholder="Image Key (optional)"
              className={inputClass}
            />
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Fallback Image URL (optional)"
              className={`md:col-span-2 ${inputClass}`}
            />
          </div>

          <button disabled={busy} className={`mt-4 ${primaryButtonClass} disabled:opacity-50`}>
            {busy ? "Adding..." : "Add Order"}
          </button>
        </form>

        <div className={cardClass}>
          <div className={`text-sm font-semibold ${strongText}`}>Bulk Add</div>
          <div className={`mt-1 text-[11px] ${mutedText}`}>
            Format: <b>CodeNumber, Hotelname, Price, ImageKey</b>
          </div>

          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={`LB001,JW Marriott,357,jwmarriott`}
            rows={6}
            className={`mt-3 ${inputClass}`}
          />

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={bulkBusy}
              onClick={bulkAddOrders}
              className={`${primaryButtonClass} disabled:opacity-50`}
            >
              {bulkBusy ? "Importing..." : "Import Bulk Orders"}
            </button>

            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => {
                setBulkText("");
                setBulkLog("");
              }}
              className={`${buttonClass} disabled:opacity-50`}
            >
              Clear
            </button>
          </div>

          {!!bulkLog && (
            <pre
              className={`mt-3 whitespace-pre-wrap rounded-xl p-3 text-[11px] ${
                theme === "dark"
                  ? "border border-white/10 bg-black/20 text-white/80"
                  : "border border-gray-200 bg-gray-50 text-gray-700"
              }`}
            >
              {bulkLog}
            </pre>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
          <div className={cardClass}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className={`text-sm font-semibold ${strongText}`}>Image Keys</div>
                <div className={`mt-1 text-[11px] ${mutedText}`}>
                  One key controls many orders. Example: <b>Hotel → one image URL</b>
                </div>
              </div>

              <div className="hidden md:flex items-center gap-2">
                <div className={infoChipClass}>
                  <div className={`text-[10px] ${mutedText}`}>Keys</div>
                  <div className={`text-xs font-semibold ${strongText}`}>{mapStats.total}</div>
                </div>
                <div className={infoChipClass}>
                  <div className={`text-[10px] ${mutedText}`}>Active</div>
                  <div className={`text-xs font-semibold ${strongText}`}>{mapStats.active}</div>
                </div>
                <div className={infoChipClass}>
                  <div className={`text-[10px] ${mutedText}`}>Inactive</div>
                  <div className={`text-xs font-semibold ${strongText}`}>{mapStats.inactive}</div>
                </div>
              </div>
            </div>

            <form onSubmit={addImageMap} className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              <input
                value={mapKey}
                onChange={(e) => setMapKey(e.target.value)}
                placeholder="Key (example: jwmarriott)"
                className={inputClass}
                required
              />
              <input
                value={mapImageUrl}
                onChange={(e) => setMapImageUrl(e.target.value)}
                placeholder="Image URL"
                className={`md:col-span-2 ${inputClass}`}
                required
              />

              <button
                type="submit"
                disabled={mapBusy}
                className={`md:col-span-3 ${primaryButtonClass} disabled:opacity-50`}
              >
                {mapBusy ? "Saving..." : "Add Image Key"}
              </button>
            </form>

            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <input
                value={mapQuery}
                onChange={(e) => setMapQuery(e.target.value)}
                placeholder="Search image keys by key, url or active..."
                className={inputClass}
              />

              <div className="flex items-center gap-2">
                <div className={`text-[11px] ${mutedText}`}>Per page:</div>
                <select
                  value={mapPageSize}
                  onChange={(e) => setMapPageSize(Number(e.target.value))}
                  className={buttonClass}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div className={`mt-4 text-[11px] ${mutedText}`}>
              Showing{" "}
              <span className={`font-semibold ${strongText}`}>
                {mapShowingStart}-{mapShowingEnd}
              </span>{" "}
              of <span className={`font-semibold ${strongText}`}>{totalFilteredMaps}</span>
            </div>

            <div className="mt-3 space-y-2">
              {pageMaps.map((m) => {
                const isEditing = mapEditId === m._id;

                if (isEditing) {
                  return (
                    <div key={m._id} className={infoChipClass}>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <input
                          value={mapEditKey}
                          onChange={(e) => setMapEditKey(e.target.value)}
                          placeholder="Key"
                          className={inputClass}
                        />
                        <input
                          value={mapEditImageUrl}
                          onChange={(e) => setMapEditImageUrl(e.target.value)}
                          placeholder="Image URL"
                          className={inputClass}
                        />
                      </div>

                      <label className={`mt-3 flex items-center gap-2 text-xs ${softText}`}>
                        <input
                          type="checkbox"
                          checked={mapEditIsActive}
                          onChange={(e) => setMapEditIsActive(e.target.checked)}
                        />
                        Active
                      </label>

                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={saveMapEdit}
                          disabled={mapEditBusy}
                          className={`${primaryButtonClass} disabled:opacity-50`}
                        >
                          {mapEditBusy ? "Saving..." : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditMap}
                          className={buttonClass}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={m._id}
                    className={`flex flex-col gap-3 rounded-xl px-3 py-3 md:flex-row md:items-center md:justify-between ${
                      theme === "dark"
                        ? "border border-white/10 bg-white/5"
                        : "border border-gray-200 bg-gray-50"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`h-12 w-16 shrink-0 overflow-hidden rounded-lg ${
                          theme === "dark"
                            ? "border border-white/10 bg-white/5"
                            : "border border-gray-200 bg-white"
                        }`}
                      >
                        {m.imageUrl ? (
                          <img
                            src={m.imageUrl}
                            alt={m.key || "Image key preview"}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                              const fallback = e.currentTarget.nextSibling;
                              if (fallback) fallback.style.display = "flex";
                            }}
                          />
                        ) : null}

                        <div
                          style={{ display: m.imageUrl ? "none" : "flex" }}
                          className={`h-full w-full items-center justify-center text-[10px] ${mutedText}`}
                        >
                          No Image
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className={`text-xs font-semibold ${strongText}`}>{m.key}</div>
                        <div className={`mt-1 truncate text-[11px] ${mutedText}`}>{m.imageUrl}</div>
                        <div className={`mt-1 text-[11px] ${mutedText}`}>
                          Active: <span className={strongText}>{m.isActive ? "Yes" : "No"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => startEditMap(m)} className={buttonClass}>
                        Edit
                      </button>

                      <button type="button" onClick={() => deleteMap(m._id)} className={buttonClass}>
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}

              {!pageMaps.length && (
                <div
                  className={`rounded-xl px-3 py-3 text-xs ${
                    theme === "dark"
                      ? "border border-white/10 bg-white/5 text-white/50"
                      : "border border-gray-200 bg-gray-50 text-gray-500"
                  }`}
                >
                  No image keys found.
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <button
                disabled={mapPage <= 1}
                onClick={() => setMapPage((p) => Math.max(1, p - 1))}
                className={`${buttonClass} disabled:opacity-40`}
              >
                Prev
              </button>

              <div className={buttonClass + " cursor-default"}>
                Page <span className={`font-semibold ${strongText}`}>{mapPage}</span> /{" "}
                <span className={`font-semibold ${strongText}`}>{mapTotalPages}</span>
              </div>

              <button
                disabled={mapPage >= mapTotalPages}
                onClick={() => setMapPage((p) => Math.min(mapTotalPages, p + 1))}
                className={`${buttonClass} disabled:opacity-40`}
              >
                Next
              </button>
            </div>
          </div>

          <div className={cardClass}>
            <div className="flex flex-col gap-3">
              <div className="flex w-full items-center gap-2">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by order name, number, key or url..."
                  className={inputClass}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className={`text-[11px] ${mutedText}`}>Sort:</div>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className={buttonClass}
                >
                  <option value="none">None</option>
                  <option value="asc">Price: Low → High</option>
                  <option value="desc">Price: High → Low</option>
                </select>

                <div className={`ml-2 text-[11px] ${mutedText}`}>Per page:</div>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className={buttonClass}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className={`text-[11px] ${mutedText}`}>
                Showing{" "}
                <span className={`font-semibold ${strongText}`}>
                  {showingStart}-{showingEnd}
                </span>{" "}
                of <span className={`font-semibold ${strongText}`}>{totalFiltered}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={`${buttonClass} disabled:opacity-40`}
                >
                  Prev
                </button>

                <div className={buttonClass + " cursor-default"}>
                  Page <span className={`font-semibold ${strongText}`}>{page}</span> /{" "}
                  <span className={`font-semibold ${strongText}`}>{totalPages}</span>
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

            <div className="mt-4 space-y-2">
              {pageOrders.map((o) => {
                const previewUrl = o.resolvedImageUrl || o.imageUrl || "";

                return (
                  <div
                    key={o._id}
                    className={`mt-2 flex flex-col gap-3 rounded-xl px-3 py-3 md:flex-row md:items-center md:justify-between ${
                      theme === "dark"
                        ? "border border-white/10 bg-white/5"
                        : "border border-gray-200 bg-gray-50"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`h-12 w-16 shrink-0 overflow-hidden rounded-lg ${
                          theme === "dark"
                            ? "border border-white/10 bg-white/5"
                            : "border border-gray-200 bg-white"
                        }`}
                      >
                        {previewUrl ? (
                          <img
                            src={previewUrl}
                            alt={o.orderName || "Hotel preview"}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                              const fallback = e.currentTarget.nextSibling;
                              if (fallback) fallback.style.display = "flex";
                            }}
                          />
                        ) : null}

                        <div
                          style={{ display: previewUrl ? "none" : "flex" }}
                          className={`h-full w-full items-center justify-center text-[10px] ${mutedText}`}
                        >
                          No Image
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className={`truncate text-xs font-semibold ${strongText}`}>
                          {o.orderName} <span className={mutedText}>({o.orderNumber})</span>
                        </div>

                        <div className={`mt-1 flex flex-wrap items-center gap-2 text-[11px] ${mutedText}`}>
                          <span>Price: {money(o.price)}</span>
                          <span>•</span>
                          <span>Key: {o.imageKey || "-"}</span>
                          <span>•</span>
                          <span>
                            Active: <span className={strongText}>{o.isActive ? "Yes" : "No"}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => toggleOrder(o._id)} className={buttonClass}>
                        Toggle
                      </button>

                      <button type="button" onClick={() => openEditModal(o)} className={buttonClass}>
                        Edit
                      </button>

                      <button type="button" onClick={() => deleteOrder(o._id)} className={buttonClass}>
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}

              {!pageOrders.length && (
                <div
                  className={`rounded-xl px-3 py-3 text-xs ${
                    theme === "dark"
                      ? "border border-white/10 bg-white/5 text-white/50"
                      : "border border-gray-200 bg-gray-50 text-gray-500"
                  }`}
                >
                  No orders found.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {editOpen && (
        <div className={overlayClass}>
          <div className={modalClass}>
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-sm font-semibold ${strongText}`}>Edit Hotel Order</div>
                <div className={`mt-1 text-[11px] ${mutedText}`}>
                  Update order details, key and fallback image
                </div>
              </div>

              <button onClick={closeEditModal} className={buttonClass}>
                ✕
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <input
                value={editOrderNumber}
                onChange={(e) => setEditOrderNumber(e.target.value)}
                placeholder="Order Number"
                className={inputClass}
              />
              <input
                value={editOrderName}
                onChange={(e) => setEditOrderName(e.target.value)}
                placeholder="Order Name"
                className={inputClass}
              />
              <input
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                placeholder="Price"
                type="number"
                className={inputClass}
              />
              <input
                value={editImageKey}
                onChange={(e) => setEditImageKey(e.target.value)}
                placeholder="Image Key"
                className={inputClass}
              />
              <input
                value={editImageUrl}
                onChange={(e) => setEditImageUrl(e.target.value)}
                placeholder="Fallback Image URL"
                className={`md:col-span-2 ${inputClass}`}
              />
            </div>

            <label className={`mt-4 flex items-center gap-2 text-xs ${softText}`}>
              <input
                type="checkbox"
                checked={editIsActive}
                onChange={(e) => setEditIsActive(e.target.checked)}
              />
              Active
            </label>

            <div className="mt-5 flex gap-2">
              <button
                onClick={saveEdit}
                disabled={editBusy}
                className={`w-full ${primaryButtonClass} disabled:opacity-50`}
              >
                {editBusy ? "Saving..." : "Save Changes"}
              </button>

              <button onClick={closeEditModal} className={`w-full ${buttonClass}`}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}