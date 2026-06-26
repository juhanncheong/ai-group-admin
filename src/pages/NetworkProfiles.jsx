import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  CircleOff,
  Clock3,
  Globe2,
  Loader2,
  MoreHorizontal,
  Network,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import Shell from "../components/Shell";
import { api } from "../api";
import { useTheme } from "../context/ThemeContext";

const DEFAULT_IMPORT_META = {
  provider: "webshare",
  source: "webshare",
  type: "socks5",
};

const NETWORK_STATUS_OPTIONS = [
  { value: "all", label: "All status" },
  { value: "available", label: "Available" },
  { value: "assigned", label: "Assigned" },
  { value: "reserved", label: "Reserved" },
  { value: "disabled", label: "Disabled" },
  { value: "failed", label: "Failed" },
  { value: "unknown", label: "Unknown" },
];

function getNetworkStatus(profile) {
  return String(profile?.status || "unknown").toLowerCase();
}

function getNetworkStatusDotClass(status) {
  const clean = String(status || "").toLowerCase();

  if (clean === "available") return "bg-emerald-400";
  if (clean === "assigned") return "bg-sky-400";
  if (clean === "reserved") return "bg-amber-400";
  if (clean === "disabled") return "bg-red-400";
  if (clean === "failed") return "bg-red-400";

  return "bg-slate-400";
}

function normalizeSearch(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .trim();
}

function getRole() {
  try {
    const raw = localStorage.getItem("admin_profile");
    const profile = raw ? JSON.parse(raw) : {};
    return profile?.role || "admin";
  } catch {
    return "admin";
  }
}

function countProxyLines(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean).length;
}

