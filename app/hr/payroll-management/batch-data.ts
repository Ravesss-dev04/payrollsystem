export type Batch = {
  id: string;
  start: string;
  end: string;
  period: string;
  count: number;
  earnings: number;
  deductions: number;
  progress: [number, number, number];
  status: "Draft" | "In Progress" | "Completed" | "Pending Approval";
  prepared: string;
  adjustments: number;
};

// Illustrative dashboard records. IDs here are fixture identifiers, not PayrollBatch primary keys.
export const referenceBatches: Batch[] = [
  { id: "PB-0128", start: "2025-01-01", end: "2025-01-31", period: "Jan 2025", count: 1248, earnings: 456278000, deductions: 73822000, progress: [1098, 138, 12], status: "In Progress", prepared: "Emma Carter", adjustments: 12 },
  { id: "PB-0127", start: "2024-12-01", end: "2024-12-31", period: "Dec 2024", count: 1233, earnings: 376241000, deductions: 0, progress: [1233, 0, 0], status: "Completed", prepared: "James Miller", adjustments: 0 },
  { id: "PB-0126", start: "2024-11-01", end: "2024-11-30", period: "Nov 2024", count: 1220, earnings: 370198500, deductions: 0, progress: [1220, 0, 0], status: "Completed", prepared: "Emma Carter", adjustments: 0 },
  { id: "PB-0125", start: "2024-10-01", end: "2024-10-31", period: "Oct 2024", count: 1214, earnings: 368942000, deductions: 0, progress: [1214, 0, 0], status: "Completed", prepared: "James Miller", adjustments: 0 },
];

const storageKey = "workpulse-payroll-management-demo-drafts";

export function loadDemoDrafts(): Batch[] {
  if (typeof window === "undefined") return [];
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is Batch =>
      typeof item === "object" && item !== null &&
      typeof item.id === "string" && item.id.startsWith("DEMO-") &&
      item.status === "Draft" && typeof item.start === "string" &&
      typeof item.end === "string" && typeof item.period === "string" &&
      item.count === 0 && item.earnings === 0 && item.deductions === 0 &&
      Array.isArray(item.progress) && item.progress.length === 3 &&
      item.progress.every((n: unknown) => n === 0) &&
      typeof item.prepared === "string" && item.adjustments === 0,
    );
  } catch {
    return [];
  }
}

export function saveDemoDrafts(drafts: Batch[]): void {
  localStorage.setItem(storageKey, JSON.stringify(drafts.filter((batch) => batch.status === "Draft" && batch.id.startsWith("DEMO-"))));
}

export const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n / 100);

export const date = (s: string) =>
  new Date(`${s}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
  });

export const periodLabel = (s: string) =>
  new Date(`${s}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short", year: "numeric", timeZone: "UTC",
  });
