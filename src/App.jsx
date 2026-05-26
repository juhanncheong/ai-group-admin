import { useEffect, useRef } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { ThemeProvider } from "./context/ThemeContext";
import "react-toastify/dist/ReactToastify.css";

import InvitationCodes from "./pages/InvitationCodes";
import Dashboard from "./pages/Dashboard";
import AdminLogin from "./pages/AdminLogin";
import UsersPage from "./pages/Users";
import OrdersPoolPage from "./pages/OrdersPool";
import BonusTriggersPage from "./pages/BonusTriggers";
import AdminWithdrawalsPage from "./pages/AdminWithdrawals";
import AdminDepositsPage from "./pages/AdminDeposits";
import AdminSigninRewardsPage from "./pages/AdminSigninRewards";
import AdminChat from "./pages/AdminChat";
import SettingsPage from "./pages/settings";
import TrialBonus from "./pages/TrialBonus";
import Content from "./pages/Content";
import Events from "./pages/Events";
import AdminLuckyDrawPage from "./pages/AdminLuckyDrawPage";
import BonusCreditPage from "./pages/BonusCredit";
import AdminPopupsPage from "./pages/AdminPopupsPage";
import AdminOrderList from "./pages/AdminOrderList";
import AdminEmails from "./pages/AdminEmails";
import TargetedBonusOffers from "./pages/TargetedBonusOffers";

const ADMIN_INACTIVITY_LIMIT = 60 * 60 * 1000; // 1 hour

function AdminInactivityLogout() {
  const navigate = useNavigate();
  const location = useLocation();
  const timerRef = useRef(null);

  useEffect(() => {
    const isAdminPage =
      location.pathname.startsWith("/admin") &&
      location.pathname !== "/admin/login";

    if (!isAdminPage) {
      return;
    }

    const logoutAdmin = () => {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_unread_map");
      localStorage.removeItem("admin_chat_pending_user");

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
    <>
      <ThemeProvider>
        <AdminInactivityLogout />

        <Routes>
          <Route path="/" element={<Navigate to="/admin/login" replace />} />

          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<Dashboard />} />
          <Route path="/admin/invitation-codes" element={<InvitationCodes />} />
          <Route path="/admin/users" element={<UsersPage />} />
          <Route path="/admin/trial-bonus" element={<TrialBonus />} />
          <Route path="/admin/orders/pool" element={<OrdersPoolPage />} />
          <Route path="/admin/orders/bonus" element={<BonusTriggersPage />} />
          <Route path="/admin/withdrawals" element={<AdminWithdrawalsPage />} />
          <Route path="/admin/deposits" element={<AdminDepositsPage />} />
          <Route path="/admin/signin-rewards" element={<AdminSigninRewardsPage />} />
          <Route path="/admin/chat" element={<AdminChat />} />
          <Route path="/admin/settings" element={<SettingsPage />} />
          <Route path="/admin/content" element={<Content />} />
          <Route path="/admin/events" element={<Events />} />
          <Route path="/admin/lucky-draw" element={<AdminLuckyDrawPage />} />
          <Route path="/admin/bonus-credit" element={<BonusCreditPage />} />
          <Route path="/admin/popups" element={<AdminPopupsPage />} />
          <Route path="/admin/orders/list" element={<AdminOrderList />} />
          <Route path="/admin/emails" element={<AdminEmails />} />
          <Route path="/admin/targeted-bonus-offers" element={<TargetedBonusOffers />} />

          <Route path="*" element={<Navigate to="/admin/login" replace />} />
        </Routes>

        <ToastContainer position="top-right" autoClose={2500} />
      </ThemeProvider>
    </>
  );
}