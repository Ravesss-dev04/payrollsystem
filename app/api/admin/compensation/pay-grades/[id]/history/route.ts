import { NextRequest, NextResponse } from "next/server";
import { requireCompensationActor } from "../../../_auth";
import { getPayGradeHistory } from "@/app/lib/compensation/pay-grades-v2.server";

/**
 * GET /api/admin/compensation/pay-grades/[id]/history
 * Get pay grade audit history
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireCompensationActor(request, "compensation:read");

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
        total: history.length,
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
