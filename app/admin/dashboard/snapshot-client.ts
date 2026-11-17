import { dashboardSnapshotSchema } from "./summary-schema";
import type { DashboardSnapshot } from "./summary-schema";

type DashboardSnapshotFetcher = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

export async function fetchDashboardSnapshot(
  fetcher: DashboardSnapshotFetcher,
  signal: AbortSignal,
): Promise<DashboardSnapshot> {
  const response = await fetcher("/api/admin/dashboard/summary", {
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error("Dashboard snapshot request failed");

  const result = dashboardSnapshotSchema.safeParse(await response.json());
  if (!result.success) {
    throw new Error("Dashboard snapshot response was invalid");
  }
  return result.data;
}
