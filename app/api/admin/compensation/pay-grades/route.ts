import { NextRequest, NextResponse } from "next/server";
import { requireCompensationActor } from "../_auth";
import {
  createPayGrade,
  listPayGrades,
  createPayGradeSchema,
  checkSalaryRangeConflicts,
} from "@/app/lib/compensation/pay-grades-v2.server";

/**
 * GET /api/admin/compensation/pay-grades
 * List all pay grades with filtering and search
 */
export async function GET(request: NextRequest) {
  try {
    await requireCompensationActor(request);

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || undefined;
    const status = searchParams.get("status") || undefined;
    const basis = searchParams.get("basis") || undefined;
    const position = searchParams.get("position") || undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    const { payGrades, total } = await listPayGrades({
      search: search || undefined,
      status,
      basis,
      position,
      limit,
      offset,
    });

    return NextResponse.json({
      payGrades,
      pagination: {
        limit,
        offset,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[pay-grades GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch pay grades" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/compensation/pay-grades
 * Create a new pay grade
 */
export async function POST(request: NextRequest) {
  try {
    const actor = await requireCompensationActor(request);

    const body = await request.json();

    // Validate input
    const result = createPayGradeSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: result.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const input = result.data;

    // Check for salary range conflicts
    const conflicts = await checkSalaryRangeConflicts(input);
    if (conflicts.hasConflicts) {
      return NextResponse.json(
        {
          error: "Salary range conflict detected",
          conflicts: conflicts.conflicts.map((c: any) => ({
            code: c.code,
            name: c.name,
            range: `${c.minBasePay} – ${c.maxBasePay}`,
          })),
          message:
            "This pay grade overlaps with existing pay grades. Review and confirm to proceed.",
        },
        { status: 409 }
      );
    }

    // Create pay grade
    const payGrade = await createPayGrade(input, actor.userId);

    return NextResponse.json(
      {
        payGrade,
        message: "Pay grade created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[pay-grades POST]", error);

    if (error instanceof Error) {
      if (error.message.includes("already exists")) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        );
      }
      if (error.message.includes("Permission denied")) {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        );
      }
      if (error.message.includes("Validation failed")) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to create pay grade" },
      { status: 500 }
    );
  }
}
