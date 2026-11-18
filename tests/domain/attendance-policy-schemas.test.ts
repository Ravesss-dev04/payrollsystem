import { describe, expect, it } from "bun:test";
import { createAttendancePolicySchema } from "../../app/lib/attendance/policy-schemas";

const baseInput = {
  name: "Standard",
  code: "STANDARD",
  description: null,
  status: "Active",
  scope: "AllEmployees",
  precedence: 100,
  effectiveFrom: "2026-01-01",
  effectiveTo: null,
  scheduleType: "Fixed",
  timeZone: "UTC",
  workDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  shiftStart: "09:00",
  shiftEnd: "17:00",
  breakStart: "12:00",
  breakEnd: "13:00",
  breakPaid: false,
  gracePeriodMinutes: 10,
  missingTimeInRule: "Flag",
  missingTimeOutRule: "Flag",
  earlyOutRule: "Flag",
  undertimeRule: "Flag",
  absenceRule: "Flag",
  correctionsRequireApproval: true,
  overtimeEnabled: true,
  overtimePriorApproval: true,
  overtimeMinimumMinutes: 30,
  overtimeRoundingMinutes: 15,
  overtimeMaximumMinutes: 240,
  departmentIds: [],
  employeeIds: [],
};

describe("attendance policy validation", () => {
  it("accepts a break contained in an overnight shift", () => {
    const result = createAttendancePolicySchema.safeParse({
      ...baseInput,
      shiftStart: "22:00",
      shiftEnd: "06:00",
      breakStart: "01:00",
      breakEnd: "01:30",
    });

    expect(result.success).toBe(true);
  });

  it("rejects a fixed-shift break outside shift hours", () => {
    const result = createAttendancePolicySchema.safeParse({
      ...baseInput,
      breakStart: "07:00",
      breakEnd: "07:30",
    });

    expect(result.success).toBe(false);
  });
});
