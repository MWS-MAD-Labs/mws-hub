import { Link, Navigate, useLocation } from "react-router-dom";
import { ArrowLeft, LoaderCircle, ShieldAlert } from "lucide-react";
import { isMadLabsUser } from "@/lib/admin-access";
import "@/admin/components/layout/admin-theme.css";
import { useAuth } from "../hooks/useAuth";

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isSessionLoading } = useAuth();
  const location = useLocation();

  if (isSessionLoading) {
    return <main className="admin-theme admin-shell grid min-h-screen place-items-center px-4" role="status" aria-live="polite"><div className="text-center"><LoaderCircle className="mx-auto h-6 w-6 animate-spin text-[var(--admin-brand)]" /><p className="admin-heading mt-4 text-sm font-bold">Checking Admin Access</p><p className="mt-1 text-xs text-[var(--admin-text-tertiary)]">Verifying your MWS Hub permissions.</p></div></main>;
  }
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  if (!isMadLabsUser(user)) {
    return <main className="admin-theme admin-shell grid min-h-screen place-items-center px-4"><div className="w-full max-w-md rounded-xl border border-[var(--admin-rose)]/30 bg-[var(--admin-card)] p-8 text-center shadow-[var(--admin-shadow)]"><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--admin-rose-soft)] text-[var(--admin-rose)]"><ShieldAlert className="h-6 w-6" /></div><h1 className="admin-heading mt-5 text-xl font-extrabold">Admin Access Unavailable</h1><p className="mt-3 text-sm leading-6 text-[var(--admin-text-secondary)]">Your account does not have permission to open MWS Hub administration.</p><Link to="/support-hub" className="admin-focus admin-heading mt-7 inline-flex items-center gap-2 rounded-full bg-[var(--admin-brand)] px-5 py-2.5 text-sm font-bold text-white dark:text-[#241718]"><ArrowLeft className="h-4 w-4" />Return to MWS Hub</Link></div></main>;
  }
  return children;
}
