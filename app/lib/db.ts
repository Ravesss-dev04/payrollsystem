import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL must be configured");
}

const prismaGlobal = globalThis as typeof globalThis & {
  payrollPrisma?: PrismaClient;
};

export const prisma =
  prismaGlobal.payrollPrisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

if (process.env.NODE_ENV !== "production") {
  prismaGlobal.payrollPrisma = prisma;
}
