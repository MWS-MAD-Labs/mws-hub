import Badge from "@/admin/components/ui/Badge";
import { LEVEL, type Level } from "../dashboardLabels";

export default function LevelBadge({ level }: { level: Level }) {
  const { label, tone, icon } = LEVEL[level];
  return <Badge tone={tone} icon={icon}>{label}</Badge>;
}
