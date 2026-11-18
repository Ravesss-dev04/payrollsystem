import { toDecimalUnits, fromDecimalUnits } from "./formula-engine";

export interface SssBracket {
  minSalary: string;
  maxSalary: string | null;
  msc: string;
  employeeRegular: string;
  employerRegular: string;
  employeeMpf: string;
  employerMpf: string;
  employerEc: string;
  totalEmployee: string;
  totalEmployer: string;
}

export interface BirTaxBracket {
  minTaxable: string;
  maxTaxable: string | null;
  baseTax: string;
  rate: string;
  excessOver: string;
}

/**
 * Standard SSS Contribution Schedule (effective 2025/2026 issuance)
 * Total rate 14% (4.5% EE, 9.5% ER) up to MSC ceiling, plus EC and MPF/WISP.
 * Includes exact bracket for the ₱30,000 reference employee:
 * MSC: ₱30,000 -> EE share ₱1,500.00, ER share + EC ₱3,030.00.
 */
export const DEFAULT_SSS_BRACKETS: SssBracket[] = [
  {
    minSalary: "0.00",
    maxSalary: "4249.99",
    msc: "4000.00",
    employeeRegular: "180.00",
    employerRegular: "380.00",
    employeeMpf: "0.00",
    employerMpf: "0.00",
    employerEc: "10.00",
    totalEmployee: "180.00",
    totalEmployer: "390.00",
  },
  {
    minSalary: "4250.00",
    maxSalary: "4749.99",
    msc: "4500.00",
    employeeRegular: "202.50",
    employerRegular: "427.50",
    employeeMpf: "0.00",
    employerMpf: "0.00",
    employerEc: "10.00",
    totalEmployee: "202.50",
    totalEmployer: "437.50",
  },
  {
    minSalary: "4750.00",
    maxSalary: "9749.99",
    msc: "7000.00",
    employeeRegular: "315.00",
    employerRegular: "665.00",
    employeeMpf: "0.00",
    employerMpf: "0.00",
    employerEc: "10.00",
    totalEmployee: "315.00",
    totalEmployer: "675.00",
  },
  {
    minSalary: "9750.00",
    maxSalary: "14749.99",
    msc: "12000.00",
    employeeRegular: "540.00",
    employerRegular: "1140.00",
    employeeMpf: "0.00",
    employerMpf: "0.00",
    employerEc: "10.00",
    totalEmployee: "540.00",
    totalEmployer: "1150.00",
  },
  {
    minSalary: "14750.00",
    maxSalary: "19749.99",
    msc: "17000.00",
    employeeRegular: "765.00",
    employerRegular: "1615.00",
    employeeMpf: "0.00",
    employerMpf: "0.00",
    employerEc: "30.00",
    totalEmployee: "765.00",
    totalEmployer: "1645.00",
  },
  {
    minSalary: "19750.00",
    maxSalary: "24749.99",
    msc: "20000.00",
    employeeRegular: "900.00",
    employerRegular: "1900.00",
    employeeMpf: "100.00",
    employerMpf: "200.00",
    employerEc: "30.00",
    totalEmployee: "1000.00",
    totalEmployer: "2130.00",
  },
  {
    minSalary: "24750.00",
    maxSalary: "29749.99",
    msc: "27000.00",
    employeeRegular: "900.00",
    employerRegular: "1900.00",
    employeeMpf: "450.00",
    employerMpf: "900.00",
    employerEc: "30.00",
    totalEmployee: "1350.00",
    totalEmployer: "2830.00",
  },
  {
    minSalary: "29750.00",
    maxSalary: "34749.99",
    msc: "30000.00",
    employeeRegular: "900.00",
    employerRegular: "1900.00",
    employeeMpf: "600.00",
    employerMpf: "1100.00",
    employerEc: "30.00",
    totalEmployee: "1500.00",
    totalEmployer: "3030.00",
  },
  {
    minSalary: "34750.00",
    maxSalary: null,
    msc: "35000.00",
    employeeRegular: "900.00",
    employerRegular: "1900.00",
    employeeMpf: "850.00",
    employerMpf: "1600.00",
    employerEc: "30.00",
    totalEmployee: "1750.00",
    totalEmployer: "3530.00",
  },
];

