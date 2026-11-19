import { createHash } from "crypto";
import { z } from "zod";

export const SCALE = 10_000n;
export const MAX_FORMULA_AST_DEPTH = 10;
export const MAX_FORMULA_AST_NODES = 50;

export function toDecimalUnits(value: string | number): bigint {
  const str = typeof value === "number" ? value.toFixed(4) : value.trim();
  const negative = str.startsWith("-");
  const unsigned = negative ? str.slice(1) : str;
  const [whole, fraction = ""] = unsigned.split(".");
  const scaledWhole = BigInt(whole || "0") * SCALE;
  const scaledFraction = BigInt(fraction.slice(0, 4).padEnd(4, "0"));
  const result = scaledWhole + scaledFraction;
  return negative ? -result : result;
}

export function fromDecimalUnits(value: bigint): string {
  const sign = value < 0n ? "-" : "";
  const absolute = value < 0n ? -value : value;
  const whole = absolute / SCALE;
  const remainder = absolute % SCALE;
  const fraction = String(remainder).padStart(4, "0").replace(/0+$/, "");
  return `${sign}${whole}${fraction ? `.${fraction}` : ".00"}`;
}

export const ALLOWED_FORMULA_VARIABLES = [
  "basicSalary",
  "monthlyRate",
  "dailyRate",
  "hourlyRate",
  "unitRate",
  "regularHours",
  "overtimeHours",
  "restDayHours",
  "restDayOvertimeHours",
  "specialHolidayHours",
  "specialHolidayOvertimeHours",
  "regularHolidayHours",
  "regularHolidayOvertimeHours",
  "nightDifferentialHours",
  "daysWorked",
  "absentDays",
  "lateMinutes",
  "undertimeMinutes",
  "unitsProduced",
  "grossPay",
  "taxableCompensation",
  "totalMandatoryContributions",
  "employerTotalContributions",
  "qualifyingAnnualBasic",
  "minCap",
  "maxCap",
  "multiplier",
  "percentageRate",
  "tenureMonths",
  "tenureYears",
  "standardDailyDivisor",
  "standardHourlyDivisor",
] as const;

export type FormulaVariable = (typeof ALLOWED_FORMULA_VARIABLES)[number];

export const formulaAstSchema: z.ZodType<FormulaAstNode> = z.lazy(() =>
  z.union([
    z.object({
      type: z.literal("literal"),
      value: z.union([z.string(), z.number()]),
    }),
    z.object({
      type: z.literal("variable"),
      name: z.enum(ALLOWED_FORMULA_VARIABLES),
    }),
    z.object({
      type: z.literal("binary"),
      operator: z.enum(["+", "-", "*", "/"]),
      left: formulaAstSchema,
      right: formulaAstSchema,
    }),
    z.object({
      type: z.literal("function"),
      fn: z.enum(["min", "max", "clamp", "round", "floor", "ceil", "abs"]),
      args: z.array(formulaAstSchema),
    }),
    z.object({
      type: z.literal("bracket_lookup"),
      inputVariable: z.enum(ALLOWED_FORMULA_VARIABLES),
      brackets: z.array(
        z.object({
          min: z.string(),
          max: z.string().nullable(),
          baseAmount: z.string(),
          rate: z.string(),
          excessOver: z.string(),
        }),
      ),
    }),
    z.object({
      type: z.literal("conditional"),
      condition: z.object({
        left: formulaAstSchema,
        operator: z.enum(["==", "!=", "<", "<=", ">", ">="]),
        right: formulaAstSchema,
      }),
      then: formulaAstSchema,
      else: formulaAstSchema,
    }),
  ]),
);

export type FormulaAstNode =
  | { type: "literal"; value: string | number }
  | { type: "variable"; name: FormulaVariable }
  | { type: "binary"; operator: "+" | "-" | "*" | "/"; left: FormulaAstNode; right: FormulaAstNode }
  | {
      type: "function";
      fn: "min" | "max" | "clamp" | "round" | "floor" | "ceil" | "abs";
      args: FormulaAstNode[];
    }
  | {
      type: "bracket_lookup";
      inputVariable: FormulaVariable;
      brackets: Array<{
        min: string;
        max: string | null;
        baseAmount: string;
        rate: string;
        excessOver: string;
      }>;
    }
  | {
      type: "conditional";
      condition: {
        left: FormulaAstNode;
        operator: "==" | "!=" | "<" | "<=" | ">" | ">=";
        right: FormulaAstNode;
      };
      then: FormulaAstNode;
      else: FormulaAstNode;
    };

export class FormulaEvaluationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FormulaEvaluationError";
  }
}

/**
 * Validates AST tree depth and node count against explicit calculation limits.
 */
