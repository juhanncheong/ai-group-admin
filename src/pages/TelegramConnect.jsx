import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  Info,
  Loader2,
  LockKeyhole,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Smartphone,
  Trash2,
  X,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "react-toastify";
import Shell from "../components/Shell";
import { api } from "../api";
import { useTheme } from "../context/ThemeContext";

const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

function cacheGet(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.time) return null;

    if (Date.now() - parsed.time > CACHE_TTL) {
      localStorage.removeItem(key);
      return null;
    }

    return parsed.data;
  } catch (_) {
    return null;
  }
}

function cacheSet(key, data) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        time: Date.now(),
        data,
      }),
    );
  } catch (_) {}
}

function normalizeSearch(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .trim();
}

export default function TelegramConnect() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [accounts, setAccounts] = useState(() => {
    return cacheGet("telegramConnect:accounts") || [];
  });

  const [checking, setChecking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState("phone"); // phone | code | password | success

  const [phoneNumber, setPhoneNumber] = useState("");
  const [label, setLabel] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState("");
  const [modalClosing, setModalClosing] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    loadAccounts({
      silent: accounts.length > 0,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const stats = useMemo(() => {
    const connected = accounts.filter(
      (item) => item.isConnected && item.status === "connected",
    ).length;

    const disconnected = accounts.length - connected;

    return {
      total: accounts.length,
      connected,
      disconnected,
    };
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    const keyword = normalizeSearch(searchQuery);

    if (!keyword) return accounts;

    return accounts.filter((account) => {
      const profile = account.networkProfileId || account.networkProfile || {};

      const labelText = normalizeSearch(account.label || "Telegram Account");
      const phoneText = normalizeSearch(account.phoneNumber);
      const statusText = normalizeSearch(account.status);
      const idText = normalizeSearch(String(account._id || "").slice(-8));
      const ipText = normalizeSearch(
        profile.host || profile.proxyAddress || "",
      );
      const portText = normalizeSearch(profile.port || "");
      const cityText = normalizeSearch(profile.city || "");

      const deviceModelText = normalizeSearch(account.deviceModel || "");
      const systemVersionText = normalizeSearch(account.systemVersion || "");
      const appVersionText = normalizeSearch(account.appVersion || "");

      return (
        labelText.includes(keyword) ||
        phoneText.includes(keyword) ||
        statusText.includes(keyword) ||
        idText.includes(keyword) ||
        ipText.includes(keyword) ||
        portText.includes(keyword) ||
        cityText.includes(keyword) ||
        deviceModelText.includes(keyword) ||
        systemVersionText.includes(keyword) ||
        appVersionText.includes(keyword)
      );
    });
  }, [accounts, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredAccounts.length / pageSize));

  const paginatedAccounts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAccounts.slice(start, start + pageSize);
  }, [filteredAccounts, page]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  async function loadAccounts(options = {}) {
    const silent = options.silent === true;

    try {
      const cached = cacheGet("telegramConnect:accounts");

      if (Array.isArray(cached)) {
        setAccounts(cached);
      }

      if (silent) {
        setRefreshing(true);
      } else if (!Array.isArray(cached)) {
        setChecking(true);
      }

      const res = await api.get("/api/telegram-auth/accounts");
      const list = Array.isArray(res.data?.data) ? res.data.data : [];

      cacheSet("telegramConnect:accounts", list);
      setAccounts(list);
    } catch (err) {
      console.error("Load Telegram accounts error:", err);

      if (!silent) {
        toast.error(
          err?.response?.data?.message ||
            err?.response?.data?.error ||
            "Failed to load Telegram accounts",
        );
      }
    } finally {
      setChecking(false);
      setRefreshing(false);
    }
  }

  function openConnectModal(account = null) {
    setModalOpen(true);
    setStep("phone");
    setCode("");
    setPassword("");

    if (account?.phoneNumber) {
      setPhoneNumber(account.phoneNumber);
      setLabel(account.label || "");
    } else {
      setPhoneNumber("");
      setLabel("");
    }
  }

  function closeModal() {
    if (loading) return;

    setModalClosing(true);

    setTimeout(() => {
      setModalOpen(false);
      setModalClosing(false);
      setStep("phone");
      setPhoneNumber("");
      setLabel("");
      setCode("");
      setPassword("");
    }, 360);
  }

  async function handleSendCode(e) {
    e.preventDefault();

    const cleanPhone = String(phoneNumber || "").trim();
    const cleanLabel = String(label || "").trim();

    if (!cleanPhone) {
      toast.error("Telegram phone number is required");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post("/api/telegram-auth/send-code", {
        phoneNumber: cleanPhone,
        label: cleanLabel,
      });

      toast.success(res.data?.message || "Telegram code sent");
      setStep("code");
      await loadAccounts({ silent: true });
    } catch (err) {
      console.error("Send code error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to send Telegram code",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(e, codeOverride = "") {
    if (e?.preventDefault) e.preventDefault();

    const cleanPhone = String(phoneNumber || "").trim();
    const cleanCode = String(codeOverride || code || "").trim();

    if (!cleanPhone || cleanCode.length !== 5) {
      toast.error("Phone number and 5-digit code are required");
      return;
    }

    if (loading) return;

    setLoading(true);

    try {
      const res = await api.post("/api/telegram-auth/verify-code", {
        phoneNumber: cleanPhone,
        code: cleanCode,
      });

      if (res.data?.needsPassword) {
        toast.info("Telegram 2FA password required");
        setStep("password");
        return;
      }

      toast.success(res.data?.message || "Telegram account connected");
      setStep("success");
      await loadAccounts({ silent: true });
    } catch (err) {
      const data = err?.response?.data;

      if (data?.needsPassword) {
        toast.info("Telegram 2FA password required");
        setStep("password");
        return;
      }

      console.error("Verify code error:", err);
      toast.error(data?.message || data?.error || "Failed to verify code");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyPassword(e) {
    e.preventDefault();

    const cleanPhone = String(phoneNumber || "").trim();

    if (!cleanPhone || !password) {
      toast.error("Phone number and 2FA password are required");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post("/api/telegram-auth/verify-password", {
        phoneNumber: cleanPhone,
        password,
      });

      toast.success(res.data?.message || "Telegram account connected");
      setStep("success");
      await loadAccounts({ silent: true });
    } catch (err) {
      console.error("Verify password error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to verify Telegram password",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleTestAccount(accountId) {
    if (!accountId) return;

    setActionId(accountId);

    try {
      const res = await api.post(
        `/api/telegram-auth/accounts/${accountId}/test`,
      );
      toast.success(res.data?.message || "Telegram session is working");
      await loadAccounts({ silent: true });
    } catch (err) {
      console.error("Test Telegram account error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Telegram session test failed",
      );
      await loadAccounts({ silent: true });
    } finally {
      setActionId("");
    }
  }

  async function handleUpdateAccountLabel(accountId, newLabel) {
    if (!accountId) return;

    setActionId(accountId);

    try {
      const res = await api.patch(
        `/api/telegram-auth/accounts/${accountId}/label`,
        {
          label: String(newLabel || "").trim(),
        },
      );

      toast.success(res.data?.message || "Account label updated");
      await loadAccounts({ silent: true });
    } catch (err) {
      console.error("Update account label error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to update account label",
      );
    } finally {
      setActionId("");
    }
  }

  async function handleDeleteAccount(accountId) {
    if (!accountId) return;

    const yes = window.confirm(
      "Delete this Telegram account from admin panel?",
    );

    if (!yes) return;

    setActionId(accountId);

    try {
      const res = await api.delete(`/api/telegram-auth/accounts/${accountId}`);
      toast.success(res.data?.message || "Telegram account deleted");
      await loadAccounts({ silent: true });
    } catch (err) {
      console.error("Delete Telegram account error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to delete Telegram account",
      );
    } finally {
      setActionId("");
    }
  }

  return (
    <Shell title="Telegram Accounts">
      <div
        className={`-mx-3 -my-3 min-h-[calc(100vh-78px)] px-6 py-6 ${
          isDark ? "bg-[#202127]" : "bg-[#f4efe6]"
        }`}
      >
        <section className="space-y-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                  isDark
                    ? "bg-white/[0.06] text-white/65"
                    : "bg-white text-[#6d6254]"
                }`}
              >
                <Smartphone className="h-4 w-4" />
              </div>

              <div className="min-w-0">
                <div
                  className={`text-[11px] font-medium uppercase tracking-[0.18em] ${
                    isDark ? "text-white/38" : "text-[#8a8176]"
                  }`}
                >
                  Telegram Accounts
                </div>

                <h2
                  className={`mt-0.5 truncate text-[22px] font-semibold tracking-[-0.04em] ${
                    isDark ? "text-white" : "text-[#201d19]"
                  }`}
                >
                  Connected Telegram Accounts
                </h2>
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center xl:w-auto">
              <SmartSearchBar
                isDark={isDark}
                value={searchQuery}
                onChange={setSearchQuery}
                resultCount={filteredAccounts.length}
                totalCount={accounts.length}
              />

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => loadAccounts({ silent: true })}
                  disabled={refreshing}
                  className={luxurySoftButtonClass(isDark)}
                >
                  {refreshing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  Refresh
                </button>

                <button
                  type="button"
                  onClick={() => openConnectModal()}
                  className={luxuryPrimaryButtonClass()}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Connect Telegram
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <MiniStat
              label="Total accounts"
              value={stats.total}
              isDark={isDark}
            />

            <MiniStat
              label="Connected"
              value={stats.connected}
              isDark={isDark}
              active
            />

            <MiniStat
              label="Disconnected"
              value={stats.disconnected}
              isDark={isDark}
            />
          </div>

          <div
            className={`overflow-hidden rounded-[24px] border ${
              isDark
                ? "border-white/[0.06] bg-[#282a30]"
                : "border-[#eee4d5] bg-white"
            }`}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] border-collapse">
                <thead>
                  <tr
                    className={
                      isDark
                        ? "border-b border-white/[0.05] bg-[#24252b] text-white/42"
                        : "border-b border-[#eee4d5] bg-[#fbf8f2] text-[#8a8176]"
                    }
                  >
                    <Th>Account</Th>
                    <Th>Phone Number</Th>
                    <Th>Status</Th>
                    <Th>Last Login</Th>
                    <Th>Last Checked</Th>
                    <Th>Device Model</Th>
                    <Th>Network IP</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>

                <tbody>
                  {checking && accounts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-12 text-center">
                        <div
                          className={`inline-flex items-center gap-2 text-sm ${
                            isDark ? "text-white/50" : "text-[#746b61]"
                          }`}
                        >
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading Telegram accounts...
                        </div>
                      </td>
                    </tr>
                  ) : filteredAccounts.length ? (
                    paginatedAccounts.map((account) => (
                      <AccountRow
                        key={account._id}
                        account={account}
                        isDark={isDark}
                        busy={actionId === account._id}
                        onReconnect={() => openConnectModal(account)}
                        onTest={() => handleTestAccount(account._id)}
                        onDelete={() => handleDeleteAccount(account._id)}
                        onSaveLabel={(newLabel) =>
                          handleUpdateAccountLabel(account._id, newLabel)
                        }
                      />
                    ))
                  ) : accounts.length && searchQuery.trim() ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-12 text-center">
                        <div className="mx-auto max-w-sm">
                          <div
                            className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl ${
                              isDark
                                ? "bg-white/[0.07] text-white/60"
                                : "bg-[#eee4d5] text-[#5c5348]"
                            }`}
                          >
                            <Search className="h-5 w-5" />
                          </div>

                          <div
                            className={`mt-4 text-sm font-semibold ${
                              isDark ? "text-white" : "text-[#201d19]"
                            }`}
                          >
                            No matching accounts found
                          </div>

                          <div
                            className={`mt-2 text-xs leading-5 ${
                              isDark ? "text-white/42" : "text-[#746b61]"
                            }`}
                          >
                            Try searching another phone number, label, status,
                            or account ID.
                          </div>

                          <button
                            type="button"
                            onClick={() => setSearchQuery("")}
                            className={primaryButtonClass(
                              "mx-auto mt-5 w-auto",
                            )}
                          >
                            <X className="h-4 w-4" />
                            Clear Search
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-5 py-12 text-center">
                        <div className="mx-auto max-w-sm">
                          <div
                            className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl ${
                              isDark
                                ? "bg-white/[0.07] text-white/60"
                                : "bg-[#eee4d5] text-[#5c5348]"
                            }`}
                          >
                            <Smartphone className="h-5 w-5" />
                          </div>

                          <div
                            className={`mt-4 text-sm font-semibold ${
                              isDark ? "text-white" : "text-[#201d19]"
                            }`}
                          >
                            No Telegram accounts connected
                          </div>

                          <div
                            className={`mt-2 text-xs leading-5 ${
                              isDark ? "text-white/42" : "text-[#746b61]"
                            }`}
                          >
                            Click Connect Telegram to add the first account.
                          </div>

                          <button
                            type="button"
                            onClick={() => openConnectModal()}
                            className={primaryButtonClass(
                              "mx-auto mt-5 w-auto",
                            )}
                          >
                            <Plus className="h-4 w-4" />
                            Connect Telegram
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {filteredAccounts.length > pageSize && (
              <LuxuryPagination
                isDark={isDark}
                page={page}
                totalPages={totalPages}
                totalItems={filteredAccounts.length}
                pageSize={pageSize}
                onPageChange={setPage}
              />
            )}
          </div>
        </section>

        {modalOpen && (
          <TelegramLoginModal
            isDark={isDark}
            step={step}
            loading={loading}
            phoneNumber={phoneNumber}
            setPhoneNumber={setPhoneNumber}
            label={label}
            setLabel={setLabel}
            closing={modalClosing}
            code={code}
            setCode={setCode}
            password={password}
            setPassword={setPassword}
            onClose={closeModal}
            onSendCode={handleSendCode}
            onVerifyCode={handleVerifyCode}
            onVerifyPassword={handleVerifyPassword}
            onBackToPhone={() => setStep("phone")}
            onBackToCode={() => setStep("code")}
            onDone={closeModal}
          />
        )}

        <style>{`
  @keyframes telegramModalEnter {
    from {
      opacity: 0;
      transform: translateY(18px) scale(0.96);
      filter: blur(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
      filter: blur(0);
    }
  }

  @keyframes telegramSuccessExit {
    0% {
      opacity: 1;
      transform: scale(1) translateY(0);
      filter: blur(0);
    }
    55% {
      opacity: 1;
      transform: scale(1.035) translateY(-4px);
      filter: blur(0);
    }
    100% {
      opacity: 0;
      transform: scale(0.88) translateY(24px);
      filter: blur(10px);
    }
  }

  @keyframes successPop {
    0% {
      opacity: 0;
      transform: scale(0.35) rotate(-18deg);
    }
    65% {
      opacity: 1;
      transform: scale(1.12) rotate(5deg);
    }
    100% {
      opacity: 1;
      transform: scale(1) rotate(0);
    }
  }

  @keyframes successPulse {
    0% {
      opacity: 0.8;
      transform: scale(0.72);
    }
    100% {
      opacity: 0;
      transform: scale(1.45);
    }
  }

  @keyframes checkWiggle {
    0% {
      transform: scale(0.6) rotate(-18deg);
    }
    45% {
      transform: scale(1.12) rotate(8deg);
    }
    70% {
      transform: scale(0.96) rotate(-4deg);
    }
    100% {
      transform: scale(1) rotate(0);
    }
  }

  @keyframes successSlideUp {
    from {
      opacity: 0;
      transform: translateY(16px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes confettiDrop {
    0% {
      opacity: 0;
      transform: translateY(-10px) rotate(0deg) scale(0.6);
    }
    15% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      transform: translateY(230px) rotate(260deg) scale(1);
    }
  }
`}</style>
      </div>
    </Shell>
  );
}

function AccountRow({
  account,
  isDark,
  busy,
  onReconnect,
  onTest,
  onDelete,
  onSaveLabel,
}) {
  const connected = account.isConnected && account.status === "connected";

  const [editingLabel, setEditingLabel] = useState(false);
  const [labelValue, setLabelValue] = useState(account.label || "");
  const [networkTooltip, setNetworkTooltip] = useState(null);
  const [deviceTooltip, setDeviceTooltip] = useState(null);

  useEffect(() => {
    setLabelValue(account.label || "");
  }, [account.label]);

  async function handleSaveLabel() {
    await onSaveLabel(labelValue);
    setEditingLabel(false);
  }

  function handleCancelEdit() {
    setLabelValue(account.label || "");
    setEditingLabel(false);
  }

  return (
    <tr
      className={`border-b last:border-b-0 ${
        isDark
          ? "border-white/[0.045] text-white hover:bg-white/[0.03]"
          : "border-[#eee4d5]/80 text-[#201d19] hover:bg-[#fbf8f2]"
      }`}
    >
      <td className="px-5 py-2.5">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl ${
              connected
                ? isDark
                  ? "bg-emerald-400/10 text-emerald-300"
                  : "bg-emerald-50 text-emerald-600"
                : isDark
                  ? "bg-white/[0.07] text-white/50"
                  : "bg-[#eee4d5] text-[#6d6254]"
            }`}
          >
            {connected ? (
              <Wifi className="h-3.5 w-3.5" />
            ) : (
              <WifiOff className="h-3.5 w-3.5" />
            )}
          </div>

          <div className="min-w-0">
            {editingLabel ? (
              <div className="flex items-center gap-2">
                <input
                  value={labelValue}
                  onChange={(e) => setLabelValue(e.target.value)}
                  placeholder="Telegram Account"
                  disabled={busy}
                  className={editLabelInputClass(isDark)}
                />

                <button
                  type="button"
                  onClick={handleSaveLabel}
                  disabled={busy}
                  title="Save label"
                  className={iconButtonClass(isDark, "save")}
                >
                  {busy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={busy}
                  title="Cancel edit"
                  className={iconButtonClass(isDark, "cancel")}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="text-sm font-semibold">
                  {account.label || "Telegram Account"}
                </div>

                <button
                  type="button"
                  onClick={() => setEditingLabel(true)}
                  disabled={busy}
                  title="Edit label"
                  className={iconButtonClass(isDark)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <div
              className={`mt-0.5 text-xs ${
                isDark ? "text-white/38" : "text-[#8a8176]"
              }`}
            >
              ID: {String(account._id || "").slice(-8)}
            </div>
          </div>
        </div>
      </td>

      <td className="px-5 py-2.5 text-xs">{account.phoneNumber || "-"}</td>

      <td className="px-5 py-2.5">
        <StatusPill
          status={account.status}
          connected={connected}
          isDark={isDark}
        />
      </td>

      <td className={`px-5 py-2.5 text-xs leading-5 ${mutedTextClass(isDark)}`}>
        {formatDate(account.lastLoginAt)}
      </td>

      <td className={`px-5 py-2.5 text-xs leading-5 ${mutedTextClass(isDark)}`}>
        {formatDate(account.lastCheckedAt)}
      </td>

      <td className="px-5 py-2.5">
        <DeviceModelCell
          account={account}
          isDark={isDark}
          onShowTooltip={setDeviceTooltip}
          onHideTooltip={() => setDeviceTooltip(null)}
        />

        {deviceTooltip && (
          <DeviceInfoBubble
            account={deviceTooltip.account}
            isDark={isDark}
            position={deviceTooltip.position}
          />
        )}
      </td>

      <td className="px-5 py-2.5">
        <NetworkIpCell
          account={account}
          isDark={isDark}
          onShowTooltip={setNetworkTooltip}
          onHideTooltip={() => setNetworkTooltip(null)}
        />

        {networkTooltip && (
          <NetworkInfoBubble
            profile={networkTooltip.profile}
            isDark={isDark}
            position={networkTooltip.position}
          />
        )}
      </td>

      <td className="px-5 py-2.5">
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onReconnect}
            disabled={busy}
            className={tinyButtonClass(isDark)}
          >
            Reconnect
          </button>

          <button
            type="button"
            onClick={onTest}
            disabled={busy}
            className={tinyButtonClass(isDark)}
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Test"}
          </button>

          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className={`inline-flex h-8 items-center justify-center rounded-xl px-3 text-xs font-medium transition disabled:opacity-60 ${
              isDark
                ? "bg-red-400/[0.07] text-red-300 hover:bg-red-400/12"
                : "bg-red-50 text-red-600 hover:bg-red-100"
            }`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function SmartSearchBar({ isDark, value, onChange, resultCount, totalCount }) {
  const hasSearch = value.trim().length > 0;

  return (
    <div
      className={`group flex h-[38px] w-full items-center gap-2 rounded-[14px] border px-3 transition sm:w-[330px] lg:w-[380px] ${
        isDark
          ? "border-white/[0.07] bg-white/[0.055] text-white focus-within:border-[#d8c49a]/45 focus-within:bg-white/[0.08] focus-within:ring-4 focus-within:ring-[#d8c49a]/5"
          : "border-[#eee4d5] bg-white text-[#201d19] shadow-[0_10px_24px_rgba(30,25,18,0.035)] focus-within:border-[#d8c49a] focus-within:ring-4 focus-within:ring-[#d8c49a]/15"
      }`}
    >
      <Search
        className={`h-3.5 w-3.5 shrink-0 transition ${
          isDark
            ? "text-white/35 group-focus-within:text-[#d8c49a]"
            : "text-[#8a8176] group-focus-within:text-[#9b7b3d]"
        }`}
      />

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search phone number or label..."
        className={`h-full min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-[12px] ${
          isDark
            ? "text-white placeholder:text-white/30"
            : "text-[#201d19] placeholder:text-[#9b9287]"
        }`}
      />

      {hasSearch && (
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`hidden rounded-full px-2 py-0.5 text-[10px] font-medium sm:inline-flex ${
              isDark
                ? "bg-white/[0.07] text-white/45"
                : "bg-[#f4efe6] text-[#8a8176]"
            }`}
          >
            {resultCount}/{totalCount}
          </span>

          <button
            type="button"
            onClick={() => onChange("")}
            className={`flex h-6 w-6 items-center justify-center rounded-lg transition ${
              isDark
                ? "text-white/38 hover:bg-white/[0.10] hover:text-white/70"
                : "text-[#8a8176] hover:bg-[#f4efe6] hover:text-[#201d19]"
            }`}
            title="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function TelegramLoginModal({
  isDark,
  closing,
  step,
  loading,
  phoneNumber,
  setPhoneNumber,
  label,
  setLabel,
  code,
  setCode,
  password,
  setPassword,
  onClose,
  onSendCode,
  onVerifyCode,
  onVerifyPassword,
  onBackToPhone,
  onBackToCode,
  onDone,
}) {
  const passwordInputRef = useRef(null);

  useEffect(() => {
    if (step !== "password") return;
    if (loading) return;

    const focusTimer = setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 120);

    return () => clearTimeout(focusTimer);
  }, [step, loading]);

  useEffect(() => {
    if (step !== "success") return;
    if (loading) return;

    const closeTimer = setTimeout(() => {
      onDone();
    }, 2200);

    return () => clearTimeout(closeTimer);
  }, [step, loading, onDone]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 z-0 bg-black/55 backdrop-blur-sm"
        aria-label="Close modal backdrop"
      />

      <div
        className={`relative z-10 w-full max-w-[430px] overflow-hidden rounded-[30px] shadow-2xl ${
          closing
            ? "animate-[telegramSuccessExit_360ms_cubic-bezier(.4,0,.2,1)_forwards]"
            : "animate-[telegramModalEnter_420ms_cubic-bezier(.16,1,.3,1)_both]"
        } ${isDark ? "bg-[#202127] text-white" : "bg-white text-[#171717]"}`}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className={`absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-2xl transition ${
            isDark
              ? "bg-white/[0.08] text-white/60 hover:bg-white/[0.12]"
              : "bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0]"
          } disabled:opacity-50`}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="bg-[#229ED9] px-6 pb-7 pt-8 text-center text-white">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/18">
            <Send className="h-8 w-8" />
          </div>

          <div className="mt-4 text-xl font-semibold tracking-[-0.03em]">
            Telegram
          </div>

          <div className="mt-1 text-sm text-white/75">
            Admin account connection
          </div>
        </div>

        <div className="px-6 py-6">
          <StepDots step={step} />

          {step === "phone" && (
            <form onSubmit={onSendCode}>
              <WidgetTitle
                title="Sign in to Telegram"
                text="Enter the phone number for the Telegram account you want to connect."
                isDark={isDark}
              />

              <div className="mt-5 space-y-4">
                <div>
                  <label className={labelClass(isDark)}>Account label</label>
                  <input
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="Support account"
                    className={inputClass(isDark)}
                  />
                </div>

                <div>
                  <label className={labelClass(isDark)}>Phone number</label>
                  <input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+60123456789"
                    className={inputClass(isDark)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={telegramButtonClass()}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending code
                  </>
                ) : (
                  <>
                    <Phone className="h-4 w-4" />
                    Send Code
                  </>
                )}
              </button>
            </form>
          )}

          {step === "code" && (
            <form onSubmit={onVerifyCode}>
              <WidgetTitle
                title="Enter login code"
                text={`We sent a login code to ${
                  phoneNumber || "this phone number"
                }.`}
                isDark={isDark}
              />

              <div className="mt-5">
                <label className={labelClass(isDark)}>Telegram code</label>

                <TelegramCodeBoxes
                  value={code}
                  setValue={setCode}
                  isDark={isDark}
                  loading={loading}
                  onComplete={(finalCode) => onVerifyCode(null, finalCode)}
                />
              </div>

              <div className="mt-5">
                <button
                  type="button"
                  onClick={onBackToPhone}
                  disabled={loading}
                  className={`${modalSecondaryButtonClass(isDark)} w-full`}
                >
                  Back
                </button>
              </div>
            </form>
          )}

          {step === "password" && (
            <form onSubmit={onVerifyPassword}>
              <WidgetTitle
                title="Two-step verification"
                text="This Telegram account requires a cloud password."
                isDark={isDark}
              />

              <div className="mt-5">
                <label className={labelClass(isDark)}>2FA password</label>
                <input
                  ref={passwordInputRef}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  placeholder="Telegram password"
                  className={inputClass(isDark)}
                />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={onBackToCode}
                  disabled={loading}
                  className={modalSecondaryButtonClass(isDark)}
                >
                  Back
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className={telegramButtonClass("mt-0")}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LockKeyhole className="h-4 w-4" />
                  )}
                  Connect
                </button>
              </div>
            </form>
          )}

          {step === "success" && (
            <div className="relative overflow-hidden text-center">
              <SuccessConfetti />

              <div className="relative z-10">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/10">
                  <div className="absolute h-24 w-24 animate-[successPulse_1.6s_ease-out_infinite] rounded-full border border-emerald-400/40" />
                  <div className="absolute h-20 w-20 animate-[successPulse_1.6s_ease-out_300ms_infinite] rounded-full border border-emerald-400/30" />

                  <div className="relative flex h-16 w-16 animate-[successPop_560ms_cubic-bezier(.16,1,.3,1)_both] items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_18px_45px_rgba(16,185,129,0.35)]">
                    <CheckCircle2 className="h-9 w-9 animate-[checkWiggle_900ms_ease_380ms_both]" />
                  </div>
                </div>

                <div className="mt-6 animate-[successSlideUp_520ms_cubic-bezier(.16,1,.3,1)_160ms_both] text-[24px] font-bold tracking-[-0.04em]">
                  Telegram account connected
                </div>

                <div
                  className={`mx-auto mt-3 max-w-[330px] animate-[successSlideUp_520ms_cubic-bezier(.16,1,.3,1)_240ms_both] text-sm leading-6 ${
                    isDark ? "text-white/48" : "text-[#64748b]"
                  }`}
                >
                  This account is now ready in your admin account list.
                </div>

                <button
                  type="button"
                  onClick={onDone}
                  className={`${telegramButtonClass()} animate-[successSlideUp_520ms_cubic-bezier(.16,1,.3,1)_340ms_both] shadow-[0_18px_40px_rgba(34,158,217,0.25)] hover:scale-[1.015] active:scale-[0.98]`}
                >
                  Done
                </button>
              </div>
            </div>
          )}

          <div
            className={`mt-5 rounded-2xl px-4 py-3 text-xs leading-5 ${
              isDark
                ? "bg-white/[0.06] text-white/42"
                : "bg-[#f8fafc] text-[#64748b]"
            }`}
          >
            This page connects accounts through your backend Telegram session
            flow. The session string should never be shown in the browser.
          </div>
        </div>
      </div>
    </div>
  );
}

function SuccessConfetti() {
  const pieces = Array.from({ length: 18 }, (_, index) => index);

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {pieces.map((item) => {
        const left = 8 + ((item * 19) % 84);
        const delay = (item % 6) * 80;
        const duration = 900 + (item % 5) * 110;

        return (
          <span
            key={item}
            className="absolute top-[-12px] h-2 w-2 rounded-full bg-[#229ED9] opacity-0"
            style={{
              left: `${left}%`,
              animation: `confettiDrop ${duration}ms ease-out ${delay}ms forwards`,
            }}
          />
        );
      })}
    </div>
  );
}

function TelegramCodeBoxes({ value, setValue, isDark, loading, onComplete }) {
  const inputRef = useRef(null);
  const submittedRef = useRef("");

  useEffect(() => {
    const focusTimer = setTimeout(() => {
      inputRef.current?.focus();
    }, 120);

    return () => clearTimeout(focusTimer);
  }, []);

  useEffect(() => {
    if (!loading) {
      const focusTimer = setTimeout(() => {
        inputRef.current?.focus();
      }, 80);

      return () => clearTimeout(focusTimer);
    }
  }, [loading]);

  function handleChange(e) {
    if (loading) return;

    const next = e.target.value.replace(/\D/g, "").slice(0, 5);

    setValue(next);

    if (next.length < 5) {
      submittedRef.current = "";
    }

    if (next.length === 5 && submittedRef.current !== next) {
      submittedRef.current = next;

      setTimeout(() => {
        onComplete(next);
      }, 120);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Backspace") {
      submittedRef.current = "";
    }
  }

  function focusInput() {
    inputRef.current?.focus();
  }

  const digits = Array.from({ length: 5 }, (_, index) => value[index] || "");

  return (
    <div onClick={focusInput} className="relative">
      <input
        ref={inputRef}
        type="tel"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={5}
        className="absolute left-0 top-0 h-full w-full cursor-text opacity-0"
      />

      <div className="pointer-events-none grid grid-cols-5 gap-2">
        {digits.map((digit, index) => {
          const active =
            value.length === index || (value.length === 5 && index === 4);

          return (
            <div
              key={index}
              className={`flex h-[56px] items-center justify-center rounded-2xl border text-xl font-semibold transition ${
                isDark
                  ? "border-white/[0.10] bg-[#292a2f] text-white"
                  : "border-[#dbe7f0] bg-white text-[#171717]"
              } ${active ? "!border-[#229ED9] ring-4 ring-[#229ED9]/15" : ""}`}
            >
              {digit || ""}
            </div>
          );
        })}
      </div>

      {loading && (
        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-[#229ED9]">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Verifying code...
        </div>
      )}
    </div>
  );
}

function LuxuryPagination({
  isDark,
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}) {
  const startItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);
  const pages = getPaginationPages(page, totalPages);

  return (
    <div
      className={`flex flex-col gap-3 border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${
        isDark
          ? "border-white/[0.05] bg-[#24252b]/70"
          : "border-[#eee4d5] bg-[#fbf8f2]/80"
      }`}
    >
      <div className={`text-xs ${isDark ? "text-white/42" : "text-[#8a8176]"}`}>
        Showing{" "}
        <span className={isDark ? "text-white/70" : "text-[#201d19]"}>
          {startItem}-{endItem}
        </span>{" "}
        of{" "}
        <span className={isDark ? "text-white/70" : "text-[#201d19]"}>
          {totalItems}
        </span>{" "}
        accounts
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className={paginationButtonClass(isDark)}
        >
          Prev
        </button>

        {pages.map((item, index) =>
          item === "..." ? (
            <span
              key={`dots-${index}`}
              className={`flex h-8 min-w-8 items-center justify-center text-xs ${
                isDark ? "text-white/35" : "text-[#8a8176]"
              }`}
            >
              ...
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              className={paginationButtonClass(isDark, item === page)}
            >
              {item}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className={paginationButtonClass(isDark)}
        >
          Next
        </button>
      </div>
    </div>
  );
}

function getPaginationPages(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "...", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      "...",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "...",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "...",
    totalPages,
  ];
}

function paginationButtonClass(isDark, active = false) {
  if (active) {
    return "flex h-8 min-w-8 items-center justify-center rounded-xl bg-[#d8c49a] px-3 text-xs font-semibold text-[#171717] shadow-[0_10px_24px_rgba(216,196,154,0.18)] transition";
  }

  return `flex h-8 min-w-8 items-center justify-center rounded-xl px-3 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
    isDark
      ? "bg-white/[0.06] text-white/58 hover:bg-white/[0.10]"
      : "bg-white text-[#5c5348] ring-1 ring-[#eee4d5] hover:bg-[#f7f2ea]"
  }`;
}

function StepDots({ step }) {
  const steps = ["phone", "code", "password"];
  const activeIndex =
    step === "success"
      ? 3
      : Math.max(
          0,
          steps.findIndex((item) => item === step),
        );

  return (
    <div className="mb-5 flex justify-center gap-2">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className={`h-2 rounded-full transition-all ${
            index <= activeIndex ? "w-6 bg-[#229ED9]" : "w-2 bg-slate-300"
          }`}
        />
      ))}
    </div>
  );
}

function WidgetTitle({ title, text, isDark }) {
  return (
    <div className="text-center">
      <div className="text-lg font-semibold tracking-[-0.03em]">{title}</div>
      <div
        className={`mx-auto mt-2 max-w-[320px] text-sm leading-6 ${
          isDark ? "text-white/45" : "text-[#64748b]"
        }`}
      >
        {text}
      </div>
    </div>
  );
}

function MiniStat({ label, value, active, isDark }) {
  return (
    <div
      className={`rounded-[22px] border p-4 ${
        isDark
          ? "border-white/[0.06] bg-[#282a30] text-white"
          : "border-[#eee4d5] bg-white text-[#201d19]"
      }`}
    >
      <div className="text-[11px] font-medium uppercase tracking-[0.18em] opacity-45">
        {label}
      </div>

      <div className="mt-2 flex items-center gap-2 text-lg font-semibold">
        {active && <span className="h-2 w-2 rounded-full bg-emerald-400" />}
        {value}
      </div>
    </div>
  );
}

function StatusPill({ status, connected, isDark }) {
  const label = status || "unknown";

  if (connected) {
    return (
      <span
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
          isDark
            ? "bg-emerald-400/10 text-emerald-300"
            : "bg-emerald-50 text-emerald-700"
        }`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Connected
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
        isDark ? "bg-white/[0.08] text-white/55" : "bg-[#eee4d5] text-[#6d6254]"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-45" />
      {label}
    </span>
  );
}

function NetworkIpCell({ account, isDark, onShowTooltip, onHideTooltip }) {
  const profile = account.networkProfileId || account.networkProfile || null;

  if (!profile) {
    return (
      <div className="min-w-[170px]">
        <div
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
            isDark
              ? "bg-white/[0.06] text-white/35"
              : "bg-[#f4efe6] text-[#8a8176]"
          }`}
        >
          No IP assigned
        </div>
      </div>
    );
  }

  const host = profile.host || profile.proxyAddress || "";
  const port = profile.port || "";
  const fullAddress = host && port ? `${host}:${port}` : host || "Assigned";

  function handleEnter(e) {
    const rect = e.currentTarget.getBoundingClientRect();

    onShowTooltip({
      profile,
      position: {
        top: rect.bottom + 10,
        left: Math.min(rect.left, window.innerWidth - 340),
      },
    });
  }

  return (
    <div className="min-w-[190px]">
      <div
        onMouseEnter={handleEnter}
        onMouseLeave={onHideTooltip}
        className={`inline-flex max-w-[210px] items-center gap-2 transition ${
          isDark
            ? "text-white hover:border-[#d8c49a]/35 hover:bg-white/[0.07]"
            : "text-[#201d19] hover:border-[#d8c49a] hover:bg-white"
        }`}
      >
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${
            profile.status === "assigned"
              ? "bg-emerald-400"
              : profile.status === "reserved"
                ? "bg-amber-400"
                : profile.status === "disabled"
                  ? "bg-red-400"
                  : "bg-sky-400"
          }`}
        />

        <span className="truncate font-mono text-xs">{fullAddress}</span>

        <button
          type="button"
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition ${
            isDark
              ? "bg-white/[0.08] text-white/45 hover:bg-[#d8c49a]/15 hover:text-[#d8c49a]"
              : "bg-white text-[#8a8176] ring-1 ring-[#eee4d5] hover:text-[#9b7b3d]"
          }`}
          aria-label="Network profile details"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function NetworkInfoBubble({ profile, isDark, position }) {
  const rows = [
    ["Profile", profile.name || "Network Profile"],
    ["Type", profile.type || "socks5"],
    ["Provider", profile.provider || "webshare"],
    [
      "Address",
      profile.host && profile.port ? `${profile.host}:${profile.port}` : "-",
    ],
    ["Username", profile.username || "-"],
    ["Status", profile.status || "-"],
    ["Last tested", formatDate(profile.lastTestedAt)],
  ];

  if (profile.lastError) {
    rows.push(["Last error", profile.lastError]);
  }

  return (
    <div
      className={`fixed z-[9999] w-[320px] rounded-[22px] border p-4 text-left shadow-2xl backdrop-blur-xl ${
        isDark
          ? "border-white/[0.10] bg-[#1f2025]/95 text-white shadow-black/35"
          : "border-[#eee4d5] bg-white/95 text-[#201d19] shadow-[0_22px_60px_rgba(30,25,18,0.16)]"
      }`}
      style={{
        top: position?.top || 0,
        left: position?.left || 0,
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div
            className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${
              isDark ? "text-[#d8c49a]" : "text-[#9b7b3d]"
            }`}
          >
            Assigned Network
          </div>

          <div className="mt-1 font-mono text-sm font-semibold">
            {profile.host}:{profile.port}
          </div>
        </div>

        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
            profile.status === "assigned"
              ? isDark
                ? "bg-emerald-400/10 text-emerald-300"
                : "bg-emerald-50 text-emerald-700"
              : profile.status === "reserved"
                ? isDark
                  ? "bg-amber-400/10 text-amber-300"
                  : "bg-amber-50 text-amber-700"
                : profile.status === "disabled"
                  ? isDark
                    ? "bg-red-400/10 text-red-300"
                    : "bg-red-50 text-red-700"
                  : isDark
                    ? "bg-sky-400/10 text-sky-300"
                    : "bg-sky-50 text-sky-700"
          }`}
        >
          {profile.status || "unknown"}
        </span>
      </div>

      <div
        className={`h-px w-full ${isDark ? "bg-white/[0.08]" : "bg-[#eee4d5]"}`}
      />

      <div className="mt-3 space-y-2.5">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[88px_1fr] gap-3">
            <div
              className={`text-[11px] ${
                isDark ? "text-white/35" : "text-[#8a8176]"
              }`}
            >
              {label}
            </div>

            <div
              className={`break-words text-[12px] font-medium ${
                label === "Address" ? "font-mono" : ""
              } ${isDark ? "text-white/72" : "text-[#201d19]"}`}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      <div
        className={`mt-4 rounded-2xl px-3 py-2 text-[11px] leading-5 ${
          isDark
            ? "bg-white/[0.055] text-white/38"
            : "bg-[#f8fafc] text-[#64748b]"
        }`}
      >
        This is the fixed network profile assigned to this Telegram account.
      </div>
    </div>
  );
}

function Th({ children, align = "left" }) {
  return (
    <th
      className={`px-5 py-3 text-${align} text-[11px] font-semibold uppercase tracking-[0.16em]`}
    >
      {children}
    </th>
  );
}

function DeviceModelCell({ account, isDark, onShowTooltip, onHideTooltip }) {
  const systemVersion = account.systemVersion || "Not set";

  function handleEnter(e) {
    const rect = e.currentTarget.getBoundingClientRect();

    onShowTooltip({
      account,
      position: {
        top: rect.bottom + 10,
        left: Math.min(rect.left, window.innerWidth - 340),
      },
    });
  }

  return (
    <div className="min-w-[120px]">
      <div
        onMouseEnter={handleEnter}
        onMouseLeave={onHideTooltip}
        className={`inline-flex max-w-[135px] items-center gap-2 transition ${
          isDark
            ? "text-white hover:border-[#d8c49a]/35 hover:bg-white/[0.07]"
            : "text-[#201d19] hover:border-[#d8c49a] hover:bg-white"
        }`}
      >
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${
            account.systemVersion ? "bg-emerald-400" : "bg-amber-400"
          }`}
        />

        <span className="truncate font-mono text-[11px]">{systemVersion}</span>

        <button
          type="button"
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition ${
            isDark
              ? "bg-white/[0.08] text-white/45 hover:bg-[#d8c49a]/15 hover:text-[#d8c49a]"
              : "bg-white text-[#8a8176] ring-1 ring-[#eee4d5] hover:text-[#9b7b3d]"
          }`}
          aria-label="Device details"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function DeviceInfoBubble({ account, isDark, position }) {
  const rows = [
    ["Device model", account.deviceModel || "-"],
    ["System version", account.systemVersion || "-"],
    ["App version", account.appVersion || "-"],
    ["Phone", account.phoneNumber || "-"],
    ["Label", account.label || "Telegram Account"],
    ["Status", account.status || "-"],
    ["Last login", formatDate(account.lastLoginAt)],
  ];

  return (
    <div
      className={`fixed z-[9999] w-[320px] rounded-[22px] border p-4 text-left shadow-2xl backdrop-blur-xl ${
        isDark
          ? "border-white/[0.10] bg-[#1f2025]/95 text-white shadow-black/35"
          : "border-[#eee4d5] bg-white/95 text-[#201d19] shadow-[0_22px_60px_rgba(30,25,18,0.16)]"
      }`}
      style={{
        top: position?.top || 0,
        left: position?.left || 0,
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div
            className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${
              isDark ? "text-[#d8c49a]" : "text-[#9b7b3d]"
            }`}
          >
            Telegram Client Identity
          </div>

          <div className="mt-1 font-mono text-sm font-semibold">
            {account.deviceModel || "Not set"}
          </div>
        </div>

        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
            account.deviceModel
              ? isDark
                ? "bg-emerald-400/10 text-emerald-300"
                : "bg-emerald-50 text-emerald-700"
              : isDark
                ? "bg-amber-400/10 text-amber-300"
                : "bg-amber-50 text-amber-700"
          }`}
        >
          {account.deviceModel ? "Set" : "Missing"}
        </span>
      </div>

      <div
        className={`h-px w-full ${isDark ? "bg-white/[0.08]" : "bg-[#eee4d5]"}`}
      />

      <div className="mt-3 space-y-2.5">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[98px_1fr] gap-3">
            <div
              className={`text-[11px] ${
                isDark ? "text-white/35" : "text-[#8a8176]"
              }`}
            >
              {label}
            </div>

            <div
              className={`break-words text-[12px] font-medium ${
                ["Device model", "System version", "App version"].includes(
                  label,
                )
                  ? "font-mono"
                  : ""
              } ${isDark ? "text-white/72" : "text-[#201d19]"}`}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      <div
        className={`mt-4 rounded-2xl px-3 py-2 text-[11px] leading-5 ${
          isDark
            ? "bg-white/[0.055] text-white/38"
            : "bg-[#f8fafc] text-[#64748b]"
        }`}
      >
        This is the stable Telegram client identity saved for this account.
      </div>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString();
}

function mutedTextClass(isDark) {
  return isDark ? "text-white/45" : "text-[#746b61]";
}

function labelClass(isDark) {
  return `mb-2 block text-xs font-medium ${
    isDark ? "text-white/62" : "text-[#5c5348]"
  }`;
}

function inputClass(isDark) {
  return `min-h-[50px] w-full rounded-2xl border px-4 text-[16px] outline-none transition ${
    isDark
      ? "border-white/[0.10] bg-[#292a2f] text-white placeholder:text-white/28 focus:border-[#229ED9]/60 focus:ring-4 focus:ring-[#229ED9]/10"
      : "border-[#e2e8f0] bg-white text-[#171717] placeholder:text-[#94a3b8] focus:border-[#229ED9] focus:ring-4 focus:ring-[#229ED9]/15"
  }`;
}

function editLabelInputClass(isDark) {
  return `h-9 w-[180px] rounded-xl border px-3 text-sm outline-none transition disabled:opacity-60 ${
    isDark
      ? "border-white/[0.10] bg-[#202127] text-white placeholder:text-white/30 focus:border-[#229ED9]/65 focus:ring-4 focus:ring-[#229ED9]/10"
      : "border-[#e2e8f0] bg-white text-[#171717] placeholder:text-[#94a3b8] focus:border-[#229ED9] focus:ring-4 focus:ring-[#229ED9]/15"
  }`;
}

function primaryButtonClass(extra = "") {
  return `inline-flex min-h-[50px] items-center justify-center gap-2 rounded-2xl bg-[#d8c49a] px-5 text-sm font-semibold text-[#171717] shadow-[0_16px_35px_rgba(216,196,154,0.14)] transition hover:bg-[#e4d1a9] disabled:cursor-not-allowed disabled:opacity-60 ${extra}`;
}

function telegramButtonClass(extra = "mt-5") {
  return `inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-[#229ED9] px-5 text-sm font-semibold text-white transition hover:bg-[#1d8fc5] disabled:cursor-not-allowed disabled:opacity-60 ${extra}`;
}

function tinyButtonClass(isDark) {
  return `inline-flex h-8 items-center justify-center gap-2 rounded-xl px-3 text-xs font-medium transition disabled:opacity-60 ${
    isDark
      ? "bg-white/[0.07] text-white/60 hover:bg-white/[0.10]"
      : "bg-[#eee4d5] text-[#5c5348] hover:bg-[#e6dac8]"
  }`;
}

function iconButtonClass(isDark, type = "default") {
  if (type === "save") {
    return `inline-flex h-8 w-8 items-center justify-center rounded-xl transition disabled:opacity-60 ${
      isDark
        ? "bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/15"
        : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
    }`;
  }

  if (type === "cancel") {
    return `inline-flex h-8 w-8 items-center justify-center rounded-xl transition disabled:opacity-60 ${
      isDark
        ? "bg-red-400/10 text-red-300 hover:bg-red-400/15"
        : "bg-red-50 text-red-600 hover:bg-red-100"
    }`;
  }

  return `inline-flex h-8 w-8 items-center justify-center rounded-xl transition disabled:opacity-60 ${
    isDark
      ? "text-white/55 hover:bg-white/[0.10]"
      : "text-[#5c5348] hover:bg-[#e6dac8]"
  }`;
}

function luxuryPrimaryButtonClass(extra = "") {
  return `inline-flex min-h-[38px] items-center justify-center gap-2 rounded-[14px] bg-[#d8c49a] px-4 text-[12px] font-semibold text-[#171717] shadow-[0_10px_24px_rgba(216,196,154,0.12)] transition hover:bg-[#e4d1a9] disabled:cursor-not-allowed disabled:opacity-60 ${extra}`;
}

function luxurySoftButtonClass(isDark) {
  return `inline-flex min-h-[38px] items-center justify-center gap-2 rounded-[14px] px-4 text-[12px] font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
    isDark
      ? "bg-white/[0.06] text-white/58 hover:bg-white/[0.10]"
      : "bg-white text-[#5c5348] hover:bg-[#f7f2ea]"
  }`;
}

function modalSecondaryButtonClass(isDark) {
  return `inline-flex min-h-[50px] items-center justify-center rounded-2xl px-5 text-sm font-medium transition disabled:opacity-60 ${
    isDark
      ? "bg-white/[0.07] text-white/62 hover:bg-white/[0.10]"
      : "bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0]"
  }`;
}
