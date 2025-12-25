import React, { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import type { User } from "@local-crm/shared";
import { apiRequest } from "./api/client";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import DealsBoardPage from "./pages/DealsBoardPage";
import DealsTablePage from "./pages/DealsTablePage";
import AccountsPage from "./pages/AccountsPage";
import ContactsPage from "./pages/ContactsPage";
import ActivitiesPage from "./pages/ActivitiesPage";
import SettingsPage from "./pages/SettingsPage";
import DealDetailPage from "./pages/DealDetailPage";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";

export type AuthContextValue = {
  user: User | null;
  setUser: (user: User | null) => void;
};

export const AuthContext = React.createContext<AuthContextValue>({
  user: null,
  setUser: () => undefined
});

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    apiRequest<User>("/api/auth/me")
      .then((data) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const contextValue = useMemo(() => ({ user, setUser }), [user]);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <LoginPage onLogin={(nextUser) => {
      setUser(nextUser);
      navigate("/");
    }} />;
  }

  return (
    <AuthContext.Provider value={contextValue}>
      <div className="app-shell">
        <Sidebar />
        <div className="app-content">
          <TopBar user={user} onLogout={() => {
            apiRequest("/api/auth/logout", { method: "POST" }).finally(() => setUser(null));
          }} />
          <div className="page-body">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/deals/board" element={<DealsBoardPage />} />
              <Route path="/deals/table" element={<DealsTablePage />} />
              <Route path="/deals/:id" element={<DealDetailPage />} />
              <Route path="/accounts" element={<AccountsPage />} />
              <Route path="/contacts" element={<ContactsPage />} />
              <Route path="/activities" element={<ActivitiesPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
      </div>
    </AuthContext.Provider>
  );
}
