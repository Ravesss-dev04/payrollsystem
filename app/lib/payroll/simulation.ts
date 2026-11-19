import {
  type FullPayrollConfiguration,
} from "./company-config";
import {
  calculateEmployeePayroll,
  type CompanyPayrollPolicy,
  type EmployeeCompensationInput,
} from "./calculator";
import { toDecimalUnits, fromDecimalUnits } from "./formula-engine";

export interface SimulationResult {
  currentGross: string;
  proposedGross: string;
  diffGross: string;
  currentDeductions: string;
  proposedDeductions: string;
  diffDeductions: string;
  currentNetPay: string;
  proposedNetPay: string;
  diffNetPay: string;
  currentEmployerContribution: string;
  proposedEmployerContribution: string;
  diffEmployerContribution: string;
  currentBenefitAccrual: string;
  proposedBenefitAccrual: string;
  diffBenefitAccrual: string;
  affectedEmployeesCount: number;
  sampleCount: number;
  estimatedAggregateFinancialImpact: string;
}

export function simulateConfigurationImpact(
  currentConfig: FullPayrollConfiguration,
  proposedConfig: FullPayrollConfiguration,
  sampleEmployees?: EmployeeCompensationInput[],
): SimulationResult {
  // Use provided sample or standard synthetic representative pool
  const pool: EmployeeCompensationInput[] = sampleEmployees ?? [
    {
      employeeId: "sim-1",
      employeeNumber: "SIM-01",
      employeeName: "Junior Staff",
      department: "Support",
      compensationBasis: "Monthly",
      applicableRate: "20000.00",
      daysWorked: "22",
      regularHours: "176",
      overtimeHours: "5",
    },
    {
      employeeId: "sim-2",
      employeeNumber: "SIM-02",
      employeeName: "Mid Staff",
      department: "Operations",
      compensationBasis: "Monthly",
      applicableRate: "30000.00",
      daysWorked: "22",
      regularHours: "176",
      overtimeHours: "10",
      nightDifferentialHours: "4",
    },
    {
      employeeId: "sim-3",
      employeeNumber: "SIM-03",
      employeeName: "Senior Lead",
      department: "Engineering",
      compensationBasis: "Monthly",
      applicableRate: "65000.00",
      daysWorked: "22",
      regularHours: "176",
      overtimeHours: "0",
    },
    {
      employeeId: "sim-4",
      employeeNumber: "SIM-04",
      employeeName: "Daily Worker",
      department: "Logistics",
      compensationBasis: "Daily",
      applicableRate: "800.00",
      daysWorked: "20",
      regularHours: "160",
    },
  ];

  const currentPolicy: CompanyPayrollPolicy = {
    monthlyToDailyDivisor: currentConfig.settings.monthlyToDailyDivisor,
    dailyToHourlyDivisor: currentConfig.settings.dailyToHourlyDivisor,
    workingDaysPerWeek: currentConfig.settings.workingDaysPerWeek,
    overtimeEnabled: true,
    nightDifferentialEnabled: true,
    roundingPolicy: currentConfig.settings.roundingPolicy,
    roundingDecimals: currentConfig.settings.roundingDecimals,
  };

  const proposedPolicy: CompanyPayrollPolicy = {
    monthlyToDailyDivisor: proposedConfig.settings.monthlyToDailyDivisor,
    dailyToHourlyDivisor: proposedConfig.settings.dailyToHourlyDivisor,
    workingDaysPerWeek: proposedConfig.settings.workingDaysPerWeek,
    overtimeEnabled: true,
    nightDifferentialEnabled: true,
    roundingPolicy: proposedConfig.settings.roundingPolicy,
    roundingDecimals: proposedConfig.settings.roundingDecimals,
  };

  let curGross = 0n;
  let propGross = 0n;
  let curDed = 0n;
  let propDed = 0n;
  let curNet = 0n;
  let propNet = 0n;
  let curEr = 0n;
  let propEr = 0n;
  let curBen = 0n;
  let propBen = 0n;

  let affectedCount = 0;

  for (const emp of pool) {
    const curRes = calculateEmployeePayroll(emp, currentPolicy);
    const propRes = calculateEmployeePayroll(emp, proposedPolicy);

    curGross += toDecimalUnits(curRes.grossPay);
    propGross += toDecimalUnits(propRes.grossPay);
    curDed += toDecimalUnits(curRes.totalDeductions);
    propDed += toDecimalUnits(propRes.totalDeductions);
    curNet += toDecimalUnits(curRes.netPay);
    propNet += toDecimalUnits(propRes.netPay);
    curEr += toDecimalUnits(curRes.employerContributions);
    propEr += toDecimalUnits(propRes.employerContributions);
    curBen += toDecimalUnits(curRes.thirteenthMonthAccrual);
    propBen += toDecimalUnits(propRes.thirteenthMonthAccrual);

    if (
      curRes.grossPay !== propRes.grossPay ||
      curRes.totalDeductions !== propRes.totalDeductions ||
      curRes.netPay !== propRes.netPay ||
      curRes.employerContributions !== propRes.employerContributions
    ) {
      affectedCount++;
    }
  }

  const diffGrossUnits = propGross - curGross;
  const diffDedUnits = propDed - curDed;
  const diffNetUnits = propNet - curNet;
  const diffErUnits = propEr - curEr;
  const diffBenUnits = propBen - curBen;
  const aggregateImpactUnits = diffNetUnits + diffErUnits;

  return {
    currentGross: fromDecimalUnits(curGross),
    proposedGross: fromDecimalUnits(propGross),
    diffGross: fromDecimalUnits(diffGrossUnits),
    currentDeductions: fromDecimalUnits(curDed),
    proposedDeductions: fromDecimalUnits(propDed),
    diffDeductions: fromDecimalUnits(diffDedUnits),
    currentNetPay: fromDecimalUnits(curNet),
    proposedNetPay: fromDecimalUnits(propNet),
    diffNetPay: fromDecimalUnits(diffNetUnits),
    currentEmployerContribution: fromDecimalUnits(curEr),
    proposedEmployerContribution: fromDecimalUnits(propEr),
    diffEmployerContribution: fromDecimalUnits(diffErUnits),
    currentBenefitAccrual: fromDecimalUnits(curBen),
    proposedBenefitAccrual: fromDecimalUnits(propBen),
    diffBenefitAccrual: fromDecimalUnits(diffBenUnits),
    affectedEmployeesCount: affectedCount,
    sampleCount: pool.length,
    estimatedAggregateFinancialImpact: fromDecimalUnits(aggregateImpactUnits),
  };
}
