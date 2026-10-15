// Writes the Hub's own catalog as JSON, for Central's one time import:
//   bun run export:catalog > catalog.json
//   (in Central) bun run import:hub-catalog catalog.json [--publish] [--dry-run]
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const rows = await prisma.application.findMany({ orderBy: { id: "asc" } });
console.log(
  JSON.stringify(
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      icon: row.icon,
      description: row.description,
      category: row.category,
      href: row.href,
      sso_app_id: row.sso_app_id,
      sso_entry_url: row.sso_entry_url,
      sso_logout_url: row.sso_logout_url,
      sso_central_entitlement_app_id: row.sso_central_entitlement_app_id,
    })),
    null,
    2,
  ),
);
await prisma.$disconnect();
