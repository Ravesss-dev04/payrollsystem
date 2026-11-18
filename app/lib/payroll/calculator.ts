import { createHash } from "crypto";
import { toDecimalUnits, fromDecimalUnits } from "./formula-engine";
import {
  calculateSssContribution,
  calculatePhilHealthContribution,
  calculatePagIbigContribution,
  calculateWithholdingTax,
  PH_PAYROLL_PREMIUM_MULTIPLIERS,
  DEFAULT_PH_STATUTORY_RATES,
  type PhilippineStatutoryRates,
} from "./statutory-ph";

export const PAYROLL_CALCULATION_ENGINE_VERSION = "1.0.0";

export interface CompanyPayrollPolicy {
  monthlyToDailyDivisor: string; // e.g., "261", "313", "22", "26"
  dailyToHourlyDivisor: string; // e.g., "8"
  workingDaysPerWeek: number; // e.g., 5 or 6
  overtimeEnabled: boolean;
  nightDifferentialEnabled: boolean;
  roundingPolicy: "HalfUp" | "Floor" | "Ceil";
  roundingDecimals: number; // usually 2 or 4
}

export const DEFAULT_COMPANY_PAYROLL_POLICY: CompanyPayrollPolicy = {
  monthlyToDailyDivisor: "261",
  dailyToHourlyDivisor: "8",
  workingDaysPerWeek: 5,
  overtimeEnabled: true,
  nightDifferentialEnabled: true,
  roundingPolicy: "HalfUp",
  roundingDecimals: 2,
};

export interface EmployeeCompensationInput {
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  department: string;
  position?: string | null;
  compensationBasis: "Monthly" | "Daily" | "Hourly";
  applicableRate: string; // Rate matching compensationBasis
  daysWorked?: string | null;
  regularHours?: string | null;
  overtimeHours?: string | null;
  restDayHours?: string | null;
  restDayOvertimeHours?: string | null;
  specialHolidayHours?: string | null;
  specialHolidayOvertimeHours?: string | null;
  regularHolidayHours?: string | null;
  regularHolidayOvertimeHours?: string | null;
  nightDifferentialHours?: string | null;
  lateMinutes?: string | null;
  undertimeMinutes?: string | null;
  absentDays?: string | null;

  // Custom Allowances
  allowances?: Array<{
    label: string;
    amount: string;
    isTaxable?: boolean;
    sourceReference?: string;
  }>;

  // Custom Bonuses
  bonuses?: Array<{
    label: string;
    amount: string;
    isTaxable?: boolean;
    sourceReference?: string;
  }>;

  // Company Deductions
  companyDeductions?: Array<{
    category: string;
    label: string;
    amount: string;
    sourceReference?: string;
  }>;

  // Approved Adjustments
  adjustments?: Array<{
    adjustmentReference: string;
    adjustmentType: string;
    amount: string;
    reason: string;
    requestedBy: string;
    approvedBy: string | null;
    approvedAt: string | null;
    status: string;
    isAddition?: boolean; // whether it adds to earnings or deductions
  }>;

  // Benefits
  benefits?: Array<{
    name: string;
    amount: string;
    employerPaidPortion: string;
    employeeFundedPortion: string;
    isTaxable?: boolean;
  }>;

  // Statutory Leave Benefits & encashments
  leaveBenefits?: Array<{
    leaveType: string;
    days: string;
    amount: string;
    isTaxable?: boolean;
    sourceReference?: string;
  }>;

  // Statutory exemptions or custom rates
  statutoryExemptions?: {
    exemptSss?: boolean;
    exemptPhilHealth?: boolean;
    exemptPagIbig?: boolean;
    exemptTax?: boolean;
  };
}

export interface CalculationTrace {
  engineVersion: string;
  compensationBasis: "Monthly" | "Daily" | "Hourly";
  applicableRate: string;
  calculatedDailyRate: string;
  calculatedHourlyRate: string;
  regularBasicPay: string;
  proratedBasicPay: string;
  absentDeduction?: string;
  tardinessDeduction?: string;
  undertimeDeduction?: string;
  overtimePay: string;
  nightDifferentialPay: string;
  holidayPremiumPay: string;
  restDayPremiumPay: string;
  taxableCompensation: string;
  nonTaxableCompensation: string;
  appliedDivisors: {
    monthlyToDaily: string;
    dailyToHourly: string;
  };
  statutoryCalculations: {
    sssEmployee: string;
    sssEmployer: string;
    philHealthEmployee: string;
    philHealthEmployer: string;
    pagIbigEmployee: string;
    pagIbigEmployer: string;
    birTax: string;
  };
  thirteenthMonthAccrual: string;
  traceHash?: string;
}

