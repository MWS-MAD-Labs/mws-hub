import { RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { adminApi, type AdminReport } from "@/admin/api/adminApi";
import AppShell from "@/admin/components/layout/AppShell";
import AdminPagination from "@/admin/components/ui/AdminPagination";
import Button from "@/admin/components/ui/Button";
import Card from "@/admin/components/ui/Card";
import FilterSelect from "@/admin/components/ui/FilterSelect";
import PageHeader from "@/admin/components/ui/PageHeader";
import SearchInput from "@/admin/components/ui/SearchInput";
import { EmptyState, ErrorState, LoadingState } from "@/admin/components/ui/States";
import { cn } from "@/lib/utils";
import ReportMobileList from "./components/ReportMobileList";
import ReportsTable from "./components/ReportsTable";
import { REPORT_STATUS_OPTIONS, type ReportStatus } from "./reportStatus";

type StatusFilter = ReportStatus | "ALL";

export default function BrokenToolsPage() {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [params, setParams] = useSearchParams();
  const query = params.get("q") || "";
  const status = (params.get("status") || "ALL") as StatusFilter;
  const page = Math.max(1, Number(params.get("page")) || 1);
  const pageSize = [25, 50, 100].includes(Number(params.get("pageSize"))) ? Number(params.get("pageSize")) : 25;

  async function loadReports() {
    setIsLoading(true);
    setError("");
    try {
      setReports(await adminApi.listReports());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports.");
    } finally {
      setIsLoading(false);
    }
  }
  useEffect(() => { void loadReports(); }, []);

  const updateParams = (patch: Record<string, string>) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      Object.entries(patch).forEach(([key, value]) => (value && value !== "ALL" ? next.set(key, value) : next.delete(key)));
      return next;
    }, { replace: true });

  async function changeReport(id: string, nextStatus: ReportStatus) {
    setUpdatingIds((current) => new Set(current).add(id));
    try {
      await adminApi.updateReport(id, nextStatus);
      setReports((current) => current.map((report) => (report.id === id ? { ...report, status: nextStatus } : report)));
      toast.success("Report updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update report.");
    } finally {
      setUpdatingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return reports.filter(
      (report) =>
        (status === "ALL" || report.status === status) &&
        (!normalized || [report.application.name, report.application.id, report.reporter_email, report.message, report.status].join(" ").toLowerCase().includes(normalized)),
    );
  }, [query, reports, status]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <AppShell>
      <div className="space-y-5">
        <PageHeader
          title="Broken Tools"
          description="Triage application issues reported by Hub users."
          actions={
            <Button onClick={() => void loadReports()} disabled={isLoading}>
              <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin motion-reduce:animate-none")} />
              Refresh
            </Button>
          }
        />

        <Card
          title="All reports"
          description={`${filtered.length} ${filtered.length === 1 ? "record" : "records"}`}
          busy={isLoading}
          toolbar={
            <>
              <SearchInput value={query} placeholder="Search reports" onChange={(value) => updateParams({ q: value, page: "1" })} />
              <FilterSelect
                value={status}
                onChange={(value) => updateParams({ status: value, page: "1" })}
                options={[{ value: "ALL" as StatusFilter, label: "All statuses" }, ...REPORT_STATUS_OPTIONS]}
                ariaLabel="Filter report status"
              />
            </>
          }
        >
          {isLoading ? (
            <LoadingState>Loading broken-tool reports...</LoadingState>
          ) : error ? (
            <ErrorState title="Reports could not be loaded." message={error} onRetry={() => void loadReports()} />
          ) : rows.length === 0 ? (
            <EmptyState title={query || status !== "ALL" ? "No reports match these filters." : "No reports yet."} />
          ) : (
            <>
              <div className="md:hidden"><ReportMobileList reports={rows} updatingIds={updatingIds} onChange={changeReport} /></div>
              <div className="hidden md:block"><ReportsTable reports={rows} updatingIds={updatingIds} onChange={changeReport} /></div>
            </>
          )}
          {!isLoading && !error ? (
            <AdminPagination page={safePage} pageSize={pageSize} total={filtered.length} pageSizeOptions={[25, 50, 100]} onPageChange={(next) => updateParams({ page: String(next) })} onPageSizeChange={(next) => updateParams({ pageSize: String(next), page: "1" })} />
          ) : null}
        </Card>
      </div>
    </AppShell>
  );
}
