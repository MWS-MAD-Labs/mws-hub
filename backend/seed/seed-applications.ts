// Usage:
//   bun run seed:applications
//
// Moves the default catalog into Hub's
// database, so MAD Labs can add and edit apps from the admin screen instead
// of editing code and shipping a release.
//
// Safe to re-run: every row is an upsert by id, and `update` deliberately
// leaves nothing out, so re-seeding restores an entry that was edited by
// hand. It does NOT delete rows created through the admin screen.
import { prisma } from "../src/lib/prisma";
import { HUB_CATALOG } from "./default-catalog";
import type { HubCatalogEntry } from "../src/type/catalog-type";
import { ApplicationStatus } from "../src/generated/prisma/enums";

// MTSS and Daily Check-in are deliberately NOT seeded. They are the two apps
// with a real SSO handoff, and creating them through the admin screen is the
// end-to-end test of requirement 7: if an app can be registered by hand and
// its launch still works, the admin screen is genuinely doing the job the
// code file used to do.
//
// Their shape, for reference when filling the form:
//
//   id            mtss                        | emotional-checkin
//   name          MTSS Dashboard              | Daily Emotional Check-in
//   icon          Brain                       | HeartHandshake
//   category      students                    | students
//   href          https://app.millenniaws.sch.id/mtss
//                                             | https://app.millenniaws.sch.id/select-role
//   sso_app_id    mtss                        | daily-checkin
//   sso_entry_url <MTSS_API_URL>/auth/sso     | <DAILY_CHECKIN_API_URL>/auth/sso
//   allowed       teacher, principal, director | student, teacher, staff,
//                                             |   principal, director
//
// sso_entry_url is now a column, so those two <APP>_API_URL env vars stop
// being needed the moment both apps live in the database.
const EXCLUDED_IDS = new Set(["mtss", "emotional-checkin"]);

const STATUS: Record<HubCatalogEntry["status"], ApplicationStatus> = {
  active: ApplicationStatus.ACTIVE,
  maintenance: ApplicationStatus.MAINTENANCE,
  coming_soon: ApplicationStatus.COMING_SOON,
  new: ApplicationStatus.NEW,
};

async function main() {
  const entries = HUB_CATALOG.filter((entry) => !EXCLUDED_IDS.has(entry.id));

  for (const [index, entry] of entries.entries()) {
    const row = {
      name: entry.name,
      icon: entry.icon,
      description: entry.description,
      audience: entry.audience,
      category: entry.category,
      keywords: entry.keywords ?? [],
      href: entry.href,
      external: entry.external,
      status: STATUS[entry.status],
      discoverable: entry.discoverable,
      allowed_sources: entry.allowedSources,
      sso_app_id: entry.sso?.appId ?? null,
      sso_entry_url: entry.sso?.entryUrl ?? null,
      // Keeps the order the file had, so the grid looks unchanged after the
      // move. The admin screen can reorder from here.
      sort_order: (index + 1) * 10,
    };

    await prisma.application.upsert({
      where: { id: entry.id },
      update: row,
      create: { id: entry.id, ...row },
    });

    console.log(`  seeded: ${entry.id}`);
  }

  console.log(`\n${entries.length} application(s) seeded.`);
  console.log(
    `Skipped on purpose: ${[...EXCLUDED_IDS].join(", ")} - register these through the admin screen.`,
  );
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
