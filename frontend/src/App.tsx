import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/features/auth/context/AuthContext";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { RequireAdmin } from "@/features/auth/components/RequireAdmin";
import SupportHubPage from "@/pages/SupportHubPage";
import ProfilePage from "@/pages/ProfilePage";
import LoginPage from "@/pages/LoginPage";
import Dashboard from "@/admin/pages/Dashboard";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/support-hub" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/support-hub"
            element={
              <RequireAuth>
                <SupportHubPage />
              </RequireAuth>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <ProfilePage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <Dashboard />
              </RequireAdmin>
            }
          />
        </Routes>

        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  );
}
