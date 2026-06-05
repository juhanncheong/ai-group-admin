import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import {
  BarChart3,
  LogOut,
  Menu,
  Moon,
  ScrollText,
  Send,
  Network,
  Settings,
  Sparkles,
  Star,
  Sun,
  Users,
  X,
} from "lucide-react";

const RECENT_TABS_STORAGE_KEY = "starfish_recent_tabs_v1";
const MAX_RECENT_TABS = 8;

const TAB_LABELS = {
  "/admin/users": "Users",
  "/admin/telegram-connect": "Telegram Connect",
  "/admin/telegram-groups": "Telegram Chats",
  "/admin/scheduled-messages": "Scheduled Messages",
  "/admin/ai-prompt": "AI Prompt",
  "/admin/message-logs": "Message Logs",
  "/admin/telegram-scripts": "Telegram Scripts",
  "/admin/dashboard": "Dashboard",
  "/admin/network-profiles": "Network Profiles",
  "/admin/settings": "Settings",
};

const luxury = {
  dark: {
    page: "bg-[#222326] text-[#f4f1ec]",
    sidebar: "border-r border-[#303136] bg-[#202124]",
    header: "border-[#303136] bg-[#222326]",
    card: "border-transparent bg-[#34343c]",
    soft: "bg-[#2b2c31]",
    text: "text-[#f4f1ec]",
    muted: "text-white/42",
    muted2: "text-white/28",
    border: "border-[#303136]",
    hover: "hover:bg-[#34343c]",
    active: "bg-[#34343c] text-white",
    activeSoft: "border-[#4a4a52] bg-[#34343c] text-white",
    button: "border-[#3a3b42] bg-[#292a2f] text-white/58 hover:bg-[#34343c]",
  },
  light: {
    page: "bg-[#f2eee7] text-[#201d19]",
    sidebar: "border-r border-[#ded6ca] bg-[#ebe4d9]",
    header: "border-[#ded6ca] bg-[#f2eee7]",
    card: "border-transparent bg-white",
    soft: "bg-[#f7f2ea]",
    text: "text-[#201d19]",
    muted: "text-[#70675c]",
    muted2: "text-[#9b9081]",
    border: "border-[#ded6ca]",
    hover: "hover:bg-white/80",
    active: "bg-white text-[#201d19]",
    activeSoft: "border-[#ded6ca] bg-white text-[#201d19]",
    button: "border-[#ded6ca] bg-white/70 text-[#5f554a] hover:bg-white",
  },
};

