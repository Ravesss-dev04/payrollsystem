import { describe, expect, it } from "bun:test";
import {
  payrollRuleConfigurationSchema,
  payrollRuleSetDraftInputSchema,
} from "../../app/lib/payroll/rules";

const emptyDraft = {
  effectiveFrom: "2026-01-01",
  configuration: {
    schemaVersion: 1 as const,
    currencyCode: null,
    rounding: {},
    compensation: {},
    earnings: [],
    deductions: [],
  },
};

describe("payroll rule drafts", () => {
  it("accepts an explicitly unconfigured rule document without financial defaults", () => {
    expect(payrollRuleSetDraftInputSchema.parse(emptyDraft)).toEqual(emptyDraft);
  });

  it("rejects unknown top-level rule fields", () => {
    expect(() =>
      payrollRuleConfigurationSchema.parse({
        ...emptyDraft.configuration,
        overtimeRate: 1.5,
      }),
    ).toThrow();
  });

  it("rejects invalid effective dates and unsupported document versions", () => {
    expect(() =>
      payrollRuleSetDraftInputSchema.parse({
        ...emptyDraft,
        effectiveFrom: "not-a-date",
      }),
    ).toThrow();
    expect(() =>
      payrollRuleConfigurationSchema.parse({
        ...emptyDraft.configuration,
        schemaVersion: 2,
      }),
    ).toThrow();
  });
});
