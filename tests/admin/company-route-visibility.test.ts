import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "bun:test";

const sidebarPath = fileURLToPath(
  new URL("../../app/admin/components/AdminSidebar.tsx", import.meta.url),
);
const activeCompanyPagePath = fileURLToPath(
  new URL("../../app/admin/company/page.tsx", import.meta.url),
);
const privateCompanyPagePath = fileURLToPath(
  new URL("../../app/admin/_company/page.tsx", import.meta.url),
);

describe("temporarily disabled Company navigation", () => {
  it("does not register the Company page in the admin sidebar", () => {
    const sidebarSource = readFileSync(sidebarPath, "utf8");

    expect(sidebarSource).not.toContain('href: "/admin/company"');
  });

  it("keeps the Company page source outside the active route tree", () => {
    expect(existsSync(activeCompanyPagePath)).toBe(false);
    expect(existsSync(privateCompanyPagePath)).toBe(true);
  });
});
