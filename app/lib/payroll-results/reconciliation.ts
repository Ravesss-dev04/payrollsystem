import type { PayrollBatchInput } from "./schemas";

const scale = 10_000n;

export function toUnits(value: string): bigint {
  const negative = value.startsWith("-");
  const unsigned = negative ? value.slice(1) : value;
  const [whole, fraction = ""] = unsigned.split(".");
  const result = BigInt(whole) * scale + BigInt(fraction.padEnd(4, "0"));
  return negative ? -result : result;
}

export function fromUnits(value: bigint): string {
  const sign = value < 0n ? "-" : "";
  const absolute = value < 0n ? -value : value;
  const whole = absolute / scale;
  const fraction = String(absolute % scale).padStart(4, "0").replace(/0+$/, "");
  return `${sign}${whole}${fraction ? `.${fraction}` : ""}`;
}

function sum(values: string[]): bigint {
  return values.reduce((total, value) => total + toUnits(value), 0n);
}

export function sumDecimalStrings(values: readonly string[]): string {
  return fromUnits(
    values.reduce((total, value) => total + toUnits(value), 0n),
  );
}

export function aggregatePayrollLinesByCategory(
  lines: readonly { category: string; amount: string }[],
): { category: string; amount: string }[] {
  const amountsByCategory = new Map<string, string[]>();
  for (const line of lines) {
    const amounts = amountsByCategory.get(line.category) ?? [];
    amounts.push(line.amount);
    amountsByCategory.set(line.category, amounts);
  }
  return [...amountsByCategory]
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([category, amounts]) => ({
      category,
      amount: sumDecimalStrings(amounts),
    }));
}

export function aggregatePayrollEarningsByCategory(
  lines: readonly { category: string; amount: string }[],
): { category: string; amount: string }[] {
  return aggregatePayrollLinesByCategory(
    lines.map((line) => ({
      ...line,
      category:
        line.category === "Bonus" || line.category === "Adjustment"
          ? "BonusesAndAdjustments"
          : line.category,
    })),
  );
}

export function aggregatePayrollAdditionalEarningsByCategory(
  lines: readonly { category: string; amount: string }[],
): { category: string; amount: string }[] {
  return aggregatePayrollEarningsByCategory(lines).filter(
    ({ category }) => category !== "BasicPay",
  );
}

export function aggregatePayrollDeductionLinesByCategory(
  lines: readonly { category: string; amount: string }[],
  configuredCategories: readonly string[] | null,
): { category: string; amount: string }[] {
  const configuredNames = new Map(
    (configuredCategories ?? []).map((category) => [
      category.toLocaleLowerCase("en-US"),
      category,
    ]),
  );
  return aggregatePayrollLinesByCategory(
    lines.map((line) => ({
      ...line,
      category:
        configuredNames.get(line.category.toLocaleLowerCase("en-US")) ??
        line.category,
    })),
  );
}

export function payrollBreakdownReconciles(
  lines: readonly { amount: string }[],
  authoritativeTotal: string,
): boolean {
  return (
    sumDecimalStrings(lines.map(({ amount }) => amount)) ===
    fromUnits(toUnits(authoritativeTotal))
  );
}

export function payrollNetPayReconciles(
  grossPay: string,
  totalDeductions: string,
  netPay: string,
): boolean {
  return toUnits(grossPay) - toUnits(totalDeductions) === toUnits(netPay);
}

