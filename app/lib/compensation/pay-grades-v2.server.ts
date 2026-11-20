import "server-only";
import { prisma } from "@/app/lib/db";
import { writeDomainAuditEvent } from "@/app/lib/audit/domain-audit";
import { requirePermission } from "@/app/lib/auth/authorization";
import type { CompensationBasis } from "@/app/generated/prisma/client";
import { z } from "zod";
import { isValidMoneyString } from "./money";

/**
 * Pay Grade validation schema
 */
export const createPayGradeSchema = z.object({
  code: z.string()
    .min(1, "Code required")
    .max(40, "Code max 40 chars")
    .regex(/^[A-Z0-9_-]+$/, "Code must be uppercase alphanumeric with - or _"),
  name: z.string()
    .min(1, "Name required")
    .max(120, "Name max 120 chars"),
  description: z.string()
    .max(500, "Description max 500 chars")
    .optional()
    .nullable(),
  position: z.string()
    .max(120, "Position max 120 chars")
    .optional()
    .nullable(),
  basis: z.enum(["Monthly", "Daily", "Hourly"]),
  minBasePay: z.string()
    .trim().refine(isValidMoneyString, "Min pay must be a positive amount with at most two decimal places")
    .transform((val) => parseFloat(val)),
  maxBasePay: z.string()
    .trim().refine(isValidMoneyString, "Max pay must be a positive amount with at most two decimal places")
    .transform((val) => parseFloat(val)),
  effectiveFrom: z.string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid start date",
    })
    .transform((val) => new Date(val)),
  effectiveTo: z.string()
    .optional()
    .nullable()
    .refine((val) => !val || !isNaN(Date.parse(val as string)), {
      message: "Invalid end date",
    })
    .transform((val) => (val ? new Date(val as string) : null)),
  status: z.enum(["Active", "Inactive"]),
  notes: z.string().max(500, "Notes max 500 chars").optional().nullable(),
});

export type CreatePayGradeInput = z.infer<typeof createPayGradeSchema>;

/**
 * Validate pay grade input
 */
