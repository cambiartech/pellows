import { PrismaClient } from "@/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
};

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  return new Pool({
    connectionString,
    max: Number(process.env.PG_POOL_MAX ?? 5),
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
  });
}

function getPrismaClient() {
  if (!globalForPrisma.pgPool) {
    globalForPrisma.pgPool = createPool();
  }
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      adapter: new PrismaPg(globalForPrisma.pgPool),
    });
  }
  return globalForPrisma.prisma;
}

export const prisma = getPrismaClient();
export default prisma;
