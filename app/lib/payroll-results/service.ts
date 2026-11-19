import "server-only";
import { createHash } from "node:crypto";
import { Prisma } from "../../generated/prisma/client";
import { writeDomainAuditEvent } from "../audit/domain-audit";
import { hasPermission, type Permission } from "../auth/authorization";
import type { SessionPrincipal } from "../auth/session-policy";
import { prisma } from "../db";
import {
  getActiveDeductionCategorySetForSubmission,
  parseStoredDeductionCategoryNames,
} from "../payroll/deduction-categories-service.server";
import {
  getOrganizationSettings,
  ORGANIZATION_ID,
} from "../organization/service";
import {
  payrollBatchIdSchema,
  payrollBatchInputSchema,
  payrollDecisionInputSchema,
  payrollBatchListInputSchema,
  payrollEmployeeListInputSchema,
  payrollCompensationBasisSchema,
  type PayrollBatchInput,
  type PayrollDecisionInput,
  type PayrollBatchListInput,
  type PayrollEmployeeListInput,
} from "./schemas";
import {
  aggregatePayrollAdditionalEarningsByCategory,
  aggregatePayrollEarningsByCategory,
  aggregatePayrollDeductionLinesByCategory,
  payrollBreakdownReconciles,
  payrollDeductionCategoryIssues,
  payrollEmployeeCountIssue,
  payrollNetPayReconciles,
  sumDecimalStrings,
  validatePayrollInput,
  type PayrollValidationIssue,
} from "./reconciliation";
import { recordBatchTimelineEvent } from "./timeline-service.server";
import { createDisbursementHandoff } from "./disbursement-service.server";
import {
  notifyHrPayrollApproval,
  notifyHrPayrollReturned,
  notifyHrPayrollRejected,
} from "./payroll-notifications.server";
import {
  payrollEmployeeDetailResponseSchema,
  payrollEmployeeListResponseSchema,
} from "./views";

export class PayrollServiceError extends Error {
  constructor(
    public readonly code:
      | "forbidden"
      | "invalid_request"
      | "batch_not_found"
      | "version_not_found"
      | "batch_number_conflict"
      | "version_conflict"
      | "employee_not_found"
      | "payroll_data_invalid"
      | "validation_blocked",
    public readonly status: 400 | 403 | 404 | 409 | 500,
  ) {
    super(code);
  }
}

function requirePermission(
  actor: SessionPrincipal,
  permission: Permission,
): void {
  if (
    !hasPermission({
      role: actor.role,
      permission,
      actorId: actor.userId,
      grantedPermissions: actor.grantedPermissions,
      deniedPermissions: actor.deniedPermissions,
    })
  ) {
    throw new PayrollServiceError("forbidden", 403);
  }
}

function localDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function dateValue(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function isPrismaError(error: unknown, code: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === code
  );
}

function inputVersionData(input: PayrollBatchInput, actor: SessionPrincipal) {
  return {
    periodStart: dateValue(input.periodStart),
    periodEnd: dateValue(input.periodEnd),
    cutoffReference: input.cutoffReference,
    currencyCode: input.currencyCode,
    sourceReference: input.sourceReference,
    sourceCalculatedAt: input.sourceCalculatedAt
      ? new Date(input.sourceCalculatedAt)
      : null,
    preparedByUserId: actor.userId,
    employeeCount: input.employees.length,
    grossPayable: input.grossPayable,
    totalDeductions: input.totalDeductions,
    netPayable: input.netPayable,
    employerContributions: input.employerContributions,
    laborCost: input.laborCost,
    overtimeCost: input.overtimeCost,
  };
}

function addDatabaseIssues(
  input: PayrollBatchInput,
  knownEmployees: ReadonlyMap<string, string>,
  issues: PayrollValidationIssue[],
): void {
  for (const [employeeIndex, employee] of input.employees.entries()) {
    const employeeNumber = knownEmployees.get(employee.employeeId);
    if (!employeeNumber) {
      issues.push({
        employeeIndex,
        category: "EmployeeRecord",
        severity: "Critical",
        title: "Employee record is missing",
        description: `Employee reference ${employee.employeeNumber} does not match an employee record in this application.`,
        field: "employeeId",
        actualValue: employee.employeeId,
        expectedValue: "Existing employee record",
        sourceReference: employee.sourceReference,
      });
    } else if (employeeNumber !== employee.employeeNumber) {
      issues.push({
        employeeIndex,
        category: "EmployeeRecord",
        severity: "Critical",
        title: "Employee number does not match the employee record",
        description: `Employee reference ${employee.employeeNumber} does not match the number on the linked employee record.`,
        field: "employeeNumber",
        actualValue: employee.employeeNumber,
        expectedValue: employeeNumber,
        sourceReference: employee.sourceReference,
      });
    }
  }
}

function issueFingerprint(
  issue: PayrollValidationIssue,
  input: PayrollBatchInput,
): string {
  const employeeReference =
    issue.employeeIndex === null
      ? null
      : input.employees[issue.employeeIndex]?.employeeId ?? null;
  return createHash("sha256")
    .update(
      JSON.stringify([
        employeeReference,
        issue.category,
        issue.title,
        issue.field,
        issue.sourceReference,
      ]),
    )
    .digest("hex");
}

async function saveIssues(
  transaction: Prisma.TransactionClient,
  payrollVersionId: string,
  input: PayrollBatchInput,
  employeeRows: { id: string; employeeReference: string }[],
  issues: PayrollValidationIssue[],
): Promise<void> {
  const rowByReference = new Map(
    employeeRows.map((row) => [row.employeeReference, row.id]),
  );

  const existingExceptions =
    await transaction.payrollValidationException.findMany({
      where: { payrollVersionId },
      select: { id: true, fingerprint: true, resolvedAt: true },
    });

  const currentFingerprints = new Map(
    issues.map((issue) => [issueFingerprint(issue, input), issue]),
  );

  const now = new Date();

  // Mark existing exceptions as resolved if the issue is no longer present after correction and re-validation
  for (const existing of existingExceptions) {
    if (!currentFingerprints.has(existing.fingerprint)) {
      if (!existing.resolvedAt) {
        await transaction.payrollValidationException.update({
          where: { id: existing.id },
          data: {
            resolvedAt: now,
            resolutionDetails:
              "Issue confirmed resolved: underlying source record corrected and verified by re-validation.",
          },
        });
      }
    } else {
      // Re-link employeeResultId if missing
      const issue = currentFingerprints.get(existing.fingerprint);
      const employeeReference =
        issue && issue.employeeIndex !== null
          ? input.employees[issue.employeeIndex]?.employeeId
          : null;
      const targetRowId = employeeReference
        ? (rowByReference.get(employeeReference) ?? null)
        : null;
      await transaction.payrollValidationException.update({
        where: { id: existing.id },
        data: {
          employeeResultId: targetRowId,
          resolvedAt: null,
          resolutionDetails: null,
        },
      });
    }
  }

  // Insert newly detected issues
  const existingFingerprintSet = new Set(
    existingExceptions.map((e) => e.fingerprint),
  );
  const newIssues = issues.filter(
    (issue) => !existingFingerprintSet.has(issueFingerprint(issue, input)),
  );

  if (newIssues.length) {
    await transaction.payrollValidationException.createMany({
      data: newIssues.map((item) => {
        const employeeReference =
          item.employeeIndex === null
            ? null
            : input.employees[item.employeeIndex]?.employeeId;
        return {
          payrollVersionId,
          employeeResultId: employeeReference
            ? (rowByReference.get(employeeReference) ?? null)
            : null,
          fingerprint: issueFingerprint(item, input),
          category: item.category,
          severity: item.severity,
          title: item.title,
          description: item.description,
          field: item.field,
          actualValue: item.actualValue,
          expectedValue: item.expectedValue,
          sourceReference: item.sourceReference,
        };
      }),
      skipDuplicates: true,
    });
  }
}

async function knownEmployeeIds(
  transaction: Prisma.TransactionClient,
  input: PayrollBatchInput,
): Promise<Map<string, string>> {
  const employees = await transaction.employee.findMany({
    where: { id: { in: input.employees.map(({ employeeId }) => employeeId) } },
    select: { id: true, employeeNumber: true },
  });
  return new Map(
    employees.map(({ id, employeeNumber }) => [id, employeeNumber]),
  );
}

