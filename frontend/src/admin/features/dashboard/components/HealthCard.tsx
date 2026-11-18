import type { AdminOverview } from "@/admin/api/adminApi";
import Card from "@/admin/components/ui/Card";
import Notice from "@/admin/components/ui/Notice";
import { dateTime } from "../dashboardLabels";
import LevelBadge from "./LevelBadge";

export default function HealthCard({ overview }: { overview: AdminOverview }) {
  const { health } = overview;
  const down = health.apps.filter((app) => app.status === "down");
  return (
    <Card title="Health" description={`Checked ${dateTime(overview.generated_at)}`} actions={<LevelBadge level={health.status} />} padded>
      <ul className="divide-y divide-[var(--admin-border)]">
        {health.checks.map((check) => (
          <li key={check.id} className="flex flex-wrap items-start gap-x-4 gap-y-1 py-3 first:pt-0 last:pb-0">
            <span className="w-36 shrink-0 text-sm font-semibold text-[var(--admin-text)]">{check.label}</span>
            <LevelBadge level={check.status} />
            <span className="min-w-0 flex-1 basis-64 text-sm text-[var(--admin-text-secondary)]">{check.detail}</span>
          </li>
        ))}
      </ul>
      {down.length > 0 ? (
        <Notice tone="warning" title="Not answering" className="mt-4">
          <ul className="mt-1 space-y-1">
            {down.map((app) => (
              <li key={app.id}>
                <span className="font-semibold text-[var(--admin-text)]">{app.name}</span> <span className="font-mono text-xs text-[var(--admin-text-tertiary)]">{app.address}</span>
              </li>
            ))}
          </ul>
        </Notice>
      ) : null}
    </Card>
  );
}