export interface CalculatedEmployeePayroll {
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  department: string;
  position: string | null;
  compensationBasis: "Monthly" | "Daily" | "Hourly";
  applicableRate: string;
  daysWorked: string;
  regularHours: string;
  overtimeHours: string;

  grossPay: string;
  totalDeductions: string;
  netPay: string;

  employerContributions: string;
  employerPaidBenefits: string;
  thirteenthMonthAccrual: string;

  earnings: Array<{
    category:
      | "BasicPay"
      | "OvertimePay"
      | "NightDifferential"
      | "HolidayPremium"
      | "Allowance"
      | "Bonus"
      | "Adjustment"
      | "Other";
    label: string;
    amount: string;
    sourceReference: string;
    isTaxable: boolean;
  }>;

  deductions: Array<{
    category: string;
    label: string;
    amount: string;
    sourceReference: string;
  }>;

  employerContributionLines: Array<{
    category: string;
    label: string;
    amount: string;
  }>;

  benefitsLines: Array<{
    name: string;
    amount: string;
    employerPaidPortion: string;
    employeeFundedPortion: string;
    accruedAmount: string;
    taxTreatment: "Taxable" | "NonTaxable";
  }>;

  trace: CalculationTrace;
}

export function calculateEmployeePayroll(
  employee: EmployeeCompensationInput,
  policy: CompanyPayrollPolicy = DEFAULT_COMPANY_PAYROLL_POLICY,
  statutoryRates: PhilippineStatutoryRates = DEFAULT_PH_STATUTORY_RATES,
  periodDays: number = 30,
): CalculatedEmployeePayroll {
  const rateUnits = toDecimalUnits(employee.applicableRate);
  const monthlyToDaily = toDecimalUnits(policy.monthlyToDailyDivisor);
  const dailyToHourly = toDecimalUnits(policy.dailyToHourlyDivisor);

  let dailyRateUnits: bigint;
  let hourlyRateUnits: bigint;
  let basicSalaryUnits: bigint;

  if (employee.compensationBasis === "Monthly") {
    basicSalaryUnits = rateUnits;
    dailyRateUnits = (rateUnits * 10_000n) / monthlyToDaily;
    hourlyRateUnits = (dailyRateUnits * 10_000n) / dailyToHourly;
  } else if (employee.compensationBasis === "Daily") {
    dailyRateUnits = rateUnits;
    hourlyRateUnits = (rateUnits * 10_000n) / dailyToHourly;
    basicSalaryUnits = (dailyRateUnits * monthlyToDaily) / 10_000n;
  } else {
    // Hourly
    hourlyRateUnits = rateUnits;
    dailyRateUnits = (rateUnits * dailyToHourly) / 10_000n;
    basicSalaryUnits = (dailyRateUnits * monthlyToDaily) / 10_000n;
  }

  // Basic Pay calculation (full period vs partial proration)
  let basicPayUnits = basicSalaryUnits;
  let absentDeductionUnits = 0n;
  let tardinessDeductionUnits = 0n;
  let undertimeDeductionUnits = 0n;

  if (employee.compensationBasis === "Daily" || employee.compensationBasis === "Hourly") {
    const days = employee.daysWorked ? toDecimalUnits(employee.daysWorked) : 0n;
    const hours = employee.regularHours ? toDecimalUnits(employee.regularHours) : 0n;
    if (employee.compensationBasis === "Hourly") {
      basicPayUnits = (hours * hourlyRateUnits) / 10_000n;
    } else {
      basicPayUnits = (days * dailyRateUnits) / 10_000n;
    }
  } else {
    // Monthly proration: apply unpaid absences, tardiness, and undertime deductions
    if (employee.absentDays && toDecimalUnits(employee.absentDays) > 0n) {
      const absentUnits = toDecimalUnits(employee.absentDays);
      absentDeductionUnits = (absentUnits * dailyRateUnits) / 10_000n;
    }
    if (employee.lateMinutes && toDecimalUnits(employee.lateMinutes) > 0n) {
      const lateMinUnits = toDecimalUnits(employee.lateMinutes);
      tardinessDeductionUnits = (lateMinUnits * hourlyRateUnits) / (60n * 10_000n);
    }
    if (employee.undertimeMinutes && toDecimalUnits(employee.undertimeMinutes) > 0n) {
      const utMinUnits = toDecimalUnits(employee.undertimeMinutes);
      undertimeDeductionUnits = (utMinUnits * hourlyRateUnits) / (60n * 10_000n);
    }
    const totalAttendanceDeductions = absentDeductionUnits + tardinessDeductionUnits + undertimeDeductionUnits;
    basicPayUnits = basicSalaryUnits > totalAttendanceDeductions ? basicSalaryUnits - totalAttendanceDeductions : 0n;
  }

  const earningsLines: CalculatedEmployeePayroll["earnings"] = [
    {
      category: "BasicPay",
      label: "Basic Salary",
      amount: fromDecimalUnits(basicPayUnits),
      sourceReference: `BASIC-${employee.employeeNumber}`,
      isTaxable: true,
    },
  ];

  // Overtime calculations
  let totalOvertimePayUnits = 0n;
  const otHours = employee.overtimeHours ? toDecimalUnits(employee.overtimeHours) : 0n;
  if (otHours > 0n) {
    const otMult = toDecimalUnits(PH_PAYROLL_PREMIUM_MULTIPLIERS.ordinaryOvertime);
    const otPay = ((hourlyRateUnits * otMult) / 10_000n * otHours) / 10_000n;
    totalOvertimePayUnits += otPay;
    earningsLines.push({
      category: "OvertimePay",
      label: "Regular Overtime",
      amount: fromDecimalUnits(otPay),
      sourceReference: `OT-REG-${employee.employeeNumber}`,
      isTaxable: true,
    });
  }

  // Night Differential
  let nightDiffPayUnits = 0n;
  const ndHours = employee.nightDifferentialHours ? toDecimalUnits(employee.nightDifferentialHours) : 0n;
  if (ndHours > 0n) {
    const ndMult = toDecimalUnits(PH_PAYROLL_PREMIUM_MULTIPLIERS.nightDifferential);
    const ndPay = ((hourlyRateUnits * ndMult) / 10_000n * ndHours) / 10_000n;
    nightDiffPayUnits += ndPay;
    earningsLines.push({
      category: "NightDifferential",
      label: "Night Shift Differential",
      amount: fromDecimalUnits(ndPay),
      sourceReference: `ND-${employee.employeeNumber}`,
      isTaxable: true,
    });
  }

  // Rest-day and Holiday premiums
  let holidayPremiumPayUnits = 0n;
  const rdHours = employee.restDayHours ? toDecimalUnits(employee.restDayHours) : 0n;
  if (rdHours > 0n) {
    const mult = toDecimalUnits(PH_PAYROLL_PREMIUM_MULTIPLIERS.restDayRegular);
    const pay = ((hourlyRateUnits * mult) / 10_000n * rdHours) / 10_000n;
    holidayPremiumPayUnits += pay;
    earningsLines.push({
      category: "HolidayPremium",
      label: "Rest Day Premium",
      amount: fromDecimalUnits(pay),
      sourceReference: `RD-${employee.employeeNumber}`,
      isTaxable: true,
    });
  }

  const shHours = employee.specialHolidayHours ? toDecimalUnits(employee.specialHolidayHours) : 0n;
  if (shHours > 0n) {
    const mult = toDecimalUnits(PH_PAYROLL_PREMIUM_MULTIPLIERS.specialHolidayRegular);
    const pay = ((hourlyRateUnits * mult) / 10_000n * shHours) / 10_000n;
    holidayPremiumPayUnits += pay;
    earningsLines.push({
      category: "HolidayPremium",
      label: "Special Holiday Premium",
      amount: fromDecimalUnits(pay),
      sourceReference: `SH-${employee.employeeNumber}`,
      isTaxable: true,
    });
  }

  const rhHours = employee.regularHolidayHours ? toDecimalUnits(employee.regularHolidayHours) : 0n;
  if (rhHours > 0n) {
    const mult = toDecimalUnits(PH_PAYROLL_PREMIUM_MULTIPLIERS.regularHolidayRegular);
    const pay = ((hourlyRateUnits * mult) / 10_000n * rhHours) / 10_000n;
    holidayPremiumPayUnits += pay;
    earningsLines.push({
      category: "HolidayPremium",
      label: "Regular Holiday Premium",
      amount: fromDecimalUnits(pay),
      sourceReference: `RH-${employee.employeeNumber}`,
      isTaxable: true,
    });
  }

  // Allowances
  let nonTaxableAllowancesUnits = 0n;
  let taxableAllowancesUnits = 0n;
  if (employee.allowances) {
    for (const [idx, allowance] of employee.allowances.entries()) {
      const amtUnits = toDecimalUnits(allowance.amount);
      if (allowance.isTaxable) {
        taxableAllowancesUnits += amtUnits;
      } else {
        nonTaxableAllowancesUnits += amtUnits;
      }
      earningsLines.push({
        category: "Allowance",
        label: allowance.label,
        amount: allowance.amount,
        sourceReference: allowance.sourceReference ?? `ALLOW-${idx + 1}-${employee.employeeNumber}`,
        isTaxable: allowance.isTaxable ?? false,
      });
    }
  }

  // Bonuses
  if (employee.bonuses) {
    for (const [idx, bonus] of employee.bonuses.entries()) {
      earningsLines.push({
        category: "Bonus",
        label: bonus.label,
        amount: bonus.amount,
        sourceReference: bonus.sourceReference ?? `BONUS-${idx + 1}-${employee.employeeNumber}`,
        isTaxable: bonus.isTaxable ?? true,
      });
    }
  }

  // Adjustments (positive adjustments added to earnings)
  if (employee.adjustments) {
    for (const [idx, adj] of employee.adjustments.entries()) {
      if (adj.isAddition !== false && adj.status === "Approved") {
        earningsLines.push({
          category: "Adjustment",
          label: `${adj.adjustmentType}: ${adj.reason}`,
          amount: adj.amount,
          sourceReference: adj.adjustmentReference,
          isTaxable: true,
        });
      }
    }
  }

  // Statutory and Company Leave Benefits (e.g., SIL encashment, paid leave)
  if (employee.leaveBenefits) {
    for (const [idx, leave] of employee.leaveBenefits.entries()) {
      const amtUnits = toDecimalUnits(leave.amount);
      if (leave.isTaxable) {
        taxableAllowancesUnits += amtUnits;
      } else {
        nonTaxableAllowancesUnits += amtUnits;
      }
      earningsLines.push({
        category: "Other",
        label: `${leave.leaveType} Leave Pay`,
        amount: leave.amount,
        sourceReference: leave.sourceReference ?? `LEAVE-${idx + 1}-${employee.employeeNumber}`,
        isTaxable: leave.isTaxable ?? false,
      });
    }
  }

  // Gross Pay calculation
  const grossPayUnits = earningsLines.reduce(
    (sum, line) => sum + toDecimalUnits(line.amount),
    0n,
  );

  // Statutory Calculations
  const monthlyEquivalentStr = fromDecimalUnits(basicSalaryUnits);
  const exemptions = employee.statutoryExemptions ?? {};

  // SSS
  const sssResult = exemptions.exemptSss
    ? { employeeShare: "0.00", employerShare: "0.00", ecShare: "0.00", mpfEmployee: "0.00", mpfEmployer: "0.00" }
    : calculateSssContribution(monthlyEquivalentStr, statutoryRates.sssBrackets);

  // PhilHealth
  const philHealthResult = exemptions.exemptPhilHealth
    ? { employeeShare: "0.00", employerShare: "0.00", total: "0.00" }
    : calculatePhilHealthContribution(monthlyEquivalentStr, statutoryRates);

  // Pag-IBIG
  const pagIbigResult = exemptions.exemptPagIbig
    ? { employeeShare: "0.00", employerShare: "0.00" }
    : calculatePagIbigContribution(monthlyEquivalentStr, statutoryRates);

  const deductionsLines: CalculatedEmployeePayroll["deductions"] = [];

  if (toDecimalUnits(sssResult.employeeShare) > 0n) {
    deductionsLines.push({
      category: "SSS",
      label: "SSS Contribution (Employee Share)",
      amount: sssResult.employeeShare,
      sourceReference: `DED-SSS-${employee.employeeNumber}`,
    });
  }

  if (toDecimalUnits(philHealthResult.employeeShare) > 0n) {
    deductionsLines.push({
      category: "PhilHealth",
      label: "PhilHealth Contribution (Employee Share)",
      amount: philHealthResult.employeeShare,
      sourceReference: `DED-PH-${employee.employeeNumber}`,
    });
  }

  if (toDecimalUnits(pagIbigResult.employeeShare) > 0n) {
    deductionsLines.push({
      category: "Pag-IBIG",
      label: "Pag-IBIG Contribution (Employee Share)",
      amount: pagIbigResult.employeeShare,
      sourceReference: `DED-HDMF-${employee.employeeNumber}`,
    });
  }

  // Mandatory contributions total
  const mandatoryContributionsUnits =
    toDecimalUnits(sssResult.employeeShare) +
    toDecimalUnits(philHealthResult.employeeShare) +
    toDecimalUnits(pagIbigResult.employeeShare);

  // Taxable compensation = Gross Pay - Non-taxable allowances - Employee Mandatory Contributions
  const taxableCompensationUnits =
    grossPayUnits > (nonTaxableAllowancesUnits + mandatoryContributionsUnits)
      ? grossPayUnits - nonTaxableAllowancesUnits - mandatoryContributionsUnits
      : 0n;

  // Withholding Tax
  const withholdingTaxStr = exemptions.exemptTax
    ? "0.00"
    : calculateWithholdingTax(fromDecimalUnits(taxableCompensationUnits), statutoryRates.birTaxBrackets);

  if (toDecimalUnits(withholdingTaxStr) > 0n) {
    deductionsLines.push({
      category: "WithholdingTax",
      label: "BIR Withholding Tax",
      amount: withholdingTaxStr,
      sourceReference: `DED-TAX-${employee.employeeNumber}`,
    });
  }

  // Company deductions (Loans, Cash advance, HMO, late, etc.)
  if (employee.companyDeductions) {
    for (const [idx, compDed] of employee.companyDeductions.entries()) {
      deductionsLines.push({
        category: compDed.category,
        label: compDed.label,
        amount: compDed.amount,
        sourceReference: compDed.sourceReference ?? `DED-COMP-${idx + 1}-${employee.employeeNumber}`,
      });
    }
  }

  // Negative Adjustments (deductions)
  if (employee.adjustments) {
    for (const adj of employee.adjustments) {
      if (adj.isAddition === false && adj.status === "Approved") {
        deductionsLines.push({
          category: "Adjustment",
          label: `${adj.adjustmentType}: ${adj.reason}`,
          amount: adj.amount,
          sourceReference: adj.adjustmentReference,
        });
      }
    }
  }

  // Total Deductions & Net Pay
  const totalDeductionsUnits = deductionsLines.reduce(
    (sum, line) => sum + toDecimalUnits(line.amount),
    0n,
  );

  const netPayUnits = grossPayUnits - totalDeductionsUnits;

  // Employer Contributions
  const employerContributionLines: CalculatedEmployeePayroll["employerContributionLines"] = [
    {
      category: "SSS",
      label: "SSS (Employer Share + EC)",
      amount: sssResult.employerShare,
    },
    {
      category: "PhilHealth",
      label: "PhilHealth (Employer Share)",
      amount: philHealthResult.employerShare,
    },
    {
      category: "Pag-IBIG",
      label: "Pag-IBIG (Employer Share)",
      amount: pagIbigResult.employerShare,
    },
  ];

  const employerTotalContributionsUnits =
    toDecimalUnits(sssResult.employerShare) +
    toDecimalUnits(philHealthResult.employerShare) +
    toDecimalUnits(pagIbigResult.employerShare);

  // 13th-Month Pay Accrual (monthly = basicSalary / 12)
  const thirteenthMonthAccrualUnits = basicSalaryUnits / 12n;

  // Benefits Lines
  const benefitsLines: CalculatedEmployeePayroll["benefitsLines"] = [
    {
      name: "13th-Month Pay Accrual",
      amount: fromDecimalUnits(thirteenthMonthAccrualUnits),
      employerPaidPortion: fromDecimalUnits(thirteenthMonthAccrualUnits),
      employeeFundedPortion: "0.00",
      accruedAmount: fromDecimalUnits(thirteenthMonthAccrualUnits),
      taxTreatment: "NonTaxable",
    },
  ];

  let employerPaidBenefitsUnits = thirteenthMonthAccrualUnits;

  if (employee.benefits) {
    for (const b of employee.benefits) {
      benefitsLines.push({
        name: b.name,
        amount: b.amount,
        employerPaidPortion: b.employerPaidPortion,
        employeeFundedPortion: b.employeeFundedPortion,
        accruedAmount: b.amount,
        taxTreatment: b.isTaxable ? "Taxable" : "NonTaxable",
      });
      employerPaidBenefitsUnits += toDecimalUnits(b.employerPaidPortion);
    }
  }

  const trace: CalculationTrace = {
    engineVersion: PAYROLL_CALCULATION_ENGINE_VERSION,
    compensationBasis: employee.compensationBasis,
    applicableRate: employee.applicableRate,
    calculatedDailyRate: fromDecimalUnits(dailyRateUnits),
    calculatedHourlyRate: fromDecimalUnits(hourlyRateUnits),
    regularBasicPay: fromDecimalUnits(basicSalaryUnits),
    proratedBasicPay: fromDecimalUnits(basicPayUnits),
    absentDeduction: fromDecimalUnits(absentDeductionUnits),
    tardinessDeduction: fromDecimalUnits(tardinessDeductionUnits),
    undertimeDeduction: fromDecimalUnits(undertimeDeductionUnits),
    overtimePay: fromDecimalUnits(totalOvertimePayUnits),
    nightDifferentialPay: fromDecimalUnits(nightDiffPayUnits),
    holidayPremiumPay: fromDecimalUnits(holidayPremiumPayUnits),
    restDayPremiumPay: fromDecimalUnits(rdHours > 0n ? holidayPremiumPayUnits : 0n),
    taxableCompensation: fromDecimalUnits(taxableCompensationUnits),
    nonTaxableCompensation: fromDecimalUnits(nonTaxableAllowancesUnits),
    appliedDivisors: {
      monthlyToDaily: policy.monthlyToDailyDivisor,
      dailyToHourly: policy.dailyToHourlyDivisor,
    },
    statutoryCalculations: {
      sssEmployee: sssResult.employeeShare,
      sssEmployer: sssResult.employerShare,
      philHealthEmployee: philHealthResult.employeeShare,
      philHealthEmployer: philHealthResult.employerShare,
      pagIbigEmployee: pagIbigResult.employeeShare,
      pagIbigEmployer: pagIbigResult.employerShare,
      birTax: withholdingTaxStr,
    },
    thirteenthMonthAccrual: fromDecimalUnits(thirteenthMonthAccrualUnits),
  };

  // Generate SHA-256 cryptographic digest for tamper-evident calculation traceability
  const traceDigestInput = JSON.stringify({
    v: trace.engineVersion,
    emp: employee.employeeNumber,
    basis: trace.compensationBasis,
    rate: trace.applicableRate,
    basic: trace.regularBasicPay,
    prorated: trace.proratedBasicPay,
    absent: trace.absentDeduction,
    late: trace.tardinessDeduction,
    undertime: trace.undertimeDeduction,
    ot: trace.overtimePay,
    nd: trace.nightDifferentialPay,
    hol: trace.holidayPremiumPay,
    taxable: trace.taxableCompensation,
    stat: trace.statutoryCalculations,
    thirteenth: trace.thirteenthMonthAccrual,
  });
  trace.traceHash = createHash("sha256").update(traceDigestInput).digest("hex");

  return {
    employeeId: employee.employeeId,
    employeeNumber: employee.employeeNumber,
    employeeName: employee.employeeName,
    department: employee.department,
    position: employee.position ?? null,
    compensationBasis: employee.compensationBasis,
    applicableRate: employee.applicableRate,
    daysWorked: employee.daysWorked ?? "0",
    regularHours: employee.regularHours ?? "0",
    overtimeHours: employee.overtimeHours ?? "0",
    grossPay: fromDecimalUnits(grossPayUnits),
    totalDeductions: fromDecimalUnits(totalDeductionsUnits),
    netPay: fromDecimalUnits(netPayUnits),
    employerContributions: fromDecimalUnits(employerTotalContributionsUnits),
    employerPaidBenefits: fromDecimalUnits(employerPaidBenefitsUnits),
    thirteenthMonthAccrual: fromDecimalUnits(thirteenthMonthAccrualUnits),
    earnings: earningsLines,
    deductions: deductionsLines,
    employerContributionLines,
    benefitsLines,
    trace,
  };
}