/**
 * TRAIN Law Revised Withholding Tax Tables (Monthly)
 */
export const DEFAULT_BIR_MONTHLY_TAX_BRACKETS: BirTaxBracket[] = [
  {
    minTaxable: "0.00",
    maxTaxable: "20833.33",
    baseTax: "0.00",
    rate: "0.00",
    excessOver: "0.00",
  },
  {
    minTaxable: "20833.34",
    maxTaxable: "33333.33",
    baseTax: "0.00",
    rate: "0.15",
    excessOver: "20833.00",
  },
  {
    minTaxable: "33333.34",
    maxTaxable: "66666.67",
    baseTax: "1875.00",
    rate: "0.20",
    excessOver: "33333.33",
  },
  {
    minTaxable: "66666.68",
    maxTaxable: "166666.67",
    baseTax: "8541.67",
    rate: "0.25",
    excessOver: "66666.67",
  },
  {
    minTaxable: "166666.68",
    maxTaxable: "666666.67",
    baseTax: "33541.67",
    rate: "0.30",
    excessOver: "166666.67",
  },
  {
    minTaxable: "666666.68",
    maxTaxable: null,
    baseTax: "183541.67",
    rate: "0.35",
    excessOver: "666666.67",
  },
];

export interface PhilippineStatutoryRates {
  philHealthTotalRate: string; // "0.05" (5%)
  philHealthEmployeeShareRate: string; // "0.025" (2.5%)
  philHealthEmployerShareRate: string; // "0.025" (2.5%)
  philHealthMinSalary: string; // "10000.00"
  philHealthMaxSalary: string; // "100000.00"

  pagIbigEmployeeRate: string; // "0.02" (2%)
  pagIbigEmployerRate: string; // "0.02" (2%)
  pagIbigSalaryCap: string; // "10000.00" -> default max mandatory contribution is ₱200 EE and ₱200 ER

  sssBrackets: SssBracket[];
  birTaxBrackets: BirTaxBracket[];
}

export const DEFAULT_PH_STATUTORY_RATES: PhilippineStatutoryRates = {
  philHealthTotalRate: "0.05",
  philHealthEmployeeShareRate: "0.025",
  philHealthEmployerShareRate: "0.025",
  philHealthMinSalary: "10000.00",
  philHealthMaxSalary: "100000.00",

  pagIbigEmployeeRate: "0.02",
  pagIbigEmployerRate: "0.02",
  pagIbigSalaryCap: "10000.00",

  sssBrackets: DEFAULT_SSS_BRACKETS,
  birTaxBrackets: DEFAULT_BIR_MONTHLY_TAX_BRACKETS,
};

export function calculateSssContribution(
  monthlySalary: string,
  brackets: SssBracket[] = DEFAULT_SSS_BRACKETS,
): { employeeShare: string; employerShare: string; ecShare: string; mpfEmployee: string; mpfEmployer: string } {
  const salaryUnits = toDecimalUnits(monthlySalary);

  for (const bracket of brackets) {
    const minUnits = toDecimalUnits(bracket.minSalary);
    const maxUnits = bracket.maxSalary ? toDecimalUnits(bracket.maxSalary) : null;

    if (salaryUnits >= minUnits && (maxUnits === null || salaryUnits <= maxUnits)) {
      return {
        employeeShare: bracket.totalEmployee,
        employerShare: bracket.totalEmployer,
        ecShare: bracket.employerEc,
        mpfEmployee: bracket.employeeMpf,
        mpfEmployer: bracket.employerMpf,
      };
    }
  }

  // Fallback to highest bracket
  const highest = brackets[brackets.length - 1];
  return {
    employeeShare: highest.totalEmployee,
    employerShare: highest.totalEmployer,
    ecShare: highest.employerEc,
    mpfEmployee: highest.employeeMpf,
    mpfEmployer: highest.employerMpf,
  };
}

