import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import AppShell from "@/admin/components/layout/AppShell";
import { adminApi, type AdminAuditLog } from "@/admin/api/adminApi";

const ACTION_LABELS: Record<string, string> = {
  "application.create": "Create App",
  "application.update": "Update App",
  "application.delete": "Delete App",
  "app_report.update_status": "Update Report",
  "access_request.update_status": "Update Access",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatMetadata(metadata: unknown) {
  if (!metadata) return "";
  return JSON.stringify(metadata, null, 2);
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setLogs(await adminApi.listAuditLogs());
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load audit logs.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <AppShell>
      <section className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Admin trail
            </p>
            <h1 className="mt-1 text-2xl font-semibold">Audit Logs</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Riwayat perubahan katalog, laporan, dan request access.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border/70 px-3 text-sm font-semibold hover:bg-card disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        <div className="overflow-hidden rounded-lg border border-border/60 bg-card">
          {loading ? (
            <p className="p-4 text-sm text-muted-foreground">
              Loading audit logs...
            </p>
          ) : logs.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              Belum ada audit log.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-b border-border/60 bg-muted/30 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Waktu</th>
                    <th className="px-4 py-3">Aktor</th>
                    <th className="px-4 py-3">Aksi</th>
                    <th className="px-4 py-3">Target</th>
                    <th className="px-4 py-3">Ringkasan</th>
                    <th className="px-4 py-3">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {logs.map((log) => (
                    <tr key={log.id} className="align-top">
                      <td className="whitespace-nowrap px-4 py-4 text-muted-foreground">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-4 py-4">
                        <span className="block font-medium">
                          {log.actor_name || log.actor_email}
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {log.actor_email}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="block font-medium">
                          {log.entity_type}
                        </span>
                        <span className="mt-1 block max-w-44 truncate text-xs text-muted-foreground">
                          {log.entity_id}
                        </span>
                      </td>
                      <td className="max-w-sm px-4 py-4">{log.summary}</td>
                      <td className="px-4 py-4">
                        {log.metadata ? (
                          <details className="group max-w-xs">
                            <summary className="cursor-pointer text-xs font-semibold text-primary">
                              Metadata
                            </summary>
                            <pre className="mt-2 max-h-56 overflow-auto rounded-md bg-background p-3 text-xs text-muted-foreground">
                              {formatMetadata(log.metadata)}
                            </pre>
                          </details>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Empty
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
