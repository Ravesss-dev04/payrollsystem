import "server-only";
import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../db";
import { writeDomainAuditEvent } from "../audit/domain-audit";
import type { SessionPrincipal } from "../auth/session-policy";
import {
  getDepartments,
  getEmploymentStatusPolicy,
  ORGANIZATION_ID,
} from "../organization/service";
import {
  createEmployeeSchema,
  employeeIdSchema,
  employeeAccountLinkSchema,
  updateEmployeeSchema,
  type CreateEmployeeInput,
  type EmployeeSummary,
  type EmployeeWorkspace,
  type UpdateEmployeeInput,
} from "./schemas";

type EmployeeProfile = {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  workEmail: string;
};

type EmployeeAssignmentSummary = {
  effectiveFrom: Date;
  statusDefinition: { code: string; label: string };
  department: { id: string; name: string };
};

async function findSingleOpenAssignment(
  transaction: Prisma.TransactionClient,
  employeeId: string,
) {
  const assignments = await transaction.employeeAssignment.findMany({
    where: { employeeId, effectiveTo: null },
    orderBy: { effectiveFrom: "desc" },
    select: {
      id: true,
      effectiveFrom: true,
      statusDefinition: { select: { id: true, code: true, label: true } },
      department: { select: { id: true, name: true } },
    },
  });
  const [assignment] = assignments;
  if (!assignment) {
    throw new EmployeeServiceError("employee_assignment_missing", 409);
  }
  if (assignments.length !== 1) {
    throw new EmployeeServiceError("assignment_conflict", 409);
  }
  return assignment;
}

export class EmployeeServiceError extends Error {
  constructor(
    public readonly code:
      | "forbidden"
      | "employee_not_found"
      | "employee_assignment_missing"
      | "department_not_found"
      | "employment_status_not_configured"
      | "organization_not_configured"
      | "effective_date_must_increase"
      | "assignment_conflict"
      | "employee_conflict"
      | "employee_already_linked"
      | "account_not_found"
      | "account_already_linked"
      | "linked_account_email_mismatch",
    public readonly status: 403 | 404 | 409,
  ) {
    super(code);
  }
}

function requireHr(actor: SessionPrincipal): void {
  if (actor.role !== "hr") {
    throw new EmployeeServiceError("forbidden", 403);
  }
}

function requireAdmin(actor: SessionPrincipal): void {
  if (actor.role !== "admin") {
    throw new EmployeeServiceError("forbidden", 403);
  }
}

function employeeDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function toEmployeeSummary(
  employee: EmployeeProfile,
  assignment: EmployeeAssignmentSummary,
): EmployeeSummary {
  return {
    id: employee.id,
    employeeNumber: employee.employeeNumber,
    firstName: employee.firstName,
    lastName: employee.lastName,
    workEmail: employee.workEmail,
    employmentStatus: assignment.statusDefinition,
    department: assignment.department,
    effectiveFrom: dateOnly(assignment.effectiveFrom),
  };
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

async function findActiveDepartment(
  transaction: Prisma.TransactionClient,
  departmentId: string,
) {
  return transaction.department.findFirst({
    where: {
      id: departmentId,
      organizationId: ORGANIZATION_ID,
      active: true,
    },
    select: { id: true, name: true },
  });
}

async function findStatusDefinition(
  transaction: Prisma.TransactionClient,
  effectiveFrom: Date,
  statusCode: string,
) {
  const policy = await transaction.employmentStatusPolicy.findFirst({
    where: {
      organizationId: ORGANIZATION_ID,
      effectiveFrom: { lte: effectiveFrom },
    },
    orderBy: [{ effectiveFrom: "desc" }, { version: "desc" }],
    select: {
      definitions: {
        where: { code: statusCode, active: true },
        select: { id: true, code: true, label: true },
      },
    },
  });
  const statusDefinition = policy?.definitions.find(
    (definition) => definition.code === statusCode,
  );
  if (!statusDefinition) {
    throw new EmployeeServiceError(
      "employment_status_not_configured",
      409,
    );
  }
  return statusDefinition;
}

export async function getEmployeeWorkspace(): Promise<EmployeeWorkspace> {
  const [records, departments, employmentStatuses] = await Promise.all([
    prisma.employee.findMany({
      orderBy: [{ employeeNumber: "asc" }],
      select: {
        id: true,
        employeeNumber: true,
        firstName: true,
        lastName: true,
        workEmail: true,
        assignments: {
          where: { effectiveTo: null },
          orderBy: { effectiveFrom: "desc" },
          select: {
            effectiveFrom: true,
            statusDefinition: { select: { code: true, label: true } },
            department: { select: { id: true, name: true } },
          },
        },
      },
    }),
    getDepartments(),
    getEmploymentStatusPolicy(),
  ]);

  const employees = records.map((record) => {
    const [assignment] = record.assignments;
    if (!assignment) {
      throw new EmployeeServiceError("employee_assignment_missing", 409);
    }
    if (record.assignments.length !== 1) {
      throw new EmployeeServiceError("assignment_conflict", 409);
    }
    return toEmployeeSummary(record, assignment);
  });

  return {
    employees,
    departments: departments
      .filter((department) => department.active)
      .map(({ id, name }) => ({ id, name })),
    employmentStatuses: employmentStatuses.map(({ code, label }) => ({
      code,
      label,
    })),
  };
}

export async function createEmployee(
  actor: SessionPrincipal,
  input: CreateEmployeeInput,
): Promise<EmployeeSummary> {
  requireHr(actor);
  const employeeInput = createEmployeeSchema.parse(input);
  const effectiveFrom = employeeDate(employeeInput.effectiveFrom);

  try {
    return await prisma.$transaction(async (transaction) => {
      const [department, statusDefinition] = await Promise.all([
        findActiveDepartment(transaction, employeeInput.departmentId),
        findStatusDefinition(
          transaction,
          effectiveFrom,
          employeeInput.statusCode,
        ),
      ]);
      if (!department) {
        throw new EmployeeServiceError("department_not_found", 404);
      }

      const employee = await transaction.employee.create({
        data: {
          employeeNumber: employeeInput.employeeNumber,
          firstName: employeeInput.firstName,
          lastName: employeeInput.lastName,
          workEmail: employeeInput.workEmail,
        },
        select: {
          id: true,
          employeeNumber: true,
          firstName: true,
          lastName: true,
          workEmail: true,
        },
      });
      await transaction.employeeAssignment.create({
        data: {
          employeeId: employee.id,
          statusDefinitionId: statusDefinition.id,
          departmentId: department.id,
          effectiveFrom,
          effectiveTo: null,
        },
        select: { id: true },
      });
      await writeDomainAuditEvent(transaction, {
        actor,
        action: "employee.created",
        entityType: "employee",
        entityId: employee.id,
        summary: "Employee record created",
      });
      return toEmployeeSummary(employee, {
        effectiveFrom,
        statusDefinition,
        department,
      });
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new EmployeeServiceError("employee_conflict", 409);
    }
    throw error;
  }
}

export async function updateEmployee(
  actor: SessionPrincipal,
  employeeId: string,
  input: UpdateEmployeeInput,
): Promise<EmployeeSummary> {
  requireHr(actor);
  const id = employeeIdSchema.parse(employeeId);
  const employeeInput = updateEmployeeSchema.parse(input);

  try {
    return await prisma.$transaction(async (transaction) => {
      const current = await transaction.employee.findUnique({
        where: { id },
        select: {
          id: true,
          employeeNumber: true,
          firstName: true,
          lastName: true,
          workEmail: true,
          userId: true,
        },
      });
      if (!current) {
        throw new EmployeeServiceError("employee_not_found", 404);
      }

      if (
        current.userId &&
        employeeInput.workEmail !== undefined &&
        employeeInput.workEmail !== current.workEmail
      ) {
        const linkedAccount = await transaction.user.findUnique({
          where: { id: current.userId },
          select: { email: true },
        });
        if (
          !linkedAccount ||
          normalizeEmail(linkedAccount.email) !== employeeInput.workEmail
        ) {
          throw new EmployeeServiceError(
            "linked_account_email_mismatch",
            409,
          );
        }
      }

      const profileData = {
        ...(employeeInput.employeeNumber !== undefined
          ? { employeeNumber: employeeInput.employeeNumber }
          : {}),
        ...(employeeInput.firstName !== undefined
          ? { firstName: employeeInput.firstName }
          : {}),
        ...(employeeInput.lastName !== undefined
          ? { lastName: employeeInput.lastName }
          : {}),
        ...(employeeInput.workEmail !== undefined
          ? { workEmail: employeeInput.workEmail }
          : {}),
      };
      const employee = Object.keys(profileData).length
        ? await transaction.employee.update({
            where: { id },
            data: profileData,
            select: {
              id: true,
              employeeNumber: true,
              firstName: true,
              lastName: true,
              workEmail: true,
            },
          })
        : current;

      let assignment: EmployeeAssignmentSummary;
      if (
        employeeInput.statusCode !== undefined ||
        employeeInput.departmentId !== undefined
      ) {
        const priorAssignment = await findSingleOpenAssignment(
          transaction,
          id,
        );
        if (
          !employeeInput.effectiveFrom ||
          employeeDate(employeeInput.effectiveFrom) <=
            priorAssignment.effectiveFrom
        ) {
          throw new EmployeeServiceError(
            "effective_date_must_increase",
            409,
          );
        }

        const effectiveFrom = employeeDate(employeeInput.effectiveFrom);
        const department =
          employeeInput.departmentId === undefined
            ? priorAssignment.department
            : await findActiveDepartment(
                transaction,
                employeeInput.departmentId,
              );
        if (!department) {
          throw new EmployeeServiceError("department_not_found", 404);
        }
        const statusDefinition =
          employeeInput.statusCode === undefined
            ? priorAssignment.statusDefinition
            : await findStatusDefinition(
                transaction,
                effectiveFrom,
                employeeInput.statusCode,
              );

        const closed = await transaction.employeeAssignment.updateMany({
          where: {
            id: priorAssignment.id,
            employeeId: id,
            effectiveTo: null,
          },
          data: { effectiveTo: effectiveFrom },
        });
        if (closed.count !== 1) {
          throw new EmployeeServiceError("assignment_conflict", 409);
        }
        await transaction.employeeAssignment.create({
          data: {
            employeeId: id,
            statusDefinitionId: statusDefinition.id,
            departmentId: department.id,
            effectiveFrom,
            effectiveTo: null,
          },
          select: { id: true },
        });
        assignment = { effectiveFrom, statusDefinition, department };
      } else {
        const currentAssignment = await findSingleOpenAssignment(
          transaction,
          id,
        );
        assignment = currentAssignment;
      }

      await writeDomainAuditEvent(transaction, {
        actor,
        action: "employee.updated",
        entityType: "employee",
        entityId: id,
        summary: "Employee record updated",
      });
      return toEmployeeSummary(employee, assignment);
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new EmployeeServiceError("employee_conflict", 409);
    }
    throw error;
  }
}

export async function linkEmployeeAccount(
  actor: SessionPrincipal,
  employeeId: string,
  userId: string,
): Promise<{ employeeId: string; userId: string }> {
  requireAdmin(actor);
  const input = employeeAccountLinkSchema.parse({ employeeId, userId });

  try {
    return await prisma.$transaction(async (transaction) => {
      const employee = await transaction.employee.findUnique({
        where: { id: input.employeeId },
        select: { id: true, workEmail: true, userId: true },
      });
      if (!employee) {
        throw new EmployeeServiceError("employee_not_found", 404);
      }
      if (employee.userId) {
        throw new EmployeeServiceError("employee_already_linked", 409);
      }

      const account = await transaction.user.findUnique({
        where: { id: input.userId },
        select: { id: true, email: true },
      });
      if (!account) {
        throw new EmployeeServiceError("account_not_found", 404);
      }
      if (normalizeEmail(account.email) !== employee.workEmail) {
        throw new EmployeeServiceError(
          "linked_account_email_mismatch",
          409,
        );
      }

      const existingLink = await transaction.employee.findUnique({
        where: { userId: input.userId },
        select: { id: true },
      });
      if (existingLink) {
        throw new EmployeeServiceError("account_already_linked", 409);
      }

      const linked = await transaction.employee.updateMany({
        where: {
          id: input.employeeId,
          userId: null,
          workEmail: employee.workEmail,
        },
        data: { userId: account.id },
      });
      if (linked.count !== 1) {
        throw new EmployeeServiceError("account_already_linked", 409);
      }
      await writeDomainAuditEvent(transaction, {
        actor,
        action: "employee.account_linked",
        entityType: "employee",
        entityId: employee.id,
        summary: "Employee account linked",
      });
      return { employeeId: employee.id, userId: account.id };
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new EmployeeServiceError("account_already_linked", 409);
    }
    throw error;
  }
}
