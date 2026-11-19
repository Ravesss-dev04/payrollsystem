import { describe, expect, it } from "bun:test";
import {
  resolveAttendancePolicy,
  type AttendancePolicyCandidate,
} from "../../app/lib/attendance/policy-resolution";

const date = new Date("2026-03-15T12:00:00.000Z");

function policy(
  input: Partial<AttendancePolicyCandidate> &
    Pick<AttendancePolicyCandidate, "id" | "scope">,
): AttendancePolicyCandidate {
  return {
    status: "Active",
    precedence: 100,
    effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
    effectiveTo: null,
    ...input,
  };
}

describe("attendance policy resolution", () => {
  it("chooses a more specific policy before a higher-ranked global policy", () => {
    const global = policy({
      id: "global",
      scope: "AllEmployees",
      precedence: 1,
    });
    const department = policy({
      id: "department",
      scope: "Departments",
      precedence: 100,
    });

    expect(
      resolveAttendancePolicy([global, department], date),
    ).toEqual({ status: "resolved", policy: department });
  });

  it("does not fall back when the most-specific matching policy is paused", () => {
    const global = policy({ id: "global", scope: "AllEmployees" });
    const pausedEmployee = policy({
      id: "employee",
      scope: "Employees",
      status: "Paused",
    });

    expect(
      resolveAttendancePolicy([global, pausedEmployee], date),
    ).toEqual({ status: "blocked", policyId: "employee" });
  });

  it("returns a conflict instead of choosing arbitrarily on equal priority", () => {
    const first = policy({
      id: "first",
      scope: "Departments",
      precedence: 10,
    });
    const second = policy({
      id: "second",
      scope: "Departments",
      precedence: 10,
    });

    expect(
      resolveAttendancePolicy([first, second], date),
    ).toEqual({ status: "conflict", policyIds: ["first", "second"] });
  });

  it("ignores archived policies and respects inclusive effective dates", () => {
    const archived = policy({
      id: "archived",
      scope: "Employees",
      status: "Archived",
    });
    const expired = policy({
      id: "expired",
      scope: "Departments",
      effectiveTo: new Date("2026-03-14T00:00:00.000Z"),
    });
    const global = policy({
      id: "global",
      scope: "AllEmployees",
      effectiveTo: new Date("2026-03-15T00:00:00.000Z"),
    });

    expect(
      resolveAttendancePolicy([archived, expired, global], date),
    ).toEqual({ status: "resolved", policy: global });
    expect(
      resolveAttendancePolicy([archived, expired], date),
    ).toEqual({ status: "none" });
  });
});
