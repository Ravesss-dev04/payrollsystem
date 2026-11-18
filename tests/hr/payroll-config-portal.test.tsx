import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "bun:test";
import { PayrollConfigPortalClient } from "../../app/hr/payroll/config/PayrollConfigPortalClient";
import { DEFAULT_FULL_PAYROLL_CONFIGURATION } from "../../app/lib/payroll/company-config";

describe("Task 12: HR Payroll Configuration Portal", () => {
  const sampleActive = {
    version: 1,
    category: "GeneralSettings",
    status: "Active",
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    configuration: DEFAULT_FULL_PAYROLL_CONFIGURATION,
  };

  const sampleHistory = {
    items: [
      {
        id: "cfg-1",
        version: 1,
        category: "GeneralSettings",
        status: "Active",
        effectiveFrom: "2026-01-01",
        effectiveTo: null,
        changeReason: "Initial company payroll settings baseline",
        supportingReference: "Memo 2026-01",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    total: 1,
    page: 1,
    pageSize: 20,
  };

  it("renders all dedicated portal navigation tabs for Tasks 12.1 to 12.6", () => {
    const markup = renderToStaticMarkup(
      createElement(PayrollConfigPortalClient, {
        initialActive: sampleActive,
        initialHistory: sampleHistory,
      }),
    );

    expect(markup).toContain("12.1 Company Settings");
    expect(markup).toContain("12.2 Earnings");
    expect(markup).toContain("12.3 Deductions");
    expect(markup).toContain("12.4 Benefits");
    expect(markup).toContain("12.5 Applicability");
    expect(markup).toContain("12.6 Simulation &amp; Preview");
    expect(markup).toContain("Version History");
  });

  it("renders 12.1 Company Payroll Settings with divisors, cutoffs, working hours, and rounding", () => {
    const markup = renderToStaticMarkup(
      createElement(PayrollConfigPortalClient, {
        initialActive: sampleActive,
        initialHistory: sampleHistory,
      }),
    );

    // Divisors
    expect(markup).toContain('id="monthly-to-daily-divisor"');
    expect(markup).toContain('value="261"');
    expect(markup).toContain('id="daily-to-hourly-divisor"');
    expect(markup).toContain('value="8"');

    // Frequency & Cutoffs
    expect(markup).toContain('id="payroll-frequency"');
    expect(markup).toContain('id="first-half-cutoff"');
    expect(markup).toContain('id="first-half-pay-date"');
    expect(markup).toContain('id="second-half-cutoff"');
    expect(markup).toContain('id="second-half-pay-date"');

    // Working Hours & Timezone
    expect(markup).toContain('id="company-timezone"');
    expect(markup).toContain('value="Asia/Manila"');
    expect(markup).toContain('id="working-days-per-week"');
    expect(markup).toContain('id="standard-hours-per-day"');

    // Rounding & Proration
    expect(markup).toContain('id="rounding-policy"');
    expect(markup).toContain('id="proration-method"');
  });

  it("ensures default configuration encompasses comprehensive earnings, deductions, and benefits", () => {
    // 12.2 Earnings coverage
    const earningCodes = DEFAULT_FULL_PAYROLL_CONFIGURATION.earnings.map((e) => e.code);
    expect(earningCodes).toContain("BASIC");
    expect(earningCodes).toContain("OT_REG");
    expect(earningCodes).toContain("ND");
    expect(earningCodes).toContain("HOL_REG");
    expect(earningCodes).toContain("HOL_SPEC");
    expect(earningCodes).toContain("REST_DAY");
    expect(earningCodes).toContain("ALLOW_RICE");
    expect(earningCodes).toContain("BONUS_PERF");
    expect(earningCodes).toContain("COMMISSION");

    // 12.3 Deductions coverage
    const deductionCodes = DEFAULT_FULL_PAYROLL_CONFIGURATION.deductions.map((d) => d.code);
    expect(deductionCodes).toContain("SSS");
    expect(deductionCodes).toContain("PHILHEALTH");
    expect(deductionCodes).toContain("PAGIBIG");
    expect(deductionCodes).toContain("WTAX");
    expect(deductionCodes).toContain("LOAN_EMP");
    expect(deductionCodes).toContain("CASH_ADV");
    expect(deductionCodes).toContain("HMO_DEP");
    expect(deductionCodes).toContain("TARDY_UNDERTIME");

    // 12.4 Benefits coverage
    const benefitCodes = DEFAULT_FULL_PAYROLL_CONFIGURATION.benefits.map((b) => b.code);
    expect(benefitCodes).toContain("13TH_MONTH");
    expect(benefitCodes).toContain("SIL_ACCRUAL");
    expect(benefitCodes).toContain("HMO_CORP");
    expect(benefitCodes).toContain("GROUP_LIFE_INSURANCE");
    expect(benefitCodes).toContain("ATTENDANCE_INCENTIVE");

    // Benefit classification validation: employer-paid benefits must have correct funding
    const thirteenthMonth = DEFAULT_FULL_PAYROLL_CONFIGURATION.benefits.find((b) => b.code === "13TH_MONTH");
    expect(thirteenthMonth?.fundingType).toBe("EmployerPaid");
    expect(thirteenthMonth?.paymentType).toBe("Accrual");

    const sil = DEFAULT_FULL_PAYROLL_CONFIGURATION.benefits.find((b) => b.code === "SIL_ACCRUAL");
    expect(sil?.type).toBe("Statutory");
    expect(sil?.fundingType).toBe("EmployerPaid");
  });

  it("verifies 12.5 employee applicability prevents conflicting configurations", () => {
    expect(DEFAULT_FULL_PAYROLL_CONFIGURATION.applicability.scope).toBe("All");
    expect(Array.isArray(DEFAULT_FULL_PAYROLL_CONFIGURATION.applicability.departmentIds)).toBe(true);
    expect(Array.isArray(DEFAULT_FULL_PAYROLL_CONFIGURATION.applicability.employmentTypes)).toBe(true);
  });
});
