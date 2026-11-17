import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "bun:test";

const clientPath = fileURLToPath(
  new URL(
    "../../app/admin/dashboard/AdminDashboardClient.tsx",
    import.meta.url,
  ),
);

describe("admin dashboard layout", () => {
  it("shows only persisted data or explicit unavailable states", async () => {
    expect(existsSync(clientPath)).toBe(true);
    const { default: AdminDashboardClient } = await import(
      pathToFileURL(clientPath).href
    );
    const markup = renderToStaticMarkup(
      createElement(AdminDashboardClient, {
        greeting: "Good morning, Admin!",
        snapshotDate: "November 15, 2026",
      }),
    );
    const titles = [
      "Projected Payroll",
      "Total Employees",
      "Departments",
      "Payroll Expense Trend",
      "Attendance Summary (Today)",
      "Recent Activities",
      "Pending Approvals",
    ];
    const countTitle = (title: string) =>
      markup.split(title).length - 1;

    expect(titles.every((title) => markup.includes(title))).toBe(true);
    expect(countTitle("Recent Activities")).toBe(1);
    expect(countTitle("Pending Approvals")).toBe(1);
    expect(markup).toContain("Projected payroll unavailable");
    expect(markup).toContain("Employee records unavailable");
    expect(markup).toContain("Department data unavailable");
    expect(markup).toContain("Attendance data unavailable");
    expect(markup).not.toContain("Demo data only");
    expect(markup).not.toContain("2,415,300");
    expect(markup).not.toContain("Jane Dela Cruz");
    expect(markup).not.toContain("Nov 1 to Nov 15");
    expect(markup).toContain("Good morning, Admin!");
    expect(markup).toContain("November 15, 2026");
  });
});
