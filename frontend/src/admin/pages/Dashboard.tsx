import { useEffect, useState } from "react";
import { adminApi, type AdminDashboardData } from "@/admin/api/adminApi";
import AppShell from "@/admin/components/layout/AppShell";

export default function Dashboard() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    adminApi
      .dashboard()
      .then((dashboard) => {
        if (!cancelled) setData(dashboard);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load admin dashboard.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppShell>
      <section className="max-w-3xl">
        <div className="rounded-lg border border-border/60 bg-card p-6">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Dashboard</p>
          {error ? (
            <p className="mt-3 text-sm font-medium text-destructive">{error}</p>
          ) : (
            <>
              <h1 className="mt-3 text-xl font-semibold">
                {data?.message || "Loading admin dashboard..."}
              </h1>
              {data?.unitId ? (
                <p className="mt-2 text-sm text-muted-foreground">unitId: {data.unitId}</p>
              ) : null}
            </>
          )}
        </div>
      </section>
    </AppShell>
  );
}
