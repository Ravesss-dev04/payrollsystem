import { describe, expect, it } from "bun:test";
import {
  calculateSssContribution,
  calculatePhilHealthContribution,
  calculatePagIbigContribution,
  calculateWithholdingTax,
  PHILIPPINE_DE_MINIMIS_BENEFITS,
  DEFAULT_SSS_BRACKETS,
} from "../../app/lib/payroll/statutory-ph";
import {
  calculateEmployeePayroll,
  DEFAULT_COMPANY_PAYROLL_POLICY,
} from "../../app/lib/payroll/calculator";
import {
  toDecimalUnits,
  fromDecimalUnits,
} from "../../app/lib/payroll/formula-engine";

describe("Task 23: Boundary and Statutory Limits Tests", () => {
  describe("23.1 Statutory Contribution Min/Max Boundaries", () => {
    it("tests SSS contribution floor (minimum MSC ₱4,000 / below floor)", () => {
      // Salaries below the minimum MSC must be placed in the lowest bracket
      const lowResult = calculateSssContribution("2500.00");
      expect(lowResult.employeeShare).toBe("180.00");
      expect(lowResult.employerShare).toBe("390.00");
      expect(Number(lowResult.ecShare)).toBe(10);
    });

    it("tests SSS contribution ceiling (maximum MSC ₱35,000+ / above ceiling)", () => {
      // Salaries above the maximum bracket (e.g. ₱200,000) must cap at highest bracket
      const highResult = calculateSssContribution("200000.00");
      expect(Number(highResult.employeeShare)).toBeGreaterThanOrEqual(1500);
      expect(Number(highResult.employerShare)).toBeGreaterThanOrEqual(3000);
      expect(Number(highResult.ecShare)).toBe(30);

      // Total regular + MPF caps according to highest bracket
      const topBracket = DEFAULT_SSS_BRACKETS[DEFAULT_SSS_BRACKETS.length - 1];
      expect(highResult.employeeShare).toBe(topBracket.totalEmployee);
      expect(highResult.employerShare).toBe(topBracket.totalEmployer);
    });

    it("tests PhilHealth contribution floor (minimum compensation ₱10,000)", () => {
      // Any salary <= ₱10,000 pays the floor: 5% of ₱10,000 = ₱500 total (₱250 EE, ₱250 ER)
      const floorResult = calculatePhilHealthContribution("5000.00");
      expect(floorResult.employeeShare).toBe("250.00");
      expect(floorResult.employerShare).toBe("250.00");
      expect(floorResult.total).toBe("500.00");

      const exactFloorResult = calculatePhilHealthContribution("10000.00");
      expect(exactFloorResult.employeeShare).toBe("250.00");
      expect(exactFloorResult.employerShare).toBe("250.00");
    });

    it("tests PhilHealth contribution ceiling (maximum compensation ₱100,000)", () => {
      // Any salary >= ₱100,000 caps at 5% of ₱100,000 = ₱5,000 total (₱2,500 EE, ₱2,500 ER)
      const exactCeilingResult = calculatePhilHealthContribution("100000.00");
      expect(exactCeilingResult.employeeShare).toBe("2500.00");
      expect(exactCeilingResult.employerShare).toBe("2500.00");
      expect(exactCeilingResult.total).toBe("5000.00");

      const aboveCeilingResult = calculatePhilHealthContribution("350000.00");
      expect(aboveCeilingResult.employeeShare).toBe("2500.00");
      expect(aboveCeilingResult.employerShare).toBe("2500.00");
      expect(aboveCeilingResult.total).toBe("5000.00");
    });

    it("tests Pag-IBIG mandatory compensation cap (₱10,000 salary cap / ₱200 EE max)", () => {
      // For salary ₱5,000: 2% = ₱100 EE, ₱100 ER
      const lowResult = calculatePagIbigContribution("5000.00");
      expect(lowResult.employeeShare).toBe("100.00");
      expect(lowResult.employerShare).toBe("100.00");

      // For salary ₱10,000: 2% = ₱200 EE, ₱200 ER
      const capResult = calculatePagIbigContribution("10000.00");
      expect(capResult.employeeShare).toBe("200.00");
      expect(capResult.employerShare).toBe("200.00");

      // For salary ₱100,000: capped at ₱10,000 -> ₱200 EE, ₱200 ER
      const highResult = calculatePagIbigContribution("100000.00");
      expect(highResult.employeeShare).toBe("200.00");
      expect(highResult.employerShare).toBe("200.00");
    });
  });

  describe("23.2 TRAIN Law Tax Brackets Coverage", () => {
    it("tests Bracket 1: ₱0 to ₱20,833 (Tax-exempt)", () => {
      expect(calculateWithholdingTax("0.00")).toBe("0.00");
      expect(calculateWithholdingTax("15000.00")).toBe("0.00");
      expect(calculateWithholdingTax("20833.00")).toBe("0.00");
    });

    it("tests Bracket 2: ₱20,833.01 to ₱33,333.00 (15% in excess of ₱20,833)", () => {
      // ₱25,000: 15% * (25000 - 20833) = 15% * 4167 = 625.05
      const tax25k = calculateWithholdingTax("25000.00");
      expect(Number(tax25k)).toBeCloseTo(625.05, 1);

      // ₱30,000 reference fixture: taxable ₱27,550 -> 15% * (27550 - 20833) = 1007.55
      const taxRef = calculateWithholdingTax("27550.00");
      expect(taxRef).toBe("1007.55");
    });

    it("tests Bracket 3: ₱33,333.01 to ₱66,666.66 (₱1,875.00 + 20% in excess of ₱33,333.33)", () => {
      // ₱50,000: ₱1,875 + 20% * (50000 - 33333.33)
      const tax50k = calculateWithholdingTax("50000.00");
      expect(Number(tax50k)).toBeCloseTo(5208.33, 1);
    });

    it("tests Bracket 4: ₱66,666.67 to ₱166,666.66 (₱8,541.67 + 25% in excess of ₱66,666.67)", () => {
      // ₱100,000: ₱8,541.67 + 25% * (100000 - 66666.67)
      const tax100k = calculateWithholdingTax("100000.00");
      expect(Number(tax100k)).toBeCloseTo(16875.00, 1);
    });

    it("tests Bracket 5: ₱166,666.67 to ₱666,666.66 (₱33,541.67 + 30% in excess of ₱166,666.67)", () => {
      // ₱300,000: ₱33,541.67 + 30% * (300000 - 166666.67)
      const tax300k = calculateWithholdingTax("300000.00");
      expect(Number(tax300k)).toBeCloseTo(73541.67, 1);
    });

    it("tests Bracket 6: Above ₱666,666.67 (₱183,541.67 + 35% in excess of ₱666,666.67)", () => {
      const tax1m = calculateWithholdingTax("1000000.00");
      expect(Number(tax1m)).toBeGreaterThan(300000);
    });
  });

  describe("23.3 De Minimis Ceilings and Benefit Boundaries", () => {
    it("verifies BIR RR 11-2018 statutory de minimis ceilings", () => {
      const rice = PHILIPPINE_DE_MINIMIS_BENEFITS.find((b) => b.code === "RICE_SUBSIDY");
      expect(rice?.maxTaxExemptAmount).toBe("2000.00");
      expect(rice?.frequency).toBe("Monthly");

      const clothing = PHILIPPINE_DE_MINIMIS_BENEFITS.find((b) => b.code === "CLOTHING_ALLOWANCE");
      expect(clothing?.maxTaxExemptAmount).toBe("6000.00");
      expect(clothing?.frequency).toBe("Annual");

      const medical = PHILIPPINE_DE_MINIMIS_BENEFITS.find((b) => b.code === "ACTUAL_MEDICAL_ASSISTANCE");
      expect(medical?.maxTaxExemptAmount).toBe("10000.00");
      expect(medical?.frequency).toBe("Annual");
    });
  });

  describe("23.4 Overtime and Premium Classifications", () => {
    it("verifies accurate calculation of all statutory overtime and premium rates", () => {
      const policy = {
        ...DEFAULT_COMPANY_PAYROLL_POLICY,
        regularOvertimeRate: "1.25",
        restDayRate: "1.30",
        specialHolidayRate: "1.30",
        regularHolidayRate: "2.00",
        nightDifferentialRate: "0.10",
      };

      const result = calculateEmployeePayroll(
        {
          employeeId: "emp-rates",
          employeeNumber: "00050",
          employeeName: "Rate Boundary Employee",
          department: "Ops",
          compensationBasis: "Hourly",
          applicableRate: "100.00",
          regularHours: "40",
          overtimeHours: "10", // 10 * 100 * 1.25 = 1250.00
          nightDifferentialHours: "10", // 10 * 100 * 0.10 = 100.00
          restDayHours: "8", // 8 * 100 * 1.30 = 1040.00
          specialHolidayHours: "8", // 8 * 100 * 1.30 = 1040.00
          regularHolidayHours: "8", // 8 * 100 * 2.00 = 1600.00
        },
        policy,
      );

      // Basic regular = 40 * 100 = 4000.00
      expect(result.trace.overtimePay).toBe("1250.00");
      expect(result.trace.nightDifferentialPay).toBe("100.00");
      // Holiday premium total = 1040 + 1040 + 1600 = 3680.00
      expect(result.trace.holidayPremiumPay).toBe("3680.00");
      // Total gross = 4000 + 1250 + 100 + 3680 = 9030.00
      expect(result.grossPay).toBe("9030.00");
    });
  });

  describe("23.5 Precision and Fixed-Point Arithmetic", () => {
    it("preserves exact precision without floating point drift", () => {
      const val1 = toDecimalUnits("0.01");
      const val2 = toDecimalUnits("0.02");
      expect(fromDecimalUnits(val1 + val2)).toBe("0.03");

      // Fixed point scale factor is 10,000n (4 decimals)
      const exactUnit = toDecimalUnits("1234.5678");
      expect(fromDecimalUnits(exactUnit)).toBe("1234.5678");
    });
  });
});
