import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Shell from "../components/Shell";
import { toast } from "react-toastify";
import { useTheme } from "../context/ThemeContext";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "https://slimy-xenia-jayjay122-018fd7f8.koyeb.app";

function safeStr(x) {
  return String(x || "").trim();
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

export default function Events() {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const mutedText = theme === "dark" ? "text-white/50" : "text-gray-500";
  const softText = theme === "dark" ? "text-white/70" : "text-gray-600";
  const strongText = theme === "dark" ? "text-white" : "text-gray-900";

  const inputClass =
    theme === "dark"
      ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/90 placeholder:text-white/30 outline-none focus:border-white/20"
      : "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-400";

  const textareaClass =
    theme === "dark"
      ? "w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/90 outline-none focus:border-white/20"
      : "w-full resize-none rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-gray-400";

  const cardClass =
    theme === "dark"
      ? "rounded-2xl border border-white/10 bg-white/5"
      : "rounded-2xl border border-gray-200 bg-white shadow-sm";

  const subCardClass =
    theme === "dark"
      ? "rounded-2xl border border-white/10 bg-white/5 p-3"
      : "rounded-2xl border border-gray-200 bg-gray-50 p-3";

  const buttonClass =
    theme === "dark"
      ? "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 hover:bg-white/10"
      : "rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 hover:bg-gray-50";

  const primaryButtonClass =
    theme === "dark"
      ? "rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs text-white/85 hover:bg-white/15"
      : "rounded-xl border border-gray-900 bg-gray-900 px-3 py-2 text-xs text-white hover:bg-gray-800";

  const tableHeadClass =
    theme === "dark"
      ? "bg-white/5 text-xs text-white/60"
      : "bg-gray-50 text-xs text-gray-500";

  const tableBodyClass =
    theme === "dark"
      ? "divide-y divide-white/10"
      : "divide-y divide-gray-200";

  const tableRowClass =
    theme === "dark"
      ? "hover:bg-white/5"
      : "hover:bg-gray-50";

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const [q, setQ] = useState("");

  const [createModal, setCreateModal] = useState({
    open: false,
    name: "",
    imageUrl: "",
    imageFile: null,
    description: "",
  });

  const [editModal, setEditModal] = useState({
    open: false,
    id: null,
    name: "",
    imageUrl: "",
    imageFile: null,
    description: "",
  });

  const [deleteModal, setDeleteModal] = useState({
    open: false,
    id: null,
    name: "",
  });

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

  async function fetchForm(url, options = {}) {
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

  function getPreviewSrc(modal) {
    if (modal.imageFile) {
      return URL.createObjectURL(modal.imageFile);
    }
    return safeStr(modal.imageUrl);
  }

  async function loadEvents() {
    setLoading(true);

    try {
      const data = await fetchJSON(`${API_BASE}/api/events`);
      setRows(data.events || []);
    } catch (e) {
      setRows([]);
      toast.error(e.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return rows;

    return rows.filter((ev) => {
      const name = String(ev.name || "").toLowerCase();
      const desc = String(ev.description || "").toLowerCase();
      const id = String(ev._id || "").toLowerCase();
      return name.includes(qq) || desc.includes(qq) || id.includes(qq);
    });
  }, [rows, q]);

  async function submitCreate() {
    const name = safeStr(createModal.name);
    const description = safeStr(createModal.description);
    const imageFile = createModal.imageFile;

    if (!name || !description || !imageFile) {
      toast.error("Please fill in name, description, and select an image.");
      return;
    }

    setBusyId("create");

    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("description", description);

      formData.append("image", imageFile);

      const data = await fetchForm(`${API_BASE}/api/admin/events`, {
        method: "POST",
        body: formData,
      });

      const newEvent = data.event;
      setRows((prev) => [newEvent, ...prev]);
      toast.success("Event created");

      setCreateModal({
        open: false,
        name: "",
        imageUrl: "",
        imageFile: null,
        description: "",
      });
    } catch (e) {
      toast.error(e.message || "Failed to create event");
    } finally {
      setBusyId(null);
    }
  }

  async function submitEdit() {
    if (!editModal.id) return;

    const name = safeStr(editModal.name);
    const description = safeStr(editModal.description);
    const imageFile = editModal.imageFile;

    if (!name || !description) {
      toast.error("Please fill in name, description, and select an image.");
      return;
    }

    setBusyId(editModal.id);

    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("description", description);

      if (imageFile) {
        formData.append("image", imageFile);
      }

      const data = await fetchForm(`${API_BASE}/api/admin/events/${editModal.id}`, {
        method: "PATCH",
        body: formData,
      });

      const updated = data.event || {
        _id: editModal.id,
        name,
        description,
      };

      setRows((prev) =>
        prev.map((x) => (x._id === editModal.id ? { ...x, ...updated } : x))
      );

      toast.success("Event updated");
      setEditModal({
        open: false,
        id: null,
        name: "",
        imageUrl: "",
        imageFile: null,
        description: "",
      });
    } catch (e) {
      toast.error(e.message || "Failed to update event");
    } finally {
      setBusyId(null);
    }
  }

  async function submitDelete() {
    const id = deleteModal.id;
    if (!id) return;

    setBusyId(id);

    try {
      await fetchJSON(`${API_BASE}/api/admin/events/${id}`, {
        method: "DELETE",
      });

      setRows((prev) => prev.filter((x) => x._id !== id));
      toast.success("Event deleted");
      setDeleteModal({ open: false, id: null, name: "" });
    } catch (e) {
      toast.error(e.message || "Failed to delete event");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Shell title="Events">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className={`text-xs ${mutedText}`}>
          Manage event banners, titles, and descriptions for the user events page.
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search event name / description / id..."
            className={`${inputClass} md:w-72`}
          />

          <button
            disabled={loading}
            onClick={loadEvents}
            className={`${buttonClass} disabled:opacity-50`}
          >
            Refresh
          </button>

          <button
            onClick={() => {
              setCreateModal({
                open: true,
                name: "",
                imageUrl: "",
                imageFile: null,
                description: "",
              });
            }}
            className={primaryButtonClass}
          >
            + Add Event
          </button>
        </div>
      </div>

      <div className={`mt-4 overflow-hidden ${cardClass}`}>
        <div
          className={`px-4 py-3 text-sm font-semibold ${
            theme === "dark" ? "bg-white/5 text-white" : "bg-gray-50 text-gray-900"
          }`}
        >
          Events ({filtered.length})
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className={tableHeadClass}>
              <tr>
                <th className="px-4 py-3">Preview</th>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className={tableBodyClass}>
              {loading ? (
                <tr>
                  <td className={`px-4 py-5 ${softText}`} colSpan={4}>
                    Loading events...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td className={`px-4 py-5 ${softText}`} colSpan={4}>
                    No events found.
                  </td>
                </tr>
              ) : (
                filtered.map((ev) => {
                  const isBusy = busyId === ev._id;

                  return (
                    <tr key={ev._id} className={tableRowClass}>
                      <td className="px-4 py-3">
                        <div
                          className={`h-14 w-20 overflow-hidden rounded-xl ${
                            theme === "dark"
                              ? "border border-white/10 bg-white/5"
                              : "border border-gray-200 bg-gray-50"
                          }`}
                        >
                          {ev.imageUrl ? (
                            <img
                              src={ev.imageUrl}
                              alt={ev.name || "event"}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : null}
                        </div>
                        <div className={`mt-1 max-w-[140px] truncate font-mono text-[10px] ${mutedText}`}>
                          {ev._id}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className={`text-xs font-semibold ${strongText}`}>
                          {ev.name || "-"}
                        </div>
                        <div className={`mt-1 max-w-[280px] truncate font-mono text-[11px] ${mutedText}`}>
                          {ev.imageUrl || ""}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className={`max-w-xl line-clamp-2 text-xs ${softText}`}>
                          {ev.description || "-"}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            disabled={isBusy}
                            onClick={() => {
                              setEditModal({
                                open: true,
                                id: ev._id,
                                name: ev.name || "",
                                imageUrl: ev.imageUrl || "",
                                imageFile: null,
                                description: ev.description || "",
                              });
                            }}
                            className={`${buttonClass} disabled:opacity-50`}
                          >
                            Edit
                          </button>

                          <button
                            disabled={isBusy}
                            onClick={() => {
                              setDeleteModal({
                                open: true,
                                id: ev._id,
                                name: ev.name || "Untitled",
                              });
                            }}
                            className={`${buttonClass} disabled:opacity-50`}
                          >
                            Delete
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
      </div>

      <Modal
        open={createModal.open}
        title="Add Event"
        subtitle="Create a new event"
        onClose={() =>
          setCreateModal({
            open: false,
            name: "",
            imageUrl: "",
            imageFile: null,
            description: "",
          })
        }
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() =>
                setCreateModal({
                  open: false,
                  name: "",
                  imageUrl: "",
                  imageFile: null,
                  description: "",
                })
              }
              className={buttonClass}
            >
              Cancel
            </button>

            <button
              disabled={busyId === "create"}
              onClick={submitCreate}
              className={`${primaryButtonClass} disabled:opacity-50`}
            >
              {busyId === "create" ? "Saving..." : "Create"}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className={subCardClass}>
            <div className={`text-xs font-semibold ${strongText}`}>Event Name</div>
            <input
              value={createModal.name}
              onChange={(e) => setCreateModal((p) => ({ ...p, name: e.target.value }))}
              placeholder="Example: New Year Promotion"
              className={`mt-2 ${inputClass}`}
            />
          </div>

          <div className={subCardClass}>
            <div className={`text-xs font-semibold ${strongText}`}>Upload Image</div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setCreateModal((p) => ({
                  ...p,
                  imageFile: file,
                  imageUrl: file ? "" : p.imageUrl,
                }));
              }}
              className={`mt-2 block w-full text-xs ${theme === "dark" ? "text-white/80 file:bg-white/10 file:text-white" : "text-gray-700 file:bg-gray-100 file:text-gray-800"} file:mr-3 file:rounded-xl file:border-0 file:px-3 file:py-2 file:text-xs`}
            />
            <div className={`mt-2 text-[11px] ${mutedText}`}>
              Choose from your computer.
            </div>
          </div>

          {createModal.imageFile ? (
            <div className={subCardClass}>
              <div className={`text-xs font-semibold ${strongText}`}>Preview</div>
              <div
                className={`mt-3 overflow-hidden rounded-2xl ${
                  theme === "dark"
                    ? "border border-white/10 bg-white/5"
                    : "border border-gray-200 bg-gray-50"
                }`}
              >
                <img
                  src={getPreviewSrc(createModal)}
                  alt="preview"
                  className="h-40 w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
            </div>
          ) : null}

          <div className={subCardClass}>
            <div className={`text-xs font-semibold ${strongText}`}>Description</div>
            <textarea
              value={createModal.description}
              onChange={(e) =>
                setCreateModal((p) => ({ ...p, description: e.target.value }))
              }
              placeholder="Write event description..."
              rows={5}
              className={`mt-2 ${textareaClass}`}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={editModal.open}
        title="Edit Event"
        subtitle={editModal.id ? `Event ID: ${editModal.id}` : ""}
        onClose={() =>
          setEditModal({
            open: false,
            id: null,
            name: "",
            imageUrl: "",
            imageFile: null,
            description: "",
          })
        }
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() =>
                setEditModal({
                  open: false,
                  id: null,
                  name: "",
                  imageUrl: "",
                  imageFile: null,
                  description: "",
                })
              }
              className={buttonClass}
            >
              Cancel
            </button>

            <button
              disabled={busyId === editModal.id}
              onClick={submitEdit}
              className={`${primaryButtonClass} disabled:opacity-50`}
            >
              {busyId === editModal.id ? "Saving..." : "Save Changes"}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className={subCardClass}>
            <div className={`text-xs font-semibold ${strongText}`}>Event Name</div>
            <input
              value={editModal.name}
              onChange={(e) => setEditModal((p) => ({ ...p, name: e.target.value }))}
              className={`mt-2 ${inputClass}`}
            />
          </div>

          <div className={subCardClass}>
            <div className={`text-xs font-semibold ${strongText}`}>Upload New Image</div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setEditModal((p) => ({
                  ...p,
                  imageFile: file,
                  imageUrl: file ? "" : p.imageUrl,
                }));
              }}
              className={`mt-2 block w-full text-xs ${theme === "dark" ? "text-white/80 file:bg-white/10 file:text-white" : "text-gray-700 file:bg-gray-100 file:text-gray-800"} file:mr-3 file:rounded-xl file:border-0 file:px-3 file:py-2 file:text-xs`}
            />
            <div className={`mt-2 text-[11px] ${mutedText}`}>
              Leave empty to keep current image.
            </div>
          </div>

          {(editModal.imageFile || editModal.imageUrl) ? (
            <div className={subCardClass}>
              <div className={`text-xs font-semibold ${strongText}`}>Preview</div>
              <div
                className={`mt-3 overflow-hidden rounded-2xl ${
                  theme === "dark"
                    ? "border border-white/10 bg-white/5"
                    : "border border-gray-200 bg-gray-50"
                }`}
              >
                <img
                  src={getPreviewSrc(editModal)}
                  alt="preview"
                  className="h-40 w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
            </div>
          ) : null}

          <div className={subCardClass}>
            <div className={`text-xs font-semibold ${strongText}`}>Description</div>
            <textarea
              value={editModal.description}
              onChange={(e) =>
                setEditModal((p) => ({ ...p, description: e.target.value }))
              }
              rows={5}
              className={`mt-2 ${textareaClass}`}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={deleteModal.open}
        title="Delete Event"
        subtitle={deleteModal.id ? `Event: ${deleteModal.name}` : ""}
        onClose={() => setDeleteModal({ open: false, id: null, name: "" })}
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setDeleteModal({ open: false, id: null, name: "" })}
              className={buttonClass}
            >
              Cancel
            </button>

            <button
              disabled={busyId === deleteModal.id}
              onClick={submitDelete}
              className={`${primaryButtonClass} disabled:opacity-50`}
            >
              {busyId === deleteModal.id ? "Deleting..." : "Delete"}
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
            This action is permanent and cannot be undone.
          </div>
          <div className={`text-xs ${softText}`}>
            Make sure you really want to remove this event from the user page.
          </div>
        </div>
      </Modal>
    </Shell>
  );
}