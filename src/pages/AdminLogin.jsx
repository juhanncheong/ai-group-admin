import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  Star,
  Waves,
} from "lucide-react";
import { toast } from "react-toastify";
import { API_BASE } from "../api";

const LEFT_IMAGE = "/admin-left.jpg";
const LOGO_IMAGE = "/logo.png";

export default function AdminLogin() {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();

    const cleanEmail = String(email || "")
      .trim()
      .toLowerCase();

    if (!cleanEmail || !password) {
      toast.error("Email and password are required");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/admin-auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: cleanEmail,
          password,
        }),
      });

      const data = await safeJson(res);

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Login failed");
      }

      if (!data?.token) {
        throw new Error("Login successful but token missing");
      }

      localStorage.setItem("admin_token", data.token);
      localStorage.setItem("admin_profile", JSON.stringify(data.admin || {}));

      toast.success("Welcome back to Starfish");
      navigate("/admin/telegram-connect", { replace: true });
    } catch (err) {
      console.error("[AdminLogin] error:", err);
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f7f2ea] text-[#2f2a24]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(196,166,118,0.16),transparent_34%),radial-gradient(circle_at_80%_12%,rgba(255,255,255,0.9),transparent_28%),linear-gradient(135deg,#faf7f1,#f3eadc,#fbf8f2)]" />

      <div className="relative grid min-h-screen grid-cols-1 lg:grid-cols-[1fr_1fr]">
        <section className="hidden min-h-screen lg:block">
          <div className="relative flex h-full overflow-hidden border border-[#d9c8ac]/60 bg-white/55 shadow-[0_28px_90px_rgba(90,70,42,0.14)] backdrop-blur-xl">
            <img
              src={LEFT_IMAGE}
              alt="Starfish admin workspace"
              className="absolute inset-0 h-full w-full object-cover opacity-75"
            />

            <div className="absolute inset-0 bg-white/55" />

            <div className="absolute inset-0 bg-gradient-to-br from-[#fffaf2]/85 via-[#fffaf2]/58 to-[#f3eadc]/42" />

            <div className="relative z-10 flex h-full flex-col justify-center p-10 xl:p-12">
              <div className="max-w-xl">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#d8c39e]/70 bg-white/55 px-4 py-2 text-sm font-normal text-[#7a5f35] shadow-[0_10px_35px_rgba(90,70,42,0.08)]">
                  <Sparkles className="h-4 w-4" />
                  Telegram AI Scheduler
                </div>

                <h1 className="text-5xl font-medium leading-[1.02] tracking-[-0.04em] text-[#2f2a24] xl:text-7xl">
                  Manage Telegram messages with quiet confidence.
                </h1>

                <p className="mt-7 max-w-lg text-lg font-normal leading-8 text-[#6f6254]">
                  Connect Telegram, sync groups, approve AI drafts, schedule
                  announcements, and track delivery from one refined Starfish
                  dashboard.
                </p>

                <div className="mt-9 grid max-w-lg grid-cols-3 gap-3">
                  <FeaturePill icon={<ShieldCheck />} label="Secure" />
                  <FeaturePill icon={<Waves />} label="Scheduled" />
                  <FeaturePill icon={<Star />} label="AI Ready" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative flex min-h-screen items-center justify-center px-5 py-8 sm:px-8 lg:px-10">
          <div className="w-full max-w-[470px]">
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BrandMark />

                <div>
                  <div className="text-2xl font-medium tracking-[-0.03em] text-[#2f2a24]">
                    STARFISH
                  </div>

                  <div className="text-xs font-normal uppercase tracking-[0.28em] text-[#9b8461]">
                    Admin Portal
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[34px] border border-[#d8c39e]/65 bg-white/58 p-5 shadow-[0_28px_85px_rgba(90,70,42,0.13)] backdrop-blur-2xl sm:p-7">
              <div className="rounded-[28px] border border-[#eadcc6] bg-[#fffaf3]/92 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] sm:p-7">
                <div className="mb-7">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#d8c39e]/70 bg-white/65 px-3 py-2 text-xs font-normal uppercase tracking-[0.2em] text-[#8a6c3f]">
                    <LockKeyhole className="h-4 w-4" />
                    Secure Access
                  </div>

                  <h2 className="text-4xl font-medium tracking-[-0.04em] text-[#2f2a24]">
                    Welcome back
                  </h2>

                  <p className="mt-3 text-sm font-normal leading-6 text-[#7b6b57]">
                    Sign in to manage Telegram groups, scheduled messages, and
                    AI-assisted announcements.
                  </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-normal text-[#5d5144]">
                      Admin email
                    </label>

                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#a08c6d]" />

                      <input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        type="email"
                        autoComplete="username"
                        className="min-h-[58px] w-full rounded-2xl border border-[#decfb8] bg-white px-4 pl-12 text-base font-normal text-[#2f2a24] outline-none transition placeholder:text-[#b5a58f] focus:border-[#b9975f] focus:bg-white focus:ring-4 focus:ring-[#c7a66d]/15"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-normal text-[#5d5144]">
                      Password
                    </label>

                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#a08c6d]" />

                      <input
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="Enter password"
                        className="min-h-[58px] w-full rounded-2xl border border-[#decfb8] bg-white px-4 pl-12 pr-14 text-base font-normal text-[#2f2a24] outline-none transition placeholder:text-[#b5a58f] focus:border-[#b9975f] focus:bg-white focus:ring-4 focus:ring-[#c7a66d]/15"
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-4 top-1/2 inline-flex -translate-y-1/2 items-center justify-center text-[#a08c6d] transition hover:text-[#6f5430]"
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ? (
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
                    className="group mt-2 flex min-h-[60px] w-full items-center justify-center gap-3 rounded-2xl border border-[#9f8050] bg-[#2f2a24] px-5 text-base font-medium text-[#fffaf3] shadow-[0_18px_45px_rgba(64,45,24,0.2)] transition hover:-translate-y-0.5 hover:bg-[#3b332b] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Signing in
                      </>
                    ) : (
                      <>
                        LOGIN
                        <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-6 grid grid-cols-3 gap-3">
                  <MiniStat label="JWT" value="Token" />
                  <MiniStat label="Role" value="Admin" />
                  <MiniStat label="API" value="Live" />
                </div>
              </div>
            </div>

            <div className="mt-6 text-center text-xs font-normal leading-6 text-[#9b8c79]">
              © {new Date().getFullYear()} Starfish. Secure admin management
              system.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function BrandMark() {
  return (
    <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-[#d2b982] bg-[#fffaf3] text-[#9f8050] shadow-[0_14px_35px_rgba(90,70,42,0.12)]">
      <Star className="h-6 w-6 fill-current" />

      <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-[#fffaf3] bg-[#b9975f]" />
    </div>
  );
}

function FeaturePill({ icon, label }) {
  return (
    <div className="rounded-2xl border border-[#d8c39e]/60 bg-white/55 px-4 py-4 shadow-[0_12px_38px_rgba(90,70,42,0.08)] backdrop-blur-xl">
      <div className="mb-3 text-[#9f8050] [&_svg]:h-5 [&_svg]:w-5">{icon}</div>

      <div className="text-sm font-normal text-[#4d4135]">{label}</div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-[#e2d4be] bg-white px-3 py-3 text-center">
      <div className="text-[10px] font-normal uppercase tracking-[0.2em] text-[#a8977f]">
        {label}
      </div>

      <div className="mt-1 text-sm font-medium text-[#3a3025]">{value}</div>
    </div>
  );
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}