export default function NetworkProfiles() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const isSuperAdmin = getRole() === "super_admin";

  const [profiles, setProfiles] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    assigned: 0,
    reserved: 0,
    disabled: 0,
    failed: 0,
    tested: 0,
    working: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [testAllLoading, setTestAllLoading] = useState(false);
  const [testAllProgress, setTestAllProgress] = useState({
    done: 0,
    total: 0,
  });

  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importMeta, setImportMeta] = useState(DEFAULT_IMPORT_META);
  const [importing, setImporting] = useState(false);

  const [moreProfile, setMoreProfile] = useState(null);
  const [assignProfile, setAssignProfile] = useState(null);
  const [assignableAccounts, setAssignableAccounts] = useState([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assigningAccountId, setAssigningAccountId] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter]);

  const filteredProfiles = useMemo(() => {
    const keyword = normalizeSearch(searchQuery);
    const selectedStatus = normalizeSearch(statusFilter);

    return profiles.filter((profile) => {
      const profileStatus = normalizeSearch(getNetworkStatus(profile));

      if (selectedStatus !== "all" && profileStatus !== selectedStatus) {
        return false;
      }

      if (!keyword) return true;

      const text = [
        profile.name,
        profile.type,
        profile.host,
        profile.port,
        profile.username,
        profile.provider,
        profile.source,
        profile.status,
        profile.detectedIp,
        profile.lastError,
        profile.country,
        profile.city,
        profile.region,
        profile.assignedTelegramAccount?.phoneNumber,
        profile.assignedTelegramAccount?.label,
        profile.assignedTelegramAccount?.telegramUsername,
      ]
        .map(normalizeSearch)
        .join("");

      return text.includes(keyword);
    });
  }, [profiles, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProfiles.length / pageSize));

  const paginatedProfiles = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredProfiles.slice(start, start + pageSize);
  }, [filteredProfiles, page]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  async function loadData(options = {}) {
    const silent = options.silent === true;

    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [profilesRes, statsRes] = await Promise.all([
        api.get("/api/network-profiles"),
        api.get("/api/network-profiles/stats"),
      ]);

      setProfiles(
        Array.isArray(profilesRes.data?.data) ? profilesRes.data.data : [],
      );

      setStats(statsRes.data?.data || {});
    } catch (err) {
      console.error("Load network profiles error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to load network profiles",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function blockIfNotSuperAdmin() {
    if (isSuperAdmin) return false;

    toast.error("Only super admin can edit this.");
    return true;
  }

  function updateImportMeta(field, value) {
    setImportMeta((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleImport(e) {
    e.preventDefault();

    if (blockIfNotSuperAdmin()) return;

    const text = String(importText || "").trim();

    if (!text) {
      toast.error("Paste your proxy list first");
      return;
    }

    const lines = countProxyLines(text);

    if (!lines) {
      toast.error("No valid proxy lines found");
      return;
    }

    setImporting(true);

    try {
      const res = await api.post("/api/network-profiles/import", {
        text,
        provider: importMeta.provider,
        source: importMeta.source,
        type: importMeta.type || "socks5",
      });

      toast.success(res.data?.message || "Network profiles imported");

      setImportText("");
      setImportMeta(DEFAULT_IMPORT_META);
      setImportOpen(false);

      await loadData({ silent: true });
    } catch (err) {
      console.error("Import network profiles error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to import network profiles",
      );
    } finally {
      setImporting(false);
    }
  }

  async function handleTestAll() {
    if (blockIfNotSuperAdmin()) return;

    const targets = profiles.filter((profile) => profile?._id);

    if (!targets.length) {
      toast.error("No network profiles to test");
      return;
    }

    const yes = window.confirm(
      `Test all ${targets.length} network profiles? This may take a while.`,
    );

    if (!yes) return;

    setTestAllLoading(true);
    setTestAllProgress({
      done: 0,
      total: targets.length,
    });

    let working = 0;
    let failed = 0;

    try {
      for (const profile of targets) {
        try {
          const res = await api.post(
            `/api/network-profiles/${profile._id}/test`,
          );

          if (res.data?.success) {
            working += 1;
          } else {
            failed += 1;
          }
        } catch (err) {
          failed += 1;
          console.error("Test profile failed:", profile._id, err);
        } finally {
          setTestAllProgress((prev) => ({
            ...prev,
            done: prev.done + 1,
          }));
        }
      }

      toast.success(`Test complete · ${working} working · ${failed} failed`);
      await loadData({ silent: true });
    } catch (err) {
      console.error("Test all network profiles error:", err);
      toast.error("Failed to test all network profiles");
    } finally {
      setTestAllLoading(false);
      setTestAllProgress({
        done: 0,
        total: 0,
      });
    }
  }

  async function handleTest(profileId) {
    if (!profileId) return;
    if (blockIfNotSuperAdmin()) return;

    setActionId(profileId);

    try {
      const res = await api.post(`/api/network-profiles/${profileId}/test`);

      if (res.data?.success) {
        const ip = res.data?.data?.detectedIp;
        const latency = res.data?.data?.latencyMs;

        toast.success(
          ip
            ? `Proxy working · IP ${ip}${latency ? ` · ${latency}ms` : ""}`
            : res.data?.message || "Proxy is working",
        );
      } else {
        toast.error(res.data?.message || "Proxy test failed");
      }

      await loadData({ silent: true });
    } catch (err) {
      console.error("Test network profile error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Proxy test failed",
      );
      await loadData({ silent: true });
    } finally {
      setActionId("");
    }
  }

  async function handleDisable(profileId) {
    if (!profileId) return;
    if (blockIfNotSuperAdmin()) return;

    const yes = window.confirm("Disable this network profile?");
    if (!yes) return;

    setActionId(profileId);

    try {
      const res = await api.patch(`/api/network-profiles/${profileId}/status`, {
        status: "disabled",
      });

      toast.success(res.data?.message || "Network profile disabled");
      setMoreProfile(null);
      await loadData({ silent: true });
    } catch (err) {
      console.error("Disable network profile error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to disable network profile",
      );
    } finally {
      setActionId("");
    }
  }

  async function handleRelease(profileId) {
    if (!profileId) return;
    if (blockIfNotSuperAdmin()) return;

    const yes = window.confirm(
      "Release this network profile back to available pool? This will remove it from the Telegram account.",
    );

    if (!yes) return;

    setActionId(profileId);

    try {
      const res = await api.post(`/api/network-profiles/${profileId}/release`);

      toast.success(res.data?.message || "Network profile released");
      setMoreProfile(null);
      await loadData({ silent: true });
    } catch (err) {
      console.error("Release network profile error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to release network profile",
      );
    } finally {
      setActionId("");
    }
  }

  async function handleMarkAvailable(profileId) {
    if (!profileId) return;
    if (blockIfNotSuperAdmin()) return;

    setActionId(profileId);

    try {
      const res = await api.patch(`/api/network-profiles/${profileId}/status`, {
        status: "available",
      });

      toast.success(res.data?.message || "Network profile marked available");
      setMoreProfile(null);
      await loadData({ silent: true });
    } catch (err) {
      console.error("Mark available network profile error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to mark profile available",
      );
    } finally {
      setActionId("");
    }
  }

  async function handleDelete(profileId) {
    if (!profileId) return;
    if (blockIfNotSuperAdmin()) return;

    const yes = window.confirm(
      "Delete this network profile? Only unassigned profiles can be deleted.",
    );

    if (!yes) return;

    setActionId(profileId);

    try {
      const res = await api.delete(`/api/network-profiles/${profileId}`);

      toast.success(res.data?.message || "Network profile deleted");
      setMoreProfile(null);
      await loadData({ silent: true });
    } catch (err) {
      console.error("Delete network profile error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to delete network profile",
      );
    } finally {
      setActionId("");
    }
  }

  async function loadAssignableTelegramAccounts() {
    setAssignLoading(true);

    try {
      const res = await api.get(
        "/api/network-profiles/telegram-accounts/without-ip",
      );

      setAssignableAccounts(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      console.error("Load assignable Telegram accounts error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to load Telegram accounts without IP",
      );
    } finally {
      setAssignLoading(false);
    }
  }

  function openAssignDrawer(profile) {
    if (blockIfNotSuperAdmin()) return;

    const isAvailable = getNetworkStatus(profile) === "available";
    const isAssigned = Boolean(profile?.assignedTelegramAccount);

    if (!isAvailable || isAssigned) {
      toast.error("Only available and unassigned IPs can be assigned.");
      return;
    }

    setMoreProfile(null);
    setAssignProfile(profile);
    loadAssignableTelegramAccounts();
  }

  async function handleAssignTelegramAccount(accountId) {
    if (!assignProfile?._id || !accountId) return;
    if (blockIfNotSuperAdmin()) return;

    setAssigningAccountId(accountId);

    try {
      const res = await api.post(
        `/api/network-profiles/${assignProfile._id}/assign-telegram-account`,
        {
          telegramAccountId: accountId,
        },
      );

      toast.success(res.data?.message || "IP assigned to Telegram account");

      setAssignProfile(null);
      setAssignableAccounts([]);

      await loadData({ silent: true });
    } catch (err) {
      console.error("Assign Telegram account error:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to assign IP to Telegram account",
      );
    } finally {
      setAssigningAccountId("");
    }
  }

  return (
    <Shell title="Network Profiles">
      <div
        className={`-mx-3 -my-3 min-h-[calc(100vh-78px)] px-6 py-6 ${
          isDark ? "bg-[#202127]" : "bg-[#f4efe6]"
        }`}
      >
        <section className="space-y-5">
          <TopHeader
            isDark={isDark}
            refreshing={refreshing}
            testAllLoading={testAllLoading}
            testAllProgress={testAllProgress}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            resultCount={filteredProfiles.length}
            totalCount={profiles.length}
            onRefresh={() => loadData({ silent: true })}
            onTestAll={handleTestAll}
            onImport={() => {
              if (blockIfNotSuperAdmin()) return;
              setImportOpen(true);
            }}
          />

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-8">
            <MiniStat label="Total" value={stats.total || 0} isDark={isDark} />
            <MiniStat
              label="Available"
              value={stats.available || 0}
              isDark={isDark}
              active
            />
            <MiniStat
              label="Working"
              value={stats.working || 0}
              isDark={isDark}
            />
            <MiniStat
              label="Tested"
              value={stats.tested || 0}
              isDark={isDark}
            />
            <MiniStat
              label="Assigned"
              value={stats.assigned || 0}
              isDark={isDark}
            />
            <MiniStat
              label="Reserved"
              value={stats.reserved || 0}
              isDark={isDark}
            />
            <MiniStat
              label="Failed"
              value={stats.failed || 0}
              isDark={isDark}
            />
            <MiniStat
              label="Disabled"
              value={stats.disabled || 0}
              isDark={isDark}
            />
          </div>

          <InfoStrip isDark={isDark} isSuperAdmin={isSuperAdmin} />

          <div
            className={`overflow-hidden rounded-[28px] border shadow-[0_24px_80px_rgba(17,15,10,0.08)] ${
              isDark
                ? "border-white/[0.06] bg-[#282a30]"
                : "border-[#eee4d5] bg-white"
            }`}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse">
                <thead>
                  <tr
                    className={
                      isDark
                        ? "border-b border-white/[0.05] bg-[#24252b] text-white/42"
                        : "border-b border-[#eee4d5] bg-[#fbf8f2] text-[#8a8176]"
                    }
                  >
                    <Th>No.</Th>
                    <Th>Profile</Th>
                    <Th>IP / Endpoint</Th>
                    <Th>Status</Th>
                    <Th>Assigned</Th>
                    <Th>Tested</Th>
                    <Th>Health</Th>
                    <Th align="right">More</Th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-12 text-center">
                        <div
                          className={`inline-flex items-center gap-2 text-sm ${
                            isDark ? "text-white/50" : "text-[#746b61]"
                          }`}
                        >
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading network profiles...
                        </div>
                      </td>
                    </tr>
                  ) : filteredProfiles.length ? (
                    paginatedProfiles.map((profile, index) => (
                      <ProfileRow
                        key={profile._id}
                        rowNumber={(page - 1) * pageSize + index + 1}
                        profile={profile}
                        isDark={isDark}
                        busy={actionId === profile._id}
                        onMore={() => setMoreProfile(profile)}
                      />
                    ))
                  ) : profiles.length &&
                    (searchQuery.trim() || statusFilter !== "all") ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-12 text-center">
                        <FilterEmptyState
                          isDark={isDark}
                          onClear={() => {
                            setSearchQuery("");
                            setStatusFilter("all");
                          }}
                        />
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-5 py-12 text-center">
                        <EmptyState
                          isDark={isDark}
                          onImport={() => {
                            if (blockIfNotSuperAdmin()) return;
                            setImportOpen(true);
                          }}
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {filteredProfiles.length > pageSize && (
              <LuxuryPagination
                isDark={isDark}
                page={page}
                totalPages={totalPages}
                totalItems={filteredProfiles.length}
                pageSize={pageSize}
                itemLabel="profiles"
                onPageChange={setPage}
              />
            )}
          </div>
        </section>

        {importOpen && (
          <ImportModal
            isDark={isDark}
            value={importText}
            onChange={setImportText}
            meta={importMeta}
            onMetaChange={updateImportMeta}
            loading={importing}
            onClose={() => {
              if (!importing) setImportOpen(false);
            }}
            onSubmit={handleImport}
          />
        )}

        {moreProfile && (
          <ProfileActionModal
            isDark={isDark}
            profile={moreProfile}
            busy={actionId === moreProfile._id}
            onClose={() => {
              if (!actionId) setMoreProfile(null);
            }}
            onTest={() => handleTest(moreProfile._id)}
            onAssign={() => openAssignDrawer(moreProfile)}
            onDisable={() => handleDisable(moreProfile._id)}
            onRelease={() => handleRelease(moreProfile._id)}
            onMarkAvailable={() => handleMarkAvailable(moreProfile._id)}
            onDelete={() => handleDelete(moreProfile._id)}
          />
        )}

        {assignProfile && (
          <AssignTelegramDrawer
            isDark={isDark}
            profile={assignProfile}
            accounts={assignableAccounts}
            loading={assignLoading}
            assigningAccountId={assigningAccountId}
            onRefresh={loadAssignableTelegramAccounts}
            onClose={() => {
              if (!assigningAccountId) {
                setAssignProfile(null);
                setAssignableAccounts([]);
              }
            }}
            onAssign={handleAssignTelegramAccount}
          />
        )}
      </div>
    </Shell>
  );
}

function TopHeader({
  isDark,
  refreshing,
  testAllLoading,
  testAllProgress,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  resultCount,
  totalCount,
  onRefresh,
  onTestAll,
  onImport,
}) {
  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-[0_16px_35px_rgba(0,0,0,0.10)] ${
            isDark ? "bg-white/[0.06] text-white/65" : "bg-white text-[#6d6254]"
          }`}
        >
          <Network className="h-4 w-4" />
        </div>

        <div className="min-w-0">
          <div
            className={`text-[11px] font-medium uppercase tracking-[0.18em] ${
              isDark ? "text-white/38" : "text-[#8a8176]"
            }`}
          >
            Proxy Pool
          </div>

          <h2
            className={`mt-0.5 truncate text-[22px] font-semibold tracking-[-0.04em] ${
              isDark ? "text-white" : "text-[#201d19]"
            }`}
          >
            Network Profiles
          </h2>
        </div>
      </div>

      <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center xl:w-auto">
        <StatusFilterDropdown
          isDark={isDark}
          value={statusFilter}
          onChange={setStatusFilter}
        />

        <SearchBar
          isDark={isDark}
          value={searchQuery}
          onChange={setSearchQuery}
          resultCount={resultCount}
          totalCount={totalCount}
        />

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className={softButtonClass(isDark)}
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
            onClick={onTestAll}
            disabled={testAllLoading}
            className={softButtonClass(isDark)}
          >
            {testAllLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}

            {testAllLoading
              ? `Testing ${testAllProgress.done}/${testAllProgress.total}`
              : "Test All"}
          </button>

          <button
            type="button"
            onClick={onImport}
            className={primaryButtonClass()}
          >
            <Plus className="h-3.5 w-3.5" />
            Import Profiles
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoStrip({ isDark, isSuperAdmin }) {
  return (
    <div
      className={`rounded-[24px] border px-4 py-3 ${
        isDark
          ? "border-white/[0.06] bg-[#282a30] text-white"
          : "border-[#eee4d5] bg-white text-[#201d19]"
      }`}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] bg-[#d8c49a] text-[#171719] shadow-[0_14px_35px_rgba(216,196,154,0.20)]">
            <ShieldCheck className="h-4 w-4" />
          </div>

          <div>
            <div className="text-sm font-semibold">
              {isSuperAdmin ? "Super admin controls enabled" : "View only mode"}
            </div>

            <div
              className={`mt-1 text-xs leading-5 ${
                isDark ? "text-white/42" : "text-[#746b61]"
              }`}
            >
              Actions are now inside one compact More menu. Available IPs can be
              assigned to connected Telegram accounts that currently have no IP.
            </div>
          </div>
        </div>

        <div
          className={`rounded-[16px] px-3 py-2 text-xs ${
            isDark
              ? "bg-white/[0.06] text-white/45"
              : "bg-[#f7f2ea] text-[#70675c]"
          }`}
        >
          Format: host:port:username:password
        </div>
      </div>
    </div>
  );
}

function ProfileRow({ rowNumber, profile, isDark, busy, onMore }) {
  const assigned = profile.assignedTelegramAccount;
  const endpoint = [profile.host, profile.port].filter(Boolean).join(":");

  return (
    <tr
      className={`border-b last:border-b-0 ${
        isDark
          ? "border-white/[0.045] text-white hover:bg-white/[0.03]"
          : "border-[#eee4d5]/80 text-[#201d19] hover:bg-[#fbf8f2]"
      }`}
    >
      <td className="px-5 py-3">
        <div
          className={`inline-flex h-8 min-w-8 items-center justify-center rounded-xl px-2 text-xs font-semibold ${
            isDark
              ? "bg-white/[0.06] text-white/50"
              : "bg-[#f4efe6] text-[#746b61]"
          }`}
        >
          {rowNumber}
        </div>
      </td>

      <td className="px-5 py-3">
        <div className="max-w-[230px] truncate text-sm font-medium">
          {profile.name || "Network Profile"}
        </div>

        <div className={`mt-0.5 text-xs ${mutedTextClass(isDark)}`}>
          proxy · {String(profile.type || "socks5").toUpperCase()}
        </div>
      </td>

      <td className="px-5 py-3">
        <div className="flex items-center gap-2">
          <Globe2 className={`h-3.5 w-3.5 ${mutedTextClass(isDark)}`} />
          <span className="font-mono text-xs">{profile.detectedIp || "-"}</span>
        </div>

        <div
          className={`mt-0.5 max-w-[210px] truncate text-xs ${mutedTextClass(isDark)}`}
        >
          {endpoint || "No endpoint"}{" "}
          {profile.latencyMs ? `· ${profile.latencyMs}ms` : ""}
        </div>
      </td>

      <td className="px-5 py-3">
        <StatusPill status={profile.status} isDark={isDark} />
      </td>

      <td className="px-5 py-3">
        {assigned ? (
          <div>
            <div className="max-w-[180px] truncate text-sm font-medium">
              {assigned.label ||
                assigned.telegramUsername ||
                "Telegram Account"}
            </div>
            <div className={`mt-0.5 text-xs ${mutedTextClass(isDark)}`}>
              {assigned.phoneNumber || "-"}
            </div>
          </div>
        ) : (
          <span className={`text-xs ${mutedTextClass(isDark)}`}>
            Not assigned
          </span>
        )}
      </td>

      <td className={`px-5 py-3 text-xs leading-5 ${mutedTextClass(isDark)}`}>
        {formatDate(profile.lastTestedAt)}
      </td>

      <td className="px-5 py-3">
        <HealthBox profile={profile} isDark={isDark} />
      </td>

      <td className="px-5 py-3">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onMore}
            disabled={busy}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl transition disabled:cursor-not-allowed disabled:opacity-60 ${
              isDark
                ? "bg-white/[0.07] text-white/62 hover:bg-white/[0.12] hover:text-white"
                : "bg-[#f4efe6] text-[#5c5348] hover:bg-[#e9ddca] hover:text-[#201d19]"
            }`}
            title="More actions"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MoreHorizontal className="h-4 w-4" />
            )}
          </button>
        </div>
      </td>
    </tr>
  );
}

