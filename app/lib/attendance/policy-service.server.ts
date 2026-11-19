import "server-only";
import { Prisma } from "../../generated/prisma/client";
import {
  hasPermission,
  type Permission,
} from "../auth/authorization";
import type { SessionPrincipal } from "../auth/session-policy";
import { writeDomainAuditEvent } from "../audit/domain-audit";
import { prisma } from "../db";
import { resolveAttendancePolicy } from "./policy-resolution";
import {
  attendancePolicyIdSchema,
  createAttendancePolicySchema,
  policyListInputSchema,
  updateAttendancePolicySchema,
} from "./policy-schemas";
import type { AttendancePolicyInput } from "./policy-schemas";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export class AttendancePolicyServiceError extends Error {
  constructor(
    public readonly code:
      | "forbidden"
      | "invalid_request"
      | "policy_not_found"
      | "policy_conflict"
      | "policy_scope_invalid"
      | "policy_status_conflict"
      | "policy_overlap"
      | "concurrent_update",
    public readonly status: 400 | 403 | 404 | 409,
  ) {
    super(code);
  }
}

function requireAttendanceManager(actor: SessionPrincipal): void {
  if (
    !hasPermission({
      role: actor.role,
      permission: "attendance:manage",
      actorId: actor.userId,
      grantedPermissions: actor.grantedPermissions,
      deniedPermissions: actor.deniedPermissions,
    })
  ) {
    throw new AttendancePolicyServiceError("forbidden", 403);
  }
}

function requireAttendanceReader(actor: SessionPrincipal): void {
  const permissions: Permission[] = ["attendance:read", "attendance:manage"];
  if (
    !permissions.some((permission) =>
      hasPermission({
        role: actor.role,
        permission,
        actorId: actor.userId,
        grantedPermissions: actor.grantedPermissions,
        deniedPermissions: actor.deniedPermissions,
      }),
    )
  ) {
    throw new AttendancePolicyServiceError("forbidden", 403);
  }
}

function parseWorkDays(value: Prisma.JsonValue): string[] {
  if (!Array.isArray(value)) {
    throw new Error("Stored attendance policy workdays are invalid");
  }
  const days: string[] = [];
  for (const day of value) {
    if (
      typeof day !== "string" ||
      !DAY_NAMES.some((validDay) => validDay === day)
    ) {
      throw new Error("Stored attendance policy workdays are invalid");
    }
    days.push(day);
  }
  return days;
}

function asDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function localDate(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

function scheduleText(policy: {
  scheduleType: string;
  workDays: Prisma.JsonValue;
  shiftStart: string | null;
  shiftEnd: string | null;
}) {
  const days = parseWorkDays(policy.workDays).join(" ");
  return [
    policy.scheduleType,
    days,
    policy.shiftStart ?? "",
    policy.shiftEnd ?? "",
  ].join(" ");
}

function matchesSearch(
  policy: PolicyListRecord,
  query: string,
  globalDepartmentMatches = false,
): boolean {
  if (!query) return true;
  const normalized = query.toLocaleLowerCase("en-US");
  const text = [
    policy.name,
    policy.code,
    policy.description ?? "",
    scheduleText(policy),
    ...policy.departmentAssignments.map(({ department }) => department.name),
    ...policy.employeeAssignments.flatMap(({ employee }) =>
      employee.assignments.map(({ department }) => department.name),
    ),
    ...(globalDepartmentMatches ? [normalized] : []),
  ]
    .join(" ")
    .toLocaleLowerCase("en-US");
  return text.includes(normalized);
}

function searchScore(policy: PolicyListRecord, query: string): number {
  if (!query) return 0;
  const q = query.toLocaleLowerCase("en-US");
  const name = policy.name.toLocaleLowerCase("en-US");
  const code = policy.code.toLocaleLowerCase("en-US");
  const schedule = scheduleText(policy).toLocaleLowerCase("en-US");
  if (name === q) return 1;
  if (code === q) return 2;
  if (name.startsWith(q)) return 3;
  if (code.startsWith(q)) return 4;
  if (name.includes(q)) return 5;
  if (schedule.includes(q)) return 6;
  return 7;
}

const policyInclude = {
  departmentAssignments: {
    orderBy: { department: { name: "asc" } },
    select: {
      department: { select: { id: true, name: true } },
    },
  },
  employeeAssignments: {
    orderBy: { employee: { lastName: "asc" } },
    select: {
      employee: {
        select: {
          id: true,
          employeeNumber: true,
          firstName: true,
          lastName: true,
          workEmail: true,
          assignments: {
            where: { effectiveTo: null },
            take: 2,
            select: {
              department: { select: { id: true, name: true, active: true } },
              statusDefinition: {
                select: { active: true, headcountEligible: true },
              },
            },
          },
        },
      },
    },
  },
  createdBy: { select: { id: true, name: true, email: true } },
  updatedBy: { select: { id: true, name: true, email: true } },
} satisfies Prisma.AttendancePolicyInclude;

const policyListInclude = {
  departmentAssignments: {
    select: { department: { select: { id: true, name: true } } },
  },
  employeeAssignments: {
    select: {
      employee: {
        select: {
          assignments: {
            where: { effectiveTo: null },
            take: 2,
            select: { department: { select: { id: true, name: true } } },
          },
        },
      },
    },
  },
} satisfies Prisma.AttendancePolicyInclude;

type PolicyRecord = Prisma.AttendancePolicyGetPayload<{
  include: typeof policyInclude;
}>;

type PolicyListRecord = Prisma.AttendancePolicyGetPayload<{
  include: typeof policyListInclude;
}>;

function toPolicy(record: PolicyRecord) {
  const days = parseWorkDays(record.workDays);
  const departments = record.departmentAssignments.map(({ department }) => department);
  const employees = record.employeeAssignments.map(({ employee }) => {
    if (employee.assignments.length > 1) {
      throw new AttendancePolicyServiceError("policy_scope_invalid", 409);
    }
    return {
      id: employee.id,
      employeeNumber: employee.employeeNumber,
      name: `${employee.firstName} ${employee.lastName}`.trim(),
      email: employee.workEmail,
      department: employee.assignments[0]
        ? {
            id: employee.assignments[0].department.id,
            name: employee.assignments[0].department.name,
          }
        : null,
    };
  });
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    description: record.description,
    status: record.status,
    scope: record.scope,
    precedence: record.precedence,
    effectiveFrom: localDate(record.effectiveFrom)!,
    effectiveTo: localDate(record.effectiveTo),
    scheduleType: record.scheduleType,
    timeZone: record.timeZone,
    workDays: days,
    shiftStart: record.shiftStart,
    shiftEnd: record.shiftEnd,
    breakStart: record.breakStart,
    breakEnd: record.breakEnd,
    breakPaid: record.breakPaid,
    gracePeriodMinutes: record.gracePeriodMinutes,
    missingTimeInRule: record.missingTimeInRule,
    missingTimeOutRule: record.missingTimeOutRule,
    earlyOutRule: record.earlyOutRule,
    undertimeRule: record.undertimeRule,
    absenceRule: record.absenceRule,
    correctionsRequireApproval: record.correctionsRequireApproval,
    overtimeEnabled: record.overtimeEnabled,
    overtimePriorApproval: record.overtimePriorApproval,
    overtimeMinimumMinutes: record.overtimeMinimumMinutes,
    overtimeRoundingMinutes: record.overtimeRoundingMinutes,
    overtimeMaximumMinutes: record.overtimeMaximumMinutes,
    departments,
    employees,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
  };
}

type PolicyWriteData = Omit<
  Prisma.AttendancePolicyUncheckedCreateInput,
  "createdByUserId"
>;

function inputData(input: AttendancePolicyInput): PolicyWriteData {
  return {
    code: input.code,
    name: input.name,
    description: input.description,
    status: input.status,
    scope: input.scope,
    precedence: input.precedence,
    effectiveFrom: asDate(input.effectiveFrom),
    effectiveTo: input.effectiveTo ? asDate(input.effectiveTo) : null,
    scheduleType: input.scheduleType,
    timeZone: input.timeZone,
    workDays: input.workDays,
    shiftStart: input.shiftStart,
    shiftEnd: input.shiftEnd,
    breakStart: input.breakStart,
    breakEnd: input.breakEnd,
    breakPaid: input.breakPaid,
    gracePeriodMinutes: input.gracePeriodMinutes,
    missingTimeInRule: input.missingTimeInRule,
    missingTimeOutRule: input.missingTimeOutRule,
    earlyOutRule: input.earlyOutRule,
    undertimeRule: input.undertimeRule,
    absenceRule: input.absenceRule,
    correctionsRequireApproval: input.correctionsRequireApproval,
    overtimeEnabled: input.overtimeEnabled,
    overtimePriorApproval: input.overtimePriorApproval,
    overtimeMinimumMinutes: input.overtimeMinimumMinutes,
    overtimeRoundingMinutes: input.overtimeRoundingMinutes,
    overtimeMaximumMinutes: input.overtimeMaximumMinutes,
  };
}

