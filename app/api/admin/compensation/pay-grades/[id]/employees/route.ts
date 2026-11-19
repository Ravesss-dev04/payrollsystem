import { NextRequest, NextResponse } from "next/server";
import { requireCompensationActor } from "../../../_auth";
import { getAssignedEmployees } from "@/app/lib/compensation/pay-grades-v2.server";

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
    await requireCompensationActor(request);

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
