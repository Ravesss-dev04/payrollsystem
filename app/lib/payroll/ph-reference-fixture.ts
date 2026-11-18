/**
 * Task 11.2: Default Philippine Reference Payroll Configuration & Calculation Fixture
 *
 * This provides the authoritative reference ruleset and calculation fixture
 * matching official DOLE, BIR, SSS, PhilHealth, and HDMF statutory standards.
 * Used for automated calculation tests, baseline HR reviews, and compliance audits.
 */

import type { EmployeeCompensationInput } from "./calculator";

export interface ReferencePayrollRule {
  ruleCode: string;
  name: string;
  category:
    | "BasicPay"
    | "OvertimePay"
    | "NightDifferential"
    | "HolidayPremium"
    | "Allowance"
    | "Bonus"
    | "StatutoryDeduction"
    | "CompanyDeduction"
    | "StatutoryBenefit"
    | "CompanyBenefit"
    | "EmployerContribution";
  effectiveDate: string; // ISO date YYYY-MM-DD
  calculationBasis: string;
  applicability: string;
  sourceReference: string;
  isTaxable?: boolean;
  notes?: string;
}

export const PHILIPPINE_REFERENCE_PAYROLL_RULESET: ReferencePayrollRule[] = [
  {
    ruleCode: "BASIC_SALARY",
    name: "Basic Salary",
    category: "BasicPay",
    effectiveDate: "2026-01-01",
    calculationBasis: "Monthly basic compensation divided by applicable company working divisor (e.g., 261 days)",
    applicability: "All regular and probationary employees",
    sourceReference: "Employment Agreement / DOLE Labor Advisory",
    isTaxable: true,
  },
  {
    ruleCode: "REGULAR_OVERTIME",
    name: "Regular Overtime (Ordinary Day)",
    category: "OvertimePay",
    effectiveDate: "2026-01-01",
    calculationBasis: "Hourly rate × 125% × approved overtime hours",
    applicability: "All non-exempt rank-and-file employees",
    sourceReference: "Labor Code of the Philippines, Art. 87",
    isTaxable: true,
  },
  {
    ruleCode: "NIGHT_DIFFERENTIAL",
    name: "Night Shift Differential",
    category: "NightDifferential",
    effectiveDate: "2026-01-01",
    calculationBasis: "Hourly rate × 10% premium for work performed between 10:00 PM and 6:00 AM",
    applicability: "All non-exempt employees working night shifts",
    sourceReference: "Labor Code of the Philippines, Art. 86",
    isTaxable: true,
  },
  {
    ruleCode: "REST_DAY_PREMIUM",
    name: "Scheduled Rest Day Premium",
    category: "HolidayPremium",
    effectiveDate: "2026-01-01",
    calculationBasis: "Hourly rate × 130% for the first 8 hours worked on a designated rest day",
    applicability: "All non-exempt employees required to work on rest day",
    sourceReference: "Labor Code of the Philippines, Art. 93",
    isTaxable: true,
  },
  {
    ruleCode: "SPECIAL_HOLIDAY_PREMIUM",
    name: "Special Non-Working Holiday Premium",
    category: "HolidayPremium",
    effectiveDate: "2026-01-01",
    calculationBasis: "Hourly rate × 130% for the first 8 hours worked on a special non-working day",
    applicability: "All employees who work on declared special holidays",
    sourceReference: "Labor Code of the Philippines, Art. 94 / Presidential Proclamation",
    isTaxable: true,
  },
  {
    ruleCode: "REGULAR_HOLIDAY_PREMIUM",
    name: "Regular Holiday Premium",
    category: "HolidayPremium",
    effectiveDate: "2026-01-01",
    calculationBasis: "Hourly rate × 200% for the first 8 hours worked on a regular holiday (100% basic + 100% premium)",
    applicability: "All employees who work on declared regular holidays",
    sourceReference: "Labor Code of the Philippines, Art. 94",
    isTaxable: true,
  },
  {
    ruleCode: "DED_SSS_EE",
    name: "SSS Employee Contribution",
    category: "StatutoryDeduction",
    effectiveDate: "2026-01-01",
    calculationBasis: "Official SSS Contribution Table; 4.5% regular EE share up to MSC ceiling plus MPF/WISP share",
    applicability: "All private sector employees up to age 60",
    sourceReference: "Republic Act No. 11199 / SSS Circular No. 2024-006",
    isTaxable: false,
    notes: "Deductible from gross compensation when determining taxable income",
  },
  {
    ruleCode: "DED_PH_EE",
    name: "PhilHealth Employee Contribution",
    category: "StatutoryDeduction",
    effectiveDate: "2026-01-01",
    calculationBasis: "2.5% of monthly basic salary clamped between ₱10,000 and ₱100,000",
    applicability: "All formal sector employees",
    sourceReference: "Republic Act No. 11223 / PhilHealth Circular No. 2024-0001",
    isTaxable: false,
    notes: "Deductible from gross compensation when determining taxable income",
  },
  {
    ruleCode: "DED_HDMF_EE",
    name: "Pag-IBIG Employee Contribution",
    category: "StatutoryDeduction",
    effectiveDate: "2026-01-01",
    calculationBasis: "2.0% of monthly basic salary, capped at ₱10,000 salary base (Maximum ₱200.00 EE)",
    applicability: "All SSS-covered employees",
    sourceReference: "Republic Act No. 9679 / HDMF Circular No. 460",
    isTaxable: false,
    notes: "Deductible from gross compensation when determining taxable income",
  },
  {
    ruleCode: "DED_WITHHOLDING_TAX",
    name: "BIR Withholding Tax on Compensation",
    category: "StatutoryDeduction",
    effectiveDate: "2026-01-01",
    calculationBasis: "Revised TRAIN Law Graduated Monthly Tax Table applied to Taxable Compensation",
    applicability: "All taxable individual employees",
    sourceReference: "Republic Act No. 10963 (TRAIN Law) / BIR RR 11-2018",
    isTaxable: false,
    notes: "Computed after subtracting non-taxable allowances and mandatory EE statutory contributions",
  },
  {
    ruleCode: "ER_SSS",
    name: "SSS Employer Contribution (including EC & MPF)",
    category: "EmployerContribution",
    effectiveDate: "2026-01-01",
    calculationBasis: "Official SSS Table; 9.5% regular ER share + Employees Compensation (EC ₱10/₱30) + ER MPF/WISP",
    applicability: "Covering all SSS-eligible employees",
    sourceReference: "Republic Act No. 11199 / SSS Circular No. 2024-006",
    notes: "Fully paid by employer. Never deducted from employee net pay",
  },
  {
    ruleCode: "ER_PHILHEALTH",
    name: "PhilHealth Employer Contribution",
    category: "EmployerContribution",
    effectiveDate: "2026-01-01",
    calculationBasis: "2.5% of monthly basic salary clamped between ₱10,000 and ₱100,000",
    applicability: "Covering all PhilHealth-eligible employees",
    sourceReference: "Republic Act No. 11223 / PhilHealth Circular No. 2024-0001",
    notes: "Fully paid by employer. Never deducted from employee net pay",
  },
  {
    ruleCode: "ER_PAGIBIG",
    name: "Pag-IBIG Employer Contribution",
    category: "EmployerContribution",
    effectiveDate: "2026-01-01",
    calculationBasis: "2.0% of monthly basic salary, capped at ₱10,000 salary base (Maximum ₱200.00 ER)",
    applicability: "Covering all Pag-IBIG-eligible employees",
    sourceReference: "Republic Act No. 9679 / HDMF Circular No. 460",
    notes: "Fully paid by employer. Never deducted from employee net pay",
  },
  {
    ruleCode: "BENEFIT_13TH_MONTH",
    name: "13th-Month Pay Accrual",
    category: "StatutoryBenefit",
    effectiveDate: "2026-01-01",
    calculationBasis: "1/12th of monthly basic salary earned (annual equivalent / 12)",
    applicability: "All rank-and-file employees with at least 1 month service",
    sourceReference: "Presidential Decree No. 851",
    notes: "Accrued monthly for budgeting/financial reporting. Separate from monthly take-home pay",
  },
  {
    ruleCode: "BENEFIT_SIL",
    name: "Service Incentive Leave (SIL) Accrual",
    category: "StatutoryBenefit",
    effectiveDate: "2026-01-01",
    calculationBasis: "5 days paid leave per annum after 1 year service; commutable to cash",
    applicability: "All qualified employees under Labor Code Art. 95",
    sourceReference: "Labor Code of the Philippines, Art. 95",
  },
];

