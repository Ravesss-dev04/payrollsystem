import { describe, expect, it, mock } from "bun:test";

const validSnapshot = {
  accountCounts: {
    byRole: { admin: 1, hr: 2, employee: 3 },
    byStatus: { Active: 6, Invited: 0, Suspended: 0, Inactive: 0 },
  },
  activities: [],
  lastUpdatedAt: "2026-11-15T07:03:00.000Z",
};

describe("dashboard snapshot client", () => {
  it("requests a no-store snapshot and validates the response", async () => {
    const fetcher = mock(async () => Response.json(validSnapshot));
    const { fetchDashboardSnapshot } = await import(
      "../../app/admin/dashboard/snapshot-client"
    );

    await expect(
      fetchDashboardSnapshot(fetcher, new AbortController().signal),
    ).resolves.toEqual(validSnapshot);
    expect(fetcher).toHaveBeenCalledWith(
      "/api/admin/dashboard/summary",
      expect.objectContaining({
        cache: "no-store",
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("rejects unsuccessful and malformed snapshot responses", async () => {
    const { fetchDashboardSnapshot } = await import(
      "../../app/admin/dashboard/snapshot-client"
    );
    const failedFetch = mock(async () => new Response(null, { status: 503 }));
    const invalidFetch = mock(async () => Response.json({ activities: [] }));

    await expect(
      fetchDashboardSnapshot(failedFetch, new AbortController().signal),
    ).rejects.toThrow("Dashboard snapshot request failed");
    await expect(
      fetchDashboardSnapshot(invalidFetch, new AbortController().signal),
    ).rejects.toThrow("Dashboard snapshot response was invalid");
  });
});