export function validateFormulaAstLimits(
  node: FormulaAstNode,
  depth = 1,
): number {
  if (depth > MAX_FORMULA_AST_DEPTH) {
    throw new FormulaEvaluationError(
      `Formula exceeds maximum AST depth of ${MAX_FORMULA_AST_DEPTH}`,
    );
  }

  let count = 1;
  switch (node.type) {
    case "literal":
    case "variable":
    case "bracket_lookup":
      break;
    case "binary":
      count += validateFormulaAstLimits(node.left, depth + 1);
      count += validateFormulaAstLimits(node.right, depth + 1);
      break;
    case "function":
      for (const arg of node.args) {
        count += validateFormulaAstLimits(arg, depth + 1);
      }
      break;
    case "conditional":
      count += validateFormulaAstLimits(node.condition.left, depth + 1);
      count += validateFormulaAstLimits(node.condition.right, depth + 1);
      count += validateFormulaAstLimits(node.then, depth + 1);
      count += validateFormulaAstLimits(node.else, depth + 1);
      break;
  }

  if (count > MAX_FORMULA_AST_NODES) {
    throw new FormulaEvaluationError(
      `Formula exceeds maximum node limit of ${MAX_FORMULA_AST_NODES} (found ${count})`,
    );
  }

  return count;
}

/**
 * Validates formula dependency graph and rejects circular dependencies or unknown references.
 */
export function validateFormulaDependencies(
  graph: Record<string, { formula?: FormulaAstNode; dependencies?: string[] }>,
): void {
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(key: string, path: string[]) {
    if (inStack.has(key)) {
      throw new FormulaEvaluationError(
        `Circular dependency detected in formula: ${[...path, key].join(" -> ")}`,
      );
    }
    if (visited.has(key)) return;

    visited.add(key);
    inStack.add(key);

    const deps = graph[key]?.dependencies ?? [];
    for (const dep of deps) {
      if (!graph[dep]) {
        throw new FormulaEvaluationError(
          `Formula "${key}" references unknown dependency "${dep}"`,
        );
      }
      dfs(dep, [...path, key]);
    }

    inStack.delete(key);
  }

  for (const key of Object.keys(graph)) {
    dfs(key, []);
  }
}

/**
 * Deterministic, decimal-safe AST expression evaluator.
 * Never executes eval, Function, or unrestricted code.
 */
export function evaluateFormulaAst(
  node: FormulaAstNode,
  context: Partial<Record<FormulaVariable, string | number>>,
): bigint {
  switch (node.type) {
    case "literal":
      return toDecimalUnits(node.value);

    case "variable": {
      const val = context[node.name];
      if (val === undefined || val === null) {
        return 0n;
      }
      return toDecimalUnits(val);
    }

    case "binary": {
      const left = evaluateFormulaAst(node.left, context);
      const right = evaluateFormulaAst(node.right, context);

      switch (node.operator) {
        case "+":
          return left + right;
        case "-":
          return left - right;
        case "*":
          return (left * right) / SCALE;
        case "/":
          if (right === 0n) {
            throw new FormulaEvaluationError("Division by zero in formula evaluation");
          }
          return (left * SCALE) / right;
      }
      break;
    }

    case "function": {
      const evaluatedArgs = node.args.map((arg) => evaluateFormulaAst(arg, context));
      switch (node.fn) {
        case "min":
          if (evaluatedArgs.length === 0) return 0n;
          return evaluatedArgs.reduce((min, val) => (val < min ? val : min));
        case "max":
          if (evaluatedArgs.length === 0) return 0n;
          return evaluatedArgs.reduce((max, val) => (val > max ? val : max));
        case "abs":
          if (evaluatedArgs.length === 0) return 0n;
          return evaluatedArgs[0] < 0n ? -evaluatedArgs[0] : evaluatedArgs[0];
        case "clamp": {
          if (evaluatedArgs.length < 3) {
            throw new FormulaEvaluationError("clamp expects 3 arguments: val, min, max");
          }
          const [val, min, max] = evaluatedArgs;
          if (val < min) return min;
          if (val > max) return max;
          return val;
        }
        case "round":
        case "floor":
        case "ceil":
          return evaluatedArgs[0] ?? 0n;
      }
      break;
    }

    case "bracket_lookup": {
      const inputVal = toDecimalUnits(context[node.inputVariable] ?? "0");
      for (const bracket of node.brackets) {
        const minUnits = toDecimalUnits(bracket.min);
        const maxUnits = bracket.max !== null ? toDecimalUnits(bracket.max) : null;

        if (inputVal >= minUnits && (maxUnits === null || inputVal <= maxUnits)) {
          const base = toDecimalUnits(bracket.baseAmount);
          const rate = toDecimalUnits(bracket.rate);
          const excessOver = toDecimalUnits(bracket.excessOver);
          const excess = inputVal > excessOver ? inputVal - excessOver : 0n;
          const variablePortion = (excess * rate) / SCALE;
          return base + variablePortion;
        }
      }
      return 0n;
    }

    case "conditional": {
      const leftVal = evaluateFormulaAst(node.condition.left, context);
      const rightVal = evaluateFormulaAst(node.condition.right, context);
      let conditionMet = false;

      switch (node.condition.operator) {
        case "==":
          conditionMet = leftVal === rightVal;
          break;
        case "!=":
          conditionMet = leftVal !== rightVal;
          break;
        case "<":
          conditionMet = leftVal < rightVal;
          break;
        case "<=":
          conditionMet = leftVal <= rightVal;
          break;
        case ">":
          conditionMet = leftVal > rightVal;
          break;
        case ">=":
          conditionMet = leftVal >= rightVal;
          break;
      }

      return conditionMet
        ? evaluateFormulaAst(node.then, context)
        : evaluateFormulaAst(node.else, context);
    }
  }
}

