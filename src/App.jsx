import { useEffect, useRef } from "react";
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { ThemeProvider } from "./context/ThemeContext";
import "react-toastify/dist/ReactToastify.css";

import AdminLogin from "./pages/AdminLogin";
import TelegramConnect from "./pages/TelegramConnect";
import TelegramGroups from "./pages/TelegramChats";
import ScheduledMessages from "./pages/ScheduledMessages";
import MessageLogs from "./pages/MessageLogs";
import AiPromptPage from "./pages/AiPromptPage";
import TelegramScripts from "./pages/TelegramScripts";
import AdminDashboard from "./pages/AdminDashboard";

const ADMIN_INACTIVITY_LIMIT = 60 * 60 * 1000;

function RequireAdmin({ children }) {
  const token = localStorage.getItem("admin_token");

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}

function AdminInactivityLogout() {
  const navigate = useNavigate();
  const location = useLocation();
  const timerRef = useRef(null);

  useEffect(() => {
    const isAdminPage =
      location.pathname.startsWith("/admin") &&
      location.pathname !== "/admin/login";

    if (!isAdminPage) return;

    const logoutAdmin = () => {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_profile");
      navigate("/admin/login", { replace: true });
    };

    const resetTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        logoutAdmin();
      }, ADMIN_INACTIVITY_LIMIT);
    };

    const activityEvents = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    activityEvents.forEach((event) => {
      window.addEventListener(event, resetTimer, true);
    });

    resetTimer();

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetTimer, true);
      });
    };
  }, [location.pathname, navigate]);

  return null;
}

export default function App() {
  return (
    <ThemeProvider>
      <AdminInactivityLogout />

      <Routes>
        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />

        <Route path="/admin/login" element={<AdminLogin />} />

        <Route
          path="/admin/telegram-connect"
          element={
            <RequireAdmin>
              <TelegramConnect />
            </RequireAdmin>
          }
        />

        <Route
          path="/admin/telegram-groups"
          element={
            <RequireAdmin>
              <TelegramGroups />
            </RequireAdmin>
          }
        />

        <Route
          path="/admin/scheduled-messages"
          element={
            <RequireAdmin>
              <ScheduledMessages />
            </RequireAdmin>
          }
        />

        <Route
          path="/admin/message-logs"
          element={
            <RequireAdmin>
              <MessageLogs />
            </RequireAdmin>
          }
        />

        <Route
          path="/admin/ai-prompt"
          element={
            <RequireAdmin>
              <AiPromptPage />
            </RequireAdmin>
          }
        />

        <Route
          path="/admin/telegram-scripts"
          element={
            <RequireAdmin>
              <TelegramScripts />
            </RequireAdmin>
          }
        />

        <Route
          path="/admin/dashboard"
          element={
            <RequireAdmin>
              <AdminDashboard />
            </RequireAdmin>
          }
        />

        <Route path="*" element={<Navigate to="/admin/login" replace />} />
      </Routes>

      <ToastContainer position="top-right" autoClose={2500} />
    </ThemeProvider>
  );
}
