import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserCog,
  Users,
} from "lucide-react";
import { toast } from "react-toastify";
import Shell from "../components/Shell";
import { api } from "../api";
import { useTheme } from "../context/ThemeContext";

const EMPTY_MY_PASSWORD = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const EMPTY_RESET_PASSWORD = {
  adminId: "",
  newPassword: "",
  confirmPassword: "",
};

function readAdminProfile() {
  try {
    const raw = localStorage.getItem("admin_profile");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export default function AdminSettings() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [adminProfile, setAdminProfile] = useState({});
  const [admins, setAdmins] = useState([]);

  const [myPasswordForm, setMyPasswordForm] = useState(EMPTY_MY_PASSWORD);
  const [resetPasswordForm, setResetPasswordForm] =
    useState(EMPTY_RESET_PASSWORD);

  const [showMyCurrentPassword, setShowMyCurrentPassword] = useState(false);
  const [showMyNewPassword, setShowMyNewPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [changingMyPassword, setChangingMyPassword] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  const isSuperAdmin = adminProfile?.role === "super_admin";

  const selectedAdmin = useMemo(() => {
    return admins.find((admin) => admin._id === resetPasswordForm.adminId);
  }, [admins, resetPasswordForm.adminId]);

  useEffect(() => {
    const profile = readAdminProfile();
    setAdminProfile(profile);

    if (profile?.role === "super_admin") {
      loadAdmins();
    }
  }, []);

  async function loadAdmins() {
    try {
      setLoadingAdmins(true);

      const res = await api.get("/api/admin-settings/admins");
      const list = Array.isArray(res.data?.data) ? res.data.data : [];

      setAdmins(list);
    } catch (err) {
      console.error("Load admins error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to load admins",
      );
    } finally {
      setLoadingAdmins(false);
    }
  }

  function updateMyPassword(field, value) {
    setMyPasswordForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function updateResetPassword(field, value) {
    setResetPasswordForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function validatePasswordPair(newPassword, confirmPassword) {
    if (!newPassword || !confirmPassword) {
      toast.error("New password and confirm password are required");
      return false;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return false;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return false;
    }

    return true;
  }

  async function handleChangeMyPassword(e) {
    e.preventDefault();

    if (!myPasswordForm.currentPassword) {
      toast.error("Current password is required");
      return;
    }

    if (
      !validatePasswordPair(
        myPasswordForm.newPassword,
        myPasswordForm.confirmPassword,
      )
    ) {
      return;
    }

    try {
      setChangingMyPassword(true);

      const res = await api.patch("/api/admin-settings/me/password", {
        currentPassword: myPasswordForm.currentPassword,
        newPassword: myPasswordForm.newPassword,
      });

      toast.success(res.data?.message || "Password changed successfully");
      setMyPasswordForm(EMPTY_MY_PASSWORD);

      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_profile");
    } catch (err) {
      console.error("Change my password error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to change password",
      );
    } finally {
      setChangingMyPassword(false);
    }
  }

  async function handleResetAdminPassword(e) {
    e.preventDefault();

    if (!resetPasswordForm.adminId) {
      toast.error("Select an admin first");
      return;
    }

    if (
      !validatePasswordPair(
        resetPasswordForm.newPassword,
        resetPasswordForm.confirmPassword,
      )
    ) {
      return;
    }

    try {
      setResettingPassword(true);

      const res = await api.patch(
        `/api/admin-settings/admins/${resetPasswordForm.adminId}/password`,
        {
          newPassword: resetPasswordForm.newPassword,
        },
      );

      toast.success(res.data?.message || "Admin password reset successfully");
      setResetPasswordForm(EMPTY_RESET_PASSWORD);
    } catch (err) {
      console.error("Reset admin password error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to reset admin password",
      );
    } finally {
      setResettingPassword(false);
    }
  }

  return (
    <Shell title="Settings">
      <div
        className={`-mx-3 -my-3 h-[calc(100vh-78px)] overflow-hidden px-4 py-4 ${
          isDark ? "bg-[#222326]" : "bg-[#f2eee7]"
        }`}
      >
        <div className="mx-auto flex h-full max-w-[1600px] flex-col gap-3">
          <TopBar
            isDark={isDark}
            adminProfile={adminProfile}
            isSuperAdmin={isSuperAdmin}
            loading={loadingAdmins}
            onRefresh={loadAdmins}
          />

          <div className="grid grid-cols-4 gap-3">
            <MiniMetric
              isDark={isDark}
              icon={ShieldCheck}
              label="Role"
              value={isSuperAdmin ? "Super" : "Admin"}
            />
            <MiniMetric
              isDark={isDark}
              icon={UserCog}
              label="Username"
              value={adminProfile?.username || "Admin"}
            />
            <MiniMetric
              isDark={isDark}
              icon={Users}
              label="Admins"
              value={isSuperAdmin ? admins.length : "-"}
            />
            <MiniMetric
              isDark={isDark}
              icon={KeyRound}
              label="Security"
              value="Active"
            />
          </div>

          <div
            className={`grid min-h-0 flex-1 gap-3 ${
              isSuperAdmin
                ? "xl:grid-cols-[1fr_1.05fr_0.9fr]"
                : "xl:grid-cols-[1fr_1fr]"
            }`}
          >
            <CompactPanel
              isDark={isDark}
              title="My Password"
              icon={LockKeyhole}
            >
              <form onSubmit={handleChangeMyPassword} className="grid gap-3">
                <Field isDark={isDark} label="Current Password">
                  <PasswordInput
                    isDark={isDark}
                    value={myPasswordForm.currentPassword}
                    onChange={(value) =>
                      updateMyPassword("currentPassword", value)
                    }
                    show={showMyCurrentPassword}
                    onToggle={() => setShowMyCurrentPassword((prev) => !prev)}
                    placeholder="Enter current password"
                  />
                </Field>

                <Field isDark={isDark} label="New Password">
                  <PasswordInput
                    isDark={isDark}
                    value={myPasswordForm.newPassword}
                    onChange={(value) => updateMyPassword("newPassword", value)}
                    show={showMyNewPassword}
                    onToggle={() => setShowMyNewPassword((prev) => !prev)}
                    placeholder="Enter new password"
                  />
                </Field>

                <Field isDark={isDark} label="Confirm New Password">
                  <PasswordInput
                    isDark={isDark}
                    value={myPasswordForm.confirmPassword}
                    onChange={(value) =>
                      updateMyPassword("confirmPassword", value)
                    }
                    show={showMyNewPassword}
                    onToggle={() => setShowMyNewPassword((prev) => !prev)}
                    placeholder="Confirm new password"
                  />
                </Field>

                <div
                  className={`rounded-[18px] border p-3 text-[11px] leading-5 ${
                    isDark
                      ? "border-white/[0.06] bg-[#292a2f] text-white/42"
                      : "border-[#eee4d5] bg-[#f7f2ea] text-[#70675c]"
                  }`}
                >
                  After changing your own password, login again with the new
                  password.
                </div>

                <button
                  type="submit"
                  disabled={changingMyPassword}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-[18px] bg-[#d8c49a] px-4 text-[13px] font-semibold text-[#171719] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {changingMyPassword ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Change My Password
                </button>
              </form>
            </CompactPanel>

            {isSuperAdmin && (
              <CompactPanel
                isDark={isDark}
                title="Reset Admin Password"
                icon={UserCog}
              >
                <form
                  onSubmit={handleResetAdminPassword}
                  className="grid gap-3"
                >
                  <Field isDark={isDark} label="Select Admin">
                    <select
                      value={resetPasswordForm.adminId}
                      onChange={(e) =>
                        updateResetPassword("adminId", e.target.value)
                      }
                      className={inputClass(isDark)}
                    >
                      <option value="">Choose admin</option>

                      {admins.map((admin) => (
                        <option key={admin._id} value={admin._id}>
                          {admin.username || admin.name || "Admin"} ·{" "}
                          {admin.role || "admin"}
                        </option>
                      ))}
                    </select>
                  </Field>

                  {selectedAdmin && (
                    <div
                      className={`rounded-[18px] border p-3 ${
                        isDark
                          ? "border-[#d8c49a]/20 bg-[#d8c49a]/10 text-white"
                          : "border-[#d8c49a] bg-[#fff8e8] text-[#201d19]"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#d8c49a]" />

                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-semibold">
                            {selectedAdmin.username ||
                              selectedAdmin.name ||
                              "Admin"}
                          </div>

                          <div
                            className={`mt-0.5 truncate text-[11px] ${
                              isDark ? "text-white/42" : "text-[#70675c]"
                            }`}
                          >
                            Role: {selectedAdmin.role || "admin"}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <Field isDark={isDark} label="New Password">
                    <PasswordInput
                      isDark={isDark}
                      value={resetPasswordForm.newPassword}
                      onChange={(value) =>
                        updateResetPassword("newPassword", value)
                      }
                      show={showResetPassword}
                      onToggle={() => setShowResetPassword((prev) => !prev)}
                      placeholder="Enter new password"
                    />
                  </Field>

                  <Field isDark={isDark} label="Confirm New Password">
                    <PasswordInput
                      isDark={isDark}
                      value={resetPasswordForm.confirmPassword}
                      onChange={(value) =>
                        updateResetPassword("confirmPassword", value)
                      }
                      show={showResetPassword}
                      onToggle={() => setShowResetPassword((prev) => !prev)}
                      placeholder="Confirm new password"
                    />
                  </Field>

                  <button
                    type="submit"
                    disabled={resettingPassword || !resetPasswordForm.adminId}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-[18px] bg-[#d8c49a] px-4 text-[13px] font-semibold text-[#171719] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {resettingPassword ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <KeyRound className="h-4 w-4" />
                    )}
                    Reset Password
                  </button>
                </form>
              </CompactPanel>
            )}

            <CompactPanel isDark={isDark} title="Account Access" icon={Users}>
              <div className="grid gap-3">
                <InfoCard
                  isDark={isDark}
                  icon={ShieldCheck}
                  label="Current Access"
                  title={isSuperAdmin ? "Super Admin" : "Admin"}
                  text={
                    isSuperAdmin
                      ? "You can change your own password and reset passwords for other admins."
                      : "You can change your own password only."
                  }
                />

                <InfoCard
                  isDark={isDark}
                  icon={LockKeyhole}
                  label="Password Rule"
                  title="Minimum 6 characters"
                  text="Use a strong password and keep it private."
                />

                {isSuperAdmin ? (
                  <button
                    type="button"
                    onClick={loadAdmins}
                    disabled={loadingAdmins}
                    className={secondaryButton(isDark)}
                  >
                    {loadingAdmins ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    Refresh Admin List
                  </button>
                ) : (
                  <div
                    className={`rounded-[18px] border p-3 text-[11px] leading-5 ${
                      isDark
                        ? "border-white/[0.06] bg-[#292a2f] text-white/42"
                        : "border-[#eee4d5] bg-[#f7f2ea] text-[#70675c]"
                    }`}
                  >
                    Admin list and reset tools are only available for super
                    admin accounts.
                  </div>
                )}
              </div>
            </CompactPanel>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function TopBar({ isDark, adminProfile, isSuperAdmin, loading, onRefresh }) {
  return (
    <div
      className={`flex items-center justify-between rounded-[24px] border p-4 ${
        isDark
          ? "border-white/[0.06] bg-[#282a30]"
          : "border-[#eee4d5] bg-white"
      }`}
    >
      <div>
        <div
          className={`text-[11px] font-medium uppercase tracking-[0.18em] ${
            isDark ? "text-white/38" : "text-[#8a8176]"
          }`}
        >
          Admin Security
        </div>

        <h2
          className={`mt-1 text-[22px] font-semibold tracking-[-0.04em] ${
            isDark ? "text-white" : "text-[#201d19]"
          }`}
        >
          Settings
        </h2>

        <p
          className={`mt-1 text-[12px] ${
            isDark ? "text-white/42" : "text-[#70675c]"
          }`}
        >
          {adminProfile?.username || "Admin"} ·{" "}
          {isSuperAdmin ? "super admin access" : "admin access"}
        </p>
      </div>

      {isSuperAdmin && (
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className={secondaryButton(isDark)}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </button>
      )}
    </div>
  );
}

function CompactPanel({ isDark, title, icon: Icon, children }) {
  return (
    <div
      className={`min-h-0 rounded-[24px] border p-3 ${
        isDark
          ? "border-white/[0.06] bg-[#282a30] text-white"
          : "border-[#eee4d5] bg-white text-[#201d19]"
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[15px] bg-[#d8c49a] text-[#171719]">
            <Icon className="h-4 w-4" />
          </div>

          <div className="truncate text-[14px] font-semibold">{title}</div>
        </div>
      </div>

      {children}
    </div>
  );
}

function Field({ isDark, label, children }) {
  return (
    <label className="block">
      <div
        className={`mb-1 text-[11px] font-medium ${
          isDark ? "text-white/38" : "text-[#70675c]"
        }`}
      >
        {label}
      </div>

      {children}
    </label>
  );
}

function PasswordInput({
  isDark,
  value,
  onChange,
  show,
  onToggle,
  placeholder,
}) {
  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={show ? "text" : "password"}
        autoComplete="off"
        placeholder={placeholder}
        className={`${inputClass(isDark)} pr-11`}
      />

      <button
        type="button"
        onClick={onToggle}
        className={`absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[12px] transition ${
          isDark
            ? "text-white/38 hover:bg-white/[0.08] hover:text-white"
            : "text-[#9b9081] hover:bg-[#f7f2ea] hover:text-[#201d19]"
        }`}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function MiniMetric({ isDark, icon: Icon, label, value }) {
  return (
    <div
      className={`rounded-[16px] border p-3 ${
        isDark
          ? "border-white/[0.06] bg-[#292a2f]"
          : "border-[#eee4d5] bg-[#f7f2ea]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div
          className={`text-[11px] ${
            isDark ? "text-white/38" : "text-[#70675c]"
          }`}
        >
          {label}
        </div>

        <Icon
          className={`h-3.5 w-3.5 ${
            isDark ? "text-white/35" : "text-[#9b9081]"
          }`}
        />
      </div>

      <div className="mt-1 truncate text-[18px] font-semibold">{value}</div>
    </div>
  );
}

function InfoCard({ isDark, icon: Icon, label, title, text }) {
  return (
    <div
      className={`rounded-[20px] border p-4 ${
        isDark
          ? "border-white/[0.06] bg-[#292a2f]"
          : "border-[#eee4d5] bg-[#f7f2ea]"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] bg-[#d8c49a] text-[#171719]">
          <Icon className="h-4 w-4" />
        </div>

        <div className="min-w-0">
          <div
            className={`text-[11px] font-medium uppercase tracking-[0.16em] ${
              isDark ? "text-white/38" : "text-[#70675c]"
            }`}
          >
            {label}
          </div>

          <div className="mt-1 truncate text-[14px] font-semibold">{title}</div>

          <p
            className={`mt-1 text-[11px] leading-5 ${
              isDark ? "text-white/42" : "text-[#70675c]"
            }`}
          >
            {text}
          </p>
        </div>
      </div>
    </div>
  );
}

function inputClass(isDark) {
  return `h-10 w-full rounded-[16px] border px-3 text-[13px] outline-none transition ${
    isDark
      ? "border-white/[0.06] bg-[#222326] text-white placeholder:text-white/25 focus:border-[#d8c49a]/50"
      : "border-[#eee4d5] bg-white text-[#201d19] placeholder:text-[#9b9081] focus:border-[#d8c49a]"
  }`;
}

function secondaryButton(isDark) {
  return `inline-flex h-11 items-center justify-center gap-2 rounded-[18px] border px-4 text-[13px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
    isDark
      ? "border-white/[0.08] bg-[#292a2f] text-white hover:bg-[#3d3e45]"
      : "border-[#eee4d5] bg-[#f7f2ea] text-[#201d19] hover:bg-white"
  }`;
}
