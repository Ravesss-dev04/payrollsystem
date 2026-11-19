import { describe, expect, it } from "bun:test";
import {
  calculateEmployeePayroll,
  DEFAULT_COMPANY_PAYROLL_POLICY,
  PAYROLL_CALCULATION_ENGINE_VERSION,
} from "../../app/lib/payroll/calculator";
import {
  calculateSssContribution,
  calculatePhilHealthContribution,
  calculatePagIbigContribution,
  calculateWithholdingTax,
  PHILIPPINE_DE_MINIMIS_BENEFITS,
  PHILIPPINE_STATUTORY_LEAVE_ENTITLEMENTS,
  PHILIPPINE_STATUTORY_LEGAL_REFERENCES,
} from "../../app/lib/payroll/statutory-ph";
import {
  PHILIPPINE_REFERENCE_PAYROLL_RULESET,
  SAMPLE_PH_REFERENCE_EMPLOYEE,
  EXPECTED_PH_REFERENCE_CALCULATION,
} from "../../app/lib/payroll/ph-reference-fixture";
import {
  evaluateFormulaAst,
  toDecimalUnits,
  fromDecimalUnits,
} from "../../app/lib/payroll/formula-engine";

describe("Task 11: Centralized Payroll Calculation Foundation", () => {
  it("matches the exact Task 11.2 Philippine reference employee fixture", () => {
    // Sample employee assumptions:
    // Monthly basic salary: ₱30,000.00
    // Full monthly payroll period
    // Applicable SSS, PhilHealth, and Pag-IBIG coverage
    // No overtime, no holiday, no night diff, no allowances, no additional deductions
    const result = calculateEmployeePayroll({
      employeeId: "emp-sample-1",
      employeeNumber: "00030",
      employeeName: "Sample PH Reference Employee",
      department: "Operations",
      compensationBasis: "Monthly",
      applicableRate: "30000.00",
      daysWorked: "22",
      regularHours: "176",
      overtimeHours: "0",
    });

    // Earnings
    expect(result.grossPay).toBe("30000.00");

    // Employee Deductions
    // SSS EE: ₱1,500.00
    // PhilHealth EE: ₱750.00
    // Pag-IBIG EE: ₱200.00
    // Mandatory contributions: ₱2,450.00
    // Taxable regular compensation = ₱30,000 - ₱2,450 = ₱27,550
    // Withholding tax = 15% × (₱27,550 - ₱20,833) = ₱1,007.55
    // Total deductions = ₱3,457.55
    // Net pay = ₱26,542.45
    expect(result.deductions).toContainEqual({
      category: "SSS",
      label: "SSS Contribution (Employee Share)",
      amount: "1500.00",
      sourceReference: "DED-SSS-00030",
    });
    expect(result.deductions).toContainEqual({
      category: "PhilHealth",
      label: "PhilHealth Contribution (Employee Share)",
      amount: "750.00",
      sourceReference: "DED-PH-00030",
    });
    expect(result.deductions).toContainEqual({
      category: "Pag-IBIG",
      label: "Pag-IBIG Contribution (Employee Share)",
      amount: "200.00",
      sourceReference: "DED-HDMF-00030",
    });
    expect(result.deductions).toContainEqual({
      category: "WithholdingTax",
      label: "BIR Withholding Tax",
      amount: "1007.55",
      sourceReference: "DED-TAX-00030",
    });

    expect(result.totalDeductions).toBe("3457.55");
    expect(result.netPay).toBe("26542.45");

    // Employer Contributions
    // SSS ER + EC: ₱3,030.00
    // PhilHealth ER: ₱750.00
    // Pag-IBIG ER: ₱200.00
    // Total ER contributions: ₱3,980.00
    expect(result.employerContributions).toBe("3980.00");

    // 13th-Month Pay Accrual
    // Monthly accrual: ₱30,000 / 12 = ₱2,500.00
    // Must be separate from net pay, not deducted from take-home compensation
    expect(result.thirteenthMonthAccrual).toBe("2500.00");

    // Traceability
    expect(result.trace.engineVersion).toBe(PAYROLL_CALCULATION_ENGINE_VERSION);
    expect(result.trace.statutoryCalculations.birTax).toBe("1007.55");
    expect(result.trace.statutoryCalculations.sssEmployee).toBe("1500.00");
    expect(result.trace.statutoryCalculations.sssEmployer).toBe("3030.00");
  });

  it("calculates overtime, night differential, and holiday premiums correctly", () => {
    // Daily divisor 261, daily to hourly 8 -> hourly rate = 30000 * 12 / 261 / 8
    // With monthlyToDailyDivisor: "22", dailyToHourly: "8" -> daily = 1363.6363, hourly = 170.4545
    const policy = {
      ...DEFAULT_COMPANY_PAYROLL_POLICY,
      monthlyToDailyDivisor: "22",
      dailyToHourlyDivisor: "8",
    };

    const result = calculateEmployeePayroll(
      {
        employeeId: "emp-ot",
        employeeNumber: "00031",
        employeeName: "Overtime Employee",
        department: "Engineering",
        compensationBasis: "Monthly",
        applicableRate: "30000.00",
        overtimeHours: "10",
        nightDifferentialHours: "5",
        restDayHours: "8",
      },
      policy,
    );

    // Hourly rate = 30000 / 22 / 8 = 170.4545...
    // 10 hrs OT @ 1.25 = 10 * 170.4545 * 1.25 = 2130.68
    // 5 hrs ND @ 0.10 = 5 * 170.4545 * 0.10 = 85.22
    // 8 hrs Rest Day @ 1.30 = 8 * 170.4545 * 1.30 = 1772.72
    expect(Number(result.trace.overtimePay)).toBeGreaterThan(2000);
    expect(Number(result.trace.nightDifferentialPay)).toBeGreaterThan(80);
    expect(Number(result.trace.holidayPremiumPay)).toBeGreaterThan(1700);
    expect(Number(result.grossPay)).toBeGreaterThan(33000);
  });

  it("supports daily-paid and hourly-paid employees", () => {
    const dailyResult = calculateEmployeePayroll({
      employeeId: "emp-daily",
      employeeNumber: "00032",
      employeeName: "Daily Employee",
      department: "Logistics",
      compensationBasis: "Daily",
      applicableRate: "800.00",
      daysWorked: "20",
    });
    // 20 days * 800 = 16000 gross
    expect(dailyResult.grossPay).toBe("16000.00");

    const hourlyResult = calculateEmployeePayroll({
      employeeId: "emp-hourly",
      employeeNumber: "00033",
      employeeName: "Hourly Employee",
      department: "Logistics",
      compensationBasis: "Hourly",
      applicableRate: "100.00",
      regularHours: "160",
    });
    // 160 hrs * 100 = 16000 gross
    expect(hourlyResult.grossPay).toBe("16000.00");
  });

  it("validates the automated Philippine reference fixture against expected values", () => {
    // Run the engine with the standard reference fixture
    const result = calculateEmployeePayroll(SAMPLE_PH_REFERENCE_EMPLOYEE);

    expect(result.grossPay).toBe(EXPECTED_PH_REFERENCE_CALCULATION.grossPay);
    expect(result.netPay).toBe(EXPECTED_PH_REFERENCE_CALCULATION.netPay);
    expect(result.totalDeductions).toBe(EXPECTED_PH_REFERENCE_CALCULATION.deductions.totalDeductions);
    expect(result.employerContributions).toBe(EXPECTED_PH_REFERENCE_CALCULATION.employerContributions.totalEmployerContributions);
    expect(result.thirteenthMonthAccrual).toBe(EXPECTED_PH_REFERENCE_CALCULATION.thirteenthMonthPay.monthlyAccrual);

    // Verify reference ruleset contains all required categories and official source references
    expect(PHILIPPINE_REFERENCE_PAYROLL_RULESET.length).toBeGreaterThanOrEqual(10);
    const ruleCodes = PHILIPPINE_REFERENCE_PAYROLL_RULESET.map((r) => r.ruleCode);
    expect(ruleCodes).toContain("BASIC_SALARY");
    expect(ruleCodes).toContain("REGULAR_OVERTIME");
    expect(ruleCodes).toContain("NIGHT_DIFFERENTIAL");
    expect(ruleCodes).toContain("DED_SSS_EE");
    expect(ruleCodes).toContain("DED_PH_EE");
    expect(ruleCodes).toContain("DED_HDMF_EE");
    expect(ruleCodes).toContain("DED_WITHHOLDING_TAX");
    expect(ruleCodes).toContain("ER_SSS");
    expect(ruleCodes).toContain("BENEFIT_13TH_MONTH");

    for (const rule of PHILIPPINE_REFERENCE_PAYROLL_RULESET) {
      expect(rule.effectiveDate).toBeDefined();
      expect(rule.calculationBasis).toBeDefined();
      expect(rule.applicability).toBeDefined();
      expect(rule.sourceReference).toBeDefined();
    }
  });

  it("verifies statutory rule reference schedules, de minimis limits, and legal citations", () => {
    // Official citations
    expect(PHILIPPINE_STATUTORY_LEGAL_REFERENCES.sss.governingAct).toContain("11199");
    expect(PHILIPPINE_STATUTORY_LEGAL_REFERENCES.philHealth.governingAct).toContain("11223");
    expect(PHILIPPINE_STATUTORY_LEGAL_REFERENCES.pagIbig.governingAct).toContain("9679");
    expect(PHILIPPINE_STATUTORY_LEGAL_REFERENCES.withholdingTax.governingAct).toContain("10963");
    expect(PHILIPPINE_STATUTORY_LEGAL_REFERENCES.thirteenthMonthPay.governingAct).toContain("851");

    // De Minimis Limits under BIR RR 11-2018
    const riceSubsidy = PHILIPPINE_DE_MINIMIS_BENEFITS.find((b) => b.code === "RICE_SUBSIDY");
    expect(riceSubsidy?.maxTaxExemptAmount).toBe("2000.00");
    const clothing = PHILIPPINE_DE_MINIMIS_BENEFITS.find((b) => b.code === "CLOTHING_ALLOWANCE");
    expect(clothing?.maxTaxExemptAmount).toBe("6000.00");

    // Statutory Leaves
    const sil = PHILIPPINE_STATUTORY_LEAVE_ENTITLEMENTS.find((l) => l.leaveCode === "SIL");
    expect(sil?.entitlementDays).toBe(5);
    expect(sil?.isPaidByEmployer).toBe(true);
    const maternity = PHILIPPINE_STATUTORY_LEAVE_ENTITLEMENTS.find((l) => l.leaveCode === "MATERNITY");
    expect(maternity?.entitlementDays).toBe(105);
  });

  it("supports proration for partial periods, tardiness, undertime, and leave encashment", () => {
    // Employee with 60 minutes late, 30 minutes undertime, 1 day unpaid absence, and SIL encashment
    const result = calculateEmployeePayroll(
      {
        employeeId: "emp-prorated",
        employeeNumber: "00034",
        employeeName: "Prorated Employee",
        department: "Logistics",
        compensationBasis: "Monthly",
        applicableRate: "26100.00", // at 261 divisor -> daily = 100, hourly = 12.50
        absentDays: "1", // deduct 100.00
        lateMinutes: "60", // 1 hour -> deduct 12.50
        undertimeMinutes: "30", // 0.5 hour -> deduct 6.25
        leaveBenefits: [
          {
            leaveType: "ServiceIncentiveLeave",
            days: "5",
            amount: "500.00",
            isTaxable: false,
          },
        ],
      },
      DEFAULT_COMPANY_PAYROLL_POLICY,
    );

    // Basic pay was 26,100.00 - 100.00 (absent) - 12.5 (late) - 6.25 (undertime) = 25,981.25
    expect(result.trace.proratedBasicPay).toBe("25981.25");
    expect(result.trace.absentDeduction).toBe("100.00");
    expect(result.trace.tardinessDeduction).toBe("12.5");
    expect(result.trace.undertimeDeduction).toBe("6.25");

    // Earnings includes basic salary and leave benefit
    const leaveLine = result.earnings.find((e) => e.category === "Other" && e.label.includes("ServiceIncentiveLeave"));
    expect(leaveLine).toBeDefined();
    expect(leaveLine?.amount).toBe("500.00");

    // Gross pay = 25,981.25 + 500.00 = 26,481.25
    expect(result.grossPay).toBe("26481.25");
  });

  it("generates deterministic SHA-256 calculation trace hashes for auditability", () => {
    const run1 = calculateEmployeePayroll(SAMPLE_PH_REFERENCE_EMPLOYEE);
    const run2 = calculateEmployeePayroll(SAMPLE_PH_REFERENCE_EMPLOYEE);

    expect(run1.trace.traceHash).toBeDefined();
    expect(typeof run1.trace.traceHash).toBe("string");
    expect(run1.trace.traceHash?.length).toBe(64); // SHA-256 hex string

    // Must be completely deterministic across independent runs
    expect(run1.trace.traceHash).toBe(run2.trace.traceHash);
  });
});

