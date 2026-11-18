import "server-only";
import { prisma } from "../db";
import { writeDomainAuditEvent } from "../audit/domain-audit";
import type { SessionPrincipal } from "../auth/session-policy";
import {
  payrollRuleConfigurationSchema,
  payrollRuleSetDraftInputSchema,
  type PayrollRuleSetDraftInput,
} from "./rules";

export class PayrollRuleSetServiceError extends Error {
  constructor(
    public readonly code: "forbidden" | "version_conflict",
    public readonly status: 403 | 409,
  ) {
    super(code);
  }
}

function presentRuleSet(ruleSet: {
  id: string;
  version: number;
  effectiveFrom: Date;
  configuration: unknown;
  createdAt: Date;
  createdBy: { name: string };
}) {
  return {
    ...ruleSet,
    effectiveFrom: ruleSet.effectiveFrom.toISOString(),
    createdAt: ruleSet.createdAt.toISOString(),
    configuration: payrollRuleConfigurationSchema.parse(
      ruleSet.configuration,
    ),
  };
}

function requireAdmin(actor: SessionPrincipal): void {
  if (actor.role !== "admin") {
    throw new PayrollRuleSetServiceError("forbidden", 403);
  }
}

function requireAdminOrHr(actor: SessionPrincipal): void {
  if (actor.role !== "admin" && actor.role !== "hr") {
    throw new PayrollRuleSetServiceError("forbidden", 403);
  }
}

export async function getLatestPayrollRuleSet(actor: SessionPrincipal) {
  requireAdminOrHr(actor);
  const ruleSet = await prisma.payrollRuleSet.findFirst({
    orderBy: { version: "desc" },
    select: {
      id: true,
      version: true,
      effectiveFrom: true,
      configuration: true,
      createdAt: true,
      createdBy: { select: { name: true } },
    },
  });
  return ruleSet ? presentRuleSet(ruleSet) : null;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export async function createPayrollRuleSetDraft(
  actor: SessionPrincipal,
  input: PayrollRuleSetDraftInput,
) {
  requireAdmin(actor);
  const draft = payrollRuleSetDraftInputSchema.parse(input);

  try {
    const ruleSet = await prisma.$transaction(async (transaction) => {
      const latest = await transaction.payrollRuleSet.findFirst({
        orderBy: { version: "desc" },
        select: { version: true },
      });
      const version = (latest?.version ?? 0) + 1;
      const ruleSet = await transaction.payrollRuleSet.create({
        data: {
          version,
          effectiveFrom: new Date(`${draft.effectiveFrom}T00:00:00.000Z`),
          configuration: draft.configuration,
          createdByUserId: actor.userId,
        },
        select: {
          id: true,
          version: true,
          effectiveFrom: true,
          configuration: true,
          createdAt: true,
          createdBy: { select: { name: true } },
        },
      });

      await writeDomainAuditEvent(transaction, {
        actor,
        action: "payroll.rules.draft_created",
        entityType: "payroll_rule_set",
        entityId: ruleSet.id,
        summary: `Payroll rules draft version ${version} created`,
        details: {
          version,
          effectiveFrom: draft.effectiveFrom,
        },
      });

      return ruleSet;
    });
    return presentRuleSet(ruleSet);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new PayrollRuleSetServiceError("version_conflict", 409);
    }
    throw error;
  }
}
