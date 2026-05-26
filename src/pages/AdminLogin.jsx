import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Shield,
  ScanLine,
  Smartphone,
  X,
  Copy,
  CheckCircle2,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { toast } from "react-toastify";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "https://slimy-xenia-jayjay122-018fd7f8.koyeb.app";

const LEFT_IMAGE = "/admin-left.jpg";

export default function AdminLogin() {
  const navigate = useNavigate();

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const [twoFaOpen, setTwoFaOpen] = useState(false);
  const [twoFaMode, setTwoFaMode] = useState(null); // "setup" | "login"
  const [setupToken, setSetupToken] = useState("");
  const [tempToken, setTempToken] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [manualKey, setManualKey] = useState("");
  const [gaCode, setGaCode] = useState("");
  const [twoFaLoading, setTwoFaLoading] = useState(false);
  const [setupLoaded, setSetupLoaded] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();

    const cleanLoginId = String(loginId || "").trim();

    if (!cleanLoginId || !password) {
      toast.error("Login ID and password are required");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },

        // Keep phoneNumber key so your existing backend still works.
        // The input itself allows text, username, ID, phone, etc.
        body: JSON.stringify({
          phoneNumber: cleanLoginId,
          password,
        }),
      });

      const data = await safeJson(res);

      console.log("[AdminLogin] status:", res.status);
      console.log("[AdminLogin] response:", data);

      if (!res.ok) {
        throw new Error(data?.message || `Login failed (${res.status})`);
      }

      if (data?.user?.role !== "admin") {
        throw new Error("Admin only. This account is not admin.");
      }

      if (data?.setup2FARequired && data?.setupToken) {
        setSetupToken(data.setupToken);
        setTempToken("");
        setTwoFaMode("setup");
        setTwoFaOpen(true);
        setGaCode("");
        setQrCodeUrl("");
        setManualKey("");
        setSetupLoaded(false);
        await loadSetupQr(data.setupToken);
        return;
      }

      if (data?.twoFactorRequired && data?.tempToken) {
        setTempToken(data.tempToken);
        setSetupToken("");
        setTwoFaMode("login");
        setTwoFaOpen(true);
        setGaCode("");
        setQrCodeUrl("");
        setManualKey("");
        setSetupLoaded(true);
        return;
      }

      if (!data?.token) {
        throw new Error("Login succeeded but token missing");
      }

      finishLogin(data);
    } catch (err) {
      console.error("[AdminLogin] login error:", err);
      toast.error(err.message || "Login failed. Check credentials.");
    } finally {
      setLoading(false);
    }
  }

  async function loadSetupQr(tokenToUse = setupToken) {
    try {
      setTwoFaLoading(true);

      const res = await fetch(`${API_BASE}/api/auth/admin/2fa/setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setupToken: tokenToUse }),
      });

      const data = await safeJson(res);

      if (!res.ok) {
        throw new Error(data?.message || "Failed to create Google Authenticator setup");
      }

      setQrCodeUrl(data.qrCodeUrl || "");
      setManualKey(data.manualKey || "");
      setSetupLoaded(true);
    } catch (err) {
      console.error("[AdminLogin] 2FA setup error:", err);
      toast.error(err.message || "Failed to load Google Authenticator QR");
    } finally {
      setTwoFaLoading(false);
    }
  }

  async function handleVerify2FA(e) {
    e.preventDefault();

    const cleanCode = String(gaCode || "").trim();

    if (!/^\d{6}$/.test(cleanCode)) {
      toast.error("Enter the 6-digit Google Authenticator code");
      return;
    }

    setTwoFaLoading(true);

    try {
      const isSetup = twoFaMode === "setup";

      const url = isSetup
        ? `${API_BASE}/api/auth/admin/2fa/verify-setup`
        : `${API_BASE}/api/auth/admin/2fa/verify-login`;

      const payload = isSetup
        ? { setupToken, code: cleanCode }
        : { tempToken, code: cleanCode };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await safeJson(res);

      if (!res.ok) {
        throw new Error(data?.message || "Invalid Google Authenticator code");
      }

      if (!data?.token) {
        throw new Error("2FA passed but token missing");
      }

      finishLogin(data);
    } catch (err) {
      console.error("[AdminLogin] verify 2FA error:", err);
      toast.error(err.message || "Google Authenticator verification failed");
    } finally {
      setTwoFaLoading(false);
    }
  }

  function finishLogin(data) {
    localStorage.setItem("admin_token", data.token);
    toast.success(data?.message || "Login successful");
    navigate("/admin/dashboard", { replace: true });
  }

  async function copyManualKey() {
    if (!manualKey) return;

    try {
      await navigator.clipboard.writeText(manualKey);
      toast.success("Manual key copied");
    } catch {
      toast.error("Copy failed");
    }
  }

  function closeTwoFa() {
    if (twoFaLoading) return;

    setTwoFaOpen(false);
    setTwoFaMode(null);
    setSetupToken("");
    setTempToken("");
    setQrCodeUrl("");
    setManualKey("");
    setGaCode("");
    setSetupLoaded(false);
  }

  return (
    <div className="min-h-screen w-full bg-[#f9f5ee]">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        {/* LEFT BRAND SIDE */}
        <section className="hidden min-h-screen bg-[#3158d4] lg:flex lg:flex-col">
          <div className="h-[52vh] overflow-hidden bg-white">
            <img
              src={LEFT_IMAGE}
              alt="Admin portal"
              className="h-full w-full object-cover"
            />
          </div>

          <div className="flex flex-1 items-center justify-center px-12 py-12">
            <div className="w-full max-w-xl">
              <div className="mb-10 flex items-center justify-center gap-3">
                <div className="text-3xl font-bold tracking-tight text-white">
                  16 集团
                </div>
              </div>

              <div className="relative overflow-hidden bg-[#294ccb]/80 px-8 py-8 shadow-2xl">
                <div className="absolute left-0 top-0 h-full w-1 bg-white" />

                <div className="text-xl font-medium leading-snug text-white">
                  Welcome to{" "}
                  <span className="text-4xl font-bold tracking-tight">
                    16 集团
                  </span>
                </div>

                <div className="mt-2 text-3xl font-bold leading-tight text-white">
                  Admin Management System
                </div>

                <p className="mt-7 max-w-md text-lg leading-relaxed text-white/85">
                  Cloud based streamlined management system with a centralized,
                  secure, and user friendly admin platform.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT LOGIN SIDE */}
        <section className="flex min-h-screen items-center justify-center bg-[#f9f5ee] px-5 py-8 sm:px-8 lg:px-12">
          <div className="w-full max-w-[420px]">
            <div className="mb-12 flex items-center gap-3 lg:mb-10">
              <div className="text-3xl font-bold tracking-tight text-[#3158d4]">
                16 集团
              </div>
            </div>

            <div>
              <h1 className="text-4xl font-bold tracking-tight text-[#2b2b2b]">
                Login
              </h1>

              <p className="mt-3 text-lg leading-relaxed text-[#242424]/80">
                Enter your credentials to login to your account
              </p>
            </div>

            <form onSubmit={handleLogin} className="mt-10 space-y-6">
              <div>
                <label className="mb-3 block text-base font-semibold text-[#303030]">
                  Phone Number
                </label>

                <input
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  type="text"
                  inputMode="text"
                  autoComplete="username"
                  className="min-h-[58px] w-full rounded-xl border border-[#d8d8d8] bg-white px-4 text-base text-[#222] outline-none transition focus:border-[#3158d4] focus:ring-4 focus:ring-[#3158d4]/10"
                />
              </div>

              <div>
                <label className="mb-3 block text-base font-semibold text-[#303030]">
                  Password
                </label>

                <div className="relative">
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={show ? "text" : "password"}
                    autoComplete="current-password"
                    className="min-h-[58px] w-full rounded-xl border border-[#d8d8d8] bg-white px-4 pr-14 text-base text-[#222] outline-none transition focus:border-[#3158d4] focus:ring-4 focus:ring-[#3158d4]/10"
                  />

                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-4 top-1/2 inline-flex -translate-y-1/2 items-center justify-center text-[#9a9a9a] transition hover:text-[#3158d4]"
                    aria-label={show ? "Hide password" : "Show password"}
                  >
                    {show ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex min-h-[58px] w-full items-center justify-center gap-2 rounded-xl bg-[#3158d4] px-5 text-lg font-medium text-white shadow-[0_14px_30px_rgba(49,88,212,0.25)] transition hover:bg-[#284bc4] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Signing In
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            <div className="mt-8 text-base font-semibold text-[#2b2b2b]">
              Secure admin access{" "}
              <span className="font-bold text-[#3158d4]">
                protected by 2FA
              </span>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-3">
              <TrustCard label="Admin" />
              <TrustCard label="JWT" />
              <TrustCard label="2FA" />
            </div>

            <div className="mt-10 block rounded-2xl bg-[#3158d4] p-5 text-white lg:hidden">
              <div className="flex items-center gap-3">
                <div className="text-2xl font-bold">16 集团</div>
              </div>

              <div className="mt-4 text-xl font-bold leading-snug">
                Admin Management System
              </div>

              <p className="mt-2 text-sm leading-relaxed text-white/80">
                Secure mobile access with Google Authenticator verification.
              </p>
            </div>
          </div>
        </section>
      </div>

      <TwoFactorSidebar
        open={twoFaOpen}
        mode={twoFaMode}
        qrCodeUrl={qrCodeUrl}
        manualKey={manualKey}
        gaCode={gaCode}
        setGaCode={setGaCode}
        loading={twoFaLoading}
        setupLoaded={setupLoaded}
        onClose={closeTwoFa}
        onSubmit={handleVerify2FA}
        onCopyManualKey={copyManualKey}
      />
    </div>
  );
}

function TrustCard({ label }) {
  return (
    <div className="rounded-xl border border-[#e7e7e7] bg-[#fafafa] px-3 py-3 text-center text-sm font-semibold text-[#555]">
      {label}
    </div>
  );
}

function TwoFactorSidebar({
  open,
  mode,
  qrCodeUrl,
  manualKey,
  gaCode,
  setGaCode,
  loading,
  setupLoaded,
  onClose,
  onSubmit,
  onCopyManualKey,
}) {
  const isSetup = mode === "setup";

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/45 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed bottom-0 right-0 z-50 flex h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-white text-[#222] shadow-2xl transition-transform duration-300 sm:top-0 sm:h-full sm:max-w-[500px] sm:rounded-none sm:border-l sm:border-[#e5e5e5] ${
          open
            ? "translate-y-0 sm:translate-x-0"
            : "translate-y-full sm:translate-x-full sm:translate-y-0"
        }`}
      >
        <div className="border-b border-[#eeeeee] px-5 py-5 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div>

              <h2 className="mt-4 text-2xl font-bold tracking-tight text-[#222]">
                {isSetup ? "Set Up Authenticator" : "Authenticator Code"}
              </h2>

              <p className="mt-2 max-w-sm text-sm leading-6 text-[#666]">
                {isSetup
                  ? "Scan the QR code once, then enter the 6-digit code."
                  : "Open Google Authenticator and enter the 6-digit code."}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-[#e5e5e5] bg-white p-2.5 text-[#555] transition hover:bg-[#f5f5f5] disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7">
          <div className="rounded-3xl border border-[#eeeeee] bg-[#fafafa] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3158d4] text-white">
                {isSetup ? (
                  <ScanLine className="h-5 w-5" />
                ) : (
                  <Smartphone className="h-5 w-5" />
                )}
              </div>

              <div>
                <div className="text-base font-bold text-[#222]">
                  {isSetup ? "First-time setup" : "Returning admin"}
                </div>
                <div className="text-sm text-[#777]">
                  {isSetup ? "QR scan required once" : "No QR scan needed"}
                </div>
              </div>
            </div>

            {isSetup && (
              <div className="mt-5">
                {!setupLoaded || loading ? (
                  <div className="flex h-[260px] items-center justify-center rounded-2xl border border-[#e5e5e5] bg-white">
                    <div className="text-center">
                      <Loader2 className="mx-auto h-9 w-9 animate-spin text-[#3158d4]" />
                      <div className="mt-3 text-sm text-[#777]">
                        Generating secure QR
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="rounded-2xl border border-[#e5e5e5] bg-white p-4">
                      {qrCodeUrl ? (
                        <img
                          src={qrCodeUrl}
                          alt="Google Authenticator QR Code"
                          className="mx-auto h-[220px] w-[220px]"
                        />
                      ) : (
                        <div className="flex h-[220px] items-center justify-center text-sm text-[#777]">
                          QR code unavailable
                        </div>
                      )}
                    </div>

                    <div className="mt-4 rounded-2xl border border-[#e5e5e5] bg-white p-4">
                      <div className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#777]">
                        Manual setup key
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="min-w-0 flex-1 break-all rounded-xl bg-[#f4f6fb] px-3 py-3 font-mono text-xs leading-5 text-[#333]">
                          {manualKey || "No manual key"}
                        </div>

                        <button
                          type="button"
                          onClick={onCopyManualKey}
                          className="rounded-xl border border-[#e5e5e5] bg-white p-3 text-[#555] transition hover:bg-[#f5f5f5]"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {!isSetup && (
              <div className="mt-5 rounded-2xl border border-[#d8e8ff] bg-[#3158d4]/5 p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-[#3158d4]">
                  <CheckCircle2 className="h-4 w-4" />
                  Authenticator already linked
                </div>
                <p className="mt-2 text-xs leading-5 text-[#666]">
                  Use the live 6-digit code from your app.
                </p>
              </div>
            )}

            <form onSubmit={onSubmit} className="mt-5">
              <label className="mb-2 block text-sm font-bold text-[#333]">
                6-digit Google Authenticator code
              </label>

              <input
                value={gaCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setGaCode(value);
                }}
                placeholder="000000"
                inputMode="numeric"
                autoComplete="one-time-code"
                className="min-h-[62px] w-full rounded-2xl border border-[#d8d8d8] bg-white px-4 text-center text-2xl font-bold tracking-[0.35em] text-[#222] outline-none transition placeholder:text-[#999] focus:border-[#3158d4] focus:ring-4 focus:ring-[#3158d4]/10"
              />

              <button
                type="submit"
                disabled={loading || gaCode.length !== 6}
                className="mt-4 flex min-h-[58px] w-full items-center justify-center gap-2 rounded-2xl bg-[#3158d4] px-4 text-base font-bold text-white shadow-[0_14px_30px_rgba(49,88,212,0.25)] transition hover:bg-[#284bc4] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Verifying
                  </>
                ) : isSetup ? (
                  <>
                    Verify & Activate
                    <ArrowRight className="h-5 w-5" />
                  </>
                ) : (
                  <>
                    Verify & Enter Dashboard
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  );
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}