export function calculatePhilHealthContribution(
  monthlySalary: string,
  rates: Pick<
    PhilippineStatutoryRates,
    "philHealthMinSalary" | "philHealthMaxSalary" | "philHealthEmployeeShareRate" | "philHealthEmployerShareRate"
  > = DEFAULT_PH_STATUTORY_RATES,
): { employeeShare: string; employerShare: string; total: string } {
  const salaryUnits = toDecimalUnits(monthlySalary);
  const minUnits = toDecimalUnits(rates.philHealthMinSalary);
  const maxUnits = toDecimalUnits(rates.philHealthMaxSalary);

  let clampedSalary = salaryUnits;
  if (clampedSalary < minUnits) clampedSalary = minUnits;
  if (clampedSalary > maxUnits) clampedSalary = maxUnits;

  const eeRateUnits = toDecimalUnits(rates.philHealthEmployeeShareRate);
  const erRateUnits = toDecimalUnits(rates.philHealthEmployerShareRate);

  const eeShare = (clampedSalary * eeRateUnits) / 10_000n;
  const erShare = (clampedSalary * erRateUnits) / 10_000n;
  const total = eeShare + erShare;

  return {
    employeeShare: fromDecimalUnits(eeShare),
    employerShare: fromDecimalUnits(erShare),
    total: fromDecimalUnits(total),
  };
}

export function calculatePagIbigContribution(
  monthlySalary: string,
  rates: Pick<
    PhilippineStatutoryRates,
    "pagIbigSalaryCap" | "pagIbigEmployeeRate" | "pagIbigEmployerRate"
  > = DEFAULT_PH_STATUTORY_RATES,
): { employeeShare: string; employerShare: string } {
  const salaryUnits = toDecimalUnits(monthlySalary);
  const capUnits = toDecimalUnits(rates.pagIbigSalaryCap);

  const baseSalary = salaryUnits > capUnits ? capUnits : salaryUnits;
  const eeRate = toDecimalUnits(rates.pagIbigEmployeeRate);
  const erRate = toDecimalUnits(rates.pagIbigEmployerRate);

  const eeShare = (baseSalary * eeRate) / 10_000n;
  const erShare = (baseSalary * erRate) / 10_000n;

  return {
    employeeShare: fromDecimalUnits(eeShare),
    employerShare: fromDecimalUnits(erShare),
  };
}

export function calculateWithholdingTax(
  taxableCompensation: string,
  brackets: BirTaxBracket[] = DEFAULT_BIR_MONTHLY_TAX_BRACKETS,
): string {
  const taxableUnits = toDecimalUnits(taxableCompensation);
  if (taxableUnits <= 0n) return "0.00";

  for (const bracket of brackets) {
    const minUnits = toDecimalUnits(bracket.minTaxable);
    const maxUnits = bracket.maxTaxable ? toDecimalUnits(bracket.maxTaxable) : null;

    if (taxableUnits >= minUnits && (maxUnits === null || taxableUnits <= maxUnits)) {
      const baseUnits = toDecimalUnits(bracket.baseTax);
      const rateUnits = toDecimalUnits(bracket.rate);
      const excessOverUnits = toDecimalUnits(bracket.excessOver);

      const excess = taxableUnits > excessOverUnits ? taxableUnits - excessOverUnits : 0n;
      const taxOnExcess = (excess * rateUnits) / 10_000n;
      const totalTax = baseUnits + taxOnExcess;
      return fromDecimalUnits(totalTax);
    }
  }

  return "0.00";
}

/**
 * Overtime, Rest-day and Holiday multipliers under Philippine Labor Code
 */
export const PH_PAYROLL_PREMIUM_MULTIPLIERS = {
  ordinaryOvertime: "1.25", // 125% of hourly rate
  restDayRegular: "1.30", // 130% for first 8 hours on rest day
  restDayOvertime: "1.69", // 130% * 125% = 169%
  specialHolidayRegular: "1.30", // 130% for first 8 hours on special non-working holiday
  specialHolidayOvertime: "1.69", // 130% * 125% = 169%
  specialHolidayRestDayRegular: "1.50", // 150% on special holiday falling on rest day
  specialHolidayRestDayOvertime: "1.95", // 150% * 130% = 195%
  regularHolidayRegular: "2.00", // 200% for first 8 hours on regular holiday
  regularHolidayOvertime: "2.60", // 200% * 130% = 260%
  regularHolidayRestDayRegular: "2.60", // 260% on regular holiday falling on rest day
  regularHolidayRestDayOvertime: "3.38", // 260% * 130% = 338%
  nightDifferential: "0.10", // +10% premium for work between 10:00 PM and 6:00 AM
};

