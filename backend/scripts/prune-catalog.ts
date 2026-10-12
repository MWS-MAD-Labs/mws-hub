// Removes the Hub's own catalog rows that Central now publishes, so Central is the one source of the card.
//   bun run prune:catalog             shows what would go, changes nothing
//   bun run prune:catalog --confirm   deletes those rows
import "dotenv/config";
import { listPublishedApplications } from "../src/lib/central-client";
import { rowsCoveredByCentral } from "../src/lib/catalog-prune";
import { prisma } from "../src/lib/prisma";

const confirm = process.argv.includes("--confirm");
const published = await listPublishedApplications();
const rows = await prisma.application.findMany({ select: { id: true, name: true, sso_central_entitlement_app_id: true } });
const covered = rowsCoveredByCentral(rows, published.map((app) => app.id));

console.log(`Central publishes ${published.length} application(s). The Hub has ${rows.length} catalog row(s).`);
if (covered.length === 0) console.log("No row of the Hub is covered by Central yet.");
for (const row of covered) console.log(`${confirm ? "Removing" : "Would remove"}: ${row.id}`);
if (confirm && covered.length > 0) {
  await prisma.application.deleteMany({ where: { id: { in: covered.map((row) => row.id) } } });
  console.log(`Removed ${covered.length}.`);
} else if (covered.length > 0) {
  console.log("Run again with --confirm to remove them.");
}
await prisma.$disconnect();
