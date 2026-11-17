import { Link } from "react-router-dom";
import type { AdminOverview } from "@/admin/api/adminApi";
import Card from "@/admin/components/ui/Card";
import { EmptyState } from "@/admin/components/ui/States";
import { Table, TBody, TD, TH, THead, TR } from "@/admin/components/ui/Table";
import { cn } from "@/lib/utils";
import { FAILURE_LABEL, dateTime } from "../dashboardLabels";
import CardLink from "./CardLink";
import StatTile from "./StatTile";

export default function ActivityCard({ overview }: { overview: AdminOverview }) {
  const { activity } = overview;
  const failures = Object.values(activity.failures30).reduce((sum, count) => sum + count, 0);
  return (
    <Card title="Launch activity" description="From the audit trail." actions={<CardLink to="/admin/audit-logs?range=this_month&action=application.launch">All launches</CardLink>}>
      <div className="p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile label="Launches, last 7 days" value={activity.launches7} />
          <StatTile label="Launches, last 30 days" value={activity.launches30} />
          <StatTile label="Refused or failed, last 30 days" value={failures} attention={failures > 0} />
        </div>
        {failures > 0 ? (
          <p className="mt-3 text-sm text-[var(--admin-text-secondary)]">
            {Object.entries(activity.failures30).map(([reason, count]) => `${FAILURE_LABEL[reason] ?? reason}: ${count}`).join(", ")}
          </p>
        ) : null}
      </div>
      {activity.apps.length > 0 ? (
        <div className="border-t border-[var(--admin-border)]">
          <Table caption="Launches per application" minWidth={560}>
            <THead>
              <TH>Application</TH>
              <TH align="right">7 days</TH>
              <TH align="right">30 days</TH>
              <TH align="right">Failed</TH>
              <TH>Last opened</TH>
            </THead>
            <TBody>
              {activity.apps.map((app) => (
                <TR key={app.id}>
                  <TD>
                    <Link to={`/admin/audit-logs?range=this_month&q=${encodeURIComponent(app.id)}`} className="admin-focus rounded-sm font-semibold text-[var(--admin-text)] hover:underline">{app.name}</Link>
                  </TD>
                  <TD align="right" className="tabular-nums">{app.launches7}</TD>
                  <TD align="right" className="tabular-nums">{app.launches30}</TD>
                  <TD align="right" className={cn("tabular-nums", app.failures30 > 0 && "font-semibold text-[var(--admin-gold-text)]")}>{app.failures30}</TD>
                  <TD className="text-xs text-[var(--admin-text-tertiary)]">{app.last_launch_at ? dateTime(app.last_launch_at) : "Never"}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      ) : (
        <div className="border-t border-[var(--admin-border)]">
          <EmptyState title="No launches">Nobody opened an application through the Hub in the last 30 days.</EmptyState>
        </div>
      )}
      {activity.never_opened.length > 0 ? (
        <p className="border-t border-[var(--admin-border)] px-5 py-3 text-xs text-[var(--admin-text-tertiary)]">
          Not opened in 30 days: {activity.never_opened.map((app) => app.name).join(", ")}
        </p>
      ) : null}
    </Card>
  );
}
