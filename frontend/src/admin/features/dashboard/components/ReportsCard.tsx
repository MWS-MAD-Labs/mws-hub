import { Link } from "react-router-dom";
import type { AdminOverview } from "@/admin/api/adminApi";
import Card from "@/admin/components/ui/Card";
import { EmptyState } from "@/admin/components/ui/States";
import CardLink from "./CardLink";

export default function ReportsCard({ overview }: { overview: AdminOverview }) {
  const { reports } = overview;
  return (
    <Card title="Reports" description="Problems people reported from a card." actions={<CardLink to="/admin/broken-tools">Review queue</CardLink>}>
      {reports.open === 0 ? (
        <EmptyState title="No reports need review" />
      ) : (
        <div className="p-5">
          <p className="text-sm text-[var(--admin-text-secondary)]">
            <span className="text-2xl font-semibold tabular-nums text-[var(--admin-text)]">{reports.open}</span> open or in progress
          </p>
          <ul className="mt-3 divide-y divide-[var(--admin-border)]">
            {reports.by_app.map((row) => (
              <li key={row.application_id} className="flex items-center justify-between py-2.5 text-sm">
                <Link to={`/admin/broken-tools?q=${encodeURIComponent(row.name)}`} className="admin-focus rounded-sm font-semibold text-[var(--admin-text)] hover:underline">{row.name}</Link>
                <span className="tabular-nums text-[var(--admin-text-secondary)]">{row.open}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