function ProfileActionModal({
  isDark,
  profile,
  busy,
  onClose,
  onTest,
  onAssign,
  onDisable,
  onRelease,
  onMarkAvailable,
  onDelete,
}) {
  const status = getNetworkStatus(profile);
  const assigned = profile.assignedTelegramAccount;
  const canAssign = status === "available" && !assigned;
  const canMarkAvailable = status !== "available";
  const canRelease = status !== "available";
  const canDisable = status !== "disabled";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 z-0 bg-black/55 backdrop-blur-sm"
        aria-label="Close modal backdrop"
      />

      <div
        className={`relative z-10 w-full max-w-[560px] overflow-hidden rounded-[32px] shadow-2xl ${
          isDark ? "bg-[#202127] text-white" : "bg-white text-[#171717]"
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className={`absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-2xl transition ${
            isDark
              ? "bg-white/[0.08] text-white/60 hover:bg-white/[0.12]"
              : "bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0]"
          } disabled:opacity-50`}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative overflow-hidden bg-[#d8c49a] px-6 pb-7 pt-8 text-[#171717]">
          <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-white/20 blur-2xl" />
          <div className="absolute -bottom-16 left-8 h-32 w-32 rounded-full bg-black/10 blur-2xl" />

          <div className="relative">
            <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-black/10">
              <MoreHorizontal className="h-7 w-7" />
            </div>

            <div className="mt-4 text-xl font-semibold tracking-[-0.04em]">
              Network Actions
            </div>

            <div className="mt-1 max-w-[440px] text-sm text-black/60">
              Manage this IP without widening your table.
            </div>
          </div>
        </div>

        <div className="space-y-4 px-6 py-6">
          <div
            className={`rounded-[22px] border p-4 ${
              isDark
                ? "border-white/[0.07] bg-white/[0.045]"
                : "border-[#eee4d5] bg-[#fbf8f2]"
            }`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">
                  {profile.name || "Network Profile"}
                </div>
                <div
                  className={`mt-1 font-mono text-xs ${mutedTextClass(isDark)}`}
                >
                  {[profile.host, profile.port].filter(Boolean).join(":") ||
                    "-"}
                </div>
              </div>

              <StatusPill status={profile.status} isDark={isDark} />
            </div>

            <div className={`mt-3 text-xs leading-5 ${mutedTextClass(isDark)}`}>
              Assigned:{" "}
              <span className={isDark ? "text-white/75" : "text-[#201d19]"}>
                {assigned
                  ? assigned.label || assigned.phoneNumber || "Telegram Account"
                  : "Not assigned"}
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <ActionTile
              isDark={isDark}
              title="Test Proxy"
              description="Check detected IP and latency."
              disabled={busy}
              loading={busy}
              onClick={onTest}
            />

            <ActionTile
              isDark={isDark}
              title="Assign Telegram"
              description={
                canAssign
                  ? "Attach this available IP to a connected Telegram account."
                  : "Only available and unassigned IPs can be assigned."
              }
              icon={<UserPlus className="h-4 w-4" />}
              disabled={busy || !canAssign}
              highlight={canAssign}
              onClick={onAssign}
            />

            <ActionTile
              isDark={isDark}
              title="Mark Available"
              description="Move this IP back to available status."
              disabled={busy || !canMarkAvailable}
              onClick={onMarkAvailable}
            />

            <ActionTile
              isDark={isDark}
              title="Release"
              description="Detach from Telegram and return to available pool."
              disabled={busy || !canRelease}
              warning
              onClick={onRelease}
            />

            <ActionTile
              isDark={isDark}
              title="Disable"
              description="Stop this IP from being used."
              disabled={busy || !canDisable}
              warning
              onClick={onDisable}
            />

            <ActionTile
              isDark={isDark}
              title="Delete"
              description="Remove this IP. Only works when unassigned."
              icon={<Trash2 className="h-4 w-4" />}
              disabled={busy}
              danger
              onClick={onDelete}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionTile({
  isDark,
  title,
  description,
  icon,
  disabled,
  loading,
  highlight,
  warning,
  danger,
  onClick,
}) {
  let iconClass = isDark
    ? "bg-white/[0.08] text-white/65"
    : "bg-[#f4efe6] text-[#5c5348]";

  if (highlight) {
    iconClass = "bg-emerald-400/15 text-emerald-500";
  }

  if (warning) {
    iconClass = "bg-amber-400/15 text-amber-500";
  }

  if (danger) {
    iconClass = "bg-red-400/15 text-red-500";
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group rounded-[22px] border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${
        isDark
          ? "border-white/[0.07] bg-white/[0.045] hover:bg-white/[0.075]"
          : "border-[#eee4d5] bg-white hover:bg-[#fbf8f2]"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl transition ${iconClass}`}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            icon || <RefreshCw className="h-4 w-4" />
          )}
        </div>

        <div className="min-w-0">
          <div
            className={`text-sm font-semibold ${
              isDark ? "text-white" : "text-[#201d19]"
            }`}
          >
            {title}
          </div>

          <div
            className={`mt-1 text-xs leading-5 ${
              isDark ? "text-white/42" : "text-[#746b61]"
            }`}
          >
            {description}
          </div>
        </div>
      </div>
    </button>
  );
}

