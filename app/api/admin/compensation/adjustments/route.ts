import { z } from "zod";
import { requireApiPermission } from "@/app/lib/auth/api-guard.server";
import {
  createSalaryAdjustment,
  listSalaryAdjustments,
  salaryAdjustmentInputSchema,
} from "@/app/lib/compensation/salary-adjustments.server";

export async function GET(request: Request): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "compensation:adjustment:request");
    const url = new URL(request.url);
    return Response.json({ adjustments: await listSalaryAdjustments(actor, {
      status: url.searchParams.get("status") ?? undefined,
      employeeId: url.searchParams.get("employeeId") ?? undefined,
    }) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "request_failed" }, { status: 403 });
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "compensation:adjustment:request");
    const input = salaryAdjustmentInputSchema.parse(await request.json());
    return Response.json({ adjustment: await createSalaryAdjustment(actor, input) }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "invalid_request", issues: error.issues }, { status: 400 });
    return Response.json({ error: error instanceof Error ? error.message : "request_failed" }, { status: 400 });
  }
}
