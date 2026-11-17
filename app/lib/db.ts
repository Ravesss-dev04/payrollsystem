import "server-only";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client";
import { getMySqlPoolConfig } from "./mysql-adapter-config";

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
    adapter: new PrismaMariaDb(getMySqlPoolConfig(connectionString)),
  });

if (process.env.NODE_ENV !== "production") {
  prismaGlobal.payrollPrisma = prisma;
}
