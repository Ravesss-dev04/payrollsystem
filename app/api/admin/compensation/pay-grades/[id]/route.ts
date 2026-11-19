import { NextRequest, NextResponse } from "next/server";
import { requireCompensationActor } from "../../_auth";
import {
  getPayGradeDetails,
  updatePayGrade,
  retirePayGrade,
  getAssignedEmployees,
  getPayGradeHistory,
  createPayGradeSchema,
} from "@/app/lib/compensation/pay-grades-v2.server";

/**
 * GET /api/admin/compensation/pay-grades/[id]
 * Get pay grade details with assigned employees and history
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireCompensationActor(request);

    const payGrade = await getPayGradeDetails(id);
    if (!payGrade) {
      return NextResponse.json(
        { error: "Pay grade not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ payGrade });
  } catch (error) {
    console.error(`[pay-grades GET]`, error);
    return NextResponse.json(
      { error: "Failed to fetch pay grade" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/compensation/pay-grades/[id]
 * Update a pay grade
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const actor = await requireCompensationActor(request);

    const body = await request.json();

    // Validate partial input (only provided fields)
    const partial = createPayGradeSchema.partial().safeParse(body);
    if (!partial.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: partial.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const updated = await updatePayGrade(
      id,
      partial.data,
      actor.userId
    );

    return NextResponse.json({
      payGrade: updated,
      message: "Pay grade updated successfully",
    });
  } catch (error) {
    console.error(`[pay-grades PUT]`, error);

    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
      if (error.message.includes("Permission denied")) {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to update pay grade" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/compensation/pay-grades/[id]
 * Retire a pay grade (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const actor = await requireCompensationActor(request);

    const retired = await retirePayGrade(id, actor.userId);

    return NextResponse.json({
      payGrade: retired,
      message: "Pay grade retired successfully",
    });
  } catch (error) {
    console.error(`[pay-grades DELETE]`, error);

    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
      if (error.message.includes("Cannot retire")) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 } // Conflict - has assigned employees
        );
      }
      if (error.message.includes("Permission denied")) {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to retire pay grade" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/compensation/pay-grades/[id]/employees
 * Get assigned employees for a pay grade
 */
export async function getPayGradeEmployees(
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

/**
 * GET /api/admin/compensation/pay-grades/[id]/history
 * Get pay grade audit history
 */
export async function getPayGradeAuditHistory(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireCompensationActor(request);

    const limit = Math.min(
      parseInt(request.nextUrl.searchParams.get("limit") || "50"),
      200
    );
    const offset = parseInt(request.nextUrl.searchParams.get("offset") || "0");

    const history = await getPayGradeHistory(id, { limit, offset });

    return NextResponse.json({
      history,
      pagination: {
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error(`[pay-grades history GET]`, error);
    return NextResponse.json(
      { error: "Failed to fetch pay grade history" },
      { status: 500 }
    );
  }
}
