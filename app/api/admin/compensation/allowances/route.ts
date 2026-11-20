import { NextRequest, NextResponse } from "next/server";
import { requireCompensationActor } from "../_auth";
import {
  createAllowance,
  listAllowances,
  createAllowanceSchema,
} from "@/app/lib/compensation/allowances-v2.server";

/**
 * GET /api/admin/compensation/allowances
 */
export async function GET(request: NextRequest) {
  try {
    await requireCompensationActor(request, "compensation:read");

    const params = request.nextUrl.searchParams;
    const search = params.get("search") || undefined;
    const status = params.get("status") || undefined;
    const eligibility = params.get("eligibility") || undefined;
    const recurrence = params.get("recurrence") || undefined;
    const applicableBranch = params.get("applicableBranch") || undefined;
    const minAmount = params.get("minAmount");
    const maxAmount = params.get("maxAmount");
    const page = Math.max(1, Number(params.get("page") || "1"));
    const limit = Math.min(Math.max(1, Number(params.get("pageSize") || params.get("limit") || "20")), 100);
    const offset = (page - 1) * limit || Math.max(0, Number(params.get("offset") || "0"));

    const { allowances, total } = await listAllowances({
      search,
      status,
      eligibility,
      recurrence,
      applicableBranch,
      minAmount: minAmount ? Number(minAmount) : undefined,
      maxAmount: maxAmount ? Number(maxAmount) : undefined,
      limit,
      offset,
    });

    return NextResponse.json({
      allowances,
      pagination: { limit, offset, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("[allowances GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch allowances" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/compensation/allowances
 */
export async function POST(request: NextRequest) {
  try {
    const actor = await requireCompensationActor(request);

    const body = await request.json();
    const result = createAllowanceSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: result.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const allowance = await createAllowance(result.data, actor.userId);

    return NextResponse.json(
      { allowance, message: "Allowance created successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("[allowances POST]", error);
    if (error instanceof Error) {
      if (error.message.includes("already exists")) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      if (error.message.includes("Permission denied")) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      if (error.message.includes("Validation failed")) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    return NextResponse.json(
      { error: "Failed to create allowance" },
      { status: 500 }
    );
  }
}
