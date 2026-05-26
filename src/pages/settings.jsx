import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Shell from "../components/Shell";
import { toast } from "react-toastify";
import { useTheme } from "../context/ThemeContext";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "https://slimy-xenia-jayjay122-018fd7f8.koyeb.app";

export default function Settings() {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const mutedText = theme === "dark" ? "text-white/50" : "text-gray-500";
  const softText = theme === "dark" ? "text-white/70" : "text-gray-600";
  const strongText = theme === "dark" ? "text-white" : "text-gray-900";

  const cardClass =
    theme === "dark"
      ? "rounded-2xl border border-white/10 bg-white/5"
      : "rounded-2xl border border-gray-200 bg-white shadow-sm";

  const subCardClass =
    theme === "dark"
      ? "rounded-2xl border border-white/10 bg-white/5 p-3"
      : "rounded-2xl border border-gray-200 bg-gray-50 p-3";

  const inputClass =
    theme === "dark"
      ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/90 outline-none focus:border-white/20"
      : "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-gray-400";

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

  const [vipLoading, setVipLoading] = useState(false);

  const [bonusCommissionRate, setBonusCommissionRate] = useState("0.1");

  const [vipRanks, setVipRanks] = useState([
    { rank: 1, ordersLimit: 40, commissionRate: 0.01, depositRequirement: 50 },
    { rank: 2, ordersLimit: 60, commissionRate: 0.015, depositRequirement: 500 },
    { rank: 3, ordersLimit: 80, commissionRate: 0.02, depositRequirement: 5000 },
  ]);

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

  async function loadVipConfig() {
    setVipLoading(true);

    try {
      const data = await fetchJSON(`${API_BASE}/api/admin/vip/config`);
      const config = data?.config || {};
      const ranks = config?.ranks || [];
      const bonusRate = config?.bonusCommissionRate ?? 0.1;

      setBonusCommissionRate(String(bonusRate));

      if (Array.isArray(ranks) && ranks.length) {
        const cleaned = [...ranks]
          .sort((a, b) => Number(a.rank) - Number(b.rank))
          .map((r) => ({
            rank: Number(r.rank),
            ordersLimit: Number(r.ordersLimit || 0),
            commissionRate: Number(r.commissionRate || 0),
            depositRequirement: Number(r.depositRequirement || 0),
          }));
        
        setVipRanks(cleaned);
      }
    } catch (e) {
      toast.error(e.message || "Failed to load VIP config");
    } finally {
      setVipLoading(false);
    }
  }

  async function saveVipConfig() {
    setVipLoading(true);

    try {
      const cleanBonus = Number(bonusCommissionRate);

      if (!Number.isFinite(cleanBonus) || cleanBonus < 0 || cleanBonus > 1) {
        throw new Error(
          "bonusCommissionRate must be between 0 and 1 (example 0.1)"
        );
      }

      const cleanedRanks = vipRanks.map((r) => {
        const rank = Number(r.rank);
        const ordersLimit = Number(r.ordersLimit);
        const commissionRate = Number(r.commissionRate);
        const depositRequirement = Number(r.depositRequirement);
      
        if (![1, 2, 3].includes(rank)) {
          throw new Error("Rank must be 1, 2, or 3");
        }
      
        if (!Number.isFinite(ordersLimit) || ordersLimit < 1) {
          throw new Error(`Rank ${rank}: ordersLimit must be >= 1`);
        }
      
        if (
          !Number.isFinite(commissionRate) ||
          commissionRate < 0 ||
          commissionRate > 1
        ) {
          throw new Error(`Rank ${rank}: commissionRate must be between 0 and 1`);
        }
      
        if (!Number.isFinite(depositRequirement) || depositRequirement < 0) {
          throw new Error(`Rank ${rank}: depositRequirement must be >= 0`);
        }
      
        return {
          rank,
          ordersLimit,
          commissionRate,
          depositRequirement,
        };
      });

      await fetchJSON(`${API_BASE}/api/admin/vip/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bonusCommissionRate: cleanBonus,
          ranks: cleanedRanks,
        }),
      });

      setVipRanks(cleanedRanks);
      setBonusCommissionRate(String(cleanBonus));
      toast.success("VIP and bonus settings saved");
    } catch (e) {
      toast.error(e.message || "Failed to save VIP config");
    } finally {
      setVipLoading(false);
    }
  }

  useEffect(() => {
    loadVipConfig();
  }, []);

  return (
    <Shell title="Settings • VIP & Bonus">
      <div className={`${cardClass} mt-4 overflow-hidden`}>
        <div
          className={`px-4 py-3 text-sm font-semibold ${
            theme === "dark" ? "bg-white/5 text-white" : "bg-gray-50 text-gray-900"
          }`}
        >
          VIP & Bonus Settings
        </div>

        <div className="space-y-4 p-4">
          <div className={`text-xs ${mutedText}`}>
            Set the global bonus order commission rate and the normal order
            commission rate for each VIP rank.
            <span className={`ml-2 ${theme === "dark" ? "text-white/30" : "text-gray-400"}`}>
              Example: 0.01 = 1%, 0.1 = 10%
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className={subCardClass}>
              <div className={`text-xs font-semibold ${strongText}`}>
                Bonus Order Commission Rate
              </div>
              <div className={`mt-1 text-[11px] ${mutedText}`}>
                Global rate used when order is marked as bonus
              </div>

              <input
                value={bonusCommissionRate}
                onChange={(e) => setBonusCommissionRate(e.target.value)}
                placeholder="0.1"
                className={`mt-3 ${inputClass}`}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className={tableHeadClass}>
                <tr>
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Orders Limit</th>
                  <th className="px-4 py-3">Normal Commission Rate</th>
                  <th className="px-4 py-3">Deposit Requirement</th>
                </tr>
              </thead>

              <tbody className={tableBodyClass}>
                {vipRanks.map((r, idx) => (
                  <tr key={r.rank} className={tableRowClass}>
                    <td className={`px-4 py-3 ${strongText}`}>
                      Rank {r.rank}
                    </td>

                    <td className="px-4 py-3">
                      <input
                        value={String(r.ordersLimit ?? "")}
                        onChange={(e) => {
                          const v = e.target.value;
                          setVipRanks((prev) =>
                            prev.map((x, i) =>
                              i === idx ? { ...x, ordersLimit: v } : x
                            )
                          );
                        }}
                        className={`w-32 ${inputClass}`}
                      />
                    </td>

                    <td className="px-4 py-3">
                      <input
                        value={String(r.commissionRate ?? "")}
                        onChange={(e) => {
                          const v = e.target.value;
                          setVipRanks((prev) =>
                            prev.map((x, i) =>
                              i === idx ? { ...x, commissionRate: v } : x
                            )
                          );
                        }}
                        className={`w-32 ${inputClass}`}
                      />
                    </td>

                    <td className="px-4 py-3">
                      <input
                        value={String(r.depositRequirement ?? "")}
                        onChange={(e) => {
                          const v = e.target.value;
                          setVipRanks((prev) =>
                            prev.map((x, i) =>
                              i === idx ? { ...x, depositRequirement: v } : x
                            )
                          );
                        }}
                        className={`w-32 ${inputClass}`}
                        placeholder="500"
                      />
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              disabled={vipLoading}
              onClick={loadVipConfig}
              className={`${buttonClass} disabled:opacity-50`}
            >
              Refresh
            </button>

            <button
              disabled={vipLoading}
              onClick={saveVipConfig}
              className={`${primaryButtonClass} disabled:opacity-50`}
            >
              {vipLoading ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      </div>
    </Shell>
  );
}