import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import EventPage from "./pages/EventPage";
import EntryFormPage from "./pages/EntryFormPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AccountPage from "./pages/AccountPage";
import MyEntriesPage from "./pages/MyEntriesPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminEventPage from "./pages/AdminEventPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import PrivacyPage from "./pages/PrivacyPage";
import { RequireAuth } from "./lib/auth";

export default function App() {
  return (
    <Layout>
      <Routes>
        {/* veřejné */}
        <Route path="/" element={<HomePage />} />
        <Route path="/zavody/:slug" element={<EventPage />} />
        <Route path="/prihlaseni" element={<LoginPage />} />
        <Route path="/registrace" element={<RegisterPage />} />
        <Route path="/ochrana-udaju" element={<PrivacyPage />} />

        {/* přihlášený uživatel */}
        <Route path="/zavody/:slug/prihlaska" element={<RequireAuth><EntryFormPage /></RequireAuth>} />
        <Route path="/zavody/:slug/prihlaska/:teamId" element={<RequireAuth><EntryFormPage /></RequireAuth>} />
        <Route path="/moje-prihlasky" element={<RequireAuth><MyEntriesPage /></RequireAuth>} />
        <Route path="/ucet" element={<RequireAuth><AccountPage /></RequireAuth>} />

        {/* pořadatel / admin */}
        <Route path="/admin" element={<RequireAuth role="organizer"><AdminDashboardPage /></RequireAuth>} />
        <Route path="/admin/zavody/:slug" element={<RequireAuth role="organizer"><AdminEventPage /></RequireAuth>} />
        <Route path="/admin/uzivatele" element={<RequireAuth role="admin"><AdminUsersPage /></RequireAuth>} />

        <Route path="/admin/login" element={<Navigate to="/prihlaseni" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
