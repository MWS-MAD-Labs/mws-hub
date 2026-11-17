import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { adminApi, type AdminAuditLog, type AdminPaginationMeta } from "@/admin/api/adminApi";
import AppShell from "@/admin/components/layout/AppShell";
import AdminPagination from "@/admin/components/ui/AdminPagination";
import Button from "@/admin/components/ui/Button";
import Card from "@/admin/components/ui/Card";
import PageHeader from "@/admin/components/ui/PageHeader";
import { EmptyState, LoadingState } from "@/admin/components/ui/States";
import { cn } from "@/lib/utils";
import { rangeFor, type RangePreset } from "./auditLabels";
import AuditFilters from "./components/AuditFilters";
import AuditMobileList from "./components/AuditMobileList";
import AuditTable from "./components/AuditTable";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [pagination, setPagination] = useState<AdminPaginationMeta>({ page: 1, pageSize: 10, total: 0, totalPages: 1, hasPreviousPage: false, hasNextPage: false });
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const pageSize = [10, 25, 50, 100].includes(Number(params.get("pageSize"))) ? Number(params.get("pageSize")) : 10;
  const query = params.get("q") || "";
  const action = params.get("action") || "";
  const preset = (params.get("range") || "this_week") as RangePreset;
  const presetRange = rangeFor(preset === "custom" ? "this_week" : preset);
  const dateFrom = params.get("dateFrom") || presetRange.from;
  const dateTo = params.get("dateTo") || presetRange.to;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminApi.listAuditLogs({ page, pageSize, q: query, action, dateFrom, dateTo });
      setLogs(result.data);
      setPagination(result.pagination);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, query, action, dateFrom, dateTo]);
  useEffect(() => { void load(); }, [load]);

  const updateParams = (patch: Record<string, string>) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      Object.entries(patch).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
      return next;
    }, { replace: true });

  return (
    <AppShell>
      <div className="space-y-5">
        <PageHeader
          title="Audit Logs"
          description="Review administrative actions and Hub security events."
          actions={
            <Button onClick={() => void load()} disabled={loading}>
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin motion-reduce:animate-none")} />
              {loading ? "Refreshing" : "Refresh"}
            </Button>
          }
        />

        <Card
          title="Recorded events"
          description={`${pagination.total} ${pagination.total === 1 ? "event" : "events"}`}
          busy={loading}
          toolbar={<AuditFilters query={query} action={action} preset={preset} dateFrom={dateFrom} dateTo={dateTo} onChange={updateParams} />}
        >
          {loading ? (
            <LoadingState>Loading audit logs...</LoadingState>
          ) : logs.length === 0 ? (
            <EmptyState title="No audit logs found.">Try another search, action or date range.</EmptyState>
          ) : (
            <>
              <div className="md:hidden"><AuditMobileList logs={logs} /></div>
              <div className="hidden md:block"><AuditTable logs={logs} /></div>
            </>
          )}
          {!loading ? (
            <AdminPagination page={pagination.page} pageSize={pagination.pageSize} total={pagination.total} onPageChange={(next) => updateParams({ page: String(next) })} onPageSizeChange={(next) => updateParams({ pageSize: String(next), page: "1" })} />
          ) : null}
        </Card>
      </div>
    </AppShell>
  );
}
