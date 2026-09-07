import { lazy, Suspense, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/features/auth/context/AuthContext";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { RequireAdmin } from "@/features/auth/components/RequireAdmin";

const SupportHubPage = lazy(() => import("@/pages/SupportHubPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const LogoutRelayPage = lazy(() => import("@/pages/LogoutRelayPage"));
const Dashboard = lazy(() => import("@/admin/pages/Dashboard"));
const ApplicationsPage = lazy(() => import("@/admin/pages/ApplicationsPage"));
const ApplicationEditorPage = lazy(() => import("@/admin/pages/ApplicationEditorPage"));
const FeedbackPage = lazy(() => import("@/admin/pages/FeedbackPage"));
const AuditLogsPage = lazy(() => import("@/admin/pages/AuditLogsPage"));

function PageLoader({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
          Loading...
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/support-hub" replace />} />
          <Route
            path="/login"
            element={
              <PageLoader>
                <LoginPage />
              </PageLoader>
            }
          />
          <Route
            path="/logout-relay"
            element={
              <PageLoader>
                <LogoutRelayPage />
              </PageLoader>
            }
          />
          <Route
            path="/support-hub"
            element={
              <PageLoader>
                <RequireAuth>
                  <SupportHubPage />
                </RequireAuth>
              </PageLoader>
            }
          />
          <Route
            path="/profile"
            element={
              <PageLoader>
                <RequireAuth>
                  <ProfilePage />
                </RequireAuth>
              </PageLoader>
            }
          />
          <Route
            path="/admin"
            element={
              <PageLoader>
                <RequireAdmin>
                  <Dashboard />
                </RequireAdmin>
              </PageLoader>
            }
          />
          <Route
            path="/admin/catalog"
            element={
              <PageLoader>
                <RequireAdmin>
                  <ApplicationsPage />
                </RequireAdmin>
              </PageLoader>
            }
          />
          <Route
            path="/admin/catalog/new"
            element={
              <PageLoader>
                <RequireAdmin>
                  <ApplicationEditorPage />
                </RequireAdmin>
              </PageLoader>
            }
          />
          <Route
            path="/admin/catalog/:id/edit"
            element={
              <PageLoader>
                <RequireAdmin>
                  <ApplicationEditorPage />
                </RequireAdmin>
              </PageLoader>
            }
          />
          <Route
            path="/admin/applications"
            element={
              <Navigate to="/admin/catalog" replace />
            }
          />
          <Route
            path="/admin/feedback"
            element={
              <PageLoader>
                <RequireAdmin>
                  <FeedbackPage />
                </RequireAdmin>
              </PageLoader>
            }
          />
          <Route
            path="/admin/audit-logs"
            element={
              <PageLoader>
                <RequireAdmin>
                  <AuditLogsPage />
                </RequireAdmin>
              </PageLoader>
            }
          />
        </Routes>

        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  );
}
