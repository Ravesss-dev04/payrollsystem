import { NextRequest, NextResponse } from "next/server";
import { requireCompensationActor } from "../../../_auth";
import { assignEmployeePayGrade, getAssignedEmployees } from "@/app/lib/compensation/pay-grades-v2.server";
import { z } from "zod";

/**
 * GET /api/admin/compensation/pay-grades/[id]/employees
 * Get assigned employees for a pay grade
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireCompensationActor(request, "compensation:read");

    const limit = Math.min(
      parseInt(request.nextUrl.searchParams.get("limit") || "20"),
      100
    );
    const offset = parseInt(request.nextUrl.searchParams.get("offset") || "0");

    const { employees, total } = await getAssignedEmployees(id, {
      limit,
      offset,
    });

    return NextResponse.json({
      employees,
      pagination: {
        limit,
        offset,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error(`[pay-grades employees GET]`, error);
    return NextResponse.json(
      { error: "Failed to fetch assigned employees" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireCompensationActor(request, "compensation:assignment:manage");
    const { id } = await params;
    const input = z.object({ employeeId: z.string().min(1), effectiveFrom: z.coerce.date() }).parse(await request.json());
    const assignment = await assignEmployeePayGrade(input.employeeId, id, actor.userId, input.effectiveFrom);
    return NextResponse.json({ assignment }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "invalid_request", issues: error.issues }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "request_failed" }, { status: 400 });
  }
}
