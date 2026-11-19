import "server-only";
import { Prisma } from "../../generated/prisma/client";
import { writeDomainAuditEvent } from "../audit/domain-audit";
import { hasPermission } from "../auth/authorization";
import type { SessionPrincipal } from "../auth/session-policy";
import { prisma } from "../db";
import {
  deductionCategoryDraftInputSchema,
  deductionCategoryNamesSchema,
} from "./deduction-categories";

export class DeductionCategoryServiceError extends Error {
  constructor(
    public readonly code:
      | "forbidden"
      | "invalid_request"
      | "version_conflict"
      | "configuration_invalid",
    public readonly status: 400 | 403 | 409 | 500,
  ) {
    super(code);
  }
}

export function parseStoredDeductionCategoryNames(
  categories: Prisma.JsonValue,
): string[] {
  const parsed = deductionCategoryNamesSchema.safeParse(categories);
  if (!parsed.success) {
    throw new DeductionCategoryServiceError("configuration_invalid", 500);
  }
  return parsed.data;
}

function requireHr(actor: SessionPrincipal): void {
  if (actor.role !== "hr" || !hasPermission({ role: actor.role, permission: "payroll:manage", actorId: actor.userId, grantedPermissions: actor.grantedPermissions })) {
    throw new DeductionCategoryServiceError("forbidden", 403);
  }
}

function requireAdmin(actor: SessionPrincipal): void {
  if (actor.role !== "admin" || !hasPermission({ role: actor.role, permission: "payroll:approve", actorId: actor.userId, grantedPermissions: actor.grantedPermissions })) {
    throw new DeductionCategoryServiceError("forbidden", 403);
  }
}

function presentCategorySet(categorySet: {
  id: string;
  version: number;
  status: "Draft" | "Active" | "Superseded";
  categories: Prisma.JsonValue;
  createdAt: Date;
  createdBy: { name: string } | null;
  approvedAt: Date | null;
  approvedBy: { name: string } | null;
}) {
  return {
    id: categorySet.id,
    version: categorySet.version,
    status: categorySet.status,
    categories: parseStoredDeductionCategoryNames(categorySet.categories),
    createdAt: categorySet.createdAt.toISOString(),
    createdBy: categorySet.createdBy?.name ?? null,
    approvedAt: categorySet.approvedAt?.toISOString() ?? null,
    approvedBy: categorySet.approvedBy?.name ?? null,
  };
}

const categorySetSelect = {
  id: true,
  version: true,
  status: true,
  categories: true,
  createdAt: true,
  createdBy: { select: { name: true } },
  approvedAt: true,
  approvedBy: { select: { name: true } },
} satisfies Prisma.PayrollDeductionCategorySetSelect;

export async function getDeductionCategorySets(actor: SessionPrincipal) {
  if (actor.role === "hr") requireHr(actor);
  else requireAdmin(actor);

  const [active, latestDraft] = await Promise.all([
    prisma.payrollDeductionCategorySet.findFirst({
      where: { status: "Active" },
      orderBy: { version: "desc" },
      select: categorySetSelect,
    }),
    prisma.payrollDeductionCategorySet.findFirst({
      where: { status: "Draft" },
      orderBy: { version: "desc" },
      select: categorySetSelect,
    }),
  ]);
  return {
    active: active ? presentCategorySet(active) : null,
    latestDraft: latestDraft ? presentCategorySet(latestDraft) : null,
  };
}

