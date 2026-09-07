import { useEffect, useState } from "react";
import { toast } from "sonner";
import AppShell from "@/admin/components/layout/AppShell";
import Dropdown from "@/admin/components/ui/Dropdown";
import {
  adminApi,
  type AdminAccessRequest,
  type AdminReport,
} from "@/admin/api/adminApi";

export default function FeedbackPage() {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [requests, setRequests] = useState<AdminAccessRequest[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [nextReports, nextRequests] = await Promise.all([
        adminApi.listReports(),
        adminApi.listAccessRequests(),
      ]);
      setReports(nextReports);
      setRequests(nextRequests);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load feedback.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function changeReport(id: string, status: AdminReport["status"]) {
    try {
      await adminApi.updateReport(id, status);
      await load();
      toast.success("Report updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update report.",
      );
    }
  }

  async function changeRequest(
    id: string,
    status: AdminAccessRequest["status"],
  ) {
    try {
      await adminApi.updateAccessRequest(id, status);
      await load();
      toast.success("Access request updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update request.",
      );
    }
  }

  const reportStatusOptions = [
    { value: "OPEN", label: "open" },
    { value: "IN_PROGRESS", label: "in progress" },
    { value: "RESOLVED", label: "resolved" },
  ] satisfies Array<{ value: AdminReport["status"]; label: string }>;
  const requestStatusOptions = [
    { value: "PENDING", label: "pending" },
    { value: "APPROVED", label: "approved" },
    { value: "REJECTED", label: "rejected" },
  ] satisfies Array<{ value: AdminAccessRequest["status"]; label: string }>;

  return (
    <AppShell>
      <section className="space-y-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Review queue
          </p>
          <h1 className="mt-1 text-2xl font-semibold">Feedback</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review broken-tool reports and access requests from Hub users.
          </p>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading feedback...</p>
        ) : (
          <>
            <FeedbackTable
              title="Broken-tool reports"
              empty="No reports yet."
              rows={reports}
              render={(report) => (
                <>
                  <td className="px-4 py-4">
                    {report.application.name}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {report.message}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {report.reporter_email}
                  </td>
                  <td className="px-4 py-4">
                    <Dropdown
                      value={report.status}
                      className="w-36"
                      buttonClassName="text-xs"
                      options={reportStatusOptions}
                      onChange={(value) =>
                        void changeReport(
                          report.id,
                          value,
                        )
                      }
                    />
                  </td>
                </>
              )}
            />
            <FeedbackTable
              title="Access requests"
              empty="No access requests yet."
              rows={requests}
              render={(request) => (
                <>
                  <td className="px-4 py-4">
                    {request.application.name}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {request.reason || "No reason provided"}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {request.requester_email}
                  </td>
                  <td className="px-4 py-4">
                    <Dropdown
                      value={request.status}
                      className="w-36"
                      buttonClassName="text-xs"
                      options={requestStatusOptions}
                      onChange={(value) =>
                        void changeRequest(
                          request.id,
                          value,
                        )
                      }
                    />
                  </td>
                </>
              )}
            />
          </>
        )}
      </section>
    </AppShell>
  );
}

function FeedbackTable<T extends { id: string; created_at: string }>({
  title,
  empty,
  rows,
  render,
}: {
  title: string;
  empty: string;
  rows: T[];
  render: (row: T) => React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border/60 bg-card">
      <div className="border-b border-border/60 px-4 py-4">
        <h2 className="font-semibold">{title}</h2>
      </div>
      {rows.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-border/60 bg-muted/30 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Application</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.map((row) => (
                <tr key={row.id}>{render(row)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