/**
 * Statutory de minimis benefits ceilings under BIR Revenue Regulations No. 2-98 as amended by RR 11-2018 (TRAIN Law)
 */
export interface DeMinimisBenefitLimit {
  code: string;
  name: string;
  frequency: "Monthly" | "Annual" | "PerSemester" | "Daily";
  maxTaxExemptAmount: string;
  legalBasis: string;
}

export const PHILIPPINE_DE_MINIMIS_BENEFITS: DeMinimisBenefitLimit[] = [
  {
    code: "RICE_SUBSIDY",
    name: "Rice Subsidy",
    frequency: "Monthly",
    maxTaxExemptAmount: "2000.00",
    legalBasis: "BIR RR 11-2018; 1 sack of 50-kg rice or cash equivalent not exceeding ₱2,000 per month",
  },
  {
    code: "CLOTHING_ALLOWANCE",
    name: "Uniform and Clothing Allowance",
    frequency: "Annual",
    maxTaxExemptAmount: "6000.00",
    legalBasis: "BIR RR 11-2018; not exceeding ₱6,000 per annum",
  },
  {
    code: "ACTUAL_MEDICAL_ASSISTANCE",
    name: "Actual Medical Assistance (HMO / Inpatient)",
    frequency: "Annual",
    maxTaxExemptAmount: "10000.00",
    legalBasis: "BIR RR 5-2011 & RR 11-2018; medical assistance not exceeding ₱10,000 per annum",
  },
  {
    code: "LAUNDRY_ALLOWANCE",
    name: "Laundry Allowance",
    frequency: "Monthly",
    maxTaxExemptAmount: "300.00",
    legalBasis: "BIR RR 11-2018; not exceeding ₱300 per month",
  },
  {
    code: "EMPLOYEE_ACHIEVEMENT_AWARD",
    name: "Employees Achievement Award",
    frequency: "Annual",
    maxTaxExemptAmount: "10000.00",
    legalBasis: "BIR RR 2-98 & RR 11-2018; tangible personal property not exceeding ₱10,000",
  },
  {
    code: "CHRISTMAS_ANNIVERSARY_GIFT",
    name: "Gifts given during Christmas and major anniversary",
    frequency: "Annual",
    maxTaxExemptAmount: "5000.00",
    legalBasis: "BIR RR 2-98 & RR 11-2018; not exceeding ₱5,000 per annum",
  },
  {
    code: "DEPENDENT_MEDICAL_CASH",
    name: "Medical Cash Allowance to Dependents",
    frequency: "PerSemester",
    maxTaxExemptAmount: "1500.00",
    legalBasis: "BIR RR 2-98 & RR 11-2018; not exceeding ₱1,500 per semester (₱250 per month)",
  },
  {
    code: "DAILY_MEAL_OVERTIME",
    name: "Daily Meal Allowance for Overtime / Night Duty",
    frequency: "Daily",
    maxTaxExemptAmount: "125.00",
    legalBasis: "BIR RR 2-98; not exceeding 25% of the basic minimum wage per region",
  },
];

/**
 * Statutory leave entitlements under Philippine Labor Code and special laws
 */
export interface StatutoryLeaveEntitlement {
  leaveCode: string;
  name: string;
  entitlementDays: number;
  isPaidByEmployer: boolean;
  legalBasis: string;
}

