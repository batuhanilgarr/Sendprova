import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

/** Single default workspace until auth + multi-tenant lands. */
export async function defaultWorkspace() {
  return db.workspace.upsert({
    where: { slug: "default" },
    update: {},
    create: { slug: "default", name: "Default" },
  });
}