const snapshotInclude = {
  batch: { select: { id: true, batchNumber: true } },
  preparedBy: { select: { name: true } },
  submittedBy: { select: { name: true } },
  deductionCategorySet: { select: { version: true, categories: true } },
  disbursementRecord: true,
  employees: {
    orderBy: { employeeNumber: "asc" },
    include: {
      employee: { select: { employeeNumber: true } },
      earnings: { orderBy: [{ category: "asc" }, { label: "asc" }] },
      deductions: { orderBy: [{ category: "asc" }, { label: "asc" }] },
      attendance: { orderBy: [{ workDate: "asc" }, { sourceReference: "asc" }] },
      adjustments: {
        orderBy: [{ adjustmentReference: "asc" }],
      },
    },
  },
  exceptions: {
    orderBy: [{ severity: "asc" }, { detectedAt: "asc" }],
  },
  decisions: {
    orderBy: { createdAt: "asc" },
    include: { actor: { select: { name: true } } },
  },
} satisfies Prisma.PayrollBatchVersionInclude;

type PayrollSnapshot = Prisma.PayrollBatchVersionGetPayload<{
  include: typeof snapshotInclude;
}>;

function decimalText(value: Prisma.Decimal | null): string | null {
  return value?.toString() ?? null;
}

function aggregatePayrollLines(
  employees: PayrollSnapshot["employees"],
  lineType: "earnings" | "deductions",
  configuredDeductionCategories: readonly string[] | null = null,
) {
  const lines = employees.flatMap((employee) =>
    employee[lineType].map((line) => ({
      category: line.category,
      amount: line.amount.toString(),
    })),
  );
  return lineType === "earnings"
    ? aggregatePayrollEarningsByCategory(lines)
    : aggregatePayrollDeductionLinesByCategory(
        lines,
        configuredDeductionCategories,
      );
}

const submittedPayrollStatuses = new Set([
  "PendingAdminApproval",
  "Approved",
  "Rejected",
  "Returned",
  "Processing",
  "Processed",
]);

async function getSubmittedPayrollVersion(
  actor: SessionPrincipal,
  batchIdValue: string,
  versionValue: number,
) {
  requirePermission(actor, "payroll:read");
  if (actor.role !== "admin") {
    throw new PayrollServiceError("forbidden", 403);
  }
  const batchId = payrollBatchIdSchema.safeParse(batchIdValue);
  if (
    !batchId.success ||
    !Number.isSafeInteger(versionValue) ||
    versionValue < 1 ||
    versionValue > 2_147_483_647
  ) {
    throw new PayrollServiceError("invalid_request", 400);
  }

  const version = await prisma.payrollBatchVersion.findUnique({
    where: { batchId_version: { batchId: batchId.data, version: versionValue } },
    select: {
      id: true,
      version: true,
      status: true,
      periodStart: true,
      periodEnd: true,
      currencyCode: true,
      organizationNameSnapshot: true,
      timeZoneSnapshot: true,
      submittedAt: true,
      submittedByUserId: true,
      batch: { select: { batchNumber: true } },
      deductionCategorySet: { select: { categories: true } },
    },
  });
  if (!version) throw new PayrollServiceError("version_not_found", 404);
  if (
    !submittedPayrollStatuses.has(version.status) ||
    !version.submittedAt ||
    !version.submittedByUserId
  ) {
    throw new PayrollServiceError("version_conflict", 409);
  }
  return version;
}

type PayrollEmployeeWithLines = Prisma.PayrollEmployeeResultGetPayload<{
  include: { earnings: true; deductions: true };
}>;

function payrollEmployeeListItem(
  employee: PayrollEmployeeWithLines,
  configuredDeductionCategories: readonly string[] | null,
) {
  const compensationBasis = payrollCompensationBasisSchema.safeParse(
    employee.compensationBasis,
  );
  if (!compensationBasis.success) {
    throw new PayrollServiceError("payroll_data_invalid", 500);
  }
  const additionalEarnings = aggregatePayrollAdditionalEarningsByCategory(
    employee.earnings.map((line) => ({
      category: line.category,
      amount: line.amount.toString(),
    })),
  );
  const deductions = aggregatePayrollDeductionLinesByCategory(
    employee.deductions.map((line) => ({
      category: line.category,
      amount: line.amount.toString(),
    })),
    configuredDeductionCategories,
  );
  return {
    employeeId: employee.employeeReference,
    employeeNumber: employee.employeeNumber,
    employeeName: employee.employeeName,
    profileImageUrl: null,
    department: employee.department,
    position: employee.position,
    daysWorked: decimalText(employee.daysWorked),
    compensationBasis: compensationBasis.data,
    applicableRate: employee.applicableRate.toString(),
    additionalEarnings,
    additionalEarningsTotal: sumDecimalStrings(
      additionalEarnings.map(({ amount }) => amount),
    ),
    totalDeductions: employee.totalDeductions.toString(),
    deductions,
    netAmount: employee.netPay.toString(),
  };
}

function payrollEmployeeBatchSummary(version: Awaited<
  ReturnType<typeof getSubmittedPayrollVersion>
>) {
  return {
    batchNumber: version.batch.batchNumber,
    version: version.version,
    status: version.status,
    periodStart: localDate(version.periodStart),
    periodEnd: localDate(version.periodEnd),
    currencyCode: version.currencyCode,
    organizationName: version.organizationNameSnapshot,
    timeZone: version.timeZoneSnapshot,
  };
}

export async function listPayrollBatchEmployees(
  actor: SessionPrincipal,
  batchIdValue: string,
  rawInput: PayrollEmployeeListInput,
) {
  const input = payrollEmployeeListInputSchema.safeParse(rawInput);
  if (!input.success) throw new PayrollServiceError("invalid_request", 400);
  const version = await getSubmittedPayrollVersion(
    actor,
    batchIdValue,
    input.data.version,
  );
  const where: Prisma.PayrollEmployeeResultWhereInput = {
    payrollVersionId: version.id,
    ...(input.data.compensationBasis
      ? { compensationBasis: input.data.compensationBasis }
      : {}),
    ...(input.data.query
      ? {
          OR: [
            { employeeReference: { contains: input.data.query } },
            { employeeNumber: { contains: input.data.query } },
            { employeeName: { contains: input.data.query } },
            { department: { contains: input.data.query } },
            { position: { contains: input.data.query } },
          ],
        }
      : {}),
  };
  const [total, employees] = await prisma.$transaction([
    prisma.payrollEmployeeResult.count({ where }),
    prisma.payrollEmployeeResult.findMany({
      where,
      orderBy: [{ employeeNumber: "asc" }, { employeeReference: "asc" }],
      skip: (input.data.page - 1) * input.data.pageSize,
      take: input.data.pageSize,
      include: { earnings: true, deductions: true },
    }),
  ]);
  const configuredDeductionCategories = version.deductionCategorySet
    ? parseStoredDeductionCategoryNames(
        version.deductionCategorySet.categories,
      )
    : null;
  const response = payrollEmployeeListResponseSchema.safeParse({
    batch: payrollEmployeeBatchSummary(version),
    sourceStatus:
      "Submitted HR snapshot; not independently verified or approved",
    items: employees.map((employee) =>
      payrollEmployeeListItem(employee, configuredDeductionCategories),
    ),
    page: input.data.page,
    pageSize: input.data.pageSize,
    total,
  });
  if (!response.success) {
    throw new PayrollServiceError("payroll_data_invalid", 500);
  }
  return response.data;
}

