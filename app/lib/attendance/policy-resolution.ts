export type AttendancePolicyCandidate = {
  id: string;
  status: "Active" | "Paused" | "Archived";
  scope: "AllEmployees" | "Departments" | "Employees";
  precedence: number;
  effectiveFrom: Date;
  effectiveTo: Date | null;
};

export type AttendancePolicyResolution =
  | { status: "resolved"; policy: AttendancePolicyCandidate }
  | { status: "blocked"; policyId: string }
  | { status: "conflict"; policyIds: string[] }
  | { status: "none" };

const scopeRank: Record<AttendancePolicyCandidate["scope"], number> = {
  AllEmployees: 0,
  Departments: 1,
  Employees: 2,
};

function utcDateKey(value: Date): string | null {
  if (!Number.isFinite(value.getTime())) return null;
  return value.toISOString().slice(0, 10);
}

export function resolveAttendancePolicy(
  candidates: readonly AttendancePolicyCandidate[],
  onDate: Date,
): AttendancePolicyResolution {
  const dateKey = utcDateKey(onDate);
  if (!dateKey) return { status: "none" };

  const applicable = candidates
    .filter((policy) => {
      if (policy.status === "Archived") return false;
      const start = utcDateKey(policy.effectiveFrom);
      const end = policy.effectiveTo
        ? utcDateKey(policy.effectiveTo)
        : undefined;
      return (
        start !== null &&
        dateKey >= start &&
        end !== null &&
        (end === undefined || dateKey <= end)
      );
    })
    .sort(
      (left, right) =>
        scopeRank[right.scope] - scopeRank[left.scope] ||
        left.precedence - right.precedence ||
        left.id.localeCompare(right.id),
    );

  const [selected] = applicable;
  if (!selected) return { status: "none" };

  const selectedRank = scopeRank[selected.scope];
  const conflicts = applicable
    .filter(
      (policy) =>
        scopeRank[policy.scope] === selectedRank &&
        policy.precedence === selected.precedence,
    )
    .map(({ id }) => id)
    .sort();
  if (conflicts.length > 1) {
    return { status: "conflict", policyIds: conflicts };
  }

  return selected.status === "Paused"
    ? { status: "blocked", policyId: selected.id }
    : { status: "resolved", policy: selected };
}
