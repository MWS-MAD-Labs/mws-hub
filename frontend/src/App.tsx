import { lazy, Suspense, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/features/auth/context/AuthContext";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { RequireAdmin } from "@/features/auth/components/RequireAdmin";

const SupportHubPage = lazy(() => import("@/pages/SupportHubPage"));
const SupportHubConceptsPage = lazy(
  () => import("@/pages/SupportHubConceptsPage"),
);
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const LogoutRelayPage = lazy(() => import("@/pages/LogoutRelayPage"));
const Dashboard = lazy(() => import("@/admin/pages/Dashboard"));
const BrokenTools = lazy(() => import("@/admin/pages/BrokenTools"));
const AuditLogsPage = lazy(() => import("@/admin/pages/AuditLogsPage"));
const GptCodePage = lazy(() => import("@/pages/GptCodePage"));
const GptCodeAdminPage = lazy(() => import("@/admin/pages/GptCodeAdminPage"));

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
            path="/support-hub/concepts"
            element={
              <PageLoader>
                <SupportHubConceptsPage />
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
            path="/gpt-code"
            element={
              <PageLoader>
                <RequireAuth>
                  <GptCodePage />
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
            path="/admin/catalog/*"
            element={<Navigate to="/admin" replace />}
          />
          <Route
            path="/admin/display"
            element={<Navigate to="/admin" replace />}
          />
          <Route
            path="/admin/applications"
            element={<Navigate to="/admin" replace />}
          />
          <Route
            path="/admin/feedback"
            element={<Navigate to="/admin/broken-tools" replace />}
          />
          <Route
            path="/admin/broken-tools"
            element={
              <PageLoader>
                <RequireAdmin>
                  <BrokenTools />
                </RequireAdmin>
              </PageLoader>
            }
          />
          <Route
            path="/admin/Broken-tool-reports"
            element={<Navigate to="/admin/broken-tools" replace />}
          />
          <Route
            path="/admin/access-requests"
            element={<Navigate to="/admin" replace />}
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
          <Route
            path="/admin/gpt-code"
            element={
              <PageLoader>
                <RequireAdmin>
                  <GptCodeAdminPage />
                </RequireAdmin>
              </PageLoader>
            }
          />
        </Routes>

        <Toaster style={{ zIndex: "var(--layer-toast)" }} />
      </AuthProvider>
    </BrowserRouter>
  );
}