export async function getPayrollBatchEmployee(
  actor: SessionPrincipal,
  batchIdValue: string,
  versionValue: number,
  employeeIdValue: string,
) {
  const version = await getSubmittedPayrollVersion(
    actor,
    batchIdValue,
    versionValue,
  );
  const employeeId = payrollBatchIdSchema.safeParse(employeeIdValue);
  if (!employeeId.success) {
    throw new PayrollServiceError("invalid_request", 400);
  }
  const employee = await prisma.payrollEmployeeResult.findFirst({
    where: {
      payrollVersionId: version.id,
      employeeReference: employeeId.data,
    },
    include: {
      earnings: { orderBy: [{ category: "asc" }, { label: "asc" }] },
      deductions: { orderBy: [{ category: "asc" }, { label: "asc" }] },
      attendance: { orderBy: [{ workDate: "asc" }, { sourceReference: "asc" }] },
      adjustments: { orderBy: [{ adjustmentReference: "asc" }] },
      exceptions: { orderBy: [{ severity: "asc" }, { detectedAt: "asc" }] },
      employee: {
        select: {
          user: {
            select: { id: true, profileImageKey: true },
          },
        },
      },
    },
  });
  if (!employee) throw new PayrollServiceError("employee_not_found", 404);
  const configuredDeductionCategories = version.deductionCategorySet
    ? parseStoredDeductionCategoryNames(
        version.deductionCategorySet.categories,
      )
    : null;
  const item = payrollEmployeeListItem(employee, configuredDeductionCategories);
  const earnings = employee.earnings.map((line) => ({
    category: line.category,
    amount: line.amount.toString(),
  }));
  const earningsBreakdown = aggregatePayrollEarningsByCategory(earnings);
  const grossPay = employee.grossPay.toString();
  const totalDeductions = employee.totalDeductions.toString();
  const netPay = employee.netPay.toString();
  const canReadProfileImage = hasPermission({
    role: actor.role,
    permission: "users:read",
    actorId: actor.userId,
    grantedPermissions: actor.grantedPermissions,
    deniedPermissions: actor.deniedPermissions,
  });
  const profileImageUser = employee.employee?.user;

  const response = payrollEmployeeDetailResponseSchema.safeParse({
    batch: payrollEmployeeBatchSummary(version),
    sourceStatus:
      "Submitted HR snapshot; not independently verified or approved",
    employee: {
      ...item,
      profileImageUrl:
        canReadProfileImage && profileImageUser?.profileImageKey
          ? `/api/admin/users/${encodeURIComponent(profileImageUser.id)}/profile-image`
          : null,
      grossPay,
      earningsBreakdown,
      financialReconciliation: {
        earnings: payrollBreakdownReconciles(earningsBreakdown, grossPay),
        deductions: payrollBreakdownReconciles(
          item.deductions,
          totalDeductions,
        ),
        netPay: payrollNetPayReconciles(
          grossPay,
          totalDeductions,
          netPay,
        ),
      },
      regularHours: decimalText(employee.regularHours),
      overtimeHours: decimalText(employee.overtimeHours),
      sourceReference: employee.sourceReference,
      earnings: employee.earnings.map((line) => ({
        category: line.category,
        label: line.label,
        amount: line.amount.toString(),
        sourceReference: line.sourceReference,
      })),
      deductionLines: employee.deductions.map((line) => ({
        category: line.category,
        label: line.label,
        amount: line.amount.toString(),
        sourceReference: line.sourceReference,
      })),
      attendance: employee.attendance.map((record) => ({
        sourceReference: record.sourceReference,
        workDate: localDate(record.workDate),
        timeIn: record.timeIn?.toISOString() ?? null,
        timeOut: record.timeOut?.toISOString() ?? null,
        totalHours: decimalText(record.totalHours),
        regularHours: decimalText(record.regularHours),
        overtimeHours: decimalText(record.overtimeHours),
        nightDifferentialHours: decimalText(record.nightDifferentialHours),
        classification: record.classification,
        approvalStatus: record.approvalStatus,
        exceptionDetails: record.exceptionDetails,
      })),
      adjustments: employee.adjustments.map((adjustment) => ({
        adjustmentReference: adjustment.adjustmentReference,
        adjustmentType: adjustment.adjustmentType,
        amount: adjustment.amount.toString(),
        reason: adjustment.reason,
        requestedBy: adjustment.requestedBy,
        approvedBy: adjustment.approvedBy,
        approvedAt: adjustment.approvedAt?.toISOString() ?? null,
        status: adjustment.status,
      })),
      exceptions: employee.exceptions.map((exception) => ({
        category: exception.category,
        severity: exception.severity,
        title: exception.title,
        description: exception.description,
        field: exception.field,
        actualValue: exception.actualValue,
        expectedValue: exception.expectedValue,
        sourceReference: exception.sourceReference,
        detectedAt: exception.detectedAt.toISOString(),
        resolvedAt: exception.resolvedAt?.toISOString() ?? null,
        resolutionDetails: exception.resolutionDetails,
      })),
    },
  });
  if (!response.success) {
    throw new PayrollServiceError("payroll_data_invalid", 500);
  }
  return response.data;
}

function snapshotInput(snapshot: PayrollSnapshot): PayrollBatchInput {
  return payrollBatchInputSchema.parse({
    batchNumber: snapshot.batch.batchNumber,
    periodStart: localDate(snapshot.periodStart),
    periodEnd: localDate(snapshot.periodEnd),
    cutoffReference: snapshot.cutoffReference,
    currencyCode: snapshot.currencyCode,
    sourceReference: snapshot.sourceReference,
    sourceCalculatedAt: snapshot.sourceCalculatedAt?.toISOString() ?? null,
    grossPayable: snapshot.grossPayable.toString(),
    totalDeductions: snapshot.totalDeductions.toString(),
    netPayable: snapshot.netPayable.toString(),
    employerContributions: decimalText(snapshot.employerContributions),
    laborCost: decimalText(snapshot.laborCost),
    overtimeCost: decimalText(snapshot.overtimeCost),
    employees: snapshot.employees.map((employee) => ({
      employeeId: employee.employeeReference,
      employeeNumber: employee.employeeNumber,
      employeeName: employee.employeeName,
      department: employee.department,
      position: employee.position,
      compensationBasis: employee.compensationBasis,
      applicableRate: employee.applicableRate.toString(),
      daysWorked: decimalText(employee.daysWorked),
      regularHours: decimalText(employee.regularHours),
      overtimeHours: decimalText(employee.overtimeHours),
      grossPay: employee.grossPay.toString(),
      totalDeductions: employee.totalDeductions.toString(),
      netPay: employee.netPay.toString(),
      sourceReference: employee.sourceReference,
      earnings: employee.earnings.map((line) => ({
        category: line.category,
        label: line.label,
        amount: line.amount.toString(),
        sourceReference: line.sourceReference,
      })),
      deductions: employee.deductions.map((line) => ({
        category: line.category,
        label: line.label,
        amount: line.amount.toString(),
        sourceReference: line.sourceReference,
      })),
      attendance: employee.attendance.map((record) => ({
        sourceReference: record.sourceReference,
        workDate: localDate(record.workDate),
        timeIn: record.timeIn?.toISOString() ?? null,
        timeOut: record.timeOut?.toISOString() ?? null,
        totalHours: decimalText(record.totalHours),
        regularHours: decimalText(record.regularHours),
        overtimeHours: decimalText(record.overtimeHours),
        nightDifferentialHours: decimalText(record.nightDifferentialHours),
        classification: record.classification,
        approvalStatus: record.approvalStatus,
        exceptionDetails: record.exceptionDetails,
      })),
      adjustments: employee.adjustments.map((adjustment) => ({
        adjustmentReference: adjustment.adjustmentReference,
        sourceReference: adjustment.sourceReference,
        adjustmentType: adjustment.adjustmentType,
        amount: adjustment.amount.toString(),
        reason: adjustment.reason,
        requestedBy: adjustment.requestedBy,
        approvedBy: adjustment.approvedBy,
        approvedAt: adjustment.approvedAt?.toISOString() ?? null,
        status: adjustment.status as
          | "Approved"
          | "Pending"
          | "Rejected"
          | "Returned"
          | "Unknown",
      })),
    })),
  });
}

function normalizedIssueList(
  snapshot: PayrollSnapshot,
  input: PayrollBatchInput,
): PayrollValidationIssue[] {
  const issues = validatePayrollInput(input);
  const countIssue = payrollEmployeeCountIssue(
    snapshot.employeeCount,
    snapshot.employees.length,
  );
  if (countIssue) issues.push(countIssue);
  const knownEmployees = new Map<string, string>();
  for (const employee of snapshot.employees) {
    if (employee.employeeId && employee.employee) {
      knownEmployees.set(employee.employeeId, employee.employee.employeeNumber);
    }
  }
  addDatabaseIssues(input, knownEmployees, issues);
  return issues;
}