type PolicyOverlapInput = Pick<
  AttendancePolicyInput,
  | "scope"
  | "precedence"
  | "effectiveFrom"
  | "effectiveTo"
  | "departmentIds"
  | "employeeIds"
>;

function overlapByScope(
  input: PolicyOverlapInput,
  existing: {
    scope: string;
    precedence: number;
    effectiveFrom: Date;
    effectiveTo: Date | null;
    departmentAssignments: Array<{ departmentId: string }>;
    employeeAssignments: Array<{ employeeId: string }>;
  },
) {
  const inputEnd = input.effectiveTo ? asDate(input.effectiveTo) : null;
  const datesOverlap =
    (!existing.effectiveTo || asDate(input.effectiveFrom) <= existing.effectiveTo) &&
    (!inputEnd || existing.effectiveFrom <= inputEnd);
  if (
    !datesOverlap ||
    input.scope !== existing.scope ||
    input.precedence !== existing.precedence
  ) {
    return false;
  }
  if (input.scope === "AllEmployees") return true;
  if (input.scope === "Departments") {
    const assigned = new Set(
      existing.departmentAssignments.map(({ departmentId }) => departmentId),
    );
    return input.departmentIds.some((id) => assigned.has(id));
  }
  const assigned = new Set(
    existing.employeeAssignments.map(({ employeeId }) => employeeId),
  );
  return input.employeeIds.some((id) => assigned.has(id));
}

async function validateTargets(
  transaction: Prisma.TransactionClient,
  input: AttendancePolicyInput,
): Promise<void> {
  if (input.scope === "Departments") {
    const departments = await transaction.department.findMany({
      where: { id: { in: input.departmentIds }, active: true },
      select: { id: true },
    });
    if (departments.length !== input.departmentIds.length) {
      throw new AttendancePolicyServiceError("policy_scope_invalid", 400);
    }
  }
  if (input.scope === "Employees") {
    const employees = await transaction.employee.findMany({
      where: { id: { in: input.employeeIds } },
      select: {
        id: true,
        assignments: {
          where: { effectiveTo: null },
          take: 2,
          select: {
            statusDefinition: {
              select: { active: true, headcountEligible: true },
            },
            department: { select: { active: true } },
          },
        },
      },
    });
    if (
      employees.length !== input.employeeIds.length ||
      employees.some(
        ({ assignments }) =>
          assignments.length !== 1 ||
          !assignments[0].statusDefinition.active ||
          !assignments[0].statusDefinition.headcountEligible ||
          !assignments[0].department.active,
      )
    ) {
      throw new AttendancePolicyServiceError("policy_scope_invalid", 400);
    }
  }
}

async function validateNoPolicyOverlap(
  transaction: Prisma.TransactionClient,
  input: PolicyOverlapInput,
  excludeId?: string,
): Promise<void> {
  const potential = await transaction.attendancePolicy.findMany({
    where: {
      ...(excludeId ? { id: { not: excludeId } } : {}),
      status: { not: "Archived" },
      effectiveFrom: {
        lte: input.effectiveTo ? asDate(input.effectiveTo) : new Date("9999-12-31T00:00:00.000Z"),
      },
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gte: asDate(input.effectiveFrom) } },
      ],
    },
    select: {
      id: true,
      name: true,
      scope: true,
      precedence: true,
      effectiveFrom: true,
      effectiveTo: true,
      departmentAssignments: { select: { departmentId: true } },
      employeeAssignments: { select: { employeeId: true } },
    },
  });
  const conflicts = potential.filter((policy) => overlapByScope(input, policy));
  if (conflicts.length) {
    throw new AttendancePolicyServiceError("policy_overlap", 409);
  }
}

