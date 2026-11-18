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

describe("admin dashboard activity states", () => {
  it("announces loading while security activity is being fetched", async () => {
    expect(existsSync(clientPath)).toBe(true);
    const { DashboardActivitiesPanel } = await import(
      pathToFileURL(clientPath).href
    );
    const markup = renderToStaticMarkup(
      createElement(DashboardActivitiesPanel, {
        state: { status: "loading" },
        onRefresh: () => {},
      }),
    );

    expect(markup).toContain('role="status"');
    expect(markup).toContain("Loading security and account activity");
  });

  it("renders sanitized events with Manila-local timestamps", async () => {
    expect(existsSync(clientPath)).toBe(true);
    const { DashboardActivitiesPanel } = await import(
      pathToFileURL(clientPath).href
    );
    const markup = renderToStaticMarkup(
      createElement(DashboardActivitiesPanel, {
        state: {
          status: "loaded",
          activities: [
            {
              id: "event-1",
              title: "Access denied",
              actorName: "Riley",
              category: "security",
              occurredAt: "2026-11-15T07:02:00.000Z",
            },
          ],
          lastUpdatedAt: "2026-11-15T07:03:00.000Z",
        },
        onRefresh: () => {},
      }),
    );

    expect(markup).toContain("Access denied");
    expect(markup).toContain("Riley");
    expect(markup).toContain("Security");
    expect(markup).toContain("Nov 15, 2026");
    expect(markup).toContain("Last updated");
  });

  it("renders a clear empty state when no trusted activity exists", async () => {
    expect(existsSync(clientPath)).toBe(true);
    const { DashboardActivitiesPanel } = await import(
      pathToFileURL(clientPath).href
    );
    const markup = renderToStaticMarkup(
      createElement(DashboardActivitiesPanel, {
        state: {
          status: "loaded",
          activities: [],
          lastUpdatedAt: "2026-11-15T07:03:00.000Z",
        },
        onRefresh: () => {},
      }),
    );

    expect(markup).toContain("No recent security or account activity");
  });

  it("announces retryable failures and provides a retry action", async () => {
    expect(existsSync(clientPath)).toBe(true);
    const { DashboardActivitiesPanel } = await import(
      pathToFileURL(clientPath).href
    );
    const markup = renderToStaticMarkup(
      createElement(DashboardActivitiesPanel, {
        state: { status: "error" },
        onRefresh: () => {},
      }),
    );

    expect(markup).toContain('role="alert"');
    expect(markup).toContain("Activity feed could not be loaded");
    expect(markup).toContain(">Retry<");
  });

  it("renders persisted role and account-status counts from the snapshot", async () => {
    const { DashboardSnapshotView } = await import(
      "../../app/admin/dashboard/AdminDashboardClient"
    );
    const markup = renderToStaticMarkup(
      createElement(DashboardSnapshotView, {
        state: {
          status: "loaded",
          refreshing: false,
          snapshot: {
            accountCounts: {
              byRole: { admin: 2, hr: 3, tl: 0, employee: 8 },
              byStatus: {
                Active: 10,
                Invited: 1,
                Suspended: 1,
                Inactive: 1,
              },
            },
            activities: [],
            lastUpdatedAt: "2026-11-15T07:03:00.000Z",
          },
        },
        onRefresh: () => {},
      }),
    );

    expect(markup).toContain("Account overview");
    expect(markup).toContain("Admin accounts");
    expect(markup).toContain(">2<");
    expect(markup).toContain("HR accounts");
    expect(markup).toContain(">3<");
    expect(markup).toContain("Team Lead accounts");
    expect(markup).toContain("Employee accounts");
    expect(markup).toContain(">8<");
    expect(markup).toContain("Active accounts");
    expect(markup).toContain(">10<");
  });

  it("shows loading and retry states for the dashboard snapshot", async () => {
    const { DashboardSnapshotView } = await import(
      "../../app/admin/dashboard/AdminDashboardClient"
    );
    const loading = renderToStaticMarkup(
      createElement(DashboardSnapshotView, {
        state: { status: "loading" },
        onRefresh: () => {},
      }),
    );
    const error = renderToStaticMarkup(
      createElement(DashboardSnapshotView, {
        state: { status: "error" },
        onRefresh: () => {},
      }),
    );

    expect(loading).toContain("Loading account snapshot");
    expect(error).toContain('role="alert"');
    expect(error).toContain("Dashboard snapshot could not be loaded");
    expect(error).toContain(">Retry<");
  });
});