describe("Task 13: Controlled Formula Engine", () => {
  it("evaluates mathematical AST expressions safely and deterministically", () => {
    // basicSalary * 1.25
    const ast = {
      type: "binary" as const,
      operator: "*" as const,
      left: { type: "variable" as const, name: "basicSalary" as const },
      right: { type: "literal" as const, value: "1.25" },
    };

    const evaluatedUnits = evaluateFormulaAst(ast, { basicSalary: "20000.00" });
    expect(fromDecimalUnits(evaluatedUnits)).toBe("25000.00");
  });

  it("evaluates bracket lookups deterministically", () => {
    const ast = {
      type: "bracket_lookup" as const,
      inputVariable: "taxableCompensation" as const,
      brackets: [
        {
          min: "0.00",
          max: "20833.00",
          baseAmount: "0.00",
          rate: "0.00",
          excessOver: "0.00",
        },
        {
          min: "20833.01",
          max: "33333.00",
          baseAmount: "0.00",
          rate: "0.15",
          excessOver: "20833.00",
        },
      ],
    };

    const res = evaluateFormulaAst(ast, { taxableCompensation: "27550.00" });
    // 15% * (27550 - 20833) = 15% * 6717 = 1007.55
    expect(fromDecimalUnits(res)).toBe("1007.55");
  });

  it("handles clamp, min, and max functions", () => {
    const clampAst = {
      type: "function" as const,
      fn: "clamp" as const,
      args: [
        { type: "literal" as const, value: "150000.00" },
        { type: "literal" as const, value: "10000.00" },
        { type: "literal" as const, value: "100000.00" },
      ],
    };
    const res = evaluateFormulaAst(clampAst, {});
    expect(fromDecimalUnits(res)).toBe("100000.00");
  });
});