/**
 * Approved Calculation Methods supported by the Controlled Formula Engine
 */
export type ApprovedCalculationMethod =
  | "FixedAmount"
  | "Percentage"
  | "HourlyCalculation"
  | "DailyCalculation"
  | "PerUnitCalculation"
  | "TieredTable"
  | "StatutoryTable"
  | "ProratedSalary"
  | "BenefitAccrual"
  | "EmployerPaidContribution"
  | "SharedContribution"
  | "CappedMinMax"
  | "EligibilityBased"
  | "Formula";

export interface CalculationMethodParams {
  fixedAmount?: string;
  percentageRate?: string; // e.g. "0.05"
  baseVariable?: FormulaVariable;
  hourlyMultiplier?: string; // e.g. "1.25"
  unitRate?: string;
  minCap?: string;
  maxCap?: string;
  employerShareRate?: string;
  employeeShareRate?: string;
  eligibilityVariable?: FormulaVariable;
  eligibilityThreshold?: string;
  eligibilityOperator?: ">=" | ">" | "<=" | "<" | "==";
  annualDivisor?: string; // e.g. "12"
  brackets?: Array<{
    min: string;
    max: string | null;
    baseAmount: string;
    rate: string;
    excessOver: string;
  }>;
  customAst?: FormulaAstNode;
}

/**
 * Compiles an approved high-level calculation method into an executable AST representation.
 */