/**
 * Task 11.2 Automated Calculation Fixture Employee Input
 *
 * Assumptions:
 * - Monthly basic salary: ₱30,000.00
 * - Full monthly payroll period (22 working days, 176 hours)
 * - Applicable SSS, PhilHealth, Pag-IBIG coverage
 * - No overtime, holiday, night differential, allowance, or bonus
 * - No additional deductions
 * - Simplified monthly withholding tax
 */
export const SAMPLE_PH_REFERENCE_EMPLOYEE: EmployeeCompensationInput = {
  employeeId: "emp-sample-ph-fixture",
  employeeNumber: "00030",
  employeeName: "Sample PH Reference Employee",
  department: "Operations",
  position: "Staff",
  compensationBasis: "Monthly",
  applicableRate: "30000.00",
  daysWorked: "22",
  regularHours: "176",
  overtimeHours: "0",
  restDayHours: "0",
  specialHolidayHours: "0",
  regularHolidayHours: "0",
  nightDifferentialHours: "0",
  lateMinutes: "0",
  undertimeMinutes: "0",
  absentDays: "0",
  allowances: [],
  bonuses: [],
  companyDeductions: [],
  adjustments: [],
  benefits: [],
};

/**
 * Expected calculation results matching Section 11.2 illustrative tables exactly
 */
export const EXPECTED_PH_REFERENCE_CALCULATION = {
  grossPay: "30000.00",
  deductions: {
    sssEmployee: "1500.00",
    philHealthEmployee: "750.00",
    pagIbigEmployee: "200.00",
    mandatoryContributionsTotal: "2450.00",
    taxableCompensation: "27550.00",
    withholdingTax: "1007.55",
    totalDeductions: "3457.55",
  },
  netPay: "26542.45",
  employerContributions: {
    sssEmployerWithEc: "3030.00",
    philHealthEmployer: "750.00",
    pagIbigEmployer: "200.00",
    totalEmployerContributions: "3980.00",
  },
  thirteenthMonthPay: {
    annualQualifyingSalary: "360000.00",
    annual13thMonthPay: "30000.00",
    monthlyAccrual: "2500.00",
  },
};