async function replaceAssignments(
  transaction: Prisma.TransactionClient,
  policyId: string,
  actorId: string,
  input: AttendancePolicyInput,
) {
  await transaction.attendancePolicyDepartment.deleteMany({ where: { policyId } });
  await transaction.attendancePolicyEmployee.deleteMany({ where: { policyId } });
  if (input.departmentIds.length) {
    await transaction.attendancePolicyDepartment.createMany({
      data: input.departmentIds.map((departmentId) => ({
        policyId,
        departmentId,
        assignedByUserId: actorId,
      })),
    });
  }
  if (input.employeeIds.length) {
    await transaction.attendancePolicyEmployee.createMany({
      data: input.employeeIds.map((employeeId) => ({
        policyId,
        employeeId,
        assignedByUserId: actorId,
      })),
    });
  }
}

function isKnownPrismaError(
  error: unknown,
  code: string,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === code
  );
}

export async function listAttendancePolicies(
  actor: SessionPrincipal,
  rawInput: unknown,
) {
  requireAttendanceReader(actor);
  const parsed = policyListInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AttendancePolicyServiceError("invalid_request", 400);
  }
  const globalDepartmentMatches = parsed.data.query
    ? await prisma.department.findFirst({
        where: {
          active: true,
          name: { contains: parsed.data.query },
        },
        select: { id: true },
      })
    : null;
  const records = await prisma.attendancePolicy.findMany({
    where: parsed.data.status === "all" ? {} : { status: parsed.data.status },
    include: policyListInclude,
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });
  const filtered = records
    .filter((record) =>
      matchesSearch(
        record,
        parsed.data.query,
        record.scope === "AllEmployees" && !!globalDepartmentMatches,
      ),
    )
    .sort(
      (left, right) =>
        searchScore(left, parsed.data.query) -
          searchScore(right, parsed.data.query) ||
        left.name.localeCompare(right.name) ||
        left.id.localeCompare(right.id),
    );
  return {
    policies: filtered.map((record) => ({
      id: record.id,
      code: record.code,
      name: record.name,
      description: record.description,
      status: record.status,
      scope: record.scope,
      precedence: record.precedence,
      effectiveFrom: localDate(record.effectiveFrom)!,
      effectiveTo: localDate(record.effectiveTo),
      scheduleType: record.scheduleType,
      timeZone: record.timeZone,
      workDays: parseWorkDays(record.workDays),
      shiftStart: record.shiftStart,
      shiftEnd: record.shiftEnd,
      gracePeriodMinutes: record.gracePeriodMinutes,
      overtimeEnabled: record.overtimeEnabled,
      departmentNames:
        record.scope === "AllEmployees"
          ? ["All departments"]
          : record.scope === "Departments"
            ? record.departmentAssignments.map(({ department }) => department.name)
            : [
                ...new Set(
                  record.employeeAssignments.flatMap(({ employee }) =>
                    employee.assignments.map(({ department }) => department.name),
                  ),
                ),
              ],
      assignedEmployeeCount: record.employeeAssignments.length,
      updatedAt: record.updatedAt.toISOString(),
    })),
    totalItems: filtered.length,
    statuses: ["Active", "Paused", "Archived"] as const,
  };
}