export function compileCalculationMethodToAst(
  method: ApprovedCalculationMethod,
  params: CalculationMethodParams,
): FormulaAstNode {
  switch (method) {
    case "FixedAmount":
      return { type: "literal", value: params.fixedAmount ?? "0.00" };

    case "Percentage": {
      const base: FormulaAstNode = {
        type: "variable",
        name: params.baseVariable ?? "basicSalary",
      };
      const rate: FormulaAstNode = {
        type: "literal",
        value: params.percentageRate ?? "0.00",
      };
      return { type: "binary", operator: "*", left: base, right: rate };
    }

    case "HourlyCalculation": {
      const hourlyRate: FormulaAstNode = { type: "variable", name: "hourlyRate" };
      const hours: FormulaAstNode = { type: "variable", name: "regularHours" };
      const mult: FormulaAstNode = {
        type: "literal",
        value: params.hourlyMultiplier ?? "1.00",
      };
      const basePay: FormulaAstNode = {
        type: "binary",
        operator: "*",
        left: hourlyRate,
        right: mult,
      };
      return { type: "binary", operator: "*", left: basePay, right: hours };
    }

    case "DailyCalculation": {
      const dailyRate: FormulaAstNode = { type: "variable", name: "dailyRate" };
      const days: FormulaAstNode = { type: "variable", name: "daysWorked" };
      return { type: "binary", operator: "*", left: dailyRate, right: days };
    }

    case "PerUnitCalculation": {
      const units: FormulaAstNode = { type: "variable", name: "unitsProduced" };
      const rate: FormulaAstNode = {
        type: "literal",
        value: params.unitRate ?? "0.00",
      };
      return { type: "binary", operator: "*", left: units, right: rate };
    }

    case "TieredTable":
    case "StatutoryTable":
      return {
        type: "bracket_lookup",
        inputVariable: params.baseVariable ?? "basicSalary",
        brackets: params.brackets ?? [],
      };

    case "ProratedSalary": {
      const monthlyRate: FormulaAstNode = { type: "variable", name: "basicSalary" };
      const daysWorked: FormulaAstNode = { type: "variable", name: "daysWorked" };
      const divisor: FormulaAstNode = {
        type: "literal",
        value: params.annualDivisor ?? "22",
      };
      const dailyDerived: FormulaAstNode = {
        type: "binary",
        operator: "/",
        left: monthlyRate,
        right: divisor,
      };
      return { type: "binary", operator: "*", left: dailyDerived, right: daysWorked };
    }

    case "BenefitAccrual": {
      const qualifyingAnnual: FormulaAstNode = {
        type: "variable",
        name: params.baseVariable ?? "basicSalary",
      };
      const divisor: FormulaAstNode = {
        type: "literal",
        value: params.annualDivisor ?? "12",
      };
      return { type: "binary", operator: "/", left: qualifyingAnnual, right: divisor };
    }

    case "EmployerPaidContribution": {
      const base: FormulaAstNode = {
        type: "variable",
        name: params.baseVariable ?? "basicSalary",
      };
      const rate: FormulaAstNode = {
        type: "literal",
        value: params.employerShareRate ?? "0.00",
      };
      return { type: "binary", operator: "*", left: base, right: rate };
    }

    case "SharedContribution": {
      const base: FormulaAstNode = {
        type: "variable",
        name: params.baseVariable ?? "basicSalary",
      };
      const eeRate: FormulaAstNode = {
        type: "literal",
        value: params.employeeShareRate ?? "0.00",
      };
      return { type: "binary", operator: "*", left: base, right: eeRate };
    }

    case "CappedMinMax": {
      const base: FormulaAstNode = {
        type: "variable",
        name: params.baseVariable ?? "basicSalary",
      };
      const minVal: FormulaAstNode = {
        type: "literal",
        value: params.minCap ?? "0.00",
      };
      const maxVal: FormulaAstNode = {
        type: "literal",
        value: params.maxCap ?? "99999999.00",
      };
      return {
        type: "function",
        fn: "clamp",
        args: [base, minVal, maxVal],
      };
    }

    case "EligibilityBased": {
      const eligVar: FormulaAstNode = {
        type: "variable",
        name: params.eligibilityVariable ?? "tenureMonths",
      };
      const threshold: FormulaAstNode = {
        type: "literal",
        value: params.eligibilityThreshold ?? "0",
      };
      const thenNode: FormulaAstNode = params.customAst ?? {
        type: "literal",
        value: params.fixedAmount ?? "1000.00",
      };
      const elseNode: FormulaAstNode = { type: "literal", value: "0.00" };
      return {
        type: "conditional",
        condition: {
          left: eligVar,
          operator: params.eligibilityOperator ?? ">=",
          right: threshold,
        },
        then: thenNode,
        else: elseNode,
      };
    }

    case "Formula":
      if (!params.customAst) {
        throw new FormulaEvaluationError("customAst is required when calculationMethod is Formula");
      }
      return params.customAst;
  }
}

export interface FormulaExecutionResult {
  result: string;
  rawUnits: bigint;
  appliedMethod: ApprovedCalculationMethod;
  appliedFormula: FormulaAstNode;
  configVersion: number | string;
  evaluatedVariables: Record<string, string>;
  executionHash: string;
}

/**
 * Executes an approved calculation method or custom AST and generates an audited, traceable result.
 */
export function executeFormula(
  methodOrAst: ApprovedCalculationMethod | FormulaAstNode,
  paramsOrAst: CalculationMethodParams | null,
  context: Partial<Record<FormulaVariable, string | number>>,
  configVersion: number | string = 1,
): FormulaExecutionResult {
  let ast: FormulaAstNode;
  let method: ApprovedCalculationMethod;

  if (typeof methodOrAst === "string") {
    method = methodOrAst;
    ast = compileCalculationMethodToAst(method, paramsOrAst ?? {});
  } else {
    method = "Formula";
    ast = methodOrAst;
  }

  // Enforce safety limits
  validateFormulaAstLimits(ast);

  // Evaluate safely
  const rawUnits = evaluateFormulaAst(ast, context);
  const result = fromDecimalUnits(rawUnits);

  // Capture context snapshot
  const evaluatedVariables: Record<string, string> = {};
  for (const [k, v] of Object.entries(context)) {
    if (v !== undefined && v !== null) {
      evaluatedVariables[k] = String(v);
    }
  }

  // Cryptographic execution seal
  const digestPayload = JSON.stringify({
    configVersion,
    method,
    ast,
    variables: evaluatedVariables,
    result,
  });
  const executionHash = createHash("sha256").update(digestPayload).digest("hex");

  return {
    result,
    rawUnits,
    appliedMethod: method,
    appliedFormula: ast,
    configVersion,
    evaluatedVariables,
    executionHash,
  };
}
