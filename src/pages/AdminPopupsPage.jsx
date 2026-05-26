import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import Shell from "../components/Shell";
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

function Modal({ open, title, subtitle, children, onClose, footer, wide = false }) {
  const cardRef = useRef(null);
  const { theme } = useTheme();
  const isDark = theme === "dark";

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
        if (cardRef.current && !cardRef.current.contains(e.target)) onClose?.();
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
        className={classNames(
          "relative w-full overflow-hidden rounded-[28px] border shadow-2xl",
          wide ? "max-w-4xl" : "max-w-xl",
          isDark
            ? "border-white/10 bg-[#0b1220]/95"
            : "border-gray-200 bg-white"
        )}
      >
        <div
          className={classNames(
            "relative overflow-hidden border-b px-5 py-4",
            isDark
              ? "border-white/10 bg-white/[0.03]"
              : "border-gray-200 bg-gray-50"
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div
                className={
                  isDark
                    ? "text-base font-semibold text-white"
                    : "text-base font-semibold text-gray-900"
                }
              >
                {title}
              </div>

              {subtitle ? (
                <div
                  className={
                    isDark
                      ? "mt-1 text-xs text-white/50"
                      : "mt-1 text-xs text-gray-500"
                  }
                >
                  {subtitle}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={onClose}
              className={
                isDark
                  ? "rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white/70 hover:bg-white/10"
                  : "rounded-xl border border-gray-200 bg-white px-2.5 py-2 text-xs text-gray-600 hover:bg-gray-50"
              }
            >
              ✕
            </button>
          </div>
        </div>

        <div className="max-h-[75vh] overflow-y-auto px-5 py-5">{children}</div>

        {footer ? (
          <div
            className={
              isDark
                ? "border-t border-white/10 bg-white/[0.03] px-5 py-4"
                : "border-t border-gray-200 bg-gray-50 px-5 py-4"
            }
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function UserPicker({
  selectedUsers,
  setSelectedUsers,
  allUsers,
  search,
  setSearch,
  hideSearch = false,
  hideSelected = false,
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const sectionClass = isDark
    ? "rounded-2xl border border-white/10 bg-white/[0.03] p-3"
    : "rounded-2xl border border-gray-200 bg-gray-50 p-3";

  const labelClass = isDark
    ? "text-xs font-semibold text-white"
    : "text-xs font-semibold text-gray-900";

  const mutedClass = isDark ? "text-white/50" : "text-gray-500";

  const inputClass = isDark
    ? "mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/90 placeholder:text-white/30 outline-none focus:border-white/20"
    : "mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-400";

  const filteredUsers = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();
  
    if (!q) return [];
  
    return allUsers
      .filter((u) => {
        return (
          String(u.phoneNumber || "").toLowerCase().includes(q) ||
          String(u.uid || "").toLowerCase().includes(q) ||
          String(u._id || "").toLowerCase().includes(q)
        );
      })
      .slice(0, 30);
  }, [allUsers, search]);

  function toggleUser(user) {
    const exists = selectedUsers.some((id) => String(id) === String(user._id));

    if (exists) {
      setSelectedUsers((prev) =>
        prev.filter((id) => String(id) !== String(user._id))
      );
    } else {
      setSelectedUsers((prev) => [...prev, String(user._id)]);
    }
  }

  return (
    <div className="space-y-3">
      {!hideSearch ? (
        <div className={sectionClass}>
          <div className={labelClass}>Search users</div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search phone / UID / user id..."
            className={inputClass}
          />
        </div>
      ) : null}

      <div className={sectionClass}>
        <div className="mb-3 flex items-center justify-between">
          <div className={labelClass}>Pick users</div>
          <div className={`text-[11px] ${mutedClass}`}>
            Selected: {selectedUsers.length}
          </div>
        </div>

        <div className="grid gap-2">
          {filteredUsers.length === 0 ? (
            <div
              className={
                isDark
                  ? "rounded-xl border border-dashed border-white/10 px-3 py-4 text-xs text-white/50"
                  : "rounded-xl border border-dashed border-gray-300 px-3 py-4 text-xs text-gray-500"
              }
            >
              {String(search || "").trim()
                ? "No users found"
                : "Enter UID to search users"}
            </div>
          ) : (
            filteredUsers.map((u) => {
              const active = selectedUsers.some(
                (id) => String(id) === String(u._id)
              );

              return (
                <button
                  key={u._id}
                  type="button"
                  onClick={() => toggleUser(u)}
                  className={classNames(
                    "flex items-center justify-between rounded-2xl border px-3 py-3 text-left transition",
                    active
                      ? isDark
                        ? "border-blue-500/35 bg-blue-500/10"
                        : "border-blue-200 bg-blue-50"
                      : isDark
                      ? "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                      : "border-gray-200 bg-white hover:bg-gray-50"
                  )}
                >
                  <div>
                    <div
                      className={
                        isDark
                          ? "text-sm font-semibold text-white"
                          : "text-sm font-semibold text-gray-900"
                      }
                    >
                      UID: {u.uid || "-"}
                    </div>
                    <div
                      className={
                        isDark
                          ? "mt-1 text-[12px] text-white/55"
                          : "mt-1 text-[12px] text-gray-500"
                      }
                    >
                      Phone: {u.phoneNumber || "-"}
                    </div>
                  </div>

                  <div
                    className={classNames(
                      "rounded-full px-2.5 py-1 text-[10px] font-semibold",
                      active
                        ? isDark
                          ? "bg-blue-500/20 text-blue-200"
                          : "bg-blue-100 text-blue-700"
                        : isDark
                        ? "bg-white/5 text-white/60"
                        : "bg-gray-100 text-gray-600"
                    )}
                  >
                    {active ? "Selected" : "Select"}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {!hideSelected && selectedUsers.length > 0 ? (
        <div className={sectionClass}>
          <div className={`mb-2 ${labelClass}`}>Selected user ids</div>
          <div className="flex flex-wrap gap-2">
            {selectedUsers.map((id) => (
              <span
                key={id}
                className={
                  isDark
                    ? "rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-1 text-[11px] text-blue-200"
                    : "rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] text-blue-700"
                }
              >
                {id}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function AdminPopupsPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [activeTab, setActiveTab] = useState("popup");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const [popups, setPopups] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);

  const [q, setQ] = useState("");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorType, setEditorType] = useState("popup");
  const [editorMode, setEditorMode] = useState("create");
  const [editingId, setEditingId] = useState(null);

  const [popupForm, setPopupForm] = useState({
    title: "",
    message: "",
    targetType: "all",
    targetUsers: [],
    isActive: true,
  });

  const [notificationForm, setNotificationForm] = useState({
    title: "",
    description: "",
    targetType: "all",
    targetUser: "",
  });

  const [userSearch, setUserSearch] = useState("");

  const cardClass = isDark
    ? "rounded-[28px] border border-white/10 bg-white/[0.04]"
    : "rounded-[28px] border border-[#E7E1D7] bg-white shadow-sm";

  const mutedText = isDark ? "text-white/50" : "text-gray-500";
  const softText = isDark ? "text-white/70" : "text-gray-600";
  const strongText = isDark ? "text-white" : "text-gray-900";

  const panelClass = isDark
    ? "border-white/10 bg-white/[0.04]"
    : "border-[#E7E1D7] bg-white shadow-sm";

  const inputClass = isDark
    ? "w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/90 placeholder:text-white/30 outline-none focus:border-white/20"
    : "w-full rounded-2xl border border-[#D9DDE5] bg-white px-4 py-3 text-sm text-[#111827] placeholder:text-[#9CA3AF] outline-none focus:border-[#93C5FD]";

  const textareaClass = isDark
    ? "w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/90 placeholder:text-white/30 outline-none focus:border-white/20"
    : "w-full resize-none rounded-2xl border border-[#D9DDE5] bg-white px-4 py-3 text-sm text-[#111827] placeholder:text-[#9CA3AF] outline-none focus:border-[#93C5FD]";

  const subtleButtonClass = isDark
    ? "rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 hover:bg-white/10"
    : "rounded-2xl border border-[#D8E4FF] bg-white px-4 py-3 text-sm text-[#374151] hover:bg-[#F8FBFF]";

  const primaryButtonClass = isDark
    ? "rounded-2xl border border-blue-500/25 bg-blue-500/15 px-4 py-3 text-sm font-semibold text-blue-200 hover:bg-blue-500/20"
    : "rounded-2xl border border-[#BFDBFE] bg-[#EAF3FF] px-4 py-3 text-sm font-semibold text-[#1D4ED8] hover:bg-[#DDEEFF]";

  const headerPillClass = isDark
    ? "inline-flex rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-[11px] font-semibold text-blue-200"
    : "inline-flex rounded-full border border-[#BFDBFE] bg-[#EAF3FF] px-3 py-1 text-[11px] font-semibold text-[#2563EB]";

  const tableHeadClass = isDark
    ? "bg-white/[0.03] text-xs text-white/50"
    : "bg-[#FAFBFC] text-xs text-[#6B7280]";

  const rowHoverClass = isDark ? "hover:bg-white/[0.03]" : "hover:bg-[#FAFBFF]";

  const modalSectionClass = isDark
    ? "rounded-3xl border border-white/10 bg-white/[0.03] p-4"
    : "rounded-3xl border border-gray-200 bg-gray-50 p-4";

  const modalSmallSectionClass = isDark
    ? "rounded-2xl border border-white/10 bg-white/[0.03] p-3"
    : "rounded-2xl border border-gray-200 bg-gray-50 p-3";

  const modalLabelClass = isDark
    ? "text-sm font-semibold text-white"
    : "text-sm font-semibold text-gray-900";

  const modalSmallLabelClass = isDark
    ? "text-xs font-semibold text-white"
    : "text-xs font-semibold text-gray-900";

  const modalHintClass = isDark ? "text-white/50" : "text-gray-500";

  const modalCancelButtonClass = isDark
    ? "rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/70 hover:bg-white/10"
    : "rounded-2xl border border-gray-200 bg-white px-4 py-2 text-xs text-gray-700 hover:bg-gray-50";

  const modalPrimaryButtonClass = isDark
    ? "rounded-2xl border border-blue-500/25 bg-blue-500/15 px-4 py-2 text-xs font-semibold text-blue-200 hover:bg-blue-500/20 disabled:opacity-50"
    : "rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50";

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

  async function loadPage() {
    setLoading(true);

    try {
      const [popupData, notificationData, userData] = await Promise.all([
        fetchJSON(`${API_BASE}/api/admin/popups`),
        fetchJSON(`${API_BASE}/api/admin/user-notifications`),
        fetchJSON(`${API_BASE}/api/admin/users`),
      ]);

      setPopups(Array.isArray(popupData.popups) ? popupData.popups : []);

      setNotifications(
        Array.isArray(notificationData.notifications)
          ? notificationData.notifications
          : []
      );

      setUsers(Array.isArray(userData.users) ? userData.users : []);
    } catch (e) {
      toast.error(e.message || "Failed to load page");
      setPopups([]);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPage();
  }, []);

  function resetPopupForm() {
    setPopupForm({
      title: "",
      message: "",
      targetType: "all",
      targetUsers: [],
      isActive: true,
    });

    setUserSearch("");
    setEditingId(null);
    setEditorMode("create");
  }

  function resetNotificationForm() {
    setNotificationForm({
      title: "",
      description: "",
      targetType: "all",
      targetUser: "",
    });

    setUserSearch("");
    setEditingId(null);
    setEditorMode("create");
  }

  function closeEditor() {
    setEditorOpen(false);
    resetPopupForm();
    resetNotificationForm();
  }

  function openCreatePopup() {
    resetPopupForm();
    setEditorType("popup");
    setEditorMode("create");
    setEditorOpen(true);
  }

  function openEditPopup(popup) {
    setEditorType("popup");
    setEditorMode("edit");
    setEditingId(popup._id);

    setPopupForm({
      title: popup.title || "",
      message: popup.message || "",
      targetType: popup.targetType === "specific" ? "specific" : "all",
      targetUsers: Array.isArray(popup.targetUsers)
        ? popup.targetUsers.map((u) => String(u._id || u))
        : [],
      isActive: Boolean(popup.isActive),
    });

    setUserSearch("");
    setEditorOpen(true);
  }

  function openCreateNotification() {
    resetNotificationForm();
    setEditorType("notification");
    setEditorMode("create");
    setEditorOpen(true);
  }

  async function savePopup() {
    const title = String(popupForm.title || "").trim();
    const message = String(popupForm.message || "").trim();
    const targetType = popupForm.targetType === "specific" ? "specific" : "all";

    if (!title) {
      toast.error("Title is required");
      return;
    }

    if (!message) {
      toast.error("Message is required");
      return;
    }

    if (targetType === "specific" && popupForm.targetUsers.length === 0) {
      toast.error("Pick at least 1 user");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        title,
        message,
        targetType,
        targetUsers: targetType === "specific" ? popupForm.targetUsers : [],
        isActive: Boolean(popupForm.isActive),
      };

      if (editorMode === "create") {
        const data = await fetchJSON(`${API_BASE}/api/admin/popups`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        setPopups((prev) => [data.popup, ...prev]);
        toast.success("Popup created");
      } else {
        const data = await fetchJSON(`${API_BASE}/api/admin/popups/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        setPopups((prev) =>
          prev.map((p) => (p._id === editingId ? data.popup : p))
        );

        toast.success("Popup updated");
      }

      closeEditor();
      await loadPage();
    } catch (e) {
      toast.error(e.message || "Failed to save popup");
    } finally {
      setSaving(false);
    }
  }

  async function saveNotification() {
    const title = String(notificationForm.title || "").trim();
    const description = String(notificationForm.description || "").trim();
    const targetType = notificationForm.targetType === "user" ? "user" : "all";
    const targetUser = String(notificationForm.targetUser || "").trim();

    if (!title) {
      toast.error("Notification title is required");
      return;
    }

    if (!description) {
      toast.error("Notification description is required");
      return;
    }

    if (targetType === "user" && !targetUser) {
      toast.error("Pick a user for this notification");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        title,
        description,
        targetType,
        targetUser: targetType === "user" ? targetUser : null,
      };

      const data = await fetchJSON(`${API_BASE}/api/admin/user-notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setNotifications((prev) => [data.notification, ...prev]);
      toast.success("Notification created");

      closeEditor();
      await loadPage();
    } catch (e) {
      toast.error(e.message || "Failed to create notification");
    } finally {
      setSaving(false);
    }
  }

  async function saveEditor() {
    if (editorType === "notification") {
      await saveNotification();
      return;
    }

    await savePopup();
  }

  async function togglePopupActive(popup) {
    setBusyId(popup._id);

    try {
      const data = await fetchJSON(`${API_BASE}/api/admin/popups/${popup._id}/active`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !popup.isActive }),
      });

      setPopups((prev) =>
        prev.map((p) => (p._id === popup._id ? data.popup : p))
      );

      toast.success(data.popup?.isActive ? "Popup activated" : "Popup deactivated");
    } catch (e) {
      toast.error(e.message || "Failed to update popup");
    } finally {
      setBusyId(null);
    }
  }

  async function deletePopup(popup) {
    const ok = window.confirm(`Delete popup "${popup.title}"?`);
    if (!ok) return;

    setBusyId(popup._id);

    try {
      await fetchJSON(`${API_BASE}/api/admin/popups/${popup._id}`, {
        method: "DELETE",
      });

      setPopups((prev) => prev.filter((p) => p._id !== popup._id));
      toast.success("Popup deleted");
    } catch (e) {
      toast.error(e.message || "Failed to delete popup");
    } finally {
      setBusyId(null);
    }
  }

  async function disableNotification(notification) {
    const ok = window.confirm(`Disable notification "${notification.title}"?`);
    if (!ok) return;

    setBusyId(notification._id);

    try {
      const data = await fetchJSON(
        `${API_BASE}/api/admin/user-notifications/${notification._id}/disable`,
        {
          method: "PATCH",
        }
      );

      setNotifications((prev) =>
        prev.map((n) => (n._id === notification._id ? data.notification : n))
      );

      toast.success("Notification disabled");
    } catch (e) {
      toast.error(e.message || "Failed to disable notification");
    } finally {
      setBusyId(null);
    }
  }

  const filteredPopups = useMemo(() => {
    const qq = String(q || "").trim().toLowerCase();

    return popups.filter((p) => {
      if (!qq) return true;

      return (
        String(p.title || "").toLowerCase().includes(qq) ||
        String(p.message || "").toLowerCase().includes(qq) ||
        String(p.targetType || "").toLowerCase().includes(qq)
      );
    });
  }, [popups, q]);

  const filteredNotifications = useMemo(() => {
    const qq = String(q || "").trim().toLowerCase();

    return notifications.filter((n) => {
      if (!qq) return true;

      return (
        String(n.title || "").toLowerCase().includes(qq) ||
        String(n.description || "").toLowerCase().includes(qq) ||
        String(n.targetType || "").toLowerCase().includes(qq)
      );
    });
  }, [notifications, q]);

  const notificationUserResults = useMemo(() => {
    const qq = String(userSearch || "").trim().toLowerCase();
  
    if (!qq) return [];
  
    return users
      .filter((u) => {
        return (
          String(u.phoneNumber || "").toLowerCase().includes(qq) ||
          String(u.uid || "").toLowerCase().includes(qq) ||
          String(u._id || "").toLowerCase().includes(qq)
        );
      })
      .slice(0, 30);
  }, [users, userSearch]);

  const activeTitle =
    activeTab === "notification" ? "User Notifications" : "Popup Management";

  const activeDescription =
    activeTab === "notification"
      ? "Create user notifications that appear inside the user front end notification area."
      : "Create platform-wide announcement popups, target everyone or selected users.";

  const createButtonText =
    activeTab === "notification" ? "+ New Notification" : "+ New Popup";

  const modalTitle =
    editorType === "notification"
      ? "Create Notification"
      : editorMode === "create"
      ? "Create Popup"
      : "Edit Popup";

  const modalSubtitle =
    editorType === "notification"
      ? "Send a notification to all users or one specific user"
      : editorMode === "create"
      ? "Create a global popup for users"
      : `Editing popup ${editingId || ""}`;

  return (
    <Shell title={activeTitle}>
      <div className="flex flex-col gap-4">
        <div className={classNames(cardClass, "relative overflow-hidden p-5")}>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.14),_transparent_35%)]" />

          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className={headerPillClass}>Admin Communication Center</div>

              <h2 className={`mt-3 text-2xl font-semibold tracking-tight ${strongText}`}>
                {activeTitle}
              </h2>

              <p className={`mt-2 max-w-2xl text-sm leading-6 ${softText}`}>
                {activeDescription}
              </p>

              <div
                className={classNames(
                  "mt-5 inline-flex rounded-2xl border p-1",
                  isDark
                    ? "border-white/10 bg-white/[0.03]"
                    : "border-[#E5E7EB] bg-[#F9FAFB]"
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("popup");
                    setQ("");
                  }}
                  className={classNames(
                    "rounded-xl px-4 py-2 text-xs font-semibold transition",
                    activeTab === "popup"
                      ? isDark
                        ? "bg-blue-500/20 text-blue-200"
                        : "bg-white text-[#1D4ED8] shadow-sm"
                      : isDark
                      ? "text-white/55 hover:text-white"
                      : "text-gray-500 hover:text-gray-900"
                  )}
                >
                  Popup
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("notification");
                    setQ("");
                  }}
                  className={classNames(
                    "rounded-xl px-4 py-2 text-xs font-semibold transition",
                    activeTab === "notification"
                      ? isDark
                        ? "bg-blue-500/20 text-blue-200"
                        : "bg-white text-[#1D4ED8] shadow-sm"
                      : isDark
                      ? "text-white/55 hover:text-white"
                      : "text-gray-500 hover:text-gray-900"
                  )}
                >
                  Notification
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={
                  activeTab === "notification"
                    ? "Search notifications..."
                    : "Search popups..."
                }
                className={`${inputClass} sm:w-64`}
              />

              <button
                type="button"
                onClick={loadPage}
                disabled={loading}
                className={`${subtleButtonClass} disabled:opacity-50`}
              >
                Refresh
              </button>

              <button
                type="button"
                onClick={
                  activeTab === "notification"
                    ? openCreateNotification
                    : openCreatePopup
                }
                className={primaryButtonClass}
              >
                {createButtonText}
              </button>
            </div>
          </div>
        </div>

        {activeTab === "popup" ? (
          <div className={classNames(panelClass, "overflow-hidden")}>
            <div
              className={classNames(
                "flex items-center justify-between px-5 py-4",
                isDark ? "border-b border-white/10" : "border-b border-[#EEF2F7]"
              )}
            >
              <div className={`text-sm font-semibold ${strongText}`}>
                Popups ({filteredPopups.length})
              </div>
              <div className={`text-xs ${mutedText}`}>
                Popup modal control center
              </div>
            </div>

            <div className="popup-table-scroll overflow-x-auto">
              <table className="min-w-[1650px] text-left text-sm">
                <thead className={tableHeadClass}>
                  <tr>
                    <th className="w-[240px] px-5 py-3">Title</th>
                    <th className="w-[520px] px-5 py-3">Message</th>
                    <th className="w-[140px] px-5 py-3">Target</th>
                    <th className="w-[180px] px-5 py-3">Users</th>
                    <th className="w-[130px] px-5 py-3">Status</th>
                    <th className="w-[220px] px-5 py-3">Created</th>
                    <th className="w-[220px] px-5 py-3">Actions</th>
                  </tr>
                </thead>

                <tbody
                  className={
                    isDark
                      ? "divide-y divide-white/10"
                      : "divide-y divide-[#EEF2F7]"
                  }
                >
                  {loading ? (
                    <tr>
                      <td colSpan={7} className={`px-5 py-6 text-sm ${softText}`}>
                        Loading popups...
                      </td>
                    </tr>
                  ) : filteredPopups.length === 0 ? (
                    <tr>
                      <td colSpan={7} className={`px-5 py-6 text-sm ${softText}`}>
                        No popups found.
                      </td>
                    </tr>
                  ) : (
                    filteredPopups.map((popup) => {
                      const targetUsers = Array.isArray(popup.targetUsers)
                        ? popup.targetUsers
                        : [];
                      const isBusy = busyId === popup._id;

                      return (
                        <tr key={popup._id} className={rowHoverClass}>
                          <td className="px-5 py-4 align-top">
                            <div className="max-w-[240px]">
                              <div
                                className={`truncate text-sm font-semibold ${strongText}`}
                              >
                                {popup.title || "-"}
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4 align-top">
                            <div
                              className={`max-w-[520px] whitespace-pre-wrap break-words text-sm leading-7 ${softText}`}
                            >
                              {popup.message || "-"}
                            </div>
                          </td>

                          <td className="px-5 py-4 align-top">
                            <span
                              className={classNames(
                                "inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold",
                                popup.targetType === "specific"
                                  ? isDark
                                    ? "bg-violet-500/15 text-violet-200"
                                    : "border border-violet-200 bg-violet-50 text-violet-700"
                                  : isDark
                                  ? "bg-emerald-500/15 text-emerald-200"
                                  : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                              )}
                            >
                              {popup.targetType === "specific"
                                ? "Specific users"
                                : "All users"}
                            </span>
                          </td>

                          <td className="px-5 py-4 align-top">
                            {popup.targetType === "specific" ? (
                              <div className="max-w-[240px]">
                                <div className={`text-sm ${strongText}`}>
                                  {targetUsers.length} selected
                                </div>
                                <div className={`mt-1 text-[11px] ${mutedText}`}>
                                  {targetUsers
                                    .slice(0, 2)
                                    .map((u) => `UID: ${u?.uid || "-"}`)
                                    .join(", ")}
                                  {targetUsers.length > 2 ? " ..." : ""}
                                </div>
                              </div>
                            ) : (
                              <span className={`text-sm ${softText}`}>
                                Everyone
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4 align-top">
                            <span
                              className={classNames(
                                "inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold",
                                popup.isActive
                                  ? isDark
                                    ? "bg-blue-500/15 text-blue-200"
                                    : "border border-blue-200 bg-blue-50 text-blue-700"
                                  : isDark
                                  ? "bg-white/10 text-white/60"
                                  : "border border-gray-200 bg-gray-50 text-gray-600"
                              )}
                            >
                              {popup.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>

                          <td className={`px-5 py-4 align-top text-sm ${softText}`}>
                            {formatDate(popup.createdAt)}
                          </td>

                          <td className="px-5 py-4 align-top">
                            <div className="flex items-center gap-2 whitespace-nowrap">
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => openEditPopup(popup)}
                                className={
                                  isDark
                                    ? "rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10 disabled:opacity-50"
                                    : "rounded-2xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                }
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => togglePopupActive(popup)}
                                className={classNames(
                                  "rounded-2xl border px-3 py-2 text-xs font-medium disabled:opacity-50",
                                  popup.isActive
                                    ? isDark
                                      ? "border-orange-500/25 bg-orange-500/10 text-orange-200 hover:bg-orange-500/15"
                                      : "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
                                    : isDark
                                    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15"
                                    : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                )}
                              >
                                {popup.isActive ? "Deactivate" : "Activate"}
                              </button>

                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => deletePopup(popup)}
                                className={
                                  isDark
                                    ? "rounded-2xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-200 hover:bg-red-500/15 disabled:opacity-50"
                                    : "rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 hover:bg-red-100 disabled:opacity-50"
                                }
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
        ) : (
          <div className={classNames(panelClass, "overflow-hidden")}>
            <div
              className={classNames(
                "flex items-center justify-between px-5 py-4",
                isDark ? "border-b border-white/10" : "border-b border-[#EEF2F7]"
              )}
            >
              <div className={`text-sm font-semibold ${strongText}`}>
                Notifications ({filteredNotifications.length})
              </div>
              <div className={`text-xs ${mutedText}`}>
                User notification control center
              </div>
            </div>

            <div className="popup-table-scroll overflow-x-auto">
              <table className="min-w-[1300px] text-left text-sm">
                <thead className={tableHeadClass}>
                  <tr>
                    <th className="w-[260px] px-5 py-3">Title</th>
                    <th className="w-[560px] px-5 py-3">Description</th>
                    <th className="w-[160px] px-5 py-3">Target</th>
                    <th className="w-[130px] px-5 py-3">Status</th>
                    <th className="w-[220px] px-5 py-3">Created</th>
                    <th className="w-[180px] px-5 py-3">Actions</th>
                  </tr>
                </thead>

                <tbody
                  className={
                    isDark
                      ? "divide-y divide-white/10"
                      : "divide-y divide-[#EEF2F7]"
                  }
                >
                  {loading ? (
                    <tr>
                      <td colSpan={6} className={`px-5 py-6 text-sm ${softText}`}>
                        Loading notifications...
                      </td>
                    </tr>
                  ) : filteredNotifications.length === 0 ? (
                    <tr>
                      <td colSpan={6} className={`px-5 py-6 text-sm ${softText}`}>
                        No notifications found.
                      </td>
                    </tr>
                  ) : (
                    filteredNotifications.map((notification) => {
                      const isBusy = busyId === notification._id;

                      return (
                        <tr key={notification._id} className={rowHoverClass}>
                          <td className="px-5 py-4 align-top">
                            <div className="max-w-[260px]">
                              <div
                                className={`truncate text-sm font-semibold ${strongText}`}
                              >
                                {notification.title || "-"}
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4 align-top">
                            <div
                              className={`max-w-[560px] whitespace-pre-wrap break-words text-sm leading-7 ${softText}`}
                            >
                              {notification.description || "-"}
                            </div>
                          </td>

                          <td className="px-5 py-4 align-top">
                            <span
                              className={classNames(
                                "inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold",
                                notification.targetType === "user"
                                  ? isDark
                                    ? "bg-violet-500/15 text-violet-200"
                                    : "border border-violet-200 bg-violet-50 text-violet-700"
                                  : isDark
                                  ? "bg-emerald-500/15 text-emerald-200"
                                  : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                              )}
                            >
                              {notification.targetType === "user"
                                ? "Specific user"
                                : "All users"}
                            </span>
                          </td>

                          <td className="px-5 py-4 align-top">
                            <span
                              className={classNames(
                                "inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold",
                                notification.isActive
                                  ? isDark
                                    ? "bg-blue-500/15 text-blue-200"
                                    : "border border-blue-200 bg-blue-50 text-blue-700"
                                  : isDark
                                  ? "bg-white/10 text-white/60"
                                  : "border border-gray-200 bg-gray-50 text-gray-600"
                              )}
                            >
                              {notification.isActive ? "Active" : "Disabled"}
                            </span>
                          </td>

                          <td className={`px-5 py-4 align-top text-sm ${softText}`}>
                            {formatDate(notification.createdAt)}
                          </td>

                          <td className="px-5 py-4 align-top">
                            <button
                              type="button"
                              disabled={isBusy || !notification.isActive}
                              onClick={() => disableNotification(notification)}
                              className={
                                isDark
                                  ? "rounded-2xl border border-orange-500/25 bg-orange-500/10 px-3 py-2 text-xs text-orange-200 hover:bg-orange-500/15 disabled:opacity-50"
                                  : "rounded-2xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-700 hover:bg-orange-100 disabled:opacity-50"
                              }
                            >
                              Disable
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Modal
        open={editorOpen}
        wide
        title={modalTitle}
        subtitle={modalSubtitle}
        onClose={closeEditor}
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={closeEditor}
              className={modalCancelButtonClass}
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={saveEditor}
              className={modalPrimaryButtonClass}
            >
              {saving
                ? editorType === "notification"
                  ? "Creating..."
                  : editorMode === "create"
                  ? "Creating..."
                  : "Saving..."
                : editorType === "notification"
                ? "Create Notification"
                : editorMode === "create"
                ? "Create Popup"
                : "Save Changes"}
            </button>
          </div>
        }
      >
        {editorType === "notification" ? (
          <div className="grid gap-4 lg:grid-cols-1">
            <div className={modalSectionClass}>
              <div className={`mb-3 ${modalLabelClass}`}>
                Notification Content
              </div>

              <div className="space-y-3">
                <div>
                  <div className={`mb-2 text-xs ${modalHintClass}`}>Title</div>
                  <input
                    value={notificationForm.title}
                    onChange={(e) =>
                      setNotificationForm((p) => ({
                        ...p,
                        title: e.target.value,
                      }))
                    }
                    placeholder="Example: Deposit Successful"
                    className={inputClass}
                  />
                </div>

                <div>
                  <div className={`mb-2 text-xs ${modalHintClass}`}>
                    Description
                  </div>
                  <textarea
                    value={notificationForm.description}
                    onChange={(e) =>
                      setNotificationForm((p) => ({
                        ...p,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Write the notification description here..."
                    rows={8}
                    className={textareaClass}
                  />
                </div>
              </div>
            </div>

            <div className={modalSectionClass}>
              <div className={`mb-3 ${modalLabelClass}`}>Audience</div>

              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() =>
                    setNotificationForm((p) => ({
                      ...p,
                      targetType: "all",
                      targetUser: "",
                    }))
                  }
                  className={classNames(
                    "rounded-3xl border px-4 py-4 text-left transition",
                    notificationForm.targetType === "all"
                      ? isDark
                        ? "border-emerald-500/35 bg-emerald-500/10"
                        : "border-emerald-200 bg-emerald-50"
                      : isDark
                      ? "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                      : "border-gray-200 bg-white hover:bg-gray-50"
                  )}
                >
                  <div className={`text-sm font-semibold ${strongText}`}>
                    All Users
                  </div>
                  <div className={`mt-1 text-xs ${mutedText}`}>
                    Send this notification to everyone
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setNotificationForm((p) => ({
                      ...p,
                      targetType: "user",
                    }))
                  }
                  className={classNames(
                    "rounded-3xl border px-4 py-4 text-left transition",
                    notificationForm.targetType === "user"
                      ? isDark
                        ? "border-violet-500/35 bg-violet-500/10"
                        : "border-violet-200 bg-violet-50"
                      : isDark
                      ? "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                      : "border-gray-200 bg-white hover:bg-gray-50"
                  )}
                >
                  <div className={`text-sm font-semibold ${strongText}`}>
                    Specific User
                  </div>
                  <div className={`mt-1 text-xs ${mutedText}`}>
                    Send this notification to one user
                  </div>
                </button>
              </div>
            </div>

            {notificationForm.targetType === "user" ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3">
                  <div className={modalSmallSectionClass}>
                    <div className={modalSmallLabelClass}>Search users</div>
                    <input
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search UID / phone / user id..."
                      className={`mt-2 ${inputClass}`}
                    />
                  </div>

                  <div className={modalSmallSectionClass}>
                    <div className="mb-3 flex items-center justify-between">
                      <div className={modalSmallLabelClass}>Pick user</div>
                      <div className={`text-[11px] ${mutedText}`}>
                        {notificationForm.targetUser ? "1 selected" : "0 selected"}
                      </div>
                    </div>

                    <div className="grid gap-2">
                      {notificationUserResults.length === 0 ? (
                        <div
                          className={
                            isDark
                              ? "rounded-xl border border-dashed border-white/10 px-3 py-4 text-xs text-white/50"
                              : "rounded-xl border border-dashed border-gray-300 px-3 py-4 text-xs text-gray-500"
                          }
                        >
                          {String(userSearch || "").trim()
                            ? "No users found"
                            : "Enter UID to search users"}
                        </div>
                      ) : (
                        notificationUserResults.map((u) => {
                          const active =
                            String(notificationForm.targetUser) === String(u._id);

                          return (
                            <button
                              key={u._id}
                              type="button"
                              onClick={() =>
                                setNotificationForm((p) => ({
                                  ...p,
                                  targetUser: String(u._id),
                                }))
                              }
                              className={classNames(
                                "flex items-center justify-between rounded-2xl border px-3 py-3 text-left transition",
                                active
                                  ? isDark
                                    ? "border-blue-500/35 bg-blue-500/10"
                                    : "border-blue-200 bg-blue-50"
                                  : isDark
                                  ? "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                                  : "border-gray-200 bg-white hover:bg-gray-50"
                              )}
                            >
                              <div>
                                <div className={`text-sm font-semibold ${strongText}`}>
                                  UID: {u.uid || "-"}
                                </div>
                                <div className={`mt-1 text-[12px] ${mutedText}`}>
                                  Phone: {u.phoneNumber || "-"}
                                </div>
                              </div>

                              <div
                                className={classNames(
                                  "rounded-full px-2.5 py-1 text-[10px] font-semibold",
                                  active
                                    ? isDark
                                      ? "bg-blue-500/20 text-blue-200"
                                      : "bg-blue-100 text-blue-700"
                                    : isDark
                                    ? "bg-white/5 text-white/60"
                                    : "bg-gray-100 text-gray-600"
                                )}
                              >
                                {active ? "Selected" : "Select"}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                <div className={modalSmallSectionClass}>
                  <div className="mb-3 flex items-center justify-between">
                    <div className={modalSmallLabelClass}>Selected user</div>
                  </div>

                  {!notificationForm.targetUser ? (
                    <div
                      className={
                        isDark
                          ? "rounded-xl border border-dashed border-white/10 px-3 py-4 text-xs text-white/50"
                          : "rounded-xl border border-dashed border-gray-300 px-3 py-4 text-xs text-gray-500"
                      }
                    >
                      No user selected
                    </div>
                  ) : (
                    (() => {
                      const picked = users.find(
                        (u) => String(u._id) === String(notificationForm.targetUser)
                      );

                      return (
                        <div
                          className={
                            isDark
                              ? "flex items-center justify-between rounded-2xl border border-blue-500/25 bg-blue-500/10 px-3 py-3"
                              : "flex items-center justify-between rounded-2xl border border-blue-200 bg-blue-50 px-3 py-3"
                          }
                        >
                          <div>
                            <div className={`text-sm font-semibold ${strongText}`}>
                              UID: {picked?.uid || "-"}
                            </div>
                            <div className={`mt-1 text-[12px] ${mutedText}`}>
                              Phone: {picked?.phoneNumber || "-"}
                            </div>
                            <div className={`mt-1 text-[11px] ${mutedText}`}>
                              ID: {notificationForm.targetUser}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              setNotificationForm((p) => ({
                                ...p,
                                targetUser: "",
                              }))
                            }
                            className={modalCancelButtonClass}
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })()
                  )}
                </div>
              </div>
            ) : null}

            <div className={modalSectionClass}>
              <div className={`mb-2 ${modalLabelClass}`}>Quick Tips</div>
              <ul className={`space-y-2 text-xs leading-6 ${mutedText}`}>
                <li>• Notifications are shown inside the user front end</li>
                <li>• Use all users for platform-wide messages</li>
                <li>• Use specific user for manual account messages</li>
                <li>• Keep the title short and the description clear</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-1">
            <div className="space-y-4">
              <div className={modalSectionClass}>
                <div className={`mb-3 ${modalLabelClass}`}>Popup Content</div>

                <div className="space-y-3">
                  <div>
                    <div className={`mb-2 text-xs ${modalHintClass}`}>Title</div>
                    <input
                      value={popupForm.title}
                      onChange={(e) =>
                        setPopupForm((p) => ({ ...p, title: e.target.value }))
                      }
                      placeholder="Example: Important Security Notice"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <div className={`mb-2 text-xs ${modalHintClass}`}>Message</div>
                    <textarea
                      value={popupForm.message}
                      onChange={(e) =>
                        setPopupForm((p) => ({ ...p, message: e.target.value }))
                      }
                      placeholder="Write the popup message here..."
                      rows={8}
                      className={textareaClass}
                    />
                  </div>
                </div>
              </div>

              <div className={modalSectionClass}>
                <div className={`mb-3 ${modalLabelClass}`}>Audience</div>

                <div className="grid gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPopupForm((p) => ({
                        ...p,
                        targetType: "all",
                        targetUsers: [],
                      }))
                    }
                    className={classNames(
                      "rounded-3xl border px-4 py-4 text-left transition",
                      popupForm.targetType === "all"
                        ? isDark
                          ? "border-emerald-500/35 bg-emerald-500/10"
                          : "border-emerald-200 bg-emerald-50"
                        : isDark
                        ? "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                        : "border-gray-200 bg-white hover:bg-gray-50"
                    )}
                  >
                    <div className={`text-sm font-semibold ${strongText}`}>
                      All Users
                    </div>
                    <div className={`mt-1 text-xs ${mutedText}`}>
                      Show this popup to every user
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setPopupForm((p) => ({ ...p, targetType: "specific" }))
                    }
                    className={classNames(
                      "rounded-3xl border px-4 py-4 text-left transition",
                      popupForm.targetType === "specific"
                        ? isDark
                          ? "border-violet-500/35 bg-violet-500/10"
                          : "border-violet-200 bg-violet-50"
                        : isDark
                        ? "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                        : "border-gray-200 bg-white hover:bg-gray-50"
                    )}
                  >
                    <div className={`text-sm font-semibold ${strongText}`}>
                      Specific Users
                    </div>
                    <div className={`mt-1 text-xs ${mutedText}`}>
                      Pick exactly who should see this popup
                    </div>
                  </button>
                </div>
              </div>

              {popupForm.targetType === "specific" ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-3">
                    <div className={modalSmallSectionClass}>
                      <div className={modalSmallLabelClass}>Search users</div>
                      <input
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        placeholder="Search UID / phone..."
                        className={`mt-2 ${inputClass}`}
                      />
                    </div>

                    <UserPicker
                      selectedUsers={popupForm.targetUsers}
                      setSelectedUsers={(cbOrValue) => {
                        if (typeof cbOrValue === "function") {
                          setPopupForm((p) => ({
                            ...p,
                            targetUsers: cbOrValue(p.targetUsers),
                          }));
                        } else {
                          setPopupForm((p) => ({
                            ...p,
                            targetUsers: cbOrValue,
                          }));
                        }
                      }}
                      allUsers={users}
                      search={userSearch}
                      setSearch={setUserSearch}
                      hideSearch
                      hideSelected
                    />
                  </div>

                  <div className={modalSmallSectionClass}>
                    <div className="mb-3 flex items-center justify-between">
                      <div className={modalSmallLabelClass}>Selected users</div>
                      <div className={`text-[11px] ${mutedText}`}>
                        Total: {popupForm.targetUsers.length}
                      </div>
                    </div>

                    {popupForm.targetUsers.length === 0 ? (
                      <div
                        className={
                          isDark
                            ? "rounded-xl border border-dashed border-white/10 px-3 py-4 text-xs text-white/50"
                            : "rounded-xl border border-dashed border-gray-300 px-3 py-4 text-xs text-gray-500"
                        }
                      >
                        No users selected
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        {popupForm.targetUsers.map((id) => {
                          const picked = users.find(
                            (u) => String(u._id) === String(id)
                          );

                          return (
                            <div
                              key={id}
                              className={
                                isDark
                                  ? "flex items-center justify-between rounded-2xl border border-blue-500/25 bg-blue-500/10 px-3 py-3"
                                  : "flex items-center justify-between rounded-2xl border border-blue-200 bg-blue-50 px-3 py-3"
                              }
                            >
                              <div>
                                <div className={`text-sm font-semibold ${strongText}`}>
                                  UID: {picked?.uid || "-"}
                                </div>
                                <div className={`mt-1 text-[12px] ${mutedText}`}>
                                  Phone: {picked?.phoneNumber || "-"}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  setPopupForm((p) => ({
                                    ...p,
                                    targetUsers: p.targetUsers.filter(
                                      (x) => String(x) !== String(id)
                                    ),
                                  }))
                                }
                                className={modalCancelButtonClass}
                              >
                                Remove
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-4">
              <div className={modalSectionClass}>
                <div className={`mb-3 ${modalLabelClass}`}>Status</div>

                <button
                  type="button"
                  onClick={() =>
                    setPopupForm((p) => ({ ...p, isActive: !p.isActive }))
                  }
                  className={classNames(
                    "flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition",
                    popupForm.isActive
                      ? isDark
                        ? "border-blue-500/35 bg-blue-500/10"
                        : "border-blue-200 bg-blue-50"
                      : isDark
                      ? "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                      : "border-gray-200 bg-white hover:bg-gray-50"
                  )}
                >
                  <div>
                    <div className={`text-sm font-semibold ${strongText}`}>
                      {popupForm.isActive ? "Active" : "Inactive"}
                    </div>
                    <div className={`mt-1 text-xs ${mutedText}`}>
                      {popupForm.isActive
                        ? "Users can receive this popup now"
                        : "Saved, but hidden until activated"}
                    </div>
                  </div>

                  <div
                    className={classNames(
                      "rounded-full px-2.5 py-1 text-[10px] font-semibold",
                      popupForm.isActive
                        ? isDark
                          ? "bg-blue-500/20 text-blue-200"
                          : "bg-blue-100 text-blue-700"
                        : isDark
                        ? "bg-white/10 text-white/60"
                        : "bg-gray-100 text-gray-600"
                    )}
                  >
                    {popupForm.isActive ? "ON" : "OFF"}
                  </div>
                </button>
              </div>

              <div className={modalSectionClass}>
                <div className={`mb-2 ${modalLabelClass}`}>Quick Tips</div>
                <ul className={`space-y-2 text-xs leading-6 ${mutedText}`}>
                  <li>• Best titles are short and direct</li>
                  <li>• Keep message under 5 short lines if possible</li>
                  <li>• Use “specific users” for manual targeting</li>
                  <li>• Use inactive if you want to save first and publish later</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </Shell>
  );
}