export function validatePayGrade(
  input: CreatePayGradeInput
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Date validation
  if (input.effectiveFrom && input.effectiveTo) {
    if (input.effectiveFrom > input.effectiveTo) {
      errors.push("Start date cannot be after end date");
    }
  }

  // Pay range validation
  if (input.minBasePay > input.maxBasePay) {
    errors.push("Minimum pay cannot exceed maximum pay");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create a new pay grade
 */
export async function createPayGrade(
  input: CreatePayGradeInput,
  userId: string
): Promise<any> {
  // Validate permission
  const permCheck = await requirePermission(userId, "compensation:policy:manage");
  if (!permCheck.allowed) {
    throw new Error(`Permission denied: ${permCheck.reason}`);
  }

  // Validate input
  const validation = validatePayGrade(input);
  if (!validation.valid) {
    throw new Error(`Validation failed: ${validation.errors.join("; ")}`);
  }

  // Check for duplicate code
  const existing = await prisma.payGrade.findUnique({
    where: { code: input.code },
  });
  if (existing) {
    throw new Error("Pay grade code already exists");
  }

  // Create pay grade
  const payGrade = await prisma.payGrade.create({
    data: {
      code: input.code,
      name: input.name,
      description: input.description,
      position: input.position,
      basis: input.basis,
      minBasePay: input.minBasePay,
      maxBasePay: input.maxBasePay,
      effectiveFrom: input.effectiveFrom,
      effectiveTo: input.effectiveTo,
      status: input.status,
      notes: input.notes,
      createdByUserId: userId,
    },
  });

  // Audit event
  await writeDomainAuditEvent({
    actorUserId: userId,
    actorRole: "admin", // inferred from context
    action: "create",
    entityType: "PayGrade",
    entityId: payGrade.id,
    summary: `Created pay grade: ${payGrade.code}`,
    details: {
      code: payGrade.code,
      name: payGrade.name,
      basis: payGrade.basis,
      minBasePay: payGrade.minBasePay,
      maxBasePay: payGrade.maxBasePay,
    },
  });

  return payGrade;
}

/**
 * Update a pay grade
 */
export async function updatePayGrade(
  id: string,
  input: Partial<CreatePayGradeInput>,
  userId: string
): Promise<any> {
  // Validate permission
  const permCheck = await requirePermission(userId, "compensation:policy:manage");
  if (!permCheck.allowed) {
    throw new Error(`Permission denied: ${permCheck.reason}`);
  }

  // Get existing
  const existing = await prisma.payGrade.findUnique({
    where: { id },
    include: { _count: { select: { employeeGrades: true } } },
  });

  if (!existing) {
    throw new Error("Pay grade not found");
  }

  if (input.code && input.code !== existing.code) {
    const duplicate = await prisma.payGrade.findUnique({ where: { code: input.code }, select: { id: true } });
    if (duplicate) throw new Error("Pay grade code already exists");
  }

  // If modifying salary range and employees assigned, flag discrepancy
  const changedSalaryRange =
    (input.minBasePay !== undefined && input.minBasePay !== Number(existing.minBasePay)) ||
    (input.maxBasePay !== undefined && input.maxBasePay !== Number(existing.maxBasePay));

  if (changedSalaryRange && existing._count.employeeGrades > 0) {
    // In real implementation, check each employee's current salary
    // For now, just note in audit
  }

  const candidate = {
    code: input.code ?? existing.code,
    name: input.name ?? existing.name,
    description: input.description ?? existing.description,
    position: input.position ?? existing.position,
    basis: input.basis ?? existing.basis,
    minBasePay: Number(input.minBasePay ?? existing.minBasePay),
    maxBasePay: Number(input.maxBasePay ?? existing.maxBasePay),
    effectiveFrom: new Date(input.effectiveFrom ?? existing.effectiveFrom),
    effectiveTo: input.effectiveTo === undefined ? existing.effectiveTo : input.effectiveTo,
    status: (input.status ?? existing.status) as "Active" | "Inactive",
    notes: input.notes ?? existing.notes,
  };
  const validation = validatePayGrade(candidate as CreatePayGradeInput);
  if (!validation.valid) {
    throw new Error(`Validation failed: ${validation.errors.join("; ")}`);
  }
  const conflicts = await checkSalaryRangeConflicts(candidate as unknown as CreatePayGradeInput, id);
  if (conflicts.hasConflicts) throw new Error("Salary range conflict detected for this position and compensation basis");

  // Record previous values for audit
  const previous = {
    code: existing.code,
    name: existing.name,
    basis: existing.basis,
    minBasePay: existing.minBasePay,
    maxBasePay: existing.maxBasePay,
    status: existing.status,
  };

  // Update
  const updated = await prisma.payGrade.update({
    where: { id },
    data: {
      ...input,
      updatedByUserId: userId,
      updatedAt: new Date(),
    },
  });

  // Audit event with change tracking
  await writeDomainAuditEvent({
    actorUserId: userId,
    actorRole: "admin",
    action: "update",
    entityType: "PayGrade",
    entityId: id,
    summary: `Updated pay grade: ${existing.code}`,
    details: {
      previous,
      current: {
        code: updated.code,
        name: updated.name,
        basis: updated.basis,
        minBasePay: updated.minBasePay,
        maxBasePay: updated.maxBasePay,
        status: updated.status,
      },
      salaryRangeChanged: changedSalaryRange,
      employeesAssigned: existing._count.employeeGrades,
    },
  });

  return updated;
}

/**
 * Get pay grade by ID with full details
 */
export async function getPayGradeDetails(id: string): Promise<any> {
  const payGrade = await prisma.payGrade.findUnique({
    where: { id },
    include: {
      employeeGrades: {
        where: {
          effectiveTo: null,  // Only active assignments
        },
        include: {
          employee: {
            select: {
              id: true,
              employeeNumber: true,
              firstName: true,
              lastName: true,
              workEmail: true,
              assignments: {
                where: {
                  effectiveTo: null, // Current assignment
                },
                include: {
                  department: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!payGrade) {
    return null;
  }

  return {
    ...payGrade,
    assignedEmployeeCount: payGrade.employeeGrades.length,
    assignedEmployees: payGrade.employeeGrades.map((eg) => ({
      id: eg.employee.id,
      employeeNumber: eg.employee.employeeNumber,
      name: `${eg.employee.firstName} ${eg.employee.lastName}`,
      email: eg.employee.workEmail,
      department: eg.employee.assignments[0]?.department.name || "N/A",
      assignmentDate: eg.effectiveFrom,
    })),
  };
}

/**
 * Get pay grade by code
 */
export async function getPayGradeByCode(code: string): Promise<any> {
  return prisma.payGrade.findUnique({
    where: { code },
    include: {
      _count: {
        select: { employeeGrades: true },
      },
    },
  });
}

/**
 * List pay grades with search and filters
 */
export async function listPayGrades(options: {
  search?: string;
  status?: string;
  basis?: string;
  position?: string;
  effectiveOn?: Date;
  minBasePay?: number;
  maxBasePay?: number;
  limit?: number;
  offset?: number;
} = {}): Promise<{ payGrades: any[]; total: number }> {
  const {
    search,
    status,
    basis,
    position,
    effectiveOn,
    minBasePay,
    maxBasePay,
    limit = 20,
    offset = 0,
  } = options;

  // Build where clause
  const where: any = {};

  if (status) {
    where.status = status;
  }

  if (basis) {
    where.basis = basis;
  }

  if (position) {
    where.position = {
      contains: position,
      mode: "insensitive",
    };
  }

  if (effectiveOn) {
    where.effectiveFrom = { lte: effectiveOn };
    where.AND = [
      ...(where.AND ?? []),
      { OR: [{ effectiveTo: null }, { effectiveTo: { gte: effectiveOn } }] },
    ];
  }

  if (minBasePay !== undefined) where.maxBasePay = { gte: minBasePay };
  if (maxBasePay !== undefined) where.minBasePay = { lte: maxBasePay };

  if (search) {
    // Case-insensitive partial match on code, name, description
    where.AND = [
      ...(where.AND ?? []),
      {
        OR: [
          { code: { contains: search.toUpperCase(), mode: "insensitive" } },
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      },
    ];
  }

  // Fetch both data and count in parallel
  const [payGrades, total] = await Promise.all([
    prisma.payGrade.findMany({
      where,
      include: {
        _count: {
          select: { employeeGrades: true },
        },
      },
      orderBy: [{ name: "asc" }, { code: "asc" }],
      take: limit,
      skip: offset,
    }),
    prisma.payGrade.count({ where }),
  ]);

  // Add computed fields
  const enriched = payGrades.map((pg) => ({
    ...pg,
    payRange: `${pg.minBasePay} – ${pg.maxBasePay}`,
    assignedEmployeeCount: pg._count.employeeGrades,
  }));

  return {
    payGrades: enriched,
    total,
  };
}

/**
 * Retire a pay grade (soft delete)
 * Must have no active employee assignments
 */
export async function retirePayGrade(
  id: string,
  userId: string
): Promise<any> {
  // Validate permission
  const permCheck = await requirePermission(userId, "compensation:policy:manage");
  if (!permCheck.allowed) {
    throw new Error(`Permission denied: ${permCheck.reason}`);
  }

  // Get pay grade with active assignments
  const payGrade = await prisma.payGrade.findUnique({
    where: { id },
    include: {
      employeeGrades: {
        where: {
          OR: [{ effectiveTo: null }, { effectiveFrom: { gt: new Date() } }],
        },
      },
    },
  });

  if (!payGrade) {
    throw new Error("Pay grade not found");
  }

  // Check for active assignments
  if (payGrade.employeeGrades.length > 0) {
    throw new Error(
      `Cannot retire pay grade: ${payGrade.employeeGrades.length} employees still assigned. ` +
      "Reassign all employees first."
    );
  }

  // Soft delete: mark as Retired
  const retired = await prisma.payGrade.update({
    where: { id },
    data: {
      status: "Retired",
      updatedByUserId: userId,
      updatedAt: new Date(),
    },
  });

  // Audit event
  await writeDomainAuditEvent({
    actorUserId: userId,
    actorRole: "admin",
    action: "retire",
    entityType: "PayGrade",
    entityId: id,
    summary: `Retired pay grade: ${retired.code}`,
    details: {
      code: retired.code,
      reason: "Soft delete (no active assignments)",
    },
  });

  return retired;
}

/**
 * Check for salary range conflicts
 * Returns conflicts when multiple pay grades have overlapping ranges in same position/basis
 */
export async function checkSalaryRangeConflicts(
  payGrade: CreatePayGradeInput,
  excludeId?: string,
): Promise<{ conflicts: any[]; hasConflicts: boolean }> {
  const scope: any[] = [
    { basis: payGrade.basis },
    { status: "Active" },
  ];
  if (payGrade.position) {
    scope.push({ position: { equals: payGrade.position } });
  }
  if (excludeId) scope.push({ id: { not: excludeId } });

  const overlapping = await prisma.payGrade.findMany({
    where: {
      AND: [
        ...scope,
        {
          OR: [
            // My min is in their range
            {
              AND: [
                { minBasePay: { lte: payGrade.minBasePay } },
                { maxBasePay: { gte: payGrade.minBasePay } },
              ],
            },
            // My max is in their range
            {
              AND: [
                { minBasePay: { lte: payGrade.maxBasePay } },
                { maxBasePay: { gte: payGrade.maxBasePay } },
              ],
            },
            // I completely contain them
            {
              AND: [
                { minBasePay: { gte: payGrade.minBasePay } },
                { maxBasePay: { lte: payGrade.maxBasePay } },
              ],
            },
          ],
        },
      ],
    },
  });

  return {
    conflicts: overlapping,
    hasConflicts: overlapping.length > 0,
  };
}

/**
 * Get assigned employees
 */
export async function getAssignedEmployees(
  payGradeId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{ employees: any[]; total: number }> {
  const { limit = 20, offset = 0 } = options;

  const where = {
    payGradeId,
    effectiveTo: null, // Active assignments
  };

  const [assignments, total] = await Promise.all([
    prisma.employeePayGrade.findMany({
      where,
      include: {
        employee: {
          select: {
              id: true,
              employeeNumber: true,
            firstName: true,
            lastName: true,
            workEmail: true,
            assignments: {
              where: { effectiveTo: null },
              include: { department: { select: { name: true } } },
              take: 1,
            },
          },
        },
      },
      orderBy: [{ employee: { lastName: "asc" } }],
      take: limit,
      skip: offset,
    }),
    prisma.employeePayGrade.count({ where }),
  ]);

  const employees = assignments.map((a) => ({
    employeeId: a.employee.id || a.employeeId,
    employeeNumber: a.employee.employeeNumber,
    name: `${a.employee.firstName} ${a.employee.lastName}`,
    email: a.employee.workEmail,
    department: a.employee.assignments[0]?.department.name || "N/A",
    assignedFrom: a.effectiveFrom,
  }));

  return { employees, total };
}

/**
 * Get pay grade history / audit trail
 */
export async function getPayGradeHistory(
  payGradeId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<any[]> {
  const { limit = 50, offset = 0 } = options;

  return prisma.domainAuditEvent.findMany({
    where: {
      entityType: "PayGrade",
      entityId: payGradeId,
    },
    include: {
      actor: {
        select: { id: true, email: true, name: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });
}

/**
 * Reassign employee from one pay grade to another
 */
export async function reassignEmployeePayGrade(
  employeeId: string,
  oldPayGradeId: string,
  newPayGradeId: string,
  userId: string,
  effectiveDate: Date
): Promise<any> {
  const permission = await requirePermission(userId, "compensation:assignment:manage");
  if (!permission.allowed) {
    throw new Error(`Permission denied: ${permission.reason}`);
  }

  const [employee, newPayGrade] = await Promise.all([
    prisma.employee.findUnique({ where: { id: employeeId }, select: { id: true } }),
    prisma.payGrade.findUnique({ where: { id: newPayGradeId }, select: { id: true, status: true } }),
  ]);
  if (!employee) throw new Error("Employee not found");
  if (!newPayGrade) throw new Error("New pay grade not found");
  if (newPayGrade.status !== "Active") throw new Error("Only active pay grades can be assigned");

  const actor = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!actor) throw new Error("User not found");

  return prisma.$transaction(async (tx) => {
    await tx.employeePayGrade.updateMany({
      where: { employeeId, payGradeId: oldPayGradeId, effectiveTo: null },
      data: { effectiveTo: new Date(effectiveDate.getTime() - 24 * 60 * 60 * 1000) },
    });

    const newAssignment = await tx.employeePayGrade.create({
      data: { employeeId, payGradeId: newPayGradeId, effectiveFrom: effectiveDate, assignedByUserId: userId },
    });

    await tx.domainAuditEvent.create({
      data: {
        actorUserId: userId,
        actorRole: actor.role,
        action: "reassign",
        entityType: "EmployeePayGrade",
        entityId: newAssignment.id,
        summary: "Reassigned employee pay grade",
        details: { employeeId, oldPayGradeId, newPayGradeId, effectiveDate } as any,
        effectiveDate,
        affectedEmployeeId: employeeId,
      },
    });
    return newAssignment;
  });
}

export async function assignEmployeePayGrade(
  employeeId: string,
  payGradeId: string,
  userId: string,
  effectiveDate: Date,
): Promise<any> {
  const permission = await requirePermission(userId, "compensation:assignment:manage");
  if (!permission.allowed) throw new Error(`Permission denied: ${permission.reason}`);
  const [employee, payGrade, actor] = await Promise.all([
    prisma.employee.findUnique({ where: { id: employeeId }, select: { id: true } }),
    prisma.payGrade.findUnique({ where: { id: payGradeId }, select: { id: true, status: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { role: true } }),
  ]);
  if (!employee) throw new Error("Employee not found");
  if (!payGrade) throw new Error("Pay grade not found");
  if (payGrade.status !== "Active") throw new Error("Only active pay grades can be assigned");
  if (!actor) throw new Error("User not found");

  return prisma.$transaction(async (tx) => {
    await tx.employeePayGrade.updateMany({
      where: { employeeId, effectiveTo: null },
      data: { effectiveTo: new Date(effectiveDate.getTime() - 24 * 60 * 60 * 1000) },
    });
    const assignment = await tx.employeePayGrade.create({
      data: { employeeId, payGradeId, effectiveFrom: effectiveDate, assignedByUserId: userId },
    });
    await tx.domainAuditEvent.create({
      data: {
        actorUserId: userId,
        actorRole: actor.role,
        action: "assign",
        entityType: "EmployeePayGrade",
        entityId: assignment.id,
        summary: "Assigned employee pay grade",
        details: { employeeId, payGradeId, effectiveDate } as any,
        effectiveDate,
        affectedEmployeeId: employeeId,
      },
    });
    return assignment;
  });
}