export const PHILIPPINE_STATUTORY_LEAVE_ENTITLEMENTS: StatutoryLeaveEntitlement[] = [
  {
    leaveCode: "SIL",
    name: "Service Incentive Leave",
    entitlementDays: 5,
    isPaidByEmployer: true,
    legalBasis: "Labor Code Art. 95; 5 days with pay after 1 year of continuous service, commutable to cash",
  },
  {
    leaveCode: "MATERNITY",
    name: "Maternity Leave",
    entitlementDays: 105,
    isPaidByEmployer: false, // Funded via SSS reimbursement / statutory benefit
    legalBasis: "Republic Act No. 11210 (105-Day Expanded Maternity Leave Law)",
  },
  {
    leaveCode: "PATERNITY",
    name: "Paternity Leave",
    entitlementDays: 7,
    isPaidByEmployer: true,
    legalBasis: "Republic Act No. 8187 (Paternity Leave Act of 1996); 7 days with full pay for married male employees",
  },
  {
    leaveCode: "SOLO_PARENT",
    name: "Parental Leave for Solo Parents",
    entitlementDays: 7,
    isPaidByEmployer: true,
    legalBasis: "Republic Act No. 8972 as amended by RA 11861; 7 days with full pay",
  },
  {
    leaveCode: "VAWC",
    name: "Battered Woman Leave",
    entitlementDays: 10,
    isPaidByEmployer: true,
    legalBasis: "Republic Act No. 9262 (Anti-Violence Against Women and Their Children Act); 10 days with full pay",
  },
  {
    leaveCode: "GYNECOLOGICAL",
    name: "Special Leave for Women (Gynecological Surgery)",
    entitlementDays: 60,
    isPaidByEmployer: true,
    legalBasis: "Republic Act No. 9710 (Magna Carta of Women); up to 2 months with full pay following surgery",
  },
];

/**
 * Legal Issuance Reference registry for audit and compliance
 */
export const PHILIPPINE_STATUTORY_LEGAL_REFERENCES = {
  sss: {
    governingAct: "Republic Act No. 11199 (Social Security Act of 2018)",
    circular: "SSS Circular No. 2024-006",
    effectiveYear: 2025,
    mandatoryCoverage: "All private sector employees up to age 60",
    contributions: "Total rate 14% (EE: 4.5%, ER: 9.5%), plus mandatory MPF/WISP and EC",
  },
  philHealth: {
    governingAct: "Republic Act No. 11223 (Universal Health Care Act)",
    circular: "PhilHealth Circular No. 2024-0001",
    effectiveYear: 2025,
    mandatoryCoverage: "All formal sector employees",
    contributions: "Total rate 5.0% (EE: 2.5%, ER: 2.5%), salary floor ₱10,000, ceiling ₱100,000",
  },
  pagIbig: {
    governingAct: "Republic Act No. 9679 (Home Development Mutual Fund Law of 2009)",
    circular: "HDMF Circular No. 460",
    effectiveYear: 2024,
    mandatoryCoverage: "All SSS-covered employees",
    contributions: "Rate 2% EE, 2% ER on monthly salary capped at ₱10,000 (Maximum mandatory ₱200 EE, ₱200 ER)",
  },
  withholdingTax: {
    governingAct: "Republic Act No. 10963 (Tax Reform for Acceleration and Inclusion - TRAIN Law)",
    regulations: "BIR Revenue Regulations No. 11-2018",
    effectiveYear: 2023,
    mandatoryCoverage: "Individual income tax withholding on compensation",
    brackets: "Graduated monthly rates (0% up to ₱20,833.33; 15% to 35% on excess brackets)",
  },
  thirteenthMonthPay: {
    governingAct: "Presidential Decree No. 851 (13th-Month Pay Law)",
    guidelines: "DOLE Labor Advisory No. 25, Series of 2023",
    formula: "Total Basic Salary Earned during the calendar year / 12",
    eligibility: "All rank-and-file employees who worked for at least 1 month during the calendar year",
    taxability: "Exempt from income tax and withholding tax up to ₱90,000 combined ceiling under Section 32(B)(7)(e) of NIRC",
  },
  laborCodeStandards: {
    governingAct: "Presidential Decree No. 442 (Labor Code of the Philippines)",
    overtime: "Article 87; +25% on regular day, +30% on rest day/holiday",
    nightShiftDiff: "Article 86; +10% for work between 10:00 PM and 6:00 AM",
    restDay: "Articles 91-93; +30% for work on scheduled rest day",
    holidays: "Article 94; +100% (total 200%) for regular holiday, +30% (total 130%) for special non-working holiday",
  },
};
