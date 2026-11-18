/**
 * Types for payroll configuration used by the HR configuration portal.
 * The configuration is versioned and stored as a JSON blob in the database
 * (e.g., in a `PayrollConfiguration` table with a `json` column).
 */
export interface PayrollFrequency {
  /** e.g., "monthly", "semi‑monthly", "weekly" */
  type: string;
  /** Number of periods per year */
  periodsPerYear: number;
}

export interface PayrollCutoff {
  /** Day of month when the cutoff occurs */
  day: number;
  /** Pay date offset from cutoff (in days) */
  payDateOffset: number;
}

export interface WorkingHours {
  /** Standard hours per working day */
  hoursPerDay: number;
  /** Working days per week */
  daysPerWeek: number;
  /** List of weekday numbers (0=Sun) that are rest days */
  restDays: number[];
}

export interface RoundingPolicy {
  policy: "HalfUp" | "Floor" | "Ceil";
  decimals: number; // e.g., 2 for cent precision
}

export interface CompanyPayrollPolicyConfig {
  frequency: PayrollFrequency;
  cutoff: PayrollCutoff;
  timezone: string; // IANA tz string
  salaryConversionMethod: "MonthlyToDaily" | "DailyToHourly" | "Custom";
  monthlyToDailyDivisor: string; // decimal string
  dailyToHourlyDivisor: string; // decimal string
  prorationRules: {
    enabled: boolean;
    /** Example: { day: 15, divisor: "2" } for half‑month */
    customDivisors?: Record<string, string>;
  };
  rounding: RoundingPolicy;
  workingHours: WorkingHours;
}

export interface EarningsComponentConfig {
  enabled: boolean;
  multiplier?: string; // e.g., overtime multiplier
}

export interface DeductionsComponentConfig {
  enabled: boolean;
  statutory?: boolean; // true for SSS, PhilHealth, Pag‑IBIG, Tax
  customLabel?: string;
}

export interface BenefitComponentConfig {
  enabled: boolean;
  classification: {
    statutory: boolean;
    cash: boolean;
    employerPaid: boolean;
    employeeFunded?: boolean;
    reimbursable?: boolean;
    accrued?: boolean;
    taxable?: boolean;
    contributionTreatment?: "Employer" | "Employee" | "Both";
    thirteenMonthTreatment?: "Accrual" | "None";
    eligibility?: string; // free‑form description
  };
}

export interface PayrollConfiguration {
  version: number;
  effectiveFrom: string; // ISO date
  policy: CompanyPayrollPolicyConfig;
  earnings: {
    basicSalary: EarningsComponentConfig;
    overtime: EarningsComponentConfig;
    nightDifferential: EarningsComponentConfig;
    holidayPremium: EarningsComponentConfig;
    restDayPremium: EarningsComponentConfig;
    allowances: EarningsComponentConfig;
    bonuses: EarningsComponentConfig;
    commissions?: EarningsComponentConfig;
    other?: EarningsComponentConfig;
  };
  deductions: {
    sss: DeductionsComponentConfig;
    philHealth: DeductionsComponentConfig;
    pagIbig: DeductionsComponentConfig;
    withholdingTax: DeductionsComponentConfig;
    loans?: DeductionsComponentConfig;
    cashAdvances?: DeductionsComponentConfig;
    hmo?: DeductionsComponentConfig;
    insurance?: DeductionsComponentConfig;
    lateUndertime?: DeductionsComponentConfig;
    other?: DeductionsComponentConfig;
  };
  benefits: {
    thirteenthMonth: BenefitComponentConfig;
    serviceIncentiveLeave: BenefitComponentConfig;
    statutoryLeaves?: BenefitComponentConfig;
    hmo?: BenefitComponentConfig;
    dependentHmo?: BenefitComponentConfig;
    medicalAssistance?: BenefitComponentConfig;
    riceAllowance?: BenefitComponentConfig;
    mealAllowance?: BenefitComponentConfig;
    transportationAllowance?: BenefitComponentConfig;
    clothingAllowance?: BenefitComponentConfig;
    communicationAllowance?: BenefitComponentConfig;
    lifeInsurance?: BenefitComponentConfig;
    accidentInsurance?: BenefitComponentConfig;
    performanceBonus?: BenefitComponentConfig;
    attendanceIncentive?: BenefitComponentConfig;
    other?: BenefitComponentConfig;
  };
  applicability: {
    departments?: string[];
    categories?: string[];
    employmentTypes?: string[];
    positions?: string[];
    payGroups?: string[];
    employeeIds?: string[];
    allEligible?: boolean;
  };
}