async function replaceSnapshot(
  transaction: Prisma.TransactionClient,
  payrollVersionId: string,
  input: PayrollBatchInput,
  actor: SessionPrincipal,
): Promise<{ id: string; employeeReference: string }[]> {
  const knownEmployees = await knownEmployeeIds(transaction, input);
  const issues = validatePayrollInput(input);
  addDatabaseIssues(input, knownEmployees, issues);

  const priorRows = await transaction.payrollEmployeeResult.findMany({
    where: { payrollVersionId },
    select: { id: true },
  });
  const priorIds = priorRows.map(({ id }) => id);
  if (priorIds.length) {
    await transaction.payrollEarningLine.deleteMany({
      where: { employeeResultId: { in: priorIds } },
    });
    await transaction.payrollDeductionLine.deleteMany({
      where: { employeeResultId: { in: priorIds } },
    });
    await transaction.payrollAttendanceRecord.deleteMany({
      where: { employeeResultId: { in: priorIds } },
    });
    await transaction.payrollAdjustmentEvidence.deleteMany({
      where: { employeeResultId: { in: priorIds } },
    });
    await transaction.payrollValidationException.updateMany({
      where: { payrollVersionId },
      data: { employeeResultId: null },
    });
    await transaction.payrollEmployeeResult.deleteMany({
      where: { payrollVersionId },
    });
  }

  await transaction.payrollBatchVersion.update({
    where: { id: payrollVersionId },
    data: inputVersionData(input, actor),
  });

  const rows: { id: string; employeeReference: string }[] = [];

  for (const [index, employee] of input.employees.entries()) {
    const row = await transaction.payrollEmployeeResult.create({
      data: {
        payrollVersionId,
        employeeReference: employee.employeeId,
        employeeId: knownEmployees.has(employee.employeeId)
          ? employee.employeeId
          : null,
        employeeNumber: employee.employeeNumber,
        employeeName: employee.employeeName,
        department: employee.department,
        position: employee.position,
        compensationBasis: employee.compensationBasis,
        applicableRate: employee.applicableRate,
        daysWorked: employee.daysWorked,
        regularHours: employee.regularHours,
        overtimeHours: employee.overtimeHours,
        grossPay: employee.grossPay,
        totalDeductions: employee.totalDeductions,
        netPay: employee.netPay,
        sourceReference: employee.sourceReference,
      },
      select: { id: true, employeeReference: true },
    });
    rows.push(row);
    if (employee.earnings.length) {
      await transaction.payrollEarningLine.createMany({
        data: employee.earnings.map((line) => ({
          ...line,
          employeeResultId: row.id,
        })),
      });
    }
    if (employee.deductions.length) {
      await transaction.payrollDeductionLine.createMany({
        data: employee.deductions.map((line) => ({
          ...line,
          employeeResultId: row.id,
        })),
      });
    }
    if (employee.attendance.length) {
      await transaction.payrollAttendanceRecord.createMany({
        data: employee.attendance.map((record) => ({
          ...record,
          workDate: dateValue(record.workDate),
          timeIn: record.timeIn ? new Date(record.timeIn) : null,
          timeOut: record.timeOut ? new Date(record.timeOut) : null,
          employeeResultId: row.id,
        })),
      });
    }
    if (employee.adjustments.length) {
      await transaction.payrollAdjustmentEvidence.createMany({
        data: employee.adjustments.map((adjustment) => ({
          ...adjustment,
          approvedAt: adjustment.approvedAt
            ? new Date(adjustment.approvedAt)
            : null,
          employeeResultId: row.id,
        })),
      });
    }
    if (issues.some((candidate) => candidate.employeeIndex === index)) {
      issues.forEach((candidate) => {
        if (candidate.employeeIndex === index && !candidate.sourceReference) {
          candidate.sourceReference = employee.sourceReference;
        }
      });
    }
  }

  await saveIssues(transaction, payrollVersionId, input, rows, issues);
  return rows;
}

