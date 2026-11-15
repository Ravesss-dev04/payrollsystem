import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "bun:test";

const unavailablePath = fileURLToPath(
  new URL(
    "../../app/admin/components/dashboard/DashboardUnavailableState.tsx",
    import.meta.url,
  ),
);

describe("dashboard unavailable state", () => {
  it("renders an accessible unavailable state", async () => {
    expect(existsSync(unavailablePath)).toBe(true);
    const { DashboardUnavailableState } = await import(
      pathToFileURL(unavailablePath).href
    );
    const markup = renderToStaticMarkup(
      createElement(DashboardUnavailableState, {
        title: "Payroll unavailable",
        message: "No authoritative payroll data is available yet.",
      }),
    );

    expect(markup).toContain('role="status"');
    expect(markup).toContain("Payroll unavailable");
    expect(markup).toContain("No authoritative payroll data is available yet.");
  });
});
