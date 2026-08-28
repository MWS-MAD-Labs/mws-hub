import { Link, Navigate, useLocation } from "react-router-dom";
import { ArrowLeft, ShieldAlert } from "lucide-react";
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
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
        <div className="w-full max-w-md rounded-2xl border border-destructive/20 bg-card p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-xl font-bold tracking-tight">
            Anda Tidak Memiliki Akses
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Halaman Admin Dashboard hanya dapat diakses oleh anggota unit MAD
            Labs. Akun Anda tidak memiliki izin untuk membuka halaman ini.
          </p>
          <Link
            to="/support-hub"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke MWS Hub
          </Link>
        </div>
      </main>
    );
  }

  return children;
}
