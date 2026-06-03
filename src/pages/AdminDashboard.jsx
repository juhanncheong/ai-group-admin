import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  Send,
  Smartphone,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "react-toastify";
import Shell from "../components/Shell";
import { api } from "../api";
import { useTheme } from "../context/ThemeContext";

const CACHE_TTL = 1000 * 60 * 5;
const CACHE_KEY_BASE = "adminDashboard:telegram:v1";

function getDashboardCacheKey(days) {
  return `${CACHE_KEY_BASE}:${days || "7"}`;
}

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

function formatNumber(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(number);
}

function formatPercent(value) {
  const number = Number(value || 0);
  return `${number.toFixed(number % 1 === 0 ? 0 : 1)}%`;
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "2-digit",
  });
}

function formatTime(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function getStatusTone(status = "") {
  const clean = String(status || "unknown").toLowerCase();

  if (
    ["sent", "connected", "completed", "success", "done", "approved"].includes(
      clean,
    )
  ) {
    return "green";
  }

  if (
    ["failed", "cancelled", "canceled", "error", "disconnected"].includes(clean)
  ) {
    return "red";
  }

  if (
    ["pending", "queued", "running", "processing", "pending_approval"].includes(
      clean,
    )
  ) {
    return "amber";
  }

  return "muted";
}

function getTrend(current, previous) {
  const c = Number(current || 0);
  const p = Number(previous || 0);

  if (!p && !c) return 0;
  if (!p) return 100;

  return Number((((c - p) / p) * 100).toFixed(1));
}

function splitCurrentPreviousDaily(daily) {
  const list = safeArray(daily);
  if (!list.length) return { current: [], previous: [] };

  const half = Math.max(1, Math.floor(list.length / 2));

  return {
    previous: list.slice(0, half),
    current: list.slice(half),
  };
}

function sumDaily(list, key) {
  return safeArray(list).reduce(
    (sum, item) => sum + Number(item?.[key] || 0),
    0,
  );
}

export default function AdminDashboard() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [rangeDays, setRangeDays] = useState("7");

  const [dashboard, setDashboard] = useState(() =>
    cacheGet(getDashboardCacheKey("7")),
  );

  const [loading, setLoading] = useState(() => {
    return !cacheGet(getDashboardCacheKey("7"));
  });

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const cacheKey = getDashboardCacheKey(rangeDays);
    const cached = cacheGet(cacheKey);

    if (cached) {
      setDashboard(cached);
      loadDashboard({ silent: true });
    } else {
      loadDashboard({ silent: false });
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeDays]);

  async function loadDashboard(options = {}) {
    const silent = options.silent === true;
    const cacheKey = getDashboardCacheKey(rangeDays);

    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const res = await api.get(`/api/dashboard/telegram?days=${rangeDays}`);
      const data = res.data?.data || null;

      if (data) {
        setDashboard(data);
        cacheSet(cacheKey, data);
      }
    } catch (err) {
      console.error("Load admin dashboard error:", err);

      const cached = cacheGet(cacheKey);

      if (cached) {
        setDashboard(cached);
      }

      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to refresh dashboard",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const cards = dashboard?.cards || {};
  const charts = dashboard?.charts || {};
  const daily = safeArray(charts.daily);
  const chartDaily = daily.slice(-7);
  const activity = dashboard?.activity || {};
  const healthAccounts = safeArray(dashboard?.health?.accounts);
  const pipeline = safeArray(dashboard?.pipeline);

  const analytics = useMemo(() => {
    const { current, previous } = splitCurrentPreviousDaily(chartDaily);

    const currentSent = sumDaily(current, "sent");
    const previousSent = sumDaily(previous, "sent");
    const currentFailed = sumDaily(current, "failed");
    const previousFailed = sumDaily(previous, "failed");
    const currentScheduled = sumDaily(current, "scheduled");
    const previousScheduled = sumDaily(previous, "scheduled");

    return {
      currentSent,
      currentFailed,
      currentScheduled,
      sentTrend: getTrend(currentSent, previousSent),
      failedTrend: getTrend(currentFailed, previousFailed),
      scheduledTrend: getTrend(currentScheduled, previousScheduled),
      deliveryRate: cards.delivery?.deliveryRate || 0,
      failureRate: cards.delivery?.failureRate || 0,
      connectionRate: cards.accounts?.connectionRate || 0,
    };
  }, [chartDaily, cards]);

  const lineChartData = useMemo(() => {
    return chartDaily.map((item) => ({
      ...item,
      label: formatDate(item.date),
    }));
  }, [chartDaily]);

  const statusBarData = useMemo(() => {
    return safeArray(charts.messageLogsStatus).map((item) => ({
      label: item.status || "unknown",
      value: item.count || 0,
    }));
  }, [charts.messageLogsStatus]);

  const percentageCards = useMemo(() => {
    return [
      {
        label: "Delivery Rate",
        value: analytics.deliveryRate,
        sub: "Total messages sent",
        tone: "green",
      },
      {
        label: "Failure Rate",
        value: analytics.failureRate,
        sub: "Failed message logs",
        tone: analytics.failureRate > 20 ? "red" : "amber",
      },
      {
        label: "Connection Rate",
        value: analytics.connectionRate,
        sub: "Connected accounts",
        tone: "blue",
      },
    ];
  }, [analytics]);

  if (loading && !dashboard) {
    return (
      <Shell title="Admin Dashboard">
        <div
          className={`-mx-3 -my-3 flex min-h-[calc(100vh-78px)] items-center justify-center px-6 py-6 ${
            isDark ? "bg-[#202127]" : "bg-[#f4efe6]"
          }`}
        >
          <div
            className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-[12px] ${
              isDark
                ? "border-white/[0.06] bg-[#282a30] text-white/50"
                : "border-[#eee4d5] bg-white text-[#746b61]"
            }`}
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading dashboard...
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell title="Admin Dashboard">
      <div
        className={`-mx-3 -my-3 min-h-[calc(100vh-78px)] px-6 py-6 ${
          isDark ? "bg-[#202127]" : "bg-[#f4efe6]"
        }`}
      >
        <section className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                  isDark
                    ? "bg-white/[0.06] text-white/65"
                    : "bg-white text-[#6d6254]"
                }`}
              >
                <BarChart3 className="h-4 w-4" />
              </div>

              <div className="min-w-0">
                <div
                  className={`text-[11px] font-medium uppercase tracking-[0.18em] ${
                    isDark ? "text-white/38" : "text-[#8a8176]"
                  }`}
                >
                  Command center
                </div>

                <h2
                  className={`mt-0.5 truncate text-[22px] font-semibold tracking-[-0.04em] ${
                    isDark ? "text-white" : "text-[#201d19]"
                  }`}
                >
                  Telegram Admin Dashboard
                </h2>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={rangeDays}
                onChange={(e) => setRangeDays(e.target.value)}
                className={selectClass(isDark)}
              >
                <option value="7">Last 7 days</option>
                <option value="14">Last 14 days</option>
                <option value="30">Last 30 days</option>
                <option value="60">Last 60 days</option>
                <option value="90">Last 90 days</option>
              </select>

              <button
                type="button"
                onClick={() => loadDashboard({ silent: true })}
                disabled={refreshing}
                className={softButtonClass(isDark)}
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.55fr_1fr]">
            <Card isDark={isDark} className="min-h-[178px]">
              <div className="grid grid-cols-1 divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0 divide-[#eee4d5] dark:divide-white/[0.06]">
                <TopMetric
                  isDark={isDark}
                  icon={Smartphone}
                  label="Total Accounts"
                  value={cards.accounts?.total || 0}
                  trend={cards.accounts?.connectionRate || 0}
                  suffix="connected"
                  positive
                />

                <TopMetric
                  isDark={isDark}
                  icon={Users}
                  label="Total Chats"
                  value={cards.chats?.total || 0}
                  trend={analytics.scheduledTrend}
                  suffix="pipeline"
                  positive={analytics.scheduledTrend >= 0}
                />

                <TopMetric
                  isDark={isDark}
                  icon={Send}
                  label="Messages Sent"
                  value={cards.delivery?.sent || 0}
                  trend={analytics.sentTrend}
                  suffix="period"
                  positive={analytics.sentTrend >= 0}
                />
              </div>
            </Card>

            <Card isDark={isDark} className="min-h-[178px]">
              <div className="mb-3 flex items-center justify-between gap-3">
                <SectionTitle
                  isDark={isDark}
                  title="Performance"
                  text="vs selected period"
                />
                <span className={mutedClass(isDark)}>Month</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {percentageCards.map((item) => (
                  <PercentageRing
                    key={item.label}
                    item={item}
                    isDark={isDark}
                  />
                ))}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.55fr_1fr]">
            <Card isDark={isDark}>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <SectionTitle
                    isDark={isDark}
                    title="Message Analytics"
                    text="sent, failed and scheduled movement"
                  />

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <div
                      className={`text-[28px] font-semibold tracking-[-0.05em] ${
                        isDark ? "text-white" : "text-[#201d19]"
                      }`}
                    >
                      {formatNumber(cards.delivery?.totalLogs || 0)}
                    </div>

                    <TrendPill
                      value={analytics.sentTrend}
                      good={analytics.sentTrend >= 0}
                    />

                    <span className={mutedClass(isDark)}>/Period</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[12px]">
                  <LegendDot
                    isDark={isDark}
                    color="bg-[#201d19]"
                    label="Sent"
                  />
                  <LegendDot
                    isDark={isDark}
                    color="bg-[#9b9081]"
                    label="Failed"
                  />
                  <LegendDot
                    isDark={isDark}
                    color="bg-[#d8c49a]"
                    label="Scheduled"
                  />
                </div>
              </div>

              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={lineChartData}
                    margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? "rgba(255,255,255,0.06)" : "#eee4d5"}
                    />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tick={{
                        fontSize: 11,
                        fill: isDark ? "rgba(255,255,255,0.38)" : "#8a8176",
                      }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{
                        fontSize: 11,
                        fill: isDark ? "rgba(255,255,255,0.38)" : "#8a8176",
                      }}
                    />
                    <Tooltip content={<ChartTooltip isDark={isDark} />} />
                    <Line
                      type="monotone"
                      dataKey="sent"
                      stroke={isDark ? "#ffffff" : "#201d19"}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="failed"
                      stroke="#9b9081"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="scheduled"
                      stroke="#d8c49a"
                      strokeWidth={1.5}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card isDark={isDark}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <SectionTitle
                  isDark={isDark}
                  title="Growth Profile"
                  text="delivery growth curve"
                />
                <span className={mutedClass(isDark)}>Monthly</span>
              </div>

              <div className="mb-3 flex items-center gap-2">
                <div
                  className={`text-[28px] font-semibold tracking-[-0.05em] ${
                    isDark ? "text-white" : "text-[#201d19]"
                  }`}
                >
                  {formatNumber(analytics.currentSent)}
                </div>
                <TrendPill
                  value={analytics.sentTrend}
                  good={analytics.sentTrend >= 0}
                />
              </div>

              <div className={mutedClass(isDark)}>
                Current period performance
              </div>

              <div className="mt-4 h-[235px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={lineChartData}
                    margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="sentGrowth"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#6d5dfc"
                          stopOpacity={0.75}
                        />
                        <stop
                          offset="100%"
                          stopColor="#6d5dfc"
                          stopOpacity={0.06}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? "rgba(255,255,255,0.06)" : "#eee4d5"}
                    />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tick={{
                        fontSize: 11,
                        fill: isDark ? "rgba(255,255,255,0.38)" : "#8a8176",
                      }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{
                        fontSize: 11,
                        fill: isDark ? "rgba(255,255,255,0.38)" : "#8a8176",
                      }}
                    />
                    <Tooltip content={<ChartTooltip isDark={isDark} />} />
                    <Area
                      type="monotone"
                      dataKey="sent"
                      stroke="#6d5dfc"
                      strokeWidth={2}
                      fill="url(#sentGrowth)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr_1fr]">
            <Card isDark={isDark}>
              <SectionTitle
                isDark={isDark}
                title="Automation Pipeline"
                text="message flow from schedule to delivery"
              />

              <div className="mt-4 space-y-3">
                {pipeline.filter((item) => item.key !== "approved").length ? (
                  pipeline
                    .filter((item) => item.key !== "approved")
                    .map((item, index) => (
                      <PipelineStep
                        key={item.key || index}
                        item={item}
                        index={index}
                        isDark={isDark}
                      />
                    ))
                ) : (
                  <EmptyMini isDark={isDark} text="No pipeline data yet." />
                )}
              </div>
            </Card>

            <Card isDark={isDark}>
              <SectionTitle
                isDark={isDark}
                title="Log Status"
                text="sent and failed message split"
              />

              <div className="mt-4 h-[235px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={statusBarData}
                    margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? "rgba(255,255,255,0.06)" : "#eee4d5"}
                    />

                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tick={{
                        fontSize: 11,
                        fill: isDark ? "rgba(255,255,255,0.38)" : "#8a8176",
                      }}
                    />

                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{
                        fontSize: 11,
                        fill: isDark ? "rgba(255,255,255,0.38)" : "#8a8176",
                      }}
                    />

                    <Tooltip
                      content={<ChartTooltip isDark={isDark} />}
                      cursor={false}
                    />

                    <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={34}>
                      {statusBarData.map((item, index) => (
                        <Cell
                          key={`${item.label}-${index}`}
                          fill={
                            getStatusTone(item.label) === "red"
                              ? "#ef4444"
                              : "#d8c49a"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card isDark={isDark}>
              <SectionTitle
                isDark={isDark}
                title="Account Health"
                text="connected and disconnected sessions"
              />

              <div className="mt-4 space-y-2">
                {healthAccounts.length ? (
                  <>
                    {healthAccounts.slice(0, 3).map((account) => (
                      <AccountHealthRow
                        key={account.id || account._id}
                        account={account}
                        isDark={isDark}
                      />
                    ))}

                    {healthAccounts.length > 3 && (
                      <div className={mutedClass(isDark)}>
                        +{healthAccounts.length - 3} more accounts
                      </div>
                    )}
                  </>
                ) : (
                  <EmptyMini
                    isDark={isDark}
                    text="No account health data yet."
                  />
                )}
              </div>
            </Card>
          </div>

          <Card isDark={isDark}>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <SectionTitle
                  isDark={isDark}
                  title="Recent Activities"
                  text="latest message, schedule and script events"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className={miniBadgeClass(isDark)}>Status: All</span>
                <span className={miniBadgeClass(isDark)}>
                  Days: {rangeDays}
                </span>
              </div>
            </div>

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
                    <Th>Type</Th>
                    <Th>Status</Th>
                    <Th>Target</Th>
                    <Th>Message</Th>
                    <Th>Date & Time</Th>
                  </tr>
                </thead>

                <tbody>
                  {buildActivityRows(activity).length ? (
                    buildActivityRows(activity)
                      .slice(0, 10)
                      .map((item, index) => (
                        <ActivityRow
                          key={`${item.type}-${index}`}
                          item={item}
                          isDark={isDark}
                        />
                      ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center">
                        <EmptyMini
                          isDark={isDark}
                          text="No recent activity found."
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      </div>
    </Shell>
  );
}

function buildActivityRows(activity) {
  const logs = safeArray(activity.recentLogs).map((item) => ({
    type: "Message",
    status: item.status || "unknown",
    target:
      item.chatTitle || item.targetTitle || item.chatName || "Telegram chat",
    message: item.message || item.text || item.error || "Message log",
    date: item.createdAt || item.updatedAt,
  }));

  const scheduled = safeArray(activity.recentScheduled).map((item) => ({
    type: "Scheduled",
    status: item.status || "unknown",
    target: item.targetTitle || item.chatTitle || "Scheduled target",
    message:
      item.finalMessage || item.message || item.text || "Scheduled message",
    date: item.sendAt || item.createdAt || item.updatedAt,
  }));

  const runs = safeArray(activity.recentRuns).map((item) => ({
    type: "Script Run",
    status: item.status || "unknown",
    target: item.targetTitle || item.targetTelegramChatId || "Script target",
    message: item.scriptName || item.name || "Telegram script run",
    date: item.createdAt || item.updatedAt || item.startAt,
  }));

  return [...logs, ...scheduled, ...runs].sort((a, b) => {
    const aTime = new Date(a.date || 0).getTime();
    const bTime = new Date(b.date || 0).getTime();
    return bTime - aTime;
  });
}

function Card({ children, isDark, className = "" }) {
  return (
    <div
      className={`overflow-hidden rounded-[24px] border p-5 ${className} ${
        isDark
          ? "border-white/[0.06] bg-[#282a30] text-white"
          : "border-[#eee4d5] bg-white text-[#201d19]"
      }`}
    >
      {children}
    </div>
  );
}

function SectionTitle({ title, text, isDark }) {
  return (
    <div>
      <div
        className={`text-[16px] font-semibold tracking-[-0.03em] ${
          isDark ? "text-white" : "text-[#201d19]"
        }`}
      >
        {title}
      </div>
      {text && (
        <div
          className={`mt-1 text-[12px] ${isDark ? "text-white/42" : "text-[#746b61]"}`}
        >
          {text}
        </div>
      )}
    </div>
  );
}

function TopMetric({
  isDark,
  icon: Icon,
  label,
  value,
  trend,
  suffix,
  positive,
}) {
  return (
    <div className="min-h-[135px] px-4 py-4 first:pl-0 last:pr-0 sm:px-7">
      <div className="flex items-center gap-2">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-xl ${
            isDark
              ? "bg-white/[0.05] text-white/45"
              : "bg-[#f7f2ea] text-[#6d6254]"
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>

        <div
          className={`text-[13px] font-medium ${isDark ? "text-white/48" : "text-[#8a8176]"}`}
        >
          {label}
        </div>
      </div>

      <div
        className={`mt-8 text-[25px] font-semibold tracking-[-0.05em] ${
          isDark ? "text-white" : "text-[#201d19]"
        }`}
      >
        {formatNumber(value)}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <TrendPill value={trend} good={positive} />
        <span className={mutedClass(isDark)}>/{suffix}</span>
      </div>
    </div>
  );
}

function TrendPill({ value, good }) {
  const number = Number(value || 0);

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium ${
        good
          ? "bg-emerald-500/12 text-emerald-500"
          : "bg-rose-500/10 text-rose-500"
      }`}
    >
      {number >= 0 ? "UP" : "DOWN"} {number >= 0 ? "+" : ""}
      {formatPercent(number)}
    </span>
  );
}

function PercentageRing({ item, isDark }) {
  const value = Math.max(0, Math.min(Number(item.value || 0), 100));
  const color =
    item.tone === "red"
      ? "#ef4444"
      : item.tone === "amber"
        ? "#f59e0b"
        : item.tone === "blue"
          ? "#6d5dfc"
          : "#38b84f";

  return (
    <div className="text-center">
      <div className="mx-auto h-[82px] w-[82px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            innerRadius="72%"
            outerRadius="100%"
            data={[{ value }]}
            startAngle={90}
            endAngle={-270}
          >
            <RadialBar
              dataKey="value"
              cornerRadius={20}
              fill={color}
              background={{
                fill: isDark ? "rgba(255,255,255,0.06)" : "#f1ede6",
              }}
            />
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="middle"
              className={isDark ? "fill-white" : "fill-[#201d19]"}
              style={{ fontSize: 13, fontWeight: 600 }}
            >
              {formatPercent(value)}
            </text>
          </RadialBarChart>
        </ResponsiveContainer>
      </div>

      <div
        className={`mt-2 text-[12px] font-medium ${isDark ? "text-white/72" : "text-[#51483d]"}`}
      >
        {item.label}
      </div>
      <div
        className={`mt-1 text-[11px] ${isDark ? "text-white/35" : "text-[#8a8176]"}`}
      >
        {item.sub}
      </div>
    </div>
  );
}

function PipelineStep({ item, index, isDark }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[12px] font-medium ${
          isDark
            ? "bg-white/[0.06] text-white/55"
            : "bg-[#f7f2ea] text-[#6d6254]"
        }`}
      >
        {index + 1}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <div
            className={`truncate text-[13px] font-medium ${isDark ? "text-white/72" : "text-[#51483d]"}`}
          >
            {item.label}
          </div>
          <div
            className={`text-[14px] font-semibold ${isDark ? "text-white" : "text-[#201d19]"}`}
          >
            {formatNumber(item.value)}
          </div>
        </div>
        <div
          className={`mt-1 truncate text-[11px] ${isDark ? "text-white/35" : "text-[#8a8176]"}`}
        >
          {item.description}
        </div>
      </div>
    </div>
  );
}

function AccountHealthRow({ account, isDark }) {
  const connected =
    Boolean(account.isConnected) || account.status === "connected";

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border px-3 py-3 ${
        isDark
          ? "border-white/[0.05] bg-white/[0.03]"
          : "border-[#eee4d5] bg-[#fbf8f2]"
      }`}
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
          connected
            ? "bg-emerald-500/10 text-emerald-500"
            : "bg-rose-500/10 text-rose-500"
        }`}
      >
        {connected ? (
          <Wifi className="h-3.5 w-3.5" />
        ) : (
          <WifiOff className="h-3.5 w-3.5" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div
          className={`truncate text-[12px] font-medium ${isDark ? "text-white/72" : "text-[#51483d]"}`}
        >
          {account.label || "Telegram Account"}
        </div>
        <div
          className={`mt-0.5 truncate text-[11px] ${isDark ? "text-white/35" : "text-[#8a8176]"}`}
        >
          {account.phoneNumber || account.status || "unknown"}
        </div>
      </div>

      <StatusPill status={account.status} isDark={isDark} />
    </div>
  );
}

function ActivityRow({ item, isDark }) {
  return (
    <tr
      className={
        isDark ? "border-b border-white/[0.05]" : "border-b border-[#eee4d5]"
      }
    >
      <Td isDark={isDark}>{item.type}</Td>
      <Td isDark={isDark}>
        <StatusPill status={item.status} isDark={isDark} />
      </Td>
      <Td isDark={isDark}>{item.target}</Td>
      <Td isDark={isDark}>
        <div className="max-w-[360px] truncate">{item.message}</div>
      </Td>
      <Td isDark={isDark}>{formatTime(item.date)}</Td>
    </tr>
  );
}

function StatusPill({ status, isDark }) {
  const tone = getStatusTone(status);
  const label = String(status || "unknown").replaceAll("_", " ");

  const toneClass =
    tone === "green"
      ? "bg-emerald-500/10 text-emerald-500"
      : tone === "red"
        ? "bg-rose-500/10 text-rose-500"
        : tone === "amber"
          ? "bg-amber-500/10 text-amber-500"
          : isDark
            ? "bg-white/[0.06] text-white/45"
            : "bg-[#eee4d5] text-[#6d6254]";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ${toneClass}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}

function Th({ children }) {
  return (
    <th className="px-5 py-4 text-left text-[11px] font-medium uppercase tracking-[0.14em]">
      {children}
    </th>
  );
}

function Td({ children, isDark }) {
  return (
    <td
      className={`px-5 py-4 text-[12px] ${isDark ? "text-white/58" : "text-[#51483d]"}`}
    >
      {children}
    </td>
  );
}

function LegendDot({ color, label, isDark }) {
  return (
    <span
      className={`inline-flex items-center gap-2 ${isDark ? "text-white/42" : "text-[#746b61]"}`}
    >
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function ChartTooltip({ active, payload, label, isDark }) {
  if (!active || !payload?.length) return null;

  return (
    <div
      className={`rounded-2xl border px-3 py-2 text-[12px] shadow-sm ${
        isDark
          ? "border-white/[0.08] bg-[#202127] text-white"
          : "border-[#eee4d5] bg-white text-[#201d19]"
      }`}
    >
      <div
        className={`mb-1 font-medium ${isDark ? "text-white/70" : "text-[#51483d]"}`}
      >
        {label}
      </div>
      <div className="space-y-1">
        {payload.map((item) => (
          <div
            key={item.dataKey}
            className="flex items-center justify-between gap-5"
          >
            <span className={isDark ? "text-white/45" : "text-[#746b61]"}>
              {item.name || item.dataKey}
            </span>
            <span>{formatNumber(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyMini({ text, isDark }) {
  return (
    <div
      className={`flex min-h-[120px] items-center justify-center rounded-2xl text-center text-[12px] ${
        isDark ? "bg-white/[0.03] text-white/35" : "bg-[#fbf8f2] text-[#8a8176]"
      }`}
    >
      {text}
    </div>
  );
}

function selectClass(isDark) {
  return `min-h-[38px] rounded-xl border px-3 text-[12px] outline-none transition ${
    isDark
      ? "border-white/[0.08] bg-[#282a30] text-white/65"
      : "border-[#eee4d5] bg-white text-[#51483d]"
  }`;
}

function softButtonClass(isDark) {
  return `inline-flex min-h-[38px] items-center gap-2 rounded-xl border px-3 text-[12px] transition disabled:cursor-not-allowed disabled:opacity-60 ${
    isDark
      ? "border-white/[0.08] bg-white/[0.04] text-white/60 hover:bg-white/[0.07]"
      : "border-[#eee4d5] bg-white text-[#51483d] hover:bg-[#fbf8f2]"
  }`;
}

function mutedClass(isDark) {
  return `text-[12px] ${isDark ? "text-white/42" : "text-[#746b61]"}`;
}

function miniBadgeClass(isDark) {
  return `inline-flex min-h-[32px] items-center rounded-xl px-3 text-[12px] ${
    isDark ? "bg-white/[0.05] text-white/45" : "bg-[#f7f2ea] text-[#746b61]"
  }`;
}