function AssignTelegramDrawer({
  isDark,
  profile,
  accounts,
  loading,
  assigningAccountId,
  onRefresh,
  onClose,
  onAssign,
}) {
  const [query, setQuery] = useState("");

  const filteredAccounts = useMemo(() => {
    const keyword = normalizeSearch(query);

    if (!keyword) return accounts;

    return accounts.filter((account) => {
      const text = [
        account.phoneNumber,
        account.label,
        account.telegramUsername,
        account.telegramFirstName,
        account.telegramLastName,
        account.status,
      ]
        .map(normalizeSearch)
        .join("");

      return text.includes(keyword);
    });
  }, [accounts, query]);

  return (
    <div className="fixed inset-0 z-[60]">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
        aria-label="Close drawer backdrop"
      />

      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-[520px] flex-col shadow-2xl ${
          isDark ? "bg-[#202127] text-white" : "bg-[#fbf8f2] text-[#171717]"
        }`}
      >
        <div
          className={`border-b px-5 py-5 ${
            isDark ? "border-white/[0.07]" : "border-[#eee4d5]"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div
                className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${
                  isDark ? "text-white/38" : "text-[#8a8176]"
                }`}
              >
                Assign IP
              </div>

              <div className="mt-1 text-xl font-semibold tracking-[-0.04em]">
                Select Telegram Account
              </div>

              <div
                className={`mt-2 text-xs leading-5 ${mutedTextClass(isDark)}`}
              >
                This does not reconnect Telegram. It only attaches this
                available IP to a connected Telegram account with no IP.
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={Boolean(assigningAccountId)}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition ${
                isDark
                  ? "bg-white/[0.08] text-white/60 hover:bg-white/[0.12]"
                  : "bg-white text-[#475569] hover:bg-[#f1f5f9]"
              } disabled:opacity-50`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div
            className={`mt-5 rounded-[24px] border p-4 ${
              isDark
                ? "border-white/[0.07] bg-white/[0.045]"
                : "border-[#eee4d5] bg-white"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">
                  {profile.name || "Available IP"}
                </div>
                <div
                  className={`mt-1 font-mono text-xs ${mutedTextClass(isDark)}`}
                >
                  {[profile.host, profile.port].filter(Boolean).join(":") ||
                    "-"}
                </div>
              </div>

              <StatusPill status={profile.status} isDark={isDark} />
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <div
              className={`flex h-10 min-w-0 flex-1 items-center gap-2 rounded-[16px] border px-3 ${
                isDark
                  ? "border-white/[0.07] bg-white/[0.055]"
                  : "border-[#eee4d5] bg-white"
              }`}
            >
              <Search
                className={`h-3.5 w-3.5 shrink-0 ${
                  isDark ? "text-white/35" : "text-[#8a8176]"
                }`}
              />

              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search phone, label, username..."
                className={`h-full min-w-0 flex-1 bg-transparent text-[13px] outline-none ${
                  isDark
                    ? "text-white placeholder:text-white/30"
                    : "text-[#201d19] placeholder:text-[#9b9287]"
                }`}
              />
            </div>

            <button
              type="button"
              onClick={onRefresh}
              disabled={loading || Boolean(assigningAccountId)}
              className={softIconButtonClass(isDark)}
              title="Refresh accounts"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {loading ? (
            <div
              className={`py-14 text-center text-sm ${mutedTextClass(isDark)}`}
            >
              <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />
              Loading Telegram accounts without IP...
            </div>
          ) : filteredAccounts.length ? (
            <div className="space-y-3">
              {filteredAccounts.map((account) => (
                <TelegramAccountCard
                  key={account._id}
                  isDark={isDark}
                  account={account}
                  loading={assigningAccountId === account._id}
                  disabled={Boolean(assigningAccountId)}
                  onAssign={() => onAssign(account._id)}
                />
              ))}
            </div>
          ) : accounts.length && query.trim() ? (
            <DrawerEmptyState
              isDark={isDark}
              title="No matching Telegram account"
              description="Try another phone number, label, or username."
            />
          ) : (
            <DrawerEmptyState
              isDark={isDark}
              title="No connected Telegram accounts without IP"
              description="Release an expired IP from a connected Telegram account first, then it will appear here."
            />
          )}
        </div>
      </aside>
    </div>
  );
}

function TelegramAccountCard({ isDark, account, loading, disabled, onAssign }) {
  const displayName =
    account.label ||
    account.telegramUsername ||
    [account.telegramFirstName, account.telegramLastName]
      .filter(Boolean)
      .join(" ") ||
    "Telegram Account";

  return (
    <div
      className={`rounded-[24px] border p-4 transition ${
        isDark
          ? "border-white/[0.07] bg-white/[0.045]"
          : "border-[#eee4d5] bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{displayName}</div>

          <div className={`mt-1 text-xs ${mutedTextClass(isDark)}`}>
            {account.phoneNumber || "-"}
          </div>

          <div
            className={`mt-2 flex flex-wrap gap-2 text-[11px] ${mutedTextClass(isDark)}`}
          >
            <span
              className={`rounded-full px-2 py-1 ${
                isDark ? "bg-white/[0.06]" : "bg-[#f7f2ea]"
              }`}
            >
              {account.status || "connected"}
            </span>

            <span
              className={`rounded-full px-2 py-1 ${
                isDark ? "bg-white/[0.06]" : "bg-[#f7f2ea]"
              }`}
            >
              No IP assigned
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onAssign}
          disabled={disabled}
          className={primaryButtonClass("min-w-[92px]")}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
          Assign
        </button>
      </div>
    </div>
  );
}

function DrawerEmptyState({ isDark, title, description }) {
  return (
    <div className="py-14 text-center">
      <div
        className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl ${
          isDark ? "bg-white/[0.07] text-white/60" : "bg-white text-[#5c5348]"
        }`}
      >
        <AlertTriangle className="h-5 w-5" />
      </div>

      <div
        className={`mt-4 text-sm font-semibold ${
          isDark ? "text-white" : "text-[#201d19]"
        }`}
      >
        {title}
      </div>

      <div
        className={`mx-auto mt-2 max-w-sm text-xs leading-5 ${
          isDark ? "text-white/42" : "text-[#746b61]"
        }`}
      >
        {description}
      </div>
    </div>
  );
}

function HealthBox({ profile, isDark }) {
  const success = profile.lastTestSuccess === true;
  const failed = profile.lastTestSuccess === false;

  const label = success ? "Working" : failed ? "Failed" : "Untested";

  return (
    <div>
      <div className="flex items-center gap-2">
        <Clock3 className={`h-3.5 w-3.5 ${mutedTextClass(isDark)}`} />

        <span className={`text-xs font-normal ${mutedTextClass(isDark)}`}>
          {label}
        </span>
      </div>

      <div
        className={`mt-0.5 max-w-[180px] truncate text-xs ${mutedTextClass(isDark)}`}
      >
        {profile.lastError ||
          `${profile.successCount || 0} ok | ${profile.failureCount || 0} fail`}
      </div>
    </div>
  );
}

function ImportModal({
  isDark,
  value,
  onChange,
  meta,
  onMetaChange,
  loading,
  onClose,
  onSubmit,
}) {
  const lineCount = countProxyLines(value);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 z-0 bg-black/55 backdrop-blur-sm"
        aria-label="Close modal backdrop"
      />

      <div
        className={`relative z-10 w-full max-w-[720px] overflow-hidden rounded-[30px] shadow-2xl ${
          isDark ? "bg-[#202127] text-white" : "bg-white text-[#171717]"
        }`}
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

        <div className="bg-[#d8c49a] px-6 pb-7 pt-8 text-center text-[#171717]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-black/10">
            <Upload className="h-8 w-8" />
          </div>

          <div className="mt-4 text-xl font-semibold tracking-[-0.03em]">
            Import Proxies
          </div>

          <div className="mt-1 text-sm text-black/60">
            Paste proxy lines. One line equals one proxy.
          </div>
        </div>

        <form onSubmit={onSubmit} className="px-6 py-6">
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <Field isDark={isDark} label="Provider">
              <input
                value={meta.provider}
                onChange={(e) => onMetaChange("provider", e.target.value)}
                className={inputClass(isDark)}
                placeholder="proxy"
              />
            </Field>

            <Field isDark={isDark} label="Project / Group">
              <input
                value={meta.source}
                onChange={(e) => onMetaChange("source", e.target.value)}
                className={inputClass(isDark)}
                placeholder="proxy, project-a, telegram-main..."
              />
            </Field>

            <Field isDark={isDark} label="Proxy Type">
              <select
                value={meta.type || "socks5"}
                onChange={(e) => onMetaChange("type", e.target.value)}
                className={inputClass(isDark)}
              >
                <option value="socks5">SOCKS5</option>
                <option value="mtproxy">MTProxy</option>
              </select>
            </Field>
          </div>

          <div className="mb-2 flex items-center justify-between gap-3">
            <label className={labelClass(isDark)}>Proxy list</label>

            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                isDark
                  ? "bg-white/[0.06] text-white/45"
                  : "bg-[#f8fafc] text-[#64748b]"
              }`}
            >
              {lineCount} line(s)
            </span>
          </div>

          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`45.38.87.94:7016:dbqbopyn:jqxd9v4zevq0\n96.8.118.27:5393:dbqbopyn:jqxd9v4zevq0\n148.135.157.166:7919:dbqbopyn:jqxd9v4zevq0`}
            rows={11}
            className={`w-full rounded-2xl border px-4 py-3 font-mono text-[13px] outline-none transition ${
              isDark
                ? "border-white/[0.10] bg-[#292a2f] text-white placeholder:text-white/28 focus:border-[#d8c49a]/60 focus:ring-4 focus:ring-[#d8c49a]/10"
                : "border-[#e2e8f0] bg-white text-[#171717] placeholder:text-[#94a3b8] focus:border-[#d8c49a] focus:ring-4 focus:ring-[#d8c49a]/15"
            }`}
          />

          <div
            className={`mt-3 rounded-2xl px-4 py-3 text-xs leading-5 ${
              isDark
                ? "bg-white/[0.06] text-white/42"
                : "bg-[#f8fafc] text-[#64748b]"
            }`}
          >
            Required format:{" "}
            <span className="font-mono">host:port:username:password</span>. For
            Telegram login, use SOCKS5 proxies. HTTP proxies should not be used
            for Telegram sessions.
          </div>

          <button
            type="submit"
            disabled={loading}
            className={primaryButtonClass("mt-5 w-full")}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Import {lineCount || ""} Profile{lineCount === 1 ? "" : "s"}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function EmptyState({ isDark, onImport }) {
  return (
    <div className="mx-auto max-w-sm">
      <div
        className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl ${
          isDark
            ? "bg-white/[0.07] text-white/60"
            : "bg-[#eee4d5] text-[#5c5348]"
        }`}
      >
        <Network className="h-5 w-5" />
      </div>

      <div
        className={`mt-4 text-sm font-semibold ${
          isDark ? "text-white" : "text-[#201d19]"
        }`}
      >
        No network profiles found
      </div>

      <div
        className={`mt-2 text-xs leading-5 ${
          isDark ? "text-white/42" : "text-[#746b61]"
        }`}
      >
        Import proxies using host:port:username:password.
      </div>

      <button
        type="button"
        onClick={onImport}
        className={`${primaryButtonClass()} mx-auto mt-5`}
      >
        <Upload className="h-4 w-4" />
        Import Profiles
      </button>
    </div>
  );
}

function FilterEmptyState({ isDark, onClear }) {
  return (
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
        No matching profiles found
      </div>

      <div
        className={`mt-2 text-xs leading-5 ${
          isDark ? "text-white/42" : "text-[#746b61]"
        }`}
      >
        Try another proxy, IP, project, assigned account, or status.
      </div>

      <button
        type="button"
        onClick={onClear}
        className={`${primaryButtonClass()} mx-auto mt-5`}
      >
        <X className="h-4 w-4" />
        Clear Filters
      </button>
    </div>
  );
}

function StatusFilterDropdown({ isDark, value, onChange }) {
  const [open, setOpen] = useState(false);

  const selectedOption =
    NETWORK_STATUS_OPTIONS.find((option) => option.value === value) ||
    NETWORK_STATUS_OPTIONS[0];

  return (
    <div className="relative w-full sm:w-[170px]">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        onBlur={() => {
          setTimeout(() => setOpen(false), 120);
        }}
        className={`flex h-[38px] w-full items-center justify-between gap-2 rounded-[14px] border px-3 text-left text-xs font-medium transition ${
          isDark
            ? "border-white/[0.07] bg-white/[0.055] text-white/70 hover:bg-white/[0.08]"
            : "border-[#eee4d5] bg-white text-[#5f554a] shadow-[0_10px_24px_rgba(30,25,18,0.035)] hover:bg-[#fbf8f2]"
        }`}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${getNetworkStatusDotClass(
              selectedOption.value,
            )}`}
          />

          <span className="truncate">{selectedOption.label}</span>
        </span>

        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 transition ${
            open ? "rotate-180" : ""
          } ${isDark ? "text-white/35" : "text-[#8a8176]"}`}
        />
      </button>

      {open && (
        <div
          className={`absolute left-0 top-[44px] z-50 w-full overflow-hidden rounded-[16px] border p-1 shadow-2xl ${
            isDark
              ? "border-white/[0.08] bg-[#24252b] text-white shadow-black/30"
              : "border-[#eee4d5] bg-white text-[#201d19] shadow-[0_18px_45px_rgba(30,25,18,0.14)]"
          }`}
        >
          {NETWORK_STATUS_OPTIONS.map((option) => {
            const active = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-[12px] px-3 py-2 text-left text-xs transition ${
                  active
                    ? isDark
                      ? "bg-[#d8c49a]/12 text-[#d8c49a]"
                      : "bg-[#f7ead0] text-[#8a6728]"
                    : isDark
                      ? "text-white/58 hover:bg-white/[0.06] hover:text-white"
                      : "text-[#5f554a] hover:bg-[#f7f2ea] hover:text-[#201d19]"
                }`}
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${getNetworkStatusDotClass(
                    option.value,
                  )}`}
                />

                <span className="truncate">{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SearchBar({ isDark, value, onChange, resultCount, totalCount }) {
  const hasSearch = value.trim().length > 0;

  return (
    <div
      className={`group flex h-[38px] w-full items-center gap-2 rounded-[14px] border px-3 transition sm:w-[330px] lg:w-[380px] ${
        isDark
          ? "border-white/[0.07] bg-white/[0.055] text-white focus-within:border-[#d8c49a]/45 focus-within:bg-white/[0.08] focus-within:ring-4 focus-within:ring-[#d8c49a]/5"
          : "border-[#eee4d5] bg-white text-[#201d19] shadow-[0_10px_24px_rgba(30,25,18,0.035)] focus-within:border-[#d8c49a] focus-within:ring-4 focus:ring-[#d8c49a]/15"
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
        placeholder="Search proxy, status, IP, project..."
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

function StatusPill({ status, isDark }) {
  const clean = status || "unknown";

  const isAvailable = clean === "available";
  const isAssigned = clean === "assigned";
  const isReserved = clean === "reserved";
  const isDisabled = clean === "disabled";
  const isFailed = clean === "failed";

  let className = isDark
    ? "bg-white/[0.08] text-white/55"
    : "bg-[#eee4d5] text-[#6d6254]";

  if (isAvailable) {
    className = isDark
      ? "bg-emerald-400/10 text-emerald-300"
      : "bg-emerald-50 text-emerald-700";
  }

  if (isAssigned) {
    className = isDark
      ? "bg-sky-400/10 text-sky-300"
      : "bg-sky-50 text-sky-700";
  }

  if (isReserved) {
    className = isDark
      ? "bg-amber-400/10 text-amber-300"
      : "bg-amber-50 text-amber-700";
  }

  if (isDisabled || isFailed) {
    className = isDark
      ? "bg-red-400/10 text-red-300"
      : "bg-red-50 text-red-700";
  }

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${className}`}
    >
      {isAvailable ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : isDisabled || isFailed ? (
        <CircleOff className="h-3.5 w-3.5" />
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      )}
      {clean}
    </span>
  );
}

function LuxuryPagination({
  isDark,
  page,
  totalPages,
  totalItems,
  pageSize,
  itemLabel = "items",
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
        {itemLabel}
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

function Th({ children, align = "left" }) {
  return (
    <th
      className={`px-5 py-3 text-${align} text-[11px] font-semibold uppercase tracking-[0.16em]`}
    >
      {children}
    </th>
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
  return `block text-xs font-medium ${
    isDark ? "text-white/62" : "text-[#5c5348]"
  }`;
}

function inputClass(isDark) {
  return `h-10 w-full rounded-[16px] border px-3 text-[13px] outline-none transition ${
    isDark
      ? "border-white/[0.10] bg-[#292a2f] text-white placeholder:text-white/25 focus:border-[#d8c49a]/50"
      : "border-[#e2e8f0] bg-white text-[#171717] placeholder:text-[#94a3b8] focus:border-[#d8c49a]"
  }`;
}

function primaryButtonClass(extra = "") {
  return `inline-flex min-h-[38px] items-center justify-center gap-2 rounded-[14px] bg-[#d8c49a] px-4 text-[12px] font-semibold text-[#171717] shadow-[0_10px_24px_rgba(216,196,154,0.12)] transition hover:bg-[#e4d1a9] disabled:cursor-not-allowed disabled:opacity-60 ${extra}`;
}

function softButtonClass(isDark) {
  return `inline-flex min-h-[38px] items-center justify-center gap-2 rounded-[14px] px-4 text-[12px] font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
    isDark
      ? "bg-white/[0.06] text-white/58 hover:bg-white/[0.10]"
      : "bg-white text-[#5c5348] hover:bg-[#f7f2ea]"
  }`;
}

function softIconButtonClass(isDark) {
  return `inline-flex h-10 w-10 items-center justify-center rounded-[16px] text-[12px] font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
    isDark
      ? "bg-white/[0.06] text-white/58 hover:bg-white/[0.10]"
      : "bg-white text-[#5c5348] hover:bg-[#f7f2ea]"
  }`;
}
