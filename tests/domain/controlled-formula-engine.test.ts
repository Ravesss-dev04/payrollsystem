import { describe, expect, it } from "bun:test";
import {
  formulaAstSchema,
  evaluateFormulaAst,
  compileCalculationMethodToAst,
  executeFormula,
  validateFormulaAstLimits,
  validateFormulaDependencies,
  FormulaEvaluationError,
  toDecimalUnits,
  fromDecimalUnits,
  type FormulaAstNode,
} from "../../app/lib/payroll/formula-engine";

describe("Task 13: Controlled Formula Engine", () => {
  it("rejects unknown variables, arbitrary functions, and unrestricted code representations", () => {
    // Unknown variable rejection
    const invalidVarAst = {
      type: "variable",
      name: "maliciousGlobalOrWindow",
    };
    expect(formulaAstSchema.safeParse(invalidVarAst).success).toBe(false);

    // Unsupported arbitrary function (e.g. eval, require, fetch)
    const invalidFnAst = {
      type: "function",
      fn: "eval",
      args: [{ type: "literal", value: "console.log('pwned')" }],
    };
    expect(formulaAstSchema.safeParse(invalidFnAst).success).toBe(false);

    // Disallowed operator (e.g. bitwise or assignment)
    const invalidOpAst = {
      type: "binary",
      operator: "=",
      left: { type: "literal", value: "100" },
      right: { type: "literal", value: "200" },
    };
    expect(formulaAstSchema.safeParse(invalidOpAst).success).toBe(false);
  });

  it("evaluates all approved calculation methods accurately and deterministically", () => {
    // 1. Fixed Amount
    const fixedRes = executeFormula("FixedAmount", { fixedAmount: "2500.00" }, {}, 1);
    expect(fixedRes.result).toBe("2500.00");
    expect(fixedRes.configVersion).toBe(1);

    // 2. Percentage (e.g., 5% of basic salary)
    const pctRes = executeFormula(
      "Percentage",
      { baseVariable: "basicSalary", percentageRate: "0.05" },
      { basicSalary: "30000.00" },
      "v2.1",
    );
    expect(pctRes.result).toBe("1500.00");
    expect(pctRes.configVersion).toBe("v2.1");

    // 3. Hourly Calculation (hourlyRate * hours * multiplier)
    const hourlyRes = executeFormula(
      "HourlyCalculation",
      { hourlyMultiplier: "1.25" },
      { hourlyRate: "170.4545", regularHours: "10" },
      1,
    );
    // 170.4545 * 1.25 * 10 = 2130.6812 -> 2130.6812
    expect(Number(hourlyRes.result)).toBeCloseTo(2130.68, 1);

    // 4. Daily Calculation (dailyRate * daysWorked)
    const dailyRes = executeFormula(
      "DailyCalculation",
      {},
      { dailyRate: "800.00", daysWorked: "20" },
      1,
    );
    expect(dailyRes.result).toBe("16000.00");

    // 5. Per-Unit Calculation (unitsProduced * unitRate)
    const perUnitRes = executeFormula(
      "PerUnitCalculation",
      { unitRate: "15.50" },
      { unitsProduced: "200" },
      1,
    );
    expect(perUnitRes.result).toBe("3100.00");

    // 6. Tiered / Statutory Table Lookup
    const tableRes = executeFormula(
      "TieredTable",
      {
        baseVariable: "taxableCompensation",
        brackets: [
          { min: "0.00", max: "20833.00", baseAmount: "0.00", rate: "0.00", excessOver: "0.00" },
          { min: "20833.01", max: "33333.00", baseAmount: "0.00", rate: "0.15", excessOver: "20833.00" },
        ],
      },
      { taxableCompensation: "27550.00" },
      1,
    );
    // 15% * (27550 - 20833) = 1007.55
    expect(tableRes.result).toBe("1007.55");

    // 7. Prorated Salary (basicSalary / 22 * daysWorked)
    const proratedRes = executeFormula(
      "ProratedSalary",
      { annualDivisor: "22" },
      { basicSalary: "44000.00", daysWorked: "11" },
      1,
    );
    expect(proratedRes.result).toBe("22000.00");

    // 8. Benefit Accrual (qualifyingBasic / 12)
    const accrualRes = executeFormula(
      "BenefitAccrual",
      { baseVariable: "qualifyingAnnualBasic", annualDivisor: "12" },
      { qualifyingAnnualBasic: "360000.00" },
      1,
    );
    expect(accrualRes.result).toBe("30000.00");

    // 9. Employer-Paid Contribution
    const erRes = executeFormula(
      "EmployerPaidContribution",
      { baseVariable: "basicSalary", employerShareRate: "0.095" },
      { basicSalary: "30000.00" },
      1,
    );
    expect(erRes.result).toBe("2850.00");

    // 10. Shared Contribution (Employee Portion)
    const eeRes = executeFormula(
      "SharedContribution",
      { baseVariable: "basicSalary", employeeShareRate: "0.045" },
      { basicSalary: "30000.00" },
      1,
    );
    expect(eeRes.result).toBe("1350.00");

    // 11. Capped Min/Max (Clamp)
    const cappedRes = executeFormula(
      "CappedMinMax",
      { baseVariable: "basicSalary", minCap: "10000.00", maxCap: "100000.00" },
      { basicSalary: "150000.00" },
      1,
    );
    expect(cappedRes.result).toBe("100000.00");

    // 12. Eligibility-Based Calculation (Tenure >= 12 months gets 5000 bonus, else 0)
    const eligibleRes = executeFormula(
      "EligibilityBased",
      {
        eligibilityVariable: "tenureMonths",
        eligibilityOperator: ">=",
        eligibilityThreshold: "12",
        fixedAmount: "5000.00",
      },
      { tenureMonths: "18" },
      1,
    );
    expect(eligibleRes.result).toBe("5000.00");

    const notEligibleRes = executeFormula(
      "EligibilityBased",
      {
        eligibilityVariable: "tenureMonths",
        eligibilityOperator: ">=",
        eligibilityThreshold: "12",
        fixedAmount: "5000.00",
      },
      { tenureMonths: "6" },
      1,
    );
    expect(notEligibleRes.result).toBe("0.00");
  });

  it("enforces explicit calculation limits: max AST depth and node counts", () => {
    // Generate an AST that exceeds MAX_FORMULA_AST_DEPTH (10)
    let deepNode: FormulaAstNode = { type: "literal", value: "1.00" };
    for (let i = 0; i < 12; i++) {
      deepNode = {
        type: "binary",
        operator: "+",
        left: deepNode,
        right: { type: "literal", value: "1.00" },
      };
    }

    expect(() => validateFormulaAstLimits(deepNode)).toThrow(FormulaEvaluationError);
    expect(() => executeFormula(deepNode, null, {})).toThrow(FormulaEvaluationError);
  });

  it("detects and rejects circular dependencies and unknown references in formula dependency graphs", () => {
    // Circular: A -> B -> C -> A
    const circularGraph = {
      formulaA: { dependencies: ["formulaB"] },
      formulaB: { dependencies: ["formulaC"] },
      formulaC: { dependencies: ["formulaA"] },
    };
    expect(() => validateFormulaDependencies(circularGraph)).toThrow(/Circular dependency detected/);

    // Unknown reference: X -> nonExistent
    const missingGraph = {
      formulaX: { dependencies: ["nonExistentFormula"] },
    };
    expect(() => validateFormulaDependencies(missingGraph)).toThrow(/unknown dependency/);

    // Valid DAG: A -> B, C -> B, B -> D
    const validGraph = {
      formulaD: { dependencies: [] },
      formulaB: { dependencies: ["formulaD"] },
      formulaA: { dependencies: ["formulaB"] },
      formulaC: { dependencies: ["formulaB"] },
    };
    expect(() => validateFormulaDependencies(validGraph)).not.toThrow();
  });

  it("performs decimal-safe operations and generates audit trace hashes", () => {
    // Ensure precision on 0.1 + 0.2 without floating-point precision drift
    const ast: FormulaAstNode = {
      type: "binary",
      operator: "+",
      left: { type: "literal", value: "0.10" },
      right: { type: "literal", value: "0.20" },
    };

    const res = executeFormula(ast, null, {}, "v1.0.0");
    expect(res.result).toBe("0.3");
    expect(res.rawUnits).toBe(3000n); // exactly 0.3000 * 10000
    expect(res.executionHash).toBeDefined();
    expect(res.executionHash.length).toBe(64); // SHA-256
  });
});