export default function Shell({ title = "Dashboard", children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const isDark = theme === "dark";
  const c = isDark ? luxury.dark : luxury.light;

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [recentTabs, setRecentTabs] = useState(() => loadRecentTabs());
  const [currentTime, setCurrentTime] = useState(() =>
    new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  );

  const [pageLoading, setPageLoading] = useState(false);
  const [pageProgress, setPageProgress] = useState(0);
  const progressIntervalRef = useRef(null);
  const progressFinishTimerRef = useRef(null);
  const progressResetTimerRef = useRef(null);

  const pageKey = useMemo(() => {
    return `${location.pathname}-${location.search}-${theme}`;
  }, [location.pathname, location.search, theme]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isTrackableAdminPath(location.pathname)) return;

    const newTab = {
      path: location.pathname,
      label: getTabLabel(location.pathname),
    };

    setRecentTabs((prev) => {
      const alreadyExists = prev.some((tab) => tab.path === newTab.path);
      if (alreadyExists) return prev;

      const nextTabs = [...prev, newTab].slice(0, MAX_RECENT_TABS);
      saveRecentTabs(nextTabs);
      return nextTabs;
    });
  }, [location.pathname]);

  useEffect(() => {
    function clearProgressTimers() {
      if (progressIntervalRef.current)
        clearInterval(progressIntervalRef.current);
      if (progressFinishTimerRef.current)
        clearTimeout(progressFinishTimerRef.current);
      if (progressResetTimerRef.current)
        clearTimeout(progressResetTimerRef.current);
    }

    clearProgressTimers();

    setPageLoading(true);
    setPageProgress(10);

    progressIntervalRef.current = setInterval(() => {
      setPageProgress((prev) => {
        if (prev >= 84) return prev;
        return prev + Math.max(2, Math.round((90 - prev) * 0.1));
      });
    }, 120);

    progressFinishTimerRef.current = setTimeout(() => {
      clearProgressTimers();
      setPageProgress(100);

      progressResetTimerRef.current = setTimeout(() => {
        setPageLoading(false);
        setPageProgress(0);
      }, 260);
    }, 420);

    return clearProgressTimers;
  }, [location.pathname, location.search]);

  function closeTab(path, e) {
    e.stopPropagation();

    setRecentTabs((prev) => {
      const nextTabs = prev.filter((tab) => tab.path !== path);
      saveRecentTabs(nextTabs);

      if (location.pathname === path) {
        navigate(nextTabs[0]?.path || "/admin/telegram-connect");
      }

      return nextTabs;
    });
  }

  function confirmLogout() {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_profile");
    window.location.href = "/admin/login";
  }

  return (
    <div
      className={`h-screen overflow-hidden transition-colors duration-300 ${c.page}`}
    >
      <div className="flex h-full overflow-hidden">
        {mobileSidebarOpen && (
          <button
            type="button"
            aria-label="Close sidebar"
            className="fixed inset-0 z-[80] bg-black/45 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        <aside
          className={`fixed left-0 top-0 z-[90] flex h-full w-[270px] max-w-[85vw] shrink-0 flex-col overflow-y-auto px-4 py-5 transition-transform duration-300 lg:static lg:z-auto lg:w-[230px] lg:max-w-none lg:translate-x-0 ${
            mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } ${c.sidebar}`}
        >
          <div className="flex items-center justify-between gap-3 px-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[18px] bg-[#d8c49a] text-[#191714] shadow-[0_14px_32px_rgba(216,196,154,0.12)]">
                <Star className="h-4.5 w-4.5 fill-current" />
              </div>

              <div>
                <div
                  className={`text-[18px] font-medium tracking-[0.08em] ${c.text}`}
                >
                  STARFISH
                </div>
                <div
                  className={`text-[11px] font-normal tracking-[0.18em] ${c.muted2}`}
                >
                  ADMIN PANEL
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border lg:hidden ${c.button}`}
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          <nav className="mt-8 space-y-6">
            <SidebarSection title="Main" colors={c}>
              <SideLink
                colors={c}
                to="/admin/dashboard"
                icon={<BarChart3 className="h-4 w-4 shrink-0" />}
              >
                Dashboard
              </SideLink>
            </SidebarSection>

            <SidebarSection title="Telegram" colors={c}>
              <SideLink
                colors={c}
                to="/admin/telegram-connect"
                icon={<Send className="h-4 w-4 shrink-0" />}
              >
                Telegram Connect
              </SideLink>

              <SideLink
                colors={c}
                to="/admin/network-profiles"
                icon={<Network className="h-4 w-4 shrink-0" />}
              >
                Network Profiles
              </SideLink>

              <SideLink
                colors={c}
                to="/admin/telegram-groups"
                icon={<Users className="h-4 w-4 shrink-0" />}
              >
                Telegram Chats
              </SideLink>

              <SideLink
                colors={c}
                to="/admin/scheduled-messages"
                icon={<Settings className="h-4 w-4 shrink-0" />}
              >
                Scheduled Messages
              </SideLink>

              <SideLink
                colors={c}
                to="/admin/message-logs"
                icon={<Send className="h-4 w-4 shrink-0" />}
              >
                Message Logs
              </SideLink>

              <SideLink
                colors={c}
                to="/admin/ai-prompt"
                icon={<Sparkles className="h-4 w-4 shrink-0" />}
              >
                AI Prompt
              </SideLink>

              <SideLink
                colors={c}
                to="/admin/telegram-scripts"
                icon={<ScrollText className="h-4 w-4 shrink-0" />}
              >
                Telegram Scripts
              </SideLink>
            </SidebarSection>

            <SidebarSection title="Account" colors={c}>
              <SideLink
                colors={c}
                to="/admin/settings"
                icon={<Settings className="h-4 w-4 shrink-0" />}
              >
                Settings
              </SideLink>
            </SidebarSection>
          </nav>

          <div
            className={`mt-auto rounded-[26px] border p-4 ${c.border} ${c.soft}`}
          >
            <div className={`text-sm font-medium ${c.text}`}>
              Telegram AI Group
            </div>
            <p className={`mt-2 text-xs font-normal leading-5 ${c.muted}`}>
              Connect account, sync groups, approve messages, schedule messages,
              and use AI prompt to run your groups
            </p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div
            className={`relative z-50 h-1 shrink-0 overflow-hidden ${isDark ? "bg-[#202124]" : "bg-[#f3eee6]"}`}
          >
            <div
              className="h-full rounded-r-full bg-[#d8c49a] transition-all duration-200 ease-out"
              style={{
                width: pageLoading ? `${pageProgress}%` : "0%",
                opacity: pageLoading ? 1 : 0,
              }}
            />
          </div>

          <header
            className={`sticky top-0 z-40 shrink-0 border-b px-3 py-3 backdrop-blur-xl transition-colors duration-300 ${c.header}`}
          >
            <div className="flex min-w-0 items-center justify-between gap-2 sm:gap-4">
              <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(true)}
                  className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border lg:hidden ${c.button}`}
                >
                  <Menu className="h-4.5 w-4.5" />
                </button>

                {recentTabs.length > 0 && (
                  <div className="hidden min-w-0 flex-1 overflow-x-auto md:block">
                    <div className="ml-4 flex items-center gap-2">
                      {recentTabs.map((tab) => {
                        const isActive = location.pathname === tab.path;

                        return (
                          <button
                            key={tab.path}
                            type="button"
                            onClick={() => navigate(tab.path)}
                            className={`group inline-flex h-9 shrink-0 items-center gap-2 rounded-[15px] border px-3 text-xs font-normal transition ${
                              isActive ? c.activeSoft : `${c.button}`
                            }`}
                          >
                            <span className="max-w-[140px] truncate">
                              {tab.label}
                            </span>

                            <span
                              onClick={(e) => closeTab(tab.path, e)}
                              className={`inline-flex h-5 w-5 items-center justify-center rounded-full transition ${c.hover}`}
                            >
                              <X className="h-3.5 w-3.5" />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <div
                  className={`hidden rounded-2xl border px-3 py-2 text-xs font-normal md:block ${c.button}`}
                >
                  {currentTime}
                </div>

                <button
                  onClick={toggleTheme}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border text-xs font-normal transition sm:w-auto sm:gap-2 sm:px-4 ${c.button}`}
                >
                  {isDark ? (
                    <>
                      <Sun className="h-4 w-4" />
                      <span className="hidden sm:inline">Light</span>
                    </>
                  ) : (
                    <>
                      <Moon className="h-4 w-4" />
                      <span className="hidden sm:inline">Dark</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setLogoutModalOpen(true)}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border text-xs font-normal transition sm:w-auto sm:gap-2 sm:px-4 ${
                    isDark
                      ? "border-red-300/12 bg-red-400/7 text-red-100/70 hover:bg-red-400/10"
                      : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                  }`}
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Log out</span>
                </button>
              </div>
            </div>
          </header>

          <main
            key={pageKey}
            className={`min-w-0 flex-1 overflow-y-auto px-3 py-3 transition-colors duration-300 ${
              isDark ? "bg-[#222326]" : "bg-[#f2eee7]"
            }`}
          >
            {children}
          </main>
        </div>
      </div>

      {logoutModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close logout modal"
            onClick={() => setLogoutModalOpen(false)}
            className="absolute inset-0 bg-black/65 backdrop-blur-md"
          />

          <div
            className={`relative w-full max-w-[420px] overflow-hidden rounded-[30px] border shadow-2xl ${c.card}`}
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[22px] ${
                    isDark
                      ? "border border-red-300/12 bg-red-400/8 text-red-100/70"
                      : "border border-red-200 bg-red-50 text-red-600"
                  }`}
                >
                  <LogOut className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div
                    className={`text-lg font-medium tracking-[-0.02em] ${c.text}`}
                  >
                    Confirm logout
                  </div>

                  <div
                    className={`mt-2 text-sm font-normal leading-relaxed ${c.muted}`}
                  >
                    This will remove your Starfish admin session from this
                    browser.
                  </div>
                </div>
              </div>

              <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setLogoutModalOpen(false)}
                  className={`rounded-2xl border px-5 py-3 text-sm font-normal transition ${c.button}`}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={confirmLogout}
                  className="rounded-2xl bg-[#d8c49a] px-5 py-3 text-sm font-medium text-[#171717] transition hover:bg-[#e4d1a9]"
                >
                  Yes, log me out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SidebarSection({ title, children, colors }) {
  return (
    <div>
      <div
        className={`mb-2 px-3 text-[10px] font-normal uppercase tracking-[0.24em] ${colors.muted2}`}
      >
        {title}
      </div>

      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function SideLink({ to, icon, children, colors }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex min-h-[42px] items-center gap-3 rounded-[16px] px-3 text-sm font-normal transition ${
          isActive ? colors.active : `${colors.muted} ${colors.hover}`
        }`
      }
    >
      {icon}
      <span>{children}</span>
    </NavLink>
  );
}

function DisabledLink({ icon, children, colors }) {
  return (
    <div
      className={`flex min-h-[42px] cursor-not-allowed items-center gap-3 rounded-[16px] px-3 text-sm font-normal ${colors.muted2}`}
    >
      {icon}
      <span>{children}</span>
      <span className="ml-auto rounded-full bg-white/8 px-2 py-1 text-[10px] font-normal">
        Soon
      </span>
    </div>
  );
}

function isTrackableAdminPath(pathname) {
  return pathname.startsWith("/admin/") && pathname !== "/admin/login";
}

function getTabLabel(pathname) {
  return TAB_LABELS[pathname] || "Page";
}

function loadRecentTabs() {
  try {
    const raw = localStorage.getItem(RECENT_TABS_STORAGE_KEY);
    const parsed = JSON.parse(raw || "[]");

    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((tab) => tab && typeof tab.path === "string")
      .filter((tab) => isTrackableAdminPath(tab.path))
      .map((tab) => ({
        path: tab.path,
        label: TAB_LABELS[tab.path] || tab.label || getTabLabel(tab.path),
      }))
      .slice(0, MAX_RECENT_TABS);
  } catch {
    return [];
  }
}

function saveRecentTabs(tabs) {
  try {
    localStorage.setItem(RECENT_TABS_STORAGE_KEY, JSON.stringify(tabs));
  } catch {
    // ignore
  }
}
