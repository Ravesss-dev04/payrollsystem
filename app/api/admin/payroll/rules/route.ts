import { NextRequest, NextResponse } from "next/server";
import { requireApiPermission } from "@/app/lib/auth/api-guard.server";
import { savePayrollRule } from "@/app/lib/payroll/rule-service.server";
import { prisma } from "@/app/lib/db";

/**
 * GET /api/admin/payroll/rules
 * Fetch the latest active payroll rules
 */
export async function GET(request: NextRequest) {
  try {
    await requireApiPermission(request, "compensation:policy:manage");

    // Get latest ruleset
    const latestVersion = await prisma.payrollRuleSet.findFirst({
      orderBy: { version: "desc" },
      select: { configuration: true },
    });

    const rules = latestVersion ? (latestVersion.configuration as any).rules || [] : [];
    return NextResponse.json({ rules });
  } catch (error) {
    console.error("[payroll/rules GET]", error);
    return NextResponse.json({ error: "Failed to fetch rules" }, { status: 500 });
  }
}

/**
 * POST /api/admin/payroll/rules
 * Create a new payroll rule
 */
export async function POST(request: NextRequest) {
  try {
    const actor = await requireApiPermission(request, "compensation:policy:manage");

    const body = await request.json();
    const rule = await savePayrollRule(body, actor.userId);

    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    console.error("[payroll/rules POST]", error);

    if (error instanceof Error) {
      if (error.message.startsWith("Validation failed")) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json({ error: "Failed to save rule" }, { status: 500 });
  }
}