export async function getAttendancePolicyOptions(actor: SessionPrincipal) {
  requireAttendanceManager(actor);
  const [departments, employees] = await Promise.all([
    prisma.department.findMany({
      where: { active: true },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.employee.findMany({
      where: {
        assignments: {
          some: {
            effectiveTo: null,
            statusDefinition: { active: true, headcountEligible: true },
            department: { active: true },
          },
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }, { id: "asc" }],
      select: {
        id: true,
        employeeNumber: true,
        firstName: true,
        lastName: true,
        workEmail: true,
        assignments: {
          where: { effectiveTo: null },
          take: 2,
          select: { department: { select: { id: true, name: true } } },
        },
      },
    }),
  ]);
  return {
    departments,
    employees: employees.flatMap((employee) => {
      if (employee.assignments.length !== 1) return [];
      return [{
        id: employee.id,
        employeeNumber: employee.employeeNumber,
        name: `${employee.firstName} ${employee.lastName}`.trim(),
        email: employee.workEmail,
        department: employee.assignments[0]!.department,
      }];
    }),
  };
}

export async function getAttendancePolicyDetails(
  actor: SessionPrincipal,
  policyIdValue: string,
) {
  requireAttendanceReader(actor);
  const id = attendancePolicyIdSchema.safeParse(policyIdValue);
  if (!id.success) {
    throw new AttendancePolicyServiceError("policy_not_found", 404);
  }
  const [record, history] = await Promise.all([
    prisma.attendancePolicy.findUnique({
      where: { id: id.data },
      include: policyInclude,
    }),
    prisma.domainAuditEvent.findMany({
      where: { entityType: "attendancePolicy", entityId: id.data },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 100,
      select: {
        id: true,
        action: true,
        summary: true,
        details: true,
        createdAt: true,
        actor: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);
  if (!record) throw new AttendancePolicyServiceError("policy_not_found", 404);
  const policy = toPolicy(record);
  const assignedEmployees = await getAssignedEmployees(record);
  return {
    ...policy,
    assignedEmployees,
    history: history.map((event) => ({
      id: event.id,
      action: event.action,
      summary: event.summary,
      details: event.details,
      createdAt: event.createdAt.toISOString(),
      actor: event.actor,
    })),
  };
}

async function getAssignedEmployees(policy: PolicyRecord) {
  if (policy.scope === "Employees") {
    return policy.employeeAssignments.flatMap(({ employee }) => {
      const assignment = employee.assignments[0];
      if (
        employee.assignments.length !== 1 ||
        !assignment.statusDefinition.active ||
        !assignment.statusDefinition.headcountEligible ||
        !assignment.department.active
      ) {
        return [];
      }
      return [{
        id: employee.id,
        employeeNumber: employee.employeeNumber,
        name: `${employee.firstName} ${employee.lastName}`.trim(),
        email: employee.workEmail,
        department: {
          id: assignment.department.id,
          name: assignment.department.name,
        },
        assignmentSource: "Employee" as const,
      }];
    });
  }

  const employeeWhere: Prisma.EmployeeWhereInput = {
    assignments: {
      some: {
        effectiveTo: null,
        statusDefinition: { active: true, headcountEligible: true },
        department: { active: true },
        ...(policy.scope === "Departments"
          ? {
              departmentId: {
                in: policy.departmentAssignments.map(
                  ({ department }) => department.id,
                ),
              },
            }
          : {}),
      },
    },
  };
  const employees = await prisma.employee.findMany({
    where: employeeWhere,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }, { id: "asc" }],
    select: {
      id: true,
      employeeNumber: true,
      firstName: true,
      lastName: true,
      workEmail: true,
      assignments: {
        where: { effectiveTo: null },
        take: 2,
        select: {
          department: { select: { id: true, name: true } },
        },
      },
    },
  });
  return employees.map((employee) => {
    if (employee.assignments.length > 1) {
      throw new AttendancePolicyServiceError("policy_scope_invalid", 409);
    }
    return {
      id: employee.id,
      employeeNumber: employee.employeeNumber,
      name: `${employee.firstName} ${employee.lastName}`.trim(),
      email: employee.workEmail,
      department: employee.assignments[0]?.department ?? null,
      assignmentSource: policy.scope === "Departments" ? "Department" : "All employees",
    };
  });
}

export async function createAttendancePolicy(
  actor: SessionPrincipal,
  rawInput: unknown,
) {
  requireAttendanceManager(actor);
  const parsed = createAttendancePolicySchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AttendancePolicyServiceError("invalid_request", 400);
  }
  if (parsed.data.status === "Archived") {
    throw new AttendancePolicyServiceError("invalid_request", 400);
  }
  try {
    return await prisma.$transaction(async (transaction) => {
      await validateTargets(transaction, parsed.data);
      if (parsed.data.status !== "Archived") {
        await validateNoPolicyOverlap(transaction, parsed.data);
      }
      let timeZoneIsValid = true;
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: parsed.data.timeZone });
      } catch {
        timeZoneIsValid = false;
      }
      if (!timeZoneIsValid) {
        throw new AttendancePolicyServiceError("invalid_request", 400);
      }
      const data = inputData(parsed.data);
      const record = await transaction.attendancePolicy.create({
        data: { ...data, createdByUserId: actor.userId },
        select: { id: true },
      });
      await replaceAssignments(
        transaction,
        record.id,
        actor.userId,
        parsed.data,
      );
      await writeDomainAuditEvent(transaction, {
        actor,
        action: "attendance_policy.created",
        entityType: "attendancePolicy",
        entityId: record.id,
        summary: "Attendance policy created",
        details: {
          code: parsed.data.code,
          status: parsed.data.status,
          scope: parsed.data.scope,
          departmentIds: parsed.data.departmentIds,
          employeeIds: parsed.data.employeeIds,
        } satisfies Prisma.InputJsonObject,
      });
      const saved = await transaction.attendancePolicy.findUniqueOrThrow({
        where: { id: record.id },
        include: policyInclude,
      });
      return toPolicy(saved);
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (error instanceof AttendancePolicyServiceError) throw error;
    if (isKnownPrismaError(error, "P2002")) {
      throw new AttendancePolicyServiceError("policy_conflict", 409);
    }
    if (isKnownPrismaError(error, "P2034")) {
      throw new AttendancePolicyServiceError("concurrent_update", 409);
    }
    throw error;
  }
}

export async function updateAttendancePolicy(
  actor: SessionPrincipal,
  policyIdValue: string,
  rawInput: unknown,
) {
  requireAttendanceManager(actor);
  const id = attendancePolicyIdSchema.safeParse(policyIdValue);
  const parsed = updateAttendancePolicySchema.safeParse(rawInput);
  if (!id.success || !parsed.success) {
    throw new AttendancePolicyServiceError("invalid_request", 400);
  }
  try {
    return await prisma.$transaction(async (transaction) => {
      const existing = await transaction.attendancePolicy.findUnique({
        where: { id: id.data },
        select: { id: true, status: true },
      });
      if (!existing) {
        throw new AttendancePolicyServiceError("policy_not_found", 404);
      }
      if (existing.status === "Archived") {
        throw new AttendancePolicyServiceError("policy_status_conflict", 409);
      }
      await validateTargets(transaction, parsed.data);
      if (parsed.data.status !== "Archived") {
        await validateNoPolicyOverlap(transaction, parsed.data, id.data);
      }
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: parsed.data.timeZone });
      } catch {
        throw new AttendancePolicyServiceError("invalid_request", 400);
      }
      const data = inputData(parsed.data);
      const updated = await transaction.attendancePolicy.updateMany({
        where: { id: id.data, status: { not: "Archived" } },
        data: { ...data, updatedByUserId: actor.userId },
      });
      if (updated.count !== 1) {
        throw new AttendancePolicyServiceError("concurrent_update", 409);
      }
      await replaceAssignments(
        transaction,
        id.data,
        actor.userId,
        parsed.data,
      );
      await writeDomainAuditEvent(transaction, {
        actor,
        action:
          existing.status === parsed.data.status
            ? "attendance_policy.updated"
            : `attendance_policy.${parsed.data.status.toLowerCase()}`,
        entityType: "attendancePolicy",
        entityId: id.data,
        summary:
          existing.status === parsed.data.status
            ? "Attendance policy updated"
            : `Attendance policy ${parsed.data.status.toLowerCase()}`,
        details: {
          statusBefore: existing.status,
          statusAfter: parsed.data.status,
          scope: parsed.data.scope,
          departmentIds: parsed.data.departmentIds,
          employeeIds: parsed.data.employeeIds,
        } satisfies Prisma.InputJsonObject,
      });
      const saved = await transaction.attendancePolicy.findUniqueOrThrow({
        where: { id: id.data },
        include: policyInclude,
      });
      return toPolicy(saved);
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (error instanceof AttendancePolicyServiceError) throw error;
    if (isKnownPrismaError(error, "P2002")) {
      throw new AttendancePolicyServiceError("policy_conflict", 409);
    }
    if (isKnownPrismaError(error, "P2034")) {
      throw new AttendancePolicyServiceError("concurrent_update", 409);
    }
    throw error;
  }
}

export async function transitionAttendancePolicy(
  actor: SessionPrincipal,
  policyIdValue: string,
  status: "Active" | "Paused" | "Archived",
) {
  requireAttendanceManager(actor);
  const id = attendancePolicyIdSchema.safeParse(policyIdValue);
  if (!id.success) {
    throw new AttendancePolicyServiceError("policy_not_found", 404);
  }
  return prisma.$transaction(async (transaction) => {
    const policy = await transaction.attendancePolicy.findUnique({
      where: { id: id.data },
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
        scope: true,
        precedence: true,
        effectiveFrom: true,
        effectiveTo: true,
        departmentAssignments: { select: { departmentId: true } },
        employeeAssignments: { select: { employeeId: true } },
      },
    });
    if (!policy) throw new AttendancePolicyServiceError("policy_not_found", 404);
    if (
      policy.status === "Archived" ||
      policy.status === status ||
      (policy.status === "Active" && status === "Active")
    ) {
      throw new AttendancePolicyServiceError("policy_status_conflict", 409);
    }
    if (status !== "Archived") {
      const input: PolicyOverlapInput = {
        scope: policy.scope,
        precedence: policy.precedence,
        effectiveFrom: localDate(policy.effectiveFrom)!,
        effectiveTo: localDate(policy.effectiveTo),
        departmentIds: policy.departmentAssignments.map(
          ({ departmentId }) => departmentId,
        ),
        employeeIds: policy.employeeAssignments.map(({ employeeId }) => employeeId),
      };
      await validateNoPolicyOverlap(transaction, input, id.data);
    }
    const updated = await transaction.attendancePolicy.updateMany({
      where: { id: policy.id, status: policy.status },
      data: { status, updatedByUserId: actor.userId },
    });
    if (updated.count !== 1) {
      throw new AttendancePolicyServiceError("concurrent_update", 409);
    }
    await writeDomainAuditEvent(transaction, {
      actor,
      action: `attendance_policy.${status.toLowerCase()}`,
      entityType: "attendancePolicy",
      entityId: policy.id,
      summary: `Attendance policy ${status.toLowerCase()}`,
      details: { statusBefore: policy.status, statusAfter: status },
    });
    return { id: policy.id, status };
  });
}

