import { PrismaClient } from "@prisma/client";
import { resolveDatabaseUrl } from "./storage";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Point Prisma at the live database outside the git checkout, creating it
// from the copy in the repository on first run. See lib/storage.ts.
const url = resolveDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ datasources: { db: { url } } });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
