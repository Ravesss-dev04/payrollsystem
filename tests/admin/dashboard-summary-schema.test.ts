import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "bun:test";

const schemaPath = fileURLToPath(
  new URL("../../app/admin/dashboard/summary-schema.ts", import.meta.url),
);

describe("dashboard snapshot schema module boundary", () => {
  it("uses browser-safe generated enum exports instead of the Prisma client", () => {
    const source = readFileSync(schemaPath, "utf8");

    expect(source).toContain("generated/prisma/enums");
    expect(source).not.toContain("generated/prisma/client");
  });
});
