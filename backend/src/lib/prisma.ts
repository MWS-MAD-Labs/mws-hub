import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

// Hub's own database, holding only Hub's data: the catalog, broken-tool
// reports and access requests. Identity is never read from here - who
// someone is always comes from Central.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = new PrismaClient({ adapter });
