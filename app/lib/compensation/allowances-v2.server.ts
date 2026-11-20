import "server-only";
import { prisma } from "@/app/lib/db";
import { writeDomainAuditEvent } from "@/app/lib/audit/domain-audit";
import { requirePermission } from "@/app/lib/auth/authorization";
import type { AllowanceRecurrence, AllowanceEligibility } from "@/app/generated/prisma/client";
import { z } from "zod";
import { isValidMoneyString } from "./money";

/**
 * Allowance validation schema
 */
export const createAllowanceSchema = z.object({
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
  amount: z.string()
    .trim().refine(isValidMoneyString, "Amount must be a positive amount with at most two decimal places")
    .transform((val) => parseFloat(val)),
  recurrence: z.enum([
    "Weekly",
    "Biweekly",
    "Semimonthly",
    "Monthly",
    "Bimonthly",
    "Quarterly",
    "Annually",
    "OneTime",
    "EveryPayrollPeriod",
  ] as const),
  eligibility: z.enum([
    "AllEmployees",
    "SpecificDepartment",
    "SpecificPosition",
    "SpecificEmploymentCategory",
    "SpecificPayGrade",
    "SpecificBranch",
    "SelectedEmployees",
  ] as const),
  selectedData: z.record(z.string(), z.any()).optional().nullable(),
  applicableBranches: z.string().max(1000).optional().nullable(),
  effectiveFrom: z.string()
    .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid start date" })
    .transform((val) => new Date(val)),
  effectiveTo: z.string()
    .optional()
    .nullable()
    .refine((val) => !val || !isNaN(Date.parse(val as string)), {
      message: "Invalid end date",
    })
    .transform((val) => (val ? new Date(val as string) : null)),
  status: z.enum(["Active", "Inactive"]),
  taxTreatment: z.enum(["Taxable", "NonTaxable", "Pending", "Conditional"]),
  contributionTreatment: z.string().max(100).optional().nullable(),
  thirteenthMonthTreatment: z.string().max(100).optional().nullable(),
  payrollCalculationCategory: z.string().max(100).optional().nullable(),
  taxStatutoryReference: z.string().max(255).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export type CreateAllowanceInput = z.infer<typeof createAllowanceSchema>;

/**
 * Validate eligibility has required selections
 */
export function validateEligibilitySelections(
  eligibility: AllowanceEligibility,
  selectedData: Record<string, any> | null
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Eligibilities that require selectedData
  const requiresSelection = [
    "SpecificDepartment",
    "SpecificPosition",
    "SpecificEmploymentCategory",
    "SpecificPayGrade",
    "SpecificBranch",
    "SelectedEmployees",
  ];

  if (requiresSelection.includes(eligibility)) {
    if (!selectedData || Object.keys(selectedData).length === 0) {
      errors.push(`${eligibility} requires selection of specific records`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate allowance input
 */
export function validateAllowance(
  input: CreateAllowanceInput
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Date validation
  if (input.effectiveFrom && input.effectiveTo) {
    if (input.effectiveFrom > input.effectiveTo) {
      errors.push("Start date cannot be after end date");
    }
  }

  // Eligibility validation
  const eligibilityCheck = validateEligibilitySelections(
    input.eligibility,
    input.selectedData || null
  );
  errors.push(...eligibilityCheck.errors);

  // Tax treatment cannot be arbitrarily set to Non-Taxable
  // This would require integration with statutory rules
  if (input.taxTreatment === "NonTaxable" && !input.taxStatutoryReference) {
    errors.push("Non-taxable treatment requires statutory reference");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create a new allowance policy
 */
export async function createAllowance(
  input: CreateAllowanceInput,
  userId: string
): Promise<any> {
  // Validate permission
  const permCheck = await requirePermission(userId, "compensation:policy:manage");
  if (!permCheck.allowed) {
    throw new Error(`Permission denied: ${permCheck.reason}`);
  }

  // Validate input
  const validation = validateAllowance(input);
  if (!validation.valid) {
    throw new Error(`Validation failed: ${validation.errors.join("; ")}`);
  }

  // Check for duplicate code
  const existing = await prisma.allowancePolicy.findUnique({
    where: { code: input.code },
  });
  if (existing) {
    throw new Error("Allowance code already exists");
  }

  // Create allowance
  const allowance = await prisma.allowancePolicy.create({
    data: {
      code: input.code,
      name: input.name,
      description: input.description,
      amount: input.amount,
      recurrence: input.recurrence as AllowanceRecurrence,
      eligibility: input.eligibility as AllowanceEligibility,
      selectedData: input.selectedData as any,
      applicableBranches: input.applicableBranches,
      effectiveFrom: input.effectiveFrom,
      effectiveTo: input.effectiveTo,
      status: input.status,
      taxTreatment: input.taxTreatment,
      contributionTreatment: input.contributionTreatment,
      thirteenthMonthTreatment: input.thirteenthMonthTreatment,
      payrollCalculationCategory: input.payrollCalculationCategory,
      taxStatutoryReference: input.taxStatutoryReference,
      createdByUserId: userId,
    },
  });

  // Audit event
  await writeDomainAuditEvent({
    actorUserId: userId,
    actorRole: "admin",
    action: "create",
    entityType: "AllowancePolicy",
    entityId: allowance.id,
    summary: `Created allowance: ${allowance.code}`,
    details: {
      code: allowance.code,
      name: allowance.name,
      amount: allowance.amount,
      recurrence: allowance.recurrence,
      eligibility: allowance.eligibility,
    },
    effectiveDate: allowance.effectiveFrom,
    approvalStatus: allowance.status,
  });

  return allowance;
}

/**
 * Update an allowance policy
 */
export async function updateAllowance(
  id: string,
  input: Partial<CreateAllowanceInput>,
  userId: string,
  reason?: string
): Promise<any> {
  // Validate permission
  const permCheck = await requirePermission(userId, "compensation:policy:manage");
  if (!permCheck.allowed) {
    throw new Error(`Permission denied: ${permCheck.reason}`);
  }

  // Get existing
  const existing = await prisma.allowancePolicy.findUnique({
    where: { id },
    include: {
      _count: { select: { employeeAllowances: true } },
    },
  });

  if (!existing) {
    throw new Error("Allowance not found");
  }

  // Validate the complete post-update record, not only fields present in the
  // patch. This prevents contradictory dates, tax treatment, or eligibility
  // data from being introduced through partial updates.
  const candidate = {
    code: input.code ?? existing.code,
    name: input.name ?? existing.name,
    description: input.description === undefined ? existing.description : input.description,
    amount: input.amount ?? Number(existing.amount),
    recurrence: input.recurrence ?? existing.recurrence,
    eligibility: input.eligibility ?? existing.eligibility,
    selectedData: input.selectedData === undefined ? existing.selectedData as Record<string, any> | null : input.selectedData,
    applicableBranches: input.applicableBranches === undefined ? existing.applicableBranches : input.applicableBranches,
    effectiveFrom: input.effectiveFrom ?? existing.effectiveFrom,
    effectiveTo: input.effectiveTo === undefined ? existing.effectiveTo : input.effectiveTo,
    status: input.status ?? existing.status,
    taxTreatment: input.taxTreatment ?? existing.taxTreatment,
    contributionTreatment: input.contributionTreatment === undefined ? existing.contributionTreatment : input.contributionTreatment,
    thirteenthMonthTreatment: input.thirteenthMonthTreatment === undefined ? existing.thirteenthMonthTreatment : input.thirteenthMonthTreatment,
    payrollCalculationCategory: input.payrollCalculationCategory === undefined ? existing.payrollCalculationCategory : input.payrollCalculationCategory,
    taxStatutoryReference: input.taxStatutoryReference === undefined ? existing.taxStatutoryReference : input.taxStatutoryReference,
    notes: input.notes === undefined ? existing.notes : input.notes,
  } as CreateAllowanceInput;
  const validation = validateAllowance(candidate);
  if (!validation.valid) {
    throw new Error(`Validation failed: ${validation.errors.join("; ")}`);
  }

  // Record previous values
  const previous = {
    name: existing.name,
    amount: existing.amount,
    recurrence: existing.recurrence,
    eligibility: existing.eligibility,
    status: existing.status,
    taxTreatment: existing.taxTreatment,
  };

  // Update
  const updated = await prisma.allowancePolicy.update({
    where: { id },
    data: {
      ...(input as any),
      updatedByUserId: userId,
    },
  });

  // Record in history
  await prisma.allowancePolicyHistory.create({
    data: {
      allowancePolicyId: id,
      changeType: "update",
      previousValue: previous as any,
      newValue: {
        name: updated.name,
        amount: updated.amount,
        recurrence: updated.recurrence,
        eligibility: updated.eligibility,
        status: updated.status,
        taxTreatment: updated.taxTreatment,
      } as any,
      changedByUserId: userId,
      reason,
    },
  });

  // Audit event
  await writeDomainAuditEvent({
    actorUserId: userId,
    actorRole: "admin",
    action: "update",
    entityType: "AllowancePolicy",
    entityId: id,
    summary: `Updated allowance: ${existing.code}`,
    details: {
      previous,
      current: {
        name: updated.name,
        amount: updated.amount,
        recurrence: updated.recurrence,
        eligibility: updated.eligibility,
        status: updated.status,
        taxTreatment: updated.taxTreatment,
      },
      affectedEmployees: existing._count.employeeAllowances,
      reason,
    },
    effectiveDate: updated.effectiveFrom,
    approvalStatus: updated.status,
  });

  return updated;
}

/**
 * Pause an allowance (stops future application)
 */
export async function pauseAllowance(
  id: string,
  userId: string,
  pauseEffectiveDate: Date,
  reason?: string
): Promise<any> {
  // Validate permission
  const permCheck = await requirePermission(userId, "compensation:policy:manage");
  if (!permCheck.allowed) {
    throw new Error(`Permission denied: ${permCheck.reason}`);
  }

  const existing = await prisma.allowancePolicy.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error("Allowance not found");
  }

  if (existing.status === "Paused") {
    throw new Error("Allowance already paused");
  }

  // Update to Paused status
  const paused = await prisma.allowancePolicy.update({
    where: { id },
    data: {
      status: "Paused",
      pausedAt: pauseEffectiveDate,
      pausedByUserId: userId,
      updatedByUserId: userId,
    },
  });

  // Record in history
  await prisma.allowancePolicyHistory.create({
    data: {
      allowancePolicyId: id,
      changeType: "pause",
      previousValue: { status: existing.status },
      newValue: { status: "Paused", pauseEffectiveDate: pauseEffectiveDate.toISOString() },
      changedByUserId: userId,
      reason,
    },
  });

  // Audit event
  await writeDomainAuditEvent({
    actorUserId: userId,
    actorRole: "admin",
    action: "pause",
    entityType: "AllowancePolicy",
    entityId: id,
    summary: `Paused allowance: ${existing.code}`,
    details: {
      code: existing.code,
      pauseEffectiveDate: pauseEffectiveDate.toISOString(),
      reason,
    },
    effectiveDate: pauseEffectiveDate,
    approvalStatus: "Paused",
  });

  return paused;
}

/**
 * Retire an allowance (soft delete)
 */
export async function retireAllowance(
  id: string,
  userId: string,
  reason?: string
): Promise<any> {
  // Validate permission
  const permCheck = await requirePermission(userId, "compensation:policy:manage");
  if (!permCheck.allowed) {
    throw new Error(`Permission denied: ${permCheck.reason}`);
  }

  const existing = await prisma.allowancePolicy.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error("Allowance not found");
  }

  // Update to Retired status
  const retired = await prisma.allowancePolicy.update({
    where: { id },
    data: {
      status: "Retired",
      updatedByUserId: userId,
    },
  });

  // Record in history
  await prisma.allowancePolicyHistory.create({
    data: {
      allowancePolicyId: id,
      changeType: "retire",
      previousValue: { status: existing.status },
      newValue: { status: "Retired" },
      changedByUserId: userId,
      reason,
    },
  });

  // Audit event
  await writeDomainAuditEvent({
    actorUserId: userId,
    actorRole: "admin",
    action: "retire",
    entityType: "AllowancePolicy",
    entityId: id,
    summary: `Retired allowance: ${existing.code}`,
    details: {
      code: existing.code,
      reason,
    },
    approvalStatus: "Retired",
  });

  return retired;
}

/**
 * Get allowance by ID with full details
 */
export async function getAllowanceDetails(id: string): Promise<any> {
  const allowance = await prisma.allowancePolicy.findUnique({
    where: { id },
    include: {
      employeeAllowances: {
        where: { effectiveTo: null }, // Active assignments
        include: {
          employee: {
            select: {
              id: true,
              employeeNumber: true,
              firstName: true,
              lastName: true,
              workEmail: true,
            },
          },
        },
        take: 100,
      },
      history: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          changedBy: {
            select: { id: true, email: true, name: true },
          },
        },
      },
      createdBy: {
        select: { id: true, email: true, name: true },
      },
    },
  });

  if (!allowance) {
    return null;
  }

  return {
    ...allowance,
    assignedEmployeeCount: allowance.employeeAllowances.length,
    assignedEmployees: allowance.employeeAllowances.map((ea) => ({
      id: ea.employee.id,
      employeeNumber: ea.employee.employeeNumber,
      name: `${ea.employee.firstName} ${ea.employee.lastName}`,
      email: ea.employee.workEmail,
      effectiveFrom: ea.effectiveFrom,
    })),
  };
}

/**
 * List allowances with search and filters
 */
export async function listAllowances(options: {
  search?: string;
  status?: string;
  eligibility?: string;
  recurrence?: string;
  applicableBranch?: string;
  minAmount?: number;
  maxAmount?: number;
  limit?: number;
  offset?: number;
} = {}): Promise<{ allowances: any[]; total: number }> {
  const {
    search,
    status,
    eligibility,
    recurrence,
    applicableBranch,
    minAmount,
    maxAmount,
    limit = 20,
    offset = 0,
  } = options;

  // Build where clause
  const where: any = {};

  if (status) {
    where.status = status;
  }

  if (eligibility) {
    where.eligibility = eligibility;
  }

  if (recurrence) {
    where.recurrence = recurrence;
  }

  if (applicableBranch) {
    where.applicableBranches = {
      contains: applicableBranch,
      mode: "insensitive",
    };
  }

  if (minAmount !== undefined) where.amount = { ...(where.amount ?? {}), gte: minAmount };
  if (maxAmount !== undefined) where.amount = { ...(where.amount ?? {}), lte: maxAmount };

  if (search) {
    const numericSearch = Number(search);
    const recurrenceValues = ["Weekly", "Biweekly", "Semimonthly", "Monthly", "Bimonthly", "Quarterly", "Annually", "OneTime", "EveryPayrollPeriod"] as const;
    const eligibilityValues = ["AllEmployees", "SpecificDepartment", "SpecificPosition", "SpecificEmploymentCategory", "SpecificPayGrade", "SpecificBranch", "SelectedEmployees"] as const;
    const recurrenceMatches = recurrenceValues.filter((value) => value.toLowerCase().includes(search.toLowerCase()));
    const eligibilityMatches = eligibilityValues.filter((value) => value.toLowerCase().includes(search.toLowerCase()));
    // Case-insensitive partial match on code, name, amount
    where.AND = [
      ...(where.AND ?? []),
      { OR: [
        { code: { contains: search.toUpperCase(), mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        ...(Number.isFinite(numericSearch) ? [{ amount: { equals: numericSearch } }] : []),
        ...(recurrenceMatches.length ? [{ recurrence: { in: recurrenceMatches } }] : []),
        ...(eligibilityMatches.length ? [{ eligibility: { in: eligibilityMatches } }] : []),
        { applicableBranches: { contains: search, mode: "insensitive" } },
      ] },
    ];
  }

  // Fetch both data and count in parallel
  const [allowances, total] = await Promise.all([
    prisma.allowancePolicy.findMany({
      where,
      include: {
        _count: {
          select: { employeeAllowances: true },
        },
      },
    orderBy: [{ name: "asc" }, { code: "asc" }],
      take: limit,
      skip: offset,
    }),
    prisma.allowancePolicy.count({ where }),
  ]);

  // Add computed fields
  const enriched = allowances.map((ap) => ({
    ...ap,
    assignedEmployeeCount: ap._count.employeeAllowances,
  }));

  return {
    allowances: enriched,
    total,
  };
}

/**
 * Get allowance by code
 */
export async function getAllowanceByCode(code: string): Promise<any> {
  return prisma.allowancePolicy.findUnique({
    where: { code },
    include: {
      _count: {
        select: { employeeAllowances: true },
      },
    },
  });
}

/**
 * Get assigned employees for an allowance
 */
export async function getAssignedEmployees(
  allowanceId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{ employees: any[]; total: number }> {
  const { limit = 20, offset = 0 } = options;

  const where = {
    allowancePolicyId: allowanceId,
    effectiveTo: null, // Active assignments
  };

  const [assignments, total] = await Promise.all([
    prisma.employeeAllowance.findMany({
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
    prisma.employeeAllowance.count({ where }),
  ]);

  const employees = assignments.map((a) => ({
    employeeId: a.employee.id,
    employeeNumber: a.employee.employeeNumber,
    name: `${a.employee.firstName} ${a.employee.lastName}`,
    email: a.employee.workEmail,
    department: a.employee.assignments[0]?.department.name || "N/A",
    effectiveFrom: a.effectiveFrom,
  }));

  return { employees, total };
}

/**
 * Get allowance history
 */
export async function getAllowanceHistory(
  allowanceId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<any[]> {
  const { limit = 50, offset = 0 } = options;

  return prisma.allowancePolicyHistory.findMany({
    where: { allowancePolicyId: allowanceId },
    include: {
      changedBy: {
        select: { id: true, email: true, name: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });
}

/**
 * Assign employee to allowance
 */
export async function assignEmployeeAllowance(
  employeeId: string,
  allowanceId: string,
  userId: string,
  effectiveDate: Date
): Promise<any> {
  const permission = await requirePermission(userId, "compensation:assignment:manage");
  if (!permission.allowed) {
    throw new Error(`Permission denied: ${permission.reason}`);
  }

  const employee = await prisma.employee.findUnique({ where: { id: employeeId }, select: { id: true } });
  if (!employee) throw new Error("Employee not found");

  // Check allowance is not Retired or Paused
  const allowance = await prisma.allowancePolicy.findUnique({
    where: { id: allowanceId },
  });

  if (!allowance) {
    throw new Error("Allowance not found");
  }

  if (allowance.status === "Retired") {
    throw new Error("Cannot assign retired allowance");
  }

  if (allowance.status === "Paused") {
    throw new Error("Cannot assign paused allowance");
  }

  const actor = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!actor) throw new Error("User not found");

  return prisma.$transaction(async (tx) => {
    const assignment = await tx.employeeAllowance.create({
      data: { employeeId, allowancePolicyId: allowanceId, effectiveFrom: effectiveDate, assignedByUserId: userId },
    });
    await tx.domainAuditEvent.create({
      data: {
        actorUserId: userId,
        actorRole: actor.role,
        action: "assign",
        entityType: "EmployeeAllowance",
        entityId: assignment.id,
        summary: `Assigned allowance ${allowance.code} to employee`,
        details: { employeeId, allowanceId, effectiveDate } as any,
        effectiveDate,
        affectedEmployeeId: employeeId,
      },
    });
    return assignment;
  });
}

/**
 * Review tax treatment (by authorized reviewer)
 */
export async function reviewTaxTreatment(
  allowanceId: string,
  userId: string,
  taxTreatment: string,
  reason?: string
): Promise<any> {
  const permission = await requirePermission(userId, "compensation:tax:review");
  if (!permission.allowed) throw new Error(`Permission denied: ${permission.reason}`);
  if (!["Taxable", "NonTaxable", "Pending", "Conditional"].includes(taxTreatment)) {
    throw new Error("Unsupported tax treatment");
  }
  const allowance = await prisma.allowancePolicy.findUnique({
    where: { id: allowanceId },
  });

  if (!allowance) {
    throw new Error("Allowance not found");
  }

  if (taxTreatment === "NonTaxable" && !allowance.taxStatutoryReference) {
    throw new Error("Non-taxable treatment requires a statutory reference");
  }

  const updated = await prisma.allowancePolicy.update({
    where: { id: allowanceId },
    data: {
      taxTreatment,
      updatedByUserId: userId,
    },
  });

  // Audit
  await writeDomainAuditEvent({
    actorUserId: userId,
    actorRole: "admin",
    action: "tax_review",
    entityType: "AllowancePolicy",
    entityId: allowanceId,
    summary: `Reviewed tax treatment: ${allowance.code}`,
    details: {
      previousTaxTreatment: allowance.taxTreatment,
      newTaxTreatment: taxTreatment,
      reason,
    },
  });

  return updated;
}
