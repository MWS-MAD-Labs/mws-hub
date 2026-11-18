import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { adminApi, type AdminOverview } from "@/admin/api/adminApi";
import AppShell from "@/admin/components/layout/AppShell";
import Button from "@/admin/components/ui/Button";
import Card from "@/admin/components/ui/Card";
import PageHeader from "@/admin/components/ui/PageHeader";
import { ErrorState, LoadingState } from "@/admin/components/ui/States";
import { cn } from "@/lib/utils";
import ActivityCard from "./components/ActivityCard";
import HealthCard from "./components/HealthCard";
import ReportsCard from "./components/ReportsCard";

// Whether the Hub is working, what people opened through it, and what they reported.
export default function DashboardPage() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      setOverview(await adminApi.overview());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load the overview.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AppShell>
      <div className="space-y-5">
        <PageHeader
          title="Hub Overview"
          description="Whether the Hub works, what people opened through it, and what they reported. Applications are managed in Central."
          actions={
            <Button onClick={() => void load()} disabled={isLoading}>
              <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin motion-reduce:animate-none")} />
              Refresh
            </Button>
          }
        />

        {isLoading && !overview ? (
          <Card><LoadingState>Loading the overview...</LoadingState></Card>
        ) : error ? (
          <Card><ErrorState title="The overview could not load" message={error} onRetry={() => void load()} /></Card>
        ) : overview ? (
          <div className="space-y-5">
            <HealthCard overview={overview} />
            <ActivityCard overview={overview} />
            <ReportsCard overview={overview} />
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