export function payrollDeductionCategoryIssues(
  input: PayrollBatchInput,
  configuredCategories: readonly string[] | null,
): PayrollValidationIssue[] {
  if (!configuredCategories) {
    return [{
      employeeIndex: null,
      category: "DeductionConfiguration",
      severity: "Critical",
      title: "Active deduction categories are not configured",
      description:
        "An Admin-approved deduction category set is required to validate submitted deduction lines.",
      field: "deductions.category",
      actualValue: null,
      expectedValue: "An active Admin-approved category set",
      sourceReference: input.sourceReference,
    }];
  }

  const allowed = new Set(
    configuredCategories.map((category) => category.toLocaleLowerCase("en-US")),
  );
  const issues: PayrollValidationIssue[] = [];
  for (const [employeeIndex, employee] of input.employees.entries()) {
    for (const [lineIndex, line] of employee.deductions.entries()) {
      if (allowed.has(line.category.toLocaleLowerCase("en-US"))) continue;
      issues.push({
        employeeIndex,
        category: "DeductionConfiguration",
        severity: "Critical",
        title: "Deduction category is not configured",
        description:
          "The submitted deduction category is not in the active Admin-approved category set.",
        field: `deductions.${lineIndex}.category`,
        actualValue: line.category,
        expectedValue: "An active configured category",
        sourceReference: line.sourceReference,
      });
    }
  }
  return issues;
}

export type PayrollValidationIssue = {
  employeeIndex: number | null;
  category: string;
  severity: "Critical" | "High" | "Warning" | "Info";
  title: string;
  description: string;
  field: string | null;
  actualValue: string | null;
  expectedValue: string | null;
  sourceReference: string | null;
};

export function payrollEmployeeCountIssue(
  recordedCount: number,
  actualCount: number,
): PayrollValidationIssue | null {
  if (recordedCount === actualCount) return null;
  return {
    employeeIndex: null,
    category: "FinancialIntegrity",
    severity: "Critical",
    title: "Payroll employee count does not match included records",
    description:
      "The snapshot employee count does not match the employee payroll records stored for this version.",
    field: "employeeCount",
    actualValue: String(recordedCount),
    expectedValue: String(actualCount),
    sourceReference: null,
  };
}

function issue(
  issues: PayrollValidationIssue[],
  values: Omit<PayrollValidationIssue, "employeeIndex"> & {
    employeeIndex?: number | null;
  },
) {
  issues.push({ employeeIndex: null, ...values });
}