export async function resolvePolicyForEmployee(
  employeeIdValue: string,
  onDate: Date,
) {
  const employeeId = attendancePolicyIdSchema.safeParse(employeeIdValue);
  if (!employeeId.success || !Number.isFinite(onDate.getTime())) {
    throw new AttendancePolicyServiceError("invalid_request", 400);
  }
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId.data },
    select: {
      assignments: {
        where: { effectiveTo: null },
        take: 2,
        select: {
          departmentId: true,
          statusDefinition: { select: { active: true, headcountEligible: true } },
          department: { select: { active: true } },
        },
      },
    },
  });
  if (!employee) throw new AttendancePolicyServiceError("policy_scope_invalid", 404);
  if (
    employee.assignments.length !== 1 ||
    !employee.assignments[0]?.statusDefinition.active ||
    !employee.assignments[0]?.statusDefinition.headcountEligible ||
    !employee.assignments[0]?.department.active
  ) {
    return { status: "none" as const };
  }
  const assignment = employee.assignments[0];
  const policies = await prisma.attendancePolicy.findMany({
    where: {
      status: { in: ["Active", "Paused"] },
      effectiveFrom: { lte: onDate },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: onDate } }],
    },
    select: {
      id: true,
      status: true,
      scope: true,
      precedence: true,
      effectiveFrom: true,
      effectiveTo: true,
      departmentAssignments: { select: { departmentId: true } },
      employeeAssignments: { select: { employeeId: true } },
    },
  });
  return resolveAttendancePolicy(
    policies
      .filter(
        (policy) =>
          policy.scope === "AllEmployees" ||
          (policy.scope === "Departments" &&
            policy.departmentAssignments.some(
              ({ departmentId }) => departmentId === assignment.departmentId,
            )) ||
          (policy.scope === "Employees" &&
            policy.employeeAssignments.some(
              ({ employeeId: assignedId }) => assignedId === employeeId.data,
            )),
      )
      .map((policy) => ({
        id: policy.id,
        status: policy.status,
        scope: policy.scope,
        precedence: policy.precedence,
        effectiveFrom: policy.effectiveFrom,
        effectiveTo: policy.effectiveTo,
      })),
    onDate,
  );
}
