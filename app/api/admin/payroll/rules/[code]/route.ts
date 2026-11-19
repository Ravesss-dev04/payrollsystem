import { NextRequest, NextResponse } from "next/server";
import { requireApiPermission } from "@/app/lib/auth/api-guard.server";
import { savePayrollRule } from "@/app/lib/payroll/rule-service.server";
import { prisma } from "@/app/lib/db";

async function getPayrollRuleByCode(code: string) {
  const latestVersion = await prisma.payrollRuleSet.findFirst({
    orderBy: { version: "desc" },
    select: { configuration: true },
  });

  if (!latestVersion) return null;

  const rules = (latestVersion.configuration as any).rules || [];
  return rules.find((r: any) => r.code === code) || null;
}

/**
 * GET /api/admin/payroll/rules/[code]
 * Fetch a specific payroll rule by code
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    await requireApiPermission(request, "compensation:policy:manage");
    const { code } = await params;

    const rule = await getPayrollRuleByCode(code);
    if (!rule) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    return NextResponse.json({ rule });
  } catch (error) {
    console.error(`[payroll/rules GET]`, error);
    return NextResponse.json({ error: "Failed to fetch rule" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/payroll/rules/[code]
 * Update a payroll rule
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const actor = await requireApiPermission(request, "compensation:policy:manage");
    const { code } = await params;

    // Fetch existing rule
    const existingRule = await getPayrollRuleByCode(code);
    if (!existingRule) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    const body = await request.json();
    const updatedRule = {
      ...existingRule,
      ...body,
      id: existingRule.id, // preserve original ID
      code, // preserve original code
      createdBy: existingRule.createdBy, // preserve original creator
      createdAt: existingRule.createdAt,
    };

    const rule = await savePayrollRule(updatedRule, actor.userId);

    return NextResponse.json({ rule });
  } catch (error) {
    console.error(`[payroll/rules PUT]`, error);

    if (error instanceof Error) {
      if (error.message.startsWith("Validation failed")) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json({ error: "Failed to update rule" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/payroll/rules/[code]
 * Soft-delete a payroll rule (set status to Inactive)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const actor = await requireApiPermission(request, "compensation:policy:manage");
    const { code } = await params;

    // Fetch existing rule
    const existingRule = await getPayrollRuleByCode(code);
    if (!existingRule) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    // Soft delete by setting status to Inactive
    const deactivatedRule = {
      ...existingRule,
      status: "Inactive" as const,
      id: existingRule.id,
      code,
      createdBy: existingRule.createdBy,
      createdAt: existingRule.createdAt,
    };

    const rule = await savePayrollRule(deactivatedRule, actor.userId);

    return NextResponse.json({ rule, message: "Rule deactivated successfully" });
  } catch (error) {
    console.error(`[payroll/rules DELETE]`, error);
    return NextResponse.json({ error: "Failed to deactivate rule" }, { status: 500 });
  }
}