export function validatePayrollInput(
  input: PayrollBatchInput,
): PayrollValidationIssue[] {
  const issues: PayrollValidationIssue[] = [];

  for (const [index, employee] of input.employees.entries()) {
    const earningTotal = sum(employee.earnings.map((line) => line.amount));
    const deductionTotal = sum(employee.deductions.map((line) => line.amount));
    const rowPrefix = `Employee ${employee.employeeNumber}`;

    for (const [kind, lines] of [
      ["earning", employee.earnings],
      ["deduction", employee.deductions],
    ] as const) {
      const seen = new Set<string>();
      lines.forEach((line, lineIndex) => {
        const signature = JSON.stringify([
          kind === "deduction"
            ? line.category.toLocaleLowerCase("en-US")
            : line.category,
          line.label,
          line.amount,
          line.sourceReference,
        ]);
        if (seen.has(signature)) {
          issue(issues, {
            employeeIndex: index,
            category: "FinancialIntegrity",
            severity: "Critical",
            title: `Duplicate ${kind} line`,
            description: `${rowPrefix}: the same ${kind} line and source reference appears more than once.`,
            field: `${kind === "earning" ? "earnings" : "deductions"}.${lineIndex}`,
            actualValue: line.amount,
            expectedValue: "Each source line included once",
            sourceReference: line.sourceReference,
          });
        } else {
          seen.add(signature);
        }
      });
    }

    if (earningTotal !== toUnits(employee.grossPay)) {
      issue(issues, {
        employeeIndex: index,
        category: "FinancialReconciliation",
        severity: "Critical",
        title: "Employee earnings do not reconcile",
        description: `${rowPrefix}: submitted gross pay does not equal the sum of submitted earning lines.`,
        field: "grossPay",
        actualValue: employee.grossPay,
        expectedValue: fromUnits(earningTotal),
        sourceReference: employee.sourceReference,
      });
    }

    if (deductionTotal !== toUnits(employee.totalDeductions)) {
      issue(issues, {
        employeeIndex: index,
        category: "FinancialReconciliation",
        severity: "Critical",
        title: "Employee deductions do not reconcile",
        description: `${rowPrefix}: submitted deductions do not equal the sum of submitted deduction lines.`,
        field: "totalDeductions",
        actualValue: employee.totalDeductions,
        expectedValue: fromUnits(deductionTotal),
        sourceReference: employee.sourceReference,
      });
    }

    const expectedNet = toUnits(employee.grossPay) - toUnits(employee.totalDeductions);
    if (expectedNet !== toUnits(employee.netPay)) {
      issue(issues, {
        employeeIndex: index,
        category: "FinancialReconciliation",
        severity: "Critical",
        title: "Employee net pay does not reconcile",
        description: `${rowPrefix}: net pay does not equal gross pay less submitted employee deductions.`,
        field: "netPay",
        actualValue: employee.netPay,
        expectedValue: fromUnits(expectedNet),
        sourceReference: employee.sourceReference,
      });
    }

    if (toUnits(employee.netPay) < 0n) {
      issue(issues, {
        employeeIndex: index,
        category: "FinancialReconciliation",
        severity: "Critical",
        title: "Negative employee net pay",
        description: `${rowPrefix}: the submitted net pay is negative.`,
        field: "netPay",
        actualValue: employee.netPay,
        expectedValue: "0",
        sourceReference: employee.sourceReference,
      });
    }

    if (toUnits(employee.applicableRate) < 0n) {
      issue(issues, {
        employeeIndex: index,
        category: "Compensation",
        severity: "High",
        title: "Negative compensation rate",
        description: `${rowPrefix}: the submitted applicable rate is negative.`,
        field: "applicableRate",
        actualValue: employee.applicableRate,
        expectedValue: "0 or greater",
        sourceReference: employee.sourceReference,
      });
    }

    for (const [lineIndex, line] of employee.earnings.entries()) {
      if (toUnits(line.amount) < 0n) {
        issue(issues, {
          employeeIndex: index,
          category: "Compensation",
          severity: "High",
          title: "Negative earning component",
          description: `${rowPrefix}: earning line ${lineIndex + 1} has a negative amount.`,
          field: `earnings.${lineIndex}.amount`,
          actualValue: line.amount,
          expectedValue: "0 or greater",
          sourceReference: line.sourceReference,
        });
      }
    }

    for (const [lineIndex, line] of employee.deductions.entries()) {
      if (toUnits(line.amount) < 0n) {
        issue(issues, {
          employeeIndex: index,
          category: "Deduction",
          severity: "High",
          title: "Negative deduction",
          description: `${rowPrefix}: deduction line ${lineIndex + 1} has a negative amount.`,
          field: `deductions.${lineIndex}.amount`,
          actualValue: line.amount,
          expectedValue: "0 or greater",
          sourceReference: line.sourceReference,
        });
      }

      const isEmployerLiability =
        /\b(?:employer|er\b|ec\b|state\s*insurance)/i.test(line.label) ||
        /\b(?:employer|er\b|ec\b|state\s*insurance)/i.test(line.category);
      if (isEmployerLiability) {
        issue(issues, {
          employeeIndex: index,
          category: "DeductionConfiguration",
          severity: "Critical",
          title: "Employer contribution incorrectly included as employee deduction",
          description: `${rowPrefix}: deduction line "${line.label}" (${line.category}) is an employer contribution and must not be deducted from employee pay.`,
          field: `deductions.${lineIndex}`,
          actualValue: line.amount,
          expectedValue: "Excluded from employee deductions",
          sourceReference: line.sourceReference,
        });
      }
    }

    const workedDays = toUnits(employee.daysWorked ?? "0");
    const regularHrs = toUnits(employee.regularHours ?? "0");
    if (
      (workedDays > 0n || regularHrs > 0n) &&
      toUnits(employee.grossPay) === 0n &&
      toUnits(employee.applicableRate) > 0n
    ) {
      issue(issues, {
        employeeIndex: index,
        category: "FinancialValidation",
        severity: "Warning",
        title: "Unexpected zero gross pay with recorded working hours",
        description: `${rowPrefix}: employee has ${employee.daysWorked ?? 0} days worked and ${employee.regularHours ?? 0} regular hours, but gross pay is zero.`,
        field: "grossPay",
        actualValue: employee.grossPay,
        expectedValue: "Non-zero gross earnings for recorded working hours",
        sourceReference: employee.sourceReference,
      });
    }

    if (!employee.daysWorked || !employee.regularHours || !employee.overtimeHours) {
      issue(issues, {
        employeeIndex: index,
        category: "Attendance",
        severity: "High",
        title: "Attendance totals are incomplete",
        description: `${rowPrefix}: days worked, regular hours, and overtime hours must be supplied by the payroll source.`,
        field: "attendanceTotals",
        actualValue: null,
        expectedValue: "Submitted source totals",
        sourceReference: employee.sourceReference,
      });
    }

    if (!employee.attendance.length) {
      issue(issues, {
        employeeIndex: index,
        category: "Attendance",
        severity: "High",
        title: "Attendance evidence is missing",
        description: `${rowPrefix}: no attendance records were included in the submitted snapshot.`,
        field: "attendance",
        actualValue: "0 records",
        expectedValue: "Attendance evidence for the payroll period",
        sourceReference: employee.sourceReference,
      });
    }

    const seenAttendanceReferences = new Set<string>();
    for (const [attendanceIndex, record] of employee.attendance.entries()) {
      if (seenAttendanceReferences.has(record.sourceReference)) {
        issue(issues, {
          employeeIndex: index,
          category: "Attendance",
          severity: "Critical",
          title: "Duplicate attendance evidence",
          description: `${rowPrefix}: attendance source reference ${record.sourceReference} appears more than once.`,
          field: `attendance.${attendanceIndex}.sourceReference`,
          actualValue: record.sourceReference,
          expectedValue: "One attendance record per source reference",
          sourceReference: record.sourceReference,
        });
      } else {
        seenAttendanceReferences.add(record.sourceReference);
      }

      if (
        record.workDate < input.periodStart ||
        record.workDate > input.periodEnd
      ) {
        issue(issues, {
          employeeIndex: index,
          category: "Attendance",
          severity: "High",
          title: "Attendance date is outside the payroll period",
          description: `${rowPrefix}: attendance record ${record.sourceReference} falls outside the submitted payroll period.`,
          field: `attendance.${attendanceIndex}.workDate`,
          actualValue: record.workDate,
          expectedValue: `${input.periodStart} through ${input.periodEnd}`,
          sourceReference: record.sourceReference,
        });
      }
      if (
        record.timeIn &&
        record.timeOut &&
        Date.parse(record.timeOut) <= Date.parse(record.timeIn)
      ) {
        issue(issues, {
          employeeIndex: index,
          category: "Attendance",
          severity: "High",
          title: "Attendance time-out does not follow time-in",
          description: `${rowPrefix}: attendance record ${record.sourceReference} has a time-out that is not later than its time-in.`,
          field: `attendance.${attendanceIndex}`,
          actualValue: `${record.timeIn} / ${record.timeOut}`,
          expectedValue: "Time-out later than time-in",
          sourceReference: record.sourceReference,
        });
      }
      if (Boolean(record.timeIn) !== Boolean(record.timeOut)) {
        issue(issues, {
          employeeIndex: index,
          category: "Attendance",
          severity: "High",
          title: "Attendance punch pair is incomplete",
          description: `${rowPrefix}: attendance record ${record.sourceReference} has only one of time-in or time-out.`,
          field: `attendance.${attendanceIndex}`,
          actualValue: record.timeIn ?? record.timeOut,
          expectedValue: "Both time-in and time-out, or neither",
          sourceReference: record.sourceReference,
        });
      }
      if (record.timeIn && record.timeOut) {
        for (const [field, value] of [
          ["totalHours", record.totalHours],
          ["regularHours", record.regularHours],
          ["overtimeHours", record.overtimeHours],
        ] as const) {
          if (value !== null) continue;
          issue(issues, {
            employeeIndex: index,
            category: "Attendance",
            severity: "High",
            title: "Punched attendance hours are incomplete",
            description: `${rowPrefix}: attendance record ${record.sourceReference} includes punches but has no ${field} value.`,
            field: `attendance.${attendanceIndex}.${field}`,
            actualValue: null,
            expectedValue: "A recorded hour total",
            sourceReference: record.sourceReference,
          });
        }
      }
      if (record.exceptionDetails) {
        issue(issues, {
          employeeIndex: index,
          category: "Attendance",
          severity: "High",
          title: "Attendance exception reported",
          description: `${rowPrefix}: ${record.exceptionDetails}`,
          field: `attendance.${attendanceIndex}.exceptionDetails`,
          actualValue: record.exceptionDetails,
          expectedValue: "No unresolved attendance exception",
          sourceReference: record.sourceReference,
        });
      }
      if (record.approvalStatus !== "Approved") {
        issue(issues, {
          employeeIndex: index,
          category: "Attendance",
          severity: "High",
          title: "Attendance is not reported as approved",
          description: `${rowPrefix}: attendance record ${record.sourceReference} has approval status ${record.approvalStatus}.`,
          field: `attendance.${attendanceIndex}.approvalStatus`,
          actualValue: record.approvalStatus ?? "Not supplied",
          expectedValue: "Approved",
          sourceReference: record.sourceReference,
        });
      }
      if (
        record.overtimeHours &&
        toUnits(record.overtimeHours) > 0n &&
        record.approvalStatus !== "Approved"
      ) {
        issue(issues, {
          employeeIndex: index,
          category: "Attendance",
          severity: "High",
          title: "Unapproved overtime attendance",
          description: `${rowPrefix}: attendance record ${record.sourceReference} includes ${record.overtimeHours} overtime hours without verified approval status.`,
          field: `attendance.${attendanceIndex}.overtimeHours`,
          actualValue: record.overtimeHours,
          expectedValue: "Approved overtime record",
          sourceReference: record.sourceReference,
        });
      }
      const validClassifications = new Set([
        "present",
        "regular",
        "restday",
        "rest_day",
        "rest-day",
        "regularholiday",
        "regular_holiday",
        "specialholiday",
        "specialnonworking",
        "special_non_working",
        "special-non-working",
        "leave",
        "absent",
        "holiday",
        "unworkedholiday",
        "unworked_holiday",
      ]);
      if (
        record.classification &&
        !validClassifications.has(
          record.classification.toLowerCase().replace(/[\s_-]+/g, ""),
        )
      ) {
        issue(issues, {
          employeeIndex: index,
          category: "Attendance",
          severity: "Warning",
          title: "Invalid holiday or rest-day classification",
          description: `${rowPrefix}: attendance record ${record.sourceReference} has unrecognized classification "${record.classification}".`,
          field: `attendance.${attendanceIndex}.classification`,
          actualValue: record.classification,
          expectedValue:
            "Standard attendance classification (e.g., Present, RestDay, RegularHoliday)",
          sourceReference: record.sourceReference,
        });
      }
      if (
        !record.timeIn &&
        !record.timeOut &&
        !record.classification &&
        !record.exceptionDetails
      ) {
        issue(issues, {
          employeeIndex: index,
          category: "Attendance",
          severity: "High",
          title: "Attendance punches or classification are missing",
          description: `${rowPrefix}: attendance record ${record.sourceReference} has no punches or recorded classification.`,
          field: `attendance.${attendanceIndex}`,
          actualValue: "No punches or classification",
          expectedValue: "Recorded punches or an explicit classification",
          sourceReference: record.sourceReference,
        });
      }
    }

    for (const field of ["regularHours", "overtimeHours"] as const) {
      const employeeTotal = employee[field];
      const attendanceValues = employee.attendance.map(
        (record) => record[field],
      );
      const completeValues = attendanceValues.filter(
        (value): value is string => value !== null,
      );
      if (
        employeeTotal === null ||
        attendanceValues.length === 0 ||
        completeValues.length !== attendanceValues.length
      ) {
        continue;
      }
      const attendanceTotal = sum(completeValues);
      if (toUnits(employeeTotal) === attendanceTotal) continue;
      issue(issues, {
        employeeIndex: index,
        category: "Attendance",
        severity: "High",
        title: `Employee ${field} does not match attendance evidence`,
        description: `${rowPrefix}: the employee-level ${field} total does not equal the sum of the submitted attendance records.`,
        field,
        actualValue: employeeTotal,
        expectedValue: fromUnits(attendanceTotal),
        sourceReference: employee.sourceReference,
      });
    }

    for (const [adjustmentIndex, adjustment] of employee.adjustments.entries()) {
      if (
        adjustment.status !== "Approved" ||
        !adjustment.approvedBy ||
        !adjustment.approvedAt
      ) {
        issue(issues, {
          employeeIndex: index,
          category: "Adjustment",
          severity: "High",
          title: "Adjustment approval evidence is incomplete",
          description: `${rowPrefix}: adjustment ${adjustment.adjustmentReference} lacks a complete reported approval record.`,
          field: `adjustments.${adjustmentIndex}`,
          actualValue: adjustment.status,
          expectedValue: "Approved with approver and timestamp",
          sourceReference: adjustment.sourceReference,
        });
      }

      if (!adjustment.reason || !adjustment.reason.trim()) {
        issue(issues, {
          employeeIndex: index,
          category: "Adjustment",
          severity: "High",
          title: "Adjustment reason is missing",
          description: `${rowPrefix}: adjustment ${adjustment.adjustmentReference} has no recorded business reason.`,
          field: `adjustments.${adjustmentIndex}.reason`,
          actualValue: null,
          expectedValue: "Valid business reason for adjustment",
          sourceReference: adjustment.sourceReference,
        });
      }

      if (toUnits(adjustment.amount) <= 0n) {
        issue(issues, {
          employeeIndex: index,
          category: "Adjustment",
          severity: "High",
          title: "Invalid adjustment amount",
          description: `${rowPrefix}: adjustment ${adjustment.adjustmentReference} amount must be greater than zero.`,
          field: `adjustments.${adjustmentIndex}.amount`,
          actualValue: adjustment.amount,
          expectedValue: "Positive monetary amount",
          sourceReference: adjustment.sourceReference,
        });
      }
    }
  }

  // Cross-batch duplicate adjustmentReference detection
  const seenAdjustmentRefs = new Map<string, number>();
  for (const [index, employee] of input.employees.entries()) {
    for (const [adjustmentIndex, adjustment] of employee.adjustments.entries()) {
      const ref = adjustment.adjustmentReference;
      if (seenAdjustmentRefs.has(ref)) {
        issue(issues, {
          employeeIndex: index,
          category: "Adjustment",
          severity: "High",
          title: "Duplicate adjustment reference across employees",
          description: `Employee at index ${index} has adjustment ${ref} which also appears on employee at index ${seenAdjustmentRefs.get(ref)}.`,
          field: `adjustments.${adjustmentIndex}.adjustmentReference`,
          actualValue: ref,
          expectedValue: "Unique adjustment reference per batch",
          sourceReference: adjustment.sourceReference,
        });
      } else {
        seenAdjustmentRefs.set(ref, index);
      }
    }
  }

  const gross = sum(input.employees.map((employee) => employee.grossPay));
  const deductions = sum(
    input.employees.map((employee) => employee.totalDeductions),
  );
  const net = sum(input.employees.map((employee) => employee.netPay));

  for (const [field, actual, expected] of [
    ["grossPayable", input.grossPayable, gross],
    ["totalDeductions", input.totalDeductions, deductions],
    ["netPayable", input.netPayable, net],
  ] as const) {
    if (toUnits(actual) !== expected) {
      issue(issues, {
        category: "FinancialReconciliation",
        severity: "Critical",
        title: `Batch ${field} does not reconcile`,
        description: `The submitted batch ${field} does not equal the sum of employee payroll results.`,
        field,
        actualValue: actual,
        expectedValue: fromUnits(expected),
        sourceReference: input.sourceReference,
      });
    }
  }

  return issues;
}