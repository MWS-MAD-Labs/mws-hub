import { Navigate, useLocation } from "react-router-dom";
import { isMadLabsUser } from "@/lib/admin-access";
import { useAuth } from "../hooks/useAuth";

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isSessionLoading } = useAuth();
  const location = useLocation();

  if (isSessionLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Checking admin access...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!isMadLabsUser(user)) {
    return <Navigate to="/support-hub" replace />;
  }

  return children;
}
