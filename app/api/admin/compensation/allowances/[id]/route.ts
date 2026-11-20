import { NextRequest, NextResponse } from "next/server";
import { requireCompensationActor } from "../../_auth";
import {
  getAllowanceDetails,
  updateAllowance,
  pauseAllowance,
  retireAllowance,
  createAllowanceSchema,
} from "@/app/lib/compensation/allowances-v2.server";
import { assignEmployeeAllowance } from "@/app/lib/compensation/allowances-v2.server";
import { z } from "zod";

/**
 * GET /api/admin/compensation/allowances/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireCompensationActor(request, "compensation:read");

    const allowance = await getAllowanceDetails(id);
    if (!allowance) {
      return NextResponse.json({ error: "Allowance not found" }, { status: 404 });
    }

    return NextResponse.json({ allowance });
  } catch (error) {
    console.error(`[allowances GET]`, error);
    return NextResponse.json(
      { error: "Failed to fetch allowance" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/compensation/allowances/[id]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const actor = await requireCompensationActor(request);

    const body = await request.json();
    const partial = createAllowanceSchema.partial().safeParse(body);
    
    if (!partial.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: partial.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const updated = await updateAllowance(
      id,
      partial.data,
      actor.userId,
      body.reason
    );

    return NextResponse.json({
      allowance: updated,
      message: "Allowance updated successfully",
    });
  } catch (error) {
    console.error(`[allowances PUT]`, error);
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message.includes("Permission denied")) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }
    return NextResponse.json(
      { error: "Failed to update allowance" },
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
    const assignment = await assignEmployeeAllowance(input.employeeId, id, actor.userId, input.effectiveFrom);
    return NextResponse.json({ assignment }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "invalid_request", issues: error.issues }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "request_failed" }, { status: 400 });
  }
}

/**
 * POST /api/admin/compensation/allowances/[id]/pause
 * Pause an allowance
 */
export async function pauseAction(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const actor = await requireCompensationActor(request);

    const body = await request.json();
    const paused = await pauseAllowance(
      id,
      actor.userId,
      new Date(body.pauseEffectiveDate || new Date()),
      body.reason
    );

    return NextResponse.json({
      allowance: paused,
      message: "Allowance paused successfully",
    });
  } catch (error) {
    console.error(`[allowances pause]`, error);
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message.includes("already paused")) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
    }
    return NextResponse.json(
      { error: "Failed to pause allowance" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/compensation/allowances/[id]/retire
 * Retire an allowance
 */
export async function retireAction(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const actor = await requireCompensationActor(request);

    const body = await request.json();
    const retired = await retireAllowance(
      id,
      actor.userId,
      body.reason
    );

    return NextResponse.json({
      allowance: retired,
      message: "Allowance retired successfully",
    });
  } catch (error) {
    console.error(`[allowances retire]`, error);
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
    }
    return NextResponse.json(
      { error: "Failed to retire allowance" },
      { status: 500 }
    );
  }
}