export async function createPayrollBatch(
  actor: SessionPrincipal,
  rawInput: unknown,
) {
  requirePermission(actor, "payroll:manage");
  if (actor.role !== "hr") throw new PayrollServiceError("forbidden", 403);
  const parsed = payrollBatchInputSchema.safeParse(rawInput);
  if (!parsed.success) throw new PayrollServiceError("invalid_request", 400);

  try {
    return await prisma.$transaction(async (transaction) => {
      const batch = await transaction.payrollBatch.create({
        data: {
          batchNumber: parsed.data.batchNumber,
          createdByUserId: actor.userId,
        },
        select: { id: true, batchNumber: true },
      });
      const version = await transaction.payrollBatchVersion.create({
        data: {
          batchId: batch.id,
          version: 1,
          preparedByNameSnapshot: actor.name,
          ...inputVersionData(parsed.data, actor),
        },
        select: { id: true },
      });
      const rows = await replaceSnapshot(
        transaction,
        version.id,
        parsed.data,
        actor,
      );
      await writeDomainAuditEvent(transaction, {
        actor,
        action: "payroll.batch.created",
        entityType: "payroll_batch",
        entityId: batch.id,
        summary: "Payroll batch draft created",
        details: { version: 1 } satisfies Prisma.InputJsonObject,
      });
      await recordBatchTimelineEvent(transaction, {
        batchId: batch.id,
        version: 1,
        eventType: "BatchCreated",
        description: `Payroll batch draft created with ${rows.length} employee records by ${actor.name}`,
        actor,
        relatedRecordReference: parsed.data.sourceReference,
      });
      await recordBatchTimelineEvent(transaction, {
        batchId: batch.id,
        version: 1,
        eventType: "CalculationCompleted",
        description: `Payroll calculations completed for ${rows.length} employee records`,
        actor,
        relatedRecordReference: parsed.data.sourceReference,
      });
      return { id: batch.id, batchNumber: batch.batchNumber, version: 1, status: "Draft", employeeCount: rows.length };
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (error instanceof PayrollServiceError) throw error;
    if (isPrismaError(error, "P2002")) {
      throw new PayrollServiceError("batch_number_conflict", 409);
    }
    if (isPrismaError(error, "P2034")) {
      throw new PayrollServiceError("version_conflict", 409);
    }
    throw error;
  }
}

export async function updatePayrollDraft(
  actor: SessionPrincipal,
  batchIdValue: string,
  versionValue: number,
  rawInput: unknown,
) {
  requirePermission(actor, "payroll:manage");
  if (actor.role !== "hr") throw new PayrollServiceError("forbidden", 403);
  const batchId = payrollBatchIdSchema.safeParse(batchIdValue);
  const input = payrollBatchInputSchema.safeParse(rawInput);
  if (!batchId.success || !input.success || !Number.isSafeInteger(versionValue) || versionValue < 1) {
    throw new PayrollServiceError("invalid_request", 400);
  }

  try {
    return await prisma.$transaction(async (transaction) => {
      const latest = await transaction.payrollBatchVersion.findFirst({
        where: { batchId: batchId.data },
        orderBy: { version: "desc" },
        select: { id: true, version: true, status: true, batch: { select: { batchNumber: true } } },
      });
      if (!latest) throw new PayrollServiceError("batch_not_found", 404);
      if (
        latest.version !== versionValue ||
        latest.status !== "Draft" ||
        latest.batch.batchNumber !== input.data.batchNumber
      ) {
        throw new PayrollServiceError("version_conflict", 409);
      }

      const rows = await replaceSnapshot(transaction, latest.id, input.data, actor);
      await writeDomainAuditEvent(transaction, {
        actor,
        action: "payroll.batch.draft_updated",
        entityType: "payroll_batch",
        entityId: batchId.data,
        summary: "Payroll batch draft updated",
        details: { version: versionValue } satisfies Prisma.InputJsonObject,
      });
      await recordBatchTimelineEvent(transaction, {
        batchId: batchId.data,
        version: versionValue,
        eventType: "DraftUpdated",
        description: `Payroll draft v${versionValue} updated with ${rows.length} employee records by ${actor.name}`,
        actor,
        relatedRecordReference: input.data.sourceReference,
      });
      return { id: batchId.data, batchNumber: latest.batch.batchNumber, version: versionValue, status: "Draft", employeeCount: rows.length };
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (error instanceof PayrollServiceError) throw error;
    if (isPrismaError(error, "P2034")) {
      throw new PayrollServiceError("version_conflict", 409);
    }
    throw error;
  }
}

export async function createPayrollCorrectionVersion(
  actor: SessionPrincipal,
  batchIdValue: string,
  rawInput: unknown,
) {
  requirePermission(actor, "payroll:manage");
  if (actor.role !== "hr") throw new PayrollServiceError("forbidden", 403);
  const batchId = payrollBatchIdSchema.safeParse(batchIdValue);
  const input = payrollBatchInputSchema.safeParse(rawInput);
  if (!batchId.success || !input.success) {
    throw new PayrollServiceError("invalid_request", 400);
  }

  try {
    return await prisma.$transaction(async (transaction) => {
      const batch = await transaction.payrollBatch.findUnique({
        where: { id: batchId.data },
        select: {
          id: true,
          batchNumber: true,
          versions: {
            orderBy: { version: "desc" },
            take: 1,
            select: { version: true, status: true },
          },
        },
      });
      const latest = batch?.versions[0];
      if (!batch || !latest) throw new PayrollServiceError("batch_not_found", 404);
      if (latest.status !== "Returned" || input.data.batchNumber !== batch.batchNumber) {
        throw new PayrollServiceError("version_conflict", 409);
      }
      const nextVersion = latest.version + 1;
      const version = await transaction.payrollBatchVersion.create({
        data: {
          batchId: batch.id,
          version: nextVersion,
          preparedByNameSnapshot: actor.name,
          ...inputVersionData(input.data, actor),
        },
        select: { id: true },
      });
      const rows = await replaceSnapshot(transaction, version.id, input.data, actor);
      await writeDomainAuditEvent(transaction, {
        actor,
        action: "payroll.batch.version_created",
        entityType: "payroll_batch",
        entityId: batch.id,
        summary: "Payroll correction version created",
        details: { version: nextVersion } satisfies Prisma.InputJsonObject,
      });
      await recordBatchTimelineEvent(transaction, {
        batchId: batch.id,
        version: nextVersion,
        eventType: "CorrectionVersionCreated",
        description: `Correction draft v${nextVersion} created following returned version v${latest.version} by ${actor.name}`,
        actor,
        relatedRecordReference: input.data.sourceReference,
      });
      return { id: batch.id, batchNumber: batch.batchNumber, version: nextVersion, status: "Draft", employeeCount: rows.length };
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (error instanceof PayrollServiceError) throw error;
    if (isPrismaError(error, "P2034")) {
      throw new PayrollServiceError("version_conflict", 409);
    }
    throw error;
  }
}

export async function submitPayrollBatch(
  actor: SessionPrincipal,
  batchIdValue: string,
  versionValue: number,
) {
  requirePermission(actor, "payroll:manage");
  if (actor.role !== "hr") throw new PayrollServiceError("forbidden", 403);
  const batchId = payrollBatchIdSchema.safeParse(batchIdValue);
  if (!batchId.success || !Number.isSafeInteger(versionValue) || versionValue < 1) {
    throw new PayrollServiceError("invalid_request", 400);
  }

  try {
    return await prisma.$transaction(async (transaction) => {
      const snapshot = await transaction.payrollBatchVersion.findUnique({
        where: { batchId_version: { batchId: batchId.data, version: versionValue } },
        include: snapshotInclude,
      });
      if (!snapshot) throw new PayrollServiceError("version_not_found", 404);
      const latest = await transaction.payrollBatchVersion.findFirst({
        where: { batchId: batchId.data },
        orderBy: { version: "desc" },
        select: { id: true },
      });
      if (snapshot.status !== "Draft" || latest?.id !== snapshot.id) {
        throw new PayrollServiceError("version_conflict", 409);
      }

      const input = snapshotInput(snapshot);
      const categorySet =
        await getActiveDeductionCategorySetForSubmission(transaction);
      const issues = normalizedIssueList(snapshot, input);
      issues.push(
        ...payrollDeductionCategoryIssues(
          input,
          categorySet?.categories ?? null,
        ),
      );
      await saveIssues(
        transaction,
        snapshot.id,
        input,
        snapshot.employees.map(({ id, employeeReference }) => ({ id, employeeReference })),
        issues,
      );

      const verified = await transaction.payrollBatchVersion.updateMany({
        where: {
          id: snapshot.id,
          version: versionValue,
          status: "Draft",
        },
        data: { status: "HRVerified" },
      });
      if (verified.count !== 1) {
        throw new PayrollServiceError("version_conflict", 409);
      }
      const organization = await transaction.organizationSettings.findUnique({
        where: { id: ORGANIZATION_ID },
        select: { name: true, timeZone: true },
      });
      const submittedAt = new Date();
      const submitted = await transaction.payrollBatchVersion.updateMany({
        where: { id: snapshot.id, status: "HRVerified" },
        data: {
          status: "PendingAdminApproval",
          submittedAt,
          submittedByUserId: actor.userId,
          preparedByNameSnapshot:
            snapshot.preparedByNameSnapshot ?? snapshot.preparedBy.name,
          submittedByNameSnapshot: actor.name,
          organizationNameSnapshot: organization?.name ?? null,
          timeZoneSnapshot: organization?.timeZone ?? null,
          deductionCategorySetVersion: categorySet?.version ?? null,
        },
      });
      if (submitted.count !== 1) {
        throw new PayrollServiceError("version_conflict", 409);
      }
      await writeDomainAuditEvent(transaction, {
        actor,
        action: "payroll.batch.submitted",
        entityType: "payroll_batch",
        entityId: batchId.data,
        summary: "Payroll batch submitted for Admin approval",
        details: { version: versionValue } satisfies Prisma.InputJsonObject,
      });
      await recordBatchTimelineEvent(transaction, {
        batchId: batchId.data,
        version: versionValue,
        eventType: "HRSubmitted",
        description: `Payroll version v${versionValue} submitted for Admin approval by ${actor.name}`,
        actor,
        relatedRecordReference: snapshot.sourceReference,
      });
      if (issues.length) {
        await recordBatchTimelineEvent(transaction, {
          batchId: batchId.data,
          version: versionValue,
          eventType: "ExceptionsDetected",
          description: `${issues.length} validation exceptions detected during submission validation`,
          actor,
          metadata: { exceptionCount: issues.length },
        });
      }
      return {
        batchId: batchId.data,
        version: versionValue,
        status: "PendingAdminApproval",
        submittedAt: submittedAt.toISOString(),
        unresolvedExceptions: issues.length,
      };
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (error instanceof PayrollServiceError) throw error;
    if (isPrismaError(error, "P2034")) {
      throw new PayrollServiceError("version_conflict", 409);
    }
    throw error;
  }
}

export async function decidePayrollBatch(
  actor: SessionPrincipal,
  batchIdValue: string,
  rawInput: unknown,
) {
  requirePermission(actor, "payroll:approve");
  if (actor.role !== "admin") throw new PayrollServiceError("forbidden", 403);
  const batchId = payrollBatchIdSchema.safeParse(batchIdValue);
  const input = payrollDecisionInputSchema.safeParse(rawInput);
  if (!batchId.success || !input.success) {
    throw new PayrollServiceError("invalid_request", 400);
  }

  try {
    const outcome = await prisma.$transaction(async (transaction) => {
      const snapshot = await transaction.payrollBatchVersion.findUnique({
        where: {
          batchId_version: {
            batchId: batchId.data,
            version: input.data.version,
          },
        },
        include: snapshotInclude,
      });
      if (!snapshot) throw new PayrollServiceError("version_not_found", 404);
      if (snapshot.status !== "PendingAdminApproval") {
        throw new PayrollServiceError("version_conflict", 409);
      }

      let unresolvedCount = 0;
      if (input.data.decision === "Approved") {
        if (snapshot.submittedByUserId === actor.userId) {
          throw new PayrollServiceError("forbidden", 403);
        }
        const payrollInput = snapshotInput(snapshot);
        const issues = normalizedIssueList(snapshot, payrollInput);
        issues.push(
          ...payrollDeductionCategoryIssues(
            payrollInput,
            snapshot.deductionCategorySet
              ? parseStoredDeductionCategoryNames(
                  snapshot.deductionCategorySet.categories,
                )
              : null,
          ),
        );

        // Pre-approval revalidation: check for duplicate payments across approved batches
        const validEmployeeIds = snapshot.employees
          .map((e) => e.employeeId)
          .filter((id): id is string => Boolean(id));

        if (validEmployeeIds.length > 0) {
          const duplicatePayment = await transaction.payrollBatchVersion.findFirst({
            where: {
              status: "Approved",
              batchId: { not: batchId.data },
              periodStart: { lte: snapshot.periodEnd },
              periodEnd: { gte: snapshot.periodStart },
              employees: {
                some: {
                  employeeId: { in: validEmployeeIds },
                },
              },
            },
            select: {
              batch: { select: { batchNumber: true } },
              version: true,
            },
          });

          if (duplicatePayment) {
            issues.push({
              employeeIndex: 0,
              category: "FinancialIntegrity",
              severity: "Critical",
              title: "Duplicate employee payment detected",
              description: `One or more employees in this batch have already been approved for payment in batch ${duplicatePayment.batch.batchNumber} v${duplicatePayment.version} during an overlapping period.`,
              field: "periodStart",
              actualValue: snapshot.batch.batchNumber,
              expectedValue: "No overlapping approved payments",
              sourceReference: snapshot.sourceReference,
            });
          }
        }

        if (issues.length) {
          await saveIssues(
            transaction,
            snapshot.id,
            payrollInput,
            snapshot.employees.map(({ id, employeeReference }) => ({
              id,
              employeeReference,
            })),
            issues,
          );
        }
        await recordBatchTimelineEvent(transaction, {
          batchId: batchId.data,
          version: input.data.version,
          eventType: "ValidationRun",
          description: `Pre-approval validation executed with ${issues.length} detected issue(s)`,
          actor,
          relatedRecordReference: snapshot.sourceReference,
        });
        const unresolved = await transaction.payrollValidationException.count({
          where: { payrollVersionId: snapshot.id, resolvedAt: null },
        });
        if (unresolved > 0) return { blocked: true as const };
      } else if (input.data.decision === "Returned") {
        unresolvedCount = await transaction.payrollValidationException.count({
          where: { payrollVersionId: snapshot.id, resolvedAt: null },
        });
      }

      const changed = await transaction.payrollBatchVersion.updateMany({
        where: {
          id: snapshot.id,
          version: input.data.version,
          status: "PendingAdminApproval",
        },
        data: { status: input.data.decision },
      });
      if (changed.count !== 1) {
        throw new PayrollServiceError("version_conflict", 409);
      }
      await transaction.payrollDecision.create({
        data: {
          payrollVersionId: snapshot.id,
          actorUserId: actor.userId,
          decision: input.data.decision,
          reason: input.data.reason,
        },
      });
      await writeDomainAuditEvent(transaction, {
        actor,
        action: `payroll.batch.${input.data.decision.toLowerCase()}`,
        entityType: "payroll_batch",
        entityId: batchId.data,
        summary: `Payroll batch ${input.data.decision.toLowerCase()}`,
        details: {
          version: input.data.version,
          reason: input.data.reason,
        } satisfies Prisma.InputJsonObject,
      });

      if (input.data.decision === "Approved") {
        await createDisbursementHandoff(transaction, {
          payrollVersionId: snapshot.id,
          batchId: batchId.data,
          batchNumber: snapshot.batch.batchNumber,
          version: input.data.version,
          netPayable: snapshot.netPayable.toString(),
          actor,
        });
      }

      await recordBatchTimelineEvent(transaction, {
        batchId: batchId.data,
        version: input.data.version,
        eventType:
          input.data.decision === "Approved"
            ? "BatchApproved"
            : input.data.decision === "Returned"
              ? "ReturnedForCorrection"
              : "BatchRejected",
        description:
          input.data.decision === "Approved"
            ? `Payroll batch approved by ${actor.name}`
            : `Payroll batch ${input.data.decision.toLowerCase()} by ${actor.name}: ${input.data.reason}${unresolvedCount > 0 ? ` (${unresolvedCount} unresolved exception${unresolvedCount === 1 ? "" : "s"})` : ""}`,
        actor,
        relatedRecordReference: snapshot.sourceReference,
        metadata:
          input.data.reason || unresolvedCount > 0
            ? {
                reason: input.data.reason,
                ...(unresolvedCount > 0 ? { unresolvedExceptionCount: unresolvedCount } : {}),
              }
            : null,
      });

      return {
        blocked: false as const,
        status: input.data.decision,
        batchNumber: snapshot.batch.batchNumber,
        netPayable: snapshot.netPayable.toString(),
        employeeCount: snapshot.employees.length,
        timestamp: new Date(),
        unresolvedCount,
      };
    }, { isolationLevel: "Serializable" });

    if (outcome.blocked) {
      throw new PayrollServiceError("validation_blocked", 409);
    }

    // Safely notify HR outside transaction to guarantee no double approval on notification failure
    if (input.data.decision === "Approved") {
      void notifyHrPayrollApproval({
        batchId: batchId.data,
        batchNumber: outcome.batchNumber,
        version: input.data.version,
        approvedBy: actor.name,
        approvedAt: outcome.timestamp,
        totalAmount: outcome.netPayable,
        employeeCount: outcome.employeeCount,
        disbursementSchedule: "Disbursement handoff created",
      });
    } else if (input.data.decision === "Returned") {
      void notifyHrPayrollReturned({
        batchId: batchId.data,
        batchNumber: outcome.batchNumber,
        version: input.data.version,
        returnedBy: actor.name,
        returnedAt: outcome.timestamp,
        reason: input.data.reason ?? "",
        unresolvedExceptionCount: outcome.unresolvedCount ?? 0,
      });
    } else if (input.data.decision === "Rejected") {
      void notifyHrPayrollRejected({
        batchId: batchId.data,
        batchNumber: outcome.batchNumber,
        version: input.data.version,
        rejectedBy: actor.name,
        rejectedAt: outcome.timestamp,
        reason: input.data.reason ?? "",
      });
    }

    return {
      batchId: batchId.data,
      version: input.data.version,
      decision: input.data.decision,
      status: outcome.status,
    };
  } catch (error) {
    if (error instanceof PayrollServiceError) throw error;
    if (isPrismaError(error, "P2002") || isPrismaError(error, "P2034")) {
      throw new PayrollServiceError("version_conflict", 409);
    }
    throw error;
  }
}

export async function listPayrollBatches(
  actor: SessionPrincipal,
  rawInput: PayrollBatchListInput,
) {
  requirePermission(actor, "payroll:read");
  const input = payrollBatchListInputSchema.safeParse(rawInput);
  if (!input.success) throw new PayrollServiceError("invalid_request", 400);
  const where: Prisma.PayrollBatchVersionWhereInput = {
    ...(input.data.status === "all"
      ? {}
      : input.data.status === "RejectedOrReturned"
        ? { status: { in: ["Rejected", "Returned"] } }
        : { status: input.data.status }),
    ...(input.data.status === "PendingAdminApproval"
      ? {
          submittedAt: { not: null },
          submittedByUserId: { not: null },
        }
      : {}),
    ...(input.data.query
      ? {
          batch: {
            batchNumber: { contains: input.data.query },
          },
        }
      : {}),
    ...(input.data.periodFrom
      ? { periodEnd: { gte: dateValue(input.data.periodFrom) } }
      : {}),
    ...(input.data.periodTo
      ? { periodStart: { lte: dateValue(input.data.periodTo) } }
      : {}),
  };
  const select = {
    id: true,
    version: true,
    status: true,
    periodStart: true,
    periodEnd: true,
    submittedAt: true,
    grossPayable: true,
    totalDeductions: true,
    netPayable: true,
    currencyCode: true,
    employeeCount: true,
    disbursementRecord: { select: { status: true } },
    decisions: {
      select: {
        decision: true,
        createdAt: true,
      },
    },
    batch: {
      select: {
        id: true,
        batchNumber: true,
        versions: {
          select: {
            id: true,
            version: true,
            status: true,
            submittedAt: true,
            decisions: {
              select: {
                decision: true,
                createdAt: true,
              },
            },
          },
        },
      },
    },
    preparedBy: { select: { name: true } },
    submittedBy: { select: { name: true } },
  } satisfies Prisma.PayrollBatchVersionSelect;
  const orderBy = [
    { submittedAt: "desc" },
    { createdAt: "desc" },
    { id: "asc" },
  ] satisfies Prisma.PayrollBatchVersionOrderByWithRelationInput[];
  const [total, records] = await prisma.$transaction(async (transaction) => {
    if (input.data.status === "PendingAdminApproval") {
      const conditions = [
        Prisma.sql`v.status = ${"PendingAdminApproval"}`,
        Prisma.sql`v.submittedAt IS NOT NULL`,
        Prisma.sql`v.submittedByUserId IS NOT NULL`,
        Prisma.sql`v.version = (
          SELECT MAX(latest.version)
          FROM \`PayrollBatchVersion\` AS latest
          WHERE latest.batchId = v.batchId
            AND latest.submittedAt IS NOT NULL
        )`,
      ];
      if (input.data.query) {
        conditions.push(
          Prisma.sql`b.batchNumber LIKE ${`%${input.data.query}%`}`,
        );
      }
      if (input.data.periodFrom) {
        conditions.push(
          Prisma.sql`v.periodEnd >= ${dateValue(input.data.periodFrom)}`,
        );
      }
      if (input.data.periodTo) {
        conditions.push(
          Prisma.sql`v.periodStart <= ${dateValue(input.data.periodTo)}`,
        );
      }
      const whereSql = Prisma.join(conditions, " AND ");
      const offset = (input.data.page - 1) * input.data.pageSize;
      const [countRows, idRows] = await Promise.all([
        transaction.$queryRaw<Array<{ total: number | bigint }>>(
          Prisma.sql`SELECT COUNT(*) AS total
            FROM \`PayrollBatchVersion\` AS v
            INNER JOIN \`PayrollBatch\` AS b ON b.id = v.batchId
            WHERE ${whereSql}`,
        ),
        transaction.$queryRaw<Array<{ id: string }>>(
          Prisma.sql`SELECT v.id
            FROM \`PayrollBatchVersion\` AS v
            INNER JOIN \`PayrollBatch\` AS b ON b.id = v.batchId
            WHERE ${whereSql}
            ORDER BY v.submittedAt DESC, v.createdAt DESC, v.id ASC
            LIMIT ${input.data.pageSize} OFFSET ${offset}`,
        ),
      ]);
      const ids = idRows.map(({ id }) => id);
      const records = ids.length
        ? await transaction.payrollBatchVersion.findMany({
            where: { id: { in: ids } },
            orderBy,
            select,
          })
        : [];
      return [Number(countRows[0]?.total ?? 0), records] as const;
    }

    const [total, records] = await Promise.all([
      transaction.payrollBatchVersion.count({ where }),
      transaction.payrollBatchVersion.findMany({
        where,
        orderBy,
        skip: (input.data.page - 1) * input.data.pageSize,
        take: input.data.pageSize,
        select,
      }),
    ]);
    return [total, records] as const;
  });
  const organization = await getOrganizationSettings();
  return {
    organization: {
      name: organization?.name ?? null,
      timeZone: organization?.timeZone ?? null,
    },
    items: records.map((record) => {
      const submittedDates = record.batch.versions
        .map((v) => v.submittedAt)
        .filter((d): d is Date => Boolean(d))
        .sort((a, b) => a.getTime() - b.getTime());
      const originalSubmissionDate =
        submittedDates[0]?.toISOString() ??
        record.submittedAt?.toISOString() ??
        null;

      const returnOrRejectDates = record.batch.versions
        .flatMap((v) => v.decisions)
        .filter((d) => d.decision === "Returned" || d.decision === "Rejected")
        .map((d) => d.createdAt)
        .sort((a, b) => b.getTime() - a.getTime());
      const latestDecisionDate =
        returnOrRejectDates[0]?.toISOString() ?? null;

      const returnCount = record.batch.versions.filter(
        (v) =>
          v.status === "Returned" ||
          v.decisions.some((d) => d.decision === "Returned"),
      ).length;

      const approvedDecision =
        record.decisions.find((d) => d.decision === "Approved") ??
        record.batch.versions
          .flatMap((v) => v.decisions)
          .find((d) => d.decision === "Approved");
      const approvedAt =
        record.status === "Approved" && approvedDecision
          ? approvedDecision.createdAt.toISOString()
          : null;

      const disbursementStatus =
        record.disbursementRecord?.status ??
        (record.status === "Approved" ? "PendingDisbursement" : null);

      return {
        id: record.batch.id,
        batchNumber: record.batch.batchNumber,
        versionId: record.id,
        version: record.version,
        status: record.status,
        periodStart: localDate(record.periodStart),
        periodEnd: localDate(record.periodEnd),
        submittedAt: record.submittedAt?.toISOString() ?? null,
        grossPayable: record.grossPayable.toString(),
        totalDeductions: record.totalDeductions.toString(),
        netPayable: record.netPayable.toString(),
        currencyCode: record.currencyCode,
        employeeCount: record.employeeCount,
        preparedBy: record.preparedBy.name,
        submittedBy: record.submittedBy?.name ?? null,
        disbursementStatus,
        originalSubmissionDate,
        latestDecisionDate,
        returnCount,
        approvedAt,
      };
    }),
    page: input.data.page,
    pageSize: input.data.pageSize,
    total,
  };
}

export async function getPayrollBatchReview(
  actor: SessionPrincipal,
  batchIdValue: string,
  versionValue: number,
) {
  requirePermission(actor, "payroll:read");
  const batchId = payrollBatchIdSchema.safeParse(batchIdValue);
  if (!batchId.success || !Number.isInteger(versionValue) || versionValue < 1) {
    throw new PayrollServiceError("invalid_request", 400);
  }
  const snapshot = await prisma.payrollBatchVersion.findUnique({
    where: { batchId_version: { batchId: batchId.data, version: versionValue } },
    include: snapshotInclude,
  });
  if (!snapshot) throw new PayrollServiceError("version_not_found", 404);

  const configuredDeductionCategories = snapshot.deductionCategorySet
    ? parseStoredDeductionCategoryNames(snapshot.deductionCategorySet.categories)
    : null;
  const payableBreakdown = aggregatePayrollLines(snapshot.employees, "earnings");
  const deductionBreakdown = aggregatePayrollLines(
    snapshot.employees,
    "deductions",
    configuredDeductionCategories,
  );
  const payableBreakdownReconciles = payrollBreakdownReconciles(
    payableBreakdown,
    snapshot.grossPayable.toString(),
  );
  const deductionBreakdownReconciles = payrollBreakdownReconciles(
    deductionBreakdown,
    snapshot.totalDeductions.toString(),
  );
  const audit = await prisma.domainAuditEvent.findMany({
    where: { entityType: "payroll_batch", entityId: batchId.data },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      action: true,
      summary: true,
      actorRole: true,
      createdAt: true,
      details: true,
      actor: { select: { name: true } },
    },
  });
  const timeline = await prisma.payrollBatchTimelineEvent.findMany({
    where: { batchId: batchId.data },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      version: true,
      eventType: true,
      description: true,
      actorUserId: true,
      actorRole: true,
      actorName: true,
      relatedRecordReference: true,
      createdAt: true,
    },
  });
  const batchVersions = await prisma.payrollBatchVersion.findMany({
    where: { batchId: batchId.data },
    orderBy: { version: "asc" },
    select: {
      id: true,
      version: true,
      status: true,
      netPayable: true,
      employeeCount: true,
      submittedAt: true,
      preparedByNameSnapshot: true,
      submittedByNameSnapshot: true,
      preparedBy: { select: { name: true } },
      submittedBy: { select: { name: true } },
      decisions: {
        select: {
          decision: true,
          reason: true,
          createdAt: true,
          actor: { select: { name: true } },
        },
      },
      exceptions: {
        select: {
          id: true,
          category: true,
          severity: true,
          title: true,
          description: true,
          detectedAt: true,
          resolvedAt: true,
          employeeResultId: true,
        },
      },
      employees: {
        select: {
          id: true,
          employeeNumber: true,
        },
      },
    },
  });
  return {
    organization: {
      name: snapshot.organizationNameSnapshot,
      timeZone: snapshot.timeZoneSnapshot,
    },
    batch: {
      id: snapshot.batch.id,
      batchNumber: snapshot.batch.batchNumber,
      versionId: snapshot.id,
      version: snapshot.version,
      status: snapshot.status,
      periodStart: localDate(snapshot.periodStart),
      periodEnd: localDate(snapshot.periodEnd),
      cutoffReference: snapshot.cutoffReference,
      currencyCode: snapshot.currencyCode,
      sourceReference: snapshot.sourceReference,
      sourceCalculatedAt: snapshot.sourceCalculatedAt?.toISOString() ?? null,
      preparedBy:
        snapshot.preparedByNameSnapshot ??
        "Historical account name not captured",
      submittedBy: snapshot.submittedByUserId
        ? snapshot.submittedByNameSnapshot ??
          "Historical account name not captured"
        : null,
      submittedAt: snapshot.submittedAt?.toISOString() ?? null,
      employeeCount: snapshot.employees.length,
      recordedEmployeeCount: snapshot.employeeCount,
      grossPayable: snapshot.grossPayable.toString(),
      totalDeductions: snapshot.totalDeductions.toString(),
      netPayable: snapshot.netPayable.toString(),
      employerContributions: decimalText(snapshot.employerContributions),
      laborCost: decimalText(snapshot.laborCost),
      overtimeCost: decimalText(snapshot.overtimeCost),
      deductionCategorySetVersion: snapshot.deductionCategorySetVersion,
      calculationEngineVersion: snapshot.calculationEngineVersion,
      earningsConfigVersion: snapshot.earningsConfigVersion,
      deductionConfigVersion: snapshot.deductionConfigVersion,
      benefitsConfigVersion: snapshot.benefitsConfigVersion,
      statutoryRuleVersion: snapshot.statutoryRuleVersion,
      disbursementStatus:
        snapshot.disbursementRecord?.status ??
        (snapshot.status === "Approved" ? "PendingDisbursement" : null),
      employerPaidBenefits: null, // populated from config when employer-paid benefit lines exist
    },
    payableBreakdown,
    payableBreakdownReconciles,
    deductionBreakdown,
    deductionBreakdownReconciles,
    employees: snapshot.employees.map((employee) => ({
      id: employee.id,
      employeeReference: employee.employeeReference,
      employeeNumber: employee.employeeNumber,
      employeeName: employee.employeeName,
      department: employee.department,
      position: employee.position,
      compensationBasis: employee.compensationBasis,
      applicableRate: employee.applicableRate.toString(),
      daysWorked: decimalText(employee.daysWorked),
      regularHours: decimalText(employee.regularHours),
      overtimeHours: decimalText(employee.overtimeHours),
      grossPay: employee.grossPay.toString(),
      totalDeductions: employee.totalDeductions.toString(),
      netPay: employee.netPay.toString(),
      sourceReference: employee.sourceReference,
      earnings: employee.earnings.map((line) => ({
        category: line.category,
        label: line.label,
        amount: line.amount.toString(),
        sourceReference: line.sourceReference,
      })),
      deductions: employee.deductions.map((line) => ({
        category: line.category,
        label: line.label,
        amount: line.amount.toString(),
        sourceReference: line.sourceReference,
      })),
      attendance: employee.attendance.map((record) => ({
        sourceReference: record.sourceReference,
        workDate: localDate(record.workDate),
        timeIn: record.timeIn?.toISOString() ?? null,
        timeOut: record.timeOut?.toISOString() ?? null,
        totalHours: decimalText(record.totalHours),
        regularHours: decimalText(record.regularHours),
        overtimeHours: decimalText(record.overtimeHours),
        nightDifferentialHours: decimalText(record.nightDifferentialHours),
        classification: record.classification,
        approvalStatus: record.approvalStatus,
        exceptionDetails: record.exceptionDetails,
      })),
      adjustments: employee.adjustments.map((adjustment) => ({
        adjustmentReference: adjustment.adjustmentReference,
        sourceReference: adjustment.sourceReference,
        adjustmentType: adjustment.adjustmentType,
        amount: adjustment.amount.toString(),
        reason: adjustment.reason,
        requestedBy: adjustment.requestedBy,
        approvedBy: adjustment.approvedBy,
        approvedAt: adjustment.approvedAt?.toISOString() ?? null,
        status: adjustment.status,
      })),
    })),
    exceptions: snapshot.exceptions
      .slice()
      .sort((a, b) => {
        const severityRank: Record<string, number> = {
          Critical: 1,
          High: 2,
          Warning: 3,
          Info: 4,
        };
        const rankA = severityRank[a.severity] ?? 99;
        const rankB = severityRank[b.severity] ?? 99;
        if (rankA !== rankB) return rankA - rankB;
        return a.detectedAt.getTime() - b.detectedAt.getTime();
      })
      .map((item) => ({
        id: item.id,
        category: item.category,
        severity: item.severity,
        title: item.title,
        description: item.description,
        field: item.field,
        actualValue: item.actualValue,
        expectedValue: item.expectedValue,
        sourceReference: item.sourceReference,
        detectedAt: item.detectedAt.toISOString(),
        resolvedAt: item.resolvedAt?.toISOString() ?? null,
        resolutionDetails: item.resolutionDetails,
        employeeReference:
          snapshot.employees.find(({ id }) => id === item.employeeResultId)
            ?.employeeNumber ?? null,
      })),
    decisions: snapshot.decisions.map((decision) => ({
      decision: decision.decision,
      reason: decision.reason,
      actor: decision.actor.name,
      createdAt: decision.createdAt.toISOString(),
    })),
    audit: audit.map((event) => ({
      id: event.id,
      action: event.action,
      summary: event.summary,
      actor: event.actor?.name ?? "System",
      actorRole: event.actorRole,
      createdAt: event.createdAt.toISOString(),
      details: event.details,
    })),
    timeline: timeline.map((event) => ({
      id: event.id,
      version: event.version,
      eventType: event.eventType,
      description: event.description,
      actorName: event.actorName ?? "System",
      actorRole: event.actorRole ?? null,
      relatedRecordReference: event.relatedRecordReference ?? null,
      createdAt: event.createdAt.toISOString(),
    })),
    historyVersions: batchVersions.map((bv) => ({
      version: bv.version,
      status: bv.status,
      netPayable: bv.netPayable.toString(),
      employeeCount: bv.employeeCount,
      submittedAt: bv.submittedAt?.toISOString() ?? null,
      preparedBy: bv.preparedByNameSnapshot ?? bv.preparedBy.name,
      submittedBy: bv.submittedByNameSnapshot ?? bv.submittedBy?.name ?? null,
      decisions: bv.decisions.map((d) => ({
        decision: d.decision,
        reason: d.reason,
        actor: d.actor.name,
        createdAt: d.createdAt.toISOString(),
      })),
      exceptionCount: bv.exceptions.length,
    })),
    allExceptions: batchVersions.flatMap((bv) =>
      bv.exceptions.map((ex) => ({
        id: ex.id,
        version: bv.version,
        category: ex.category,
        severity: ex.severity,
        title: ex.title,
        description: ex.description,
        detectedAt: ex.detectedAt.toISOString(),
        resolvedAt: ex.resolvedAt?.toISOString() ?? null,
        employeeReference:
          bv.employees.find((e) => e.id === ex.employeeResultId)
            ?.employeeNumber ?? null,
      })),
    ),
  };
}

export async function recordPayrollReportExport(
  actor: SessionPrincipal,
  batchIdValue: string,
  versionValue: number,
): Promise<void> {
  requirePermission(actor, "payroll:read");
  if (actor.role !== "admin") throw new PayrollServiceError("forbidden", 403);
  const batchId = payrollBatchIdSchema.safeParse(batchIdValue);
  if (!batchId.success || !Number.isSafeInteger(versionValue) || versionValue < 1) {
    throw new PayrollServiceError("invalid_request", 400);
  }

  await prisma.$transaction(async (transaction) => {
    const snapshot = await transaction.payrollBatchVersion.findUnique({
      where: {
        batchId_version: { batchId: batchId.data, version: versionValue },
      },
      select: {
        id: true,
        status: true,
      },
    });
    if (!snapshot) throw new PayrollServiceError("version_not_found", 404);
    if (
      ![
        "PendingAdminApproval",
        "Approved",
        "Rejected",
        "Returned",
        "Processing",
        "Processed",
      ].includes(snapshot.status)
    ) {
      throw new PayrollServiceError("version_conflict", 409);
    }

    await writeDomainAuditEvent(transaction, {
      actor,
      action: "payroll.report.exported",
      entityType: "payroll_batch",
      entityId: batchId.data,
      summary: "Payroll report exported",
      details: { version: versionValue } satisfies Prisma.InputJsonObject,
    });
  });
}