export async function createDeductionCategoryDraft(
  actor: SessionPrincipal,
  rawInput: unknown,
) {
  requireHr(actor);
  const parsed = deductionCategoryDraftInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new DeductionCategoryServiceError("invalid_request", 400);
  }

  try {
    return await prisma.$transaction(async (transaction) => {
      const latest = await transaction.payrollDeductionCategorySet.findFirst({
        orderBy: { version: "desc" },
        select: { version: true },
      });
      const version = (latest?.version ?? 0) + 1;
      if (!Number.isSafeInteger(version) || version > 2_147_483_647) {
        throw new DeductionCategoryServiceError("version_conflict", 409);
      }
      const superseded = await transaction.payrollDeductionCategorySet.updateMany({
        where: { status: "Draft" },
        data: { status: "Superseded" },
      });
      const categorySet = await transaction.payrollDeductionCategorySet.create({
        data: {
          version,
          status: "Draft",
          categories: parsed.data.categories,
          createdByUserId: actor.userId,
        },
        select: categorySetSelect,
      });
      await writeDomainAuditEvent(transaction, {
        actor,
        action: "payroll.deduction_categories.draft_created",
        entityType: "payroll_deduction_category_set",
        entityId: categorySet.id,
        summary: `Deduction category draft version ${categorySet.version} created`,
        details: {
          version: categorySet.version,
          categoryCount: parsed.data.categories.length,
          supersededDraftCount: superseded.count,
        },
      });
      return presentCategorySet(categorySet);
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2034" || error.code === "P2002")
    ) {
      throw new DeductionCategoryServiceError("version_conflict", 409);
    }
    throw error;
  }
}

export async function activateDeductionCategoryDraft(
  actor: SessionPrincipal,
  version: number,
  expectedActiveVersion: number | null,
) {
  requireAdmin(actor);
  if (!Number.isSafeInteger(version) || version < 1) {
    throw new DeductionCategoryServiceError("invalid_request", 400);
  }

  try {
    return await prisma.$transaction(async (transaction) => {
      const [current, draft, latestDraft] = await Promise.all([
        transaction.payrollDeductionCategorySet.findFirst({
          where: { status: "Active" },
          orderBy: { version: "desc" },
          select: { version: true },
        }),
        transaction.payrollDeductionCategorySet.findUnique({
          where: { version },
          select: { id: true, status: true },
        }),
        transaction.payrollDeductionCategorySet.findFirst({
          where: { status: "Draft" },
          orderBy: { version: "desc" },
          select: { version: true },
        }),
      ]);
      if (
        (current?.version ?? null) !== expectedActiveVersion ||
        draft?.status !== "Draft" ||
        latestDraft?.version !== version
      ) {
        throw new DeductionCategoryServiceError("version_conflict", 409);
      }

      const approvedAt = new Date();
      const superseded = await transaction.payrollDeductionCategorySet.updateMany({
        where: { status: "Active" },
        data: { status: "Superseded" },
      });
      const activated = await transaction.payrollDeductionCategorySet.updateMany({
        where: { version, status: "Draft" },
        data: {
          status: "Active",
          approvedByUserId: actor.userId,
          approvedAt,
        },
      });
      if (activated.count !== 1) {
        throw new DeductionCategoryServiceError("version_conflict", 409);
      }
      await writeDomainAuditEvent(transaction, {
        actor,
        action: "payroll.deduction_categories.activated",
        entityType: "payroll_deduction_category_set",
        entityId: draft.id,
        summary: `Deduction category version ${version} activated`,
        details: {
          version,
          previousActiveVersion: current?.version ?? null,
          supersededActiveCount: superseded.count,
        },
      });
      return {
        version,
        status: "Active" as const,
        approvedAt: approvedAt.toISOString(),
        approvedBy: actor.name,
      };
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2034" || error.code === "P2002")
    ) {
      throw new DeductionCategoryServiceError("version_conflict", 409);
    }
    throw error;
  }
}

export async function getActiveDeductionCategorySetForSubmission(
  transaction: Prisma.TransactionClient,
) {
  const categorySet = await transaction.payrollDeductionCategorySet.findFirst({
    where: { status: "Active" },
    orderBy: { version: "desc" },
    select: { version: true, categories: true },
  });
  return categorySet
    ? {
        version: categorySet.version,
        categories: parseStoredDeductionCategoryNames(categorySet.categories),
      }
    : null;
}
