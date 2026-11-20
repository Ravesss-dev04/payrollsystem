import { z } from "zod";
import { requireApiPermission } from "@/app/lib/auth/api-guard.server";
import {
  createTLSalaryAdjustmentRecommendation,
  listTLRecommendations,
  salaryAdjustmentInputSchema,
} from "@/app/lib/compensation/salary-adjustments.server";

export async function GET(request: Request): Promise<Response> {
  try {
    const actor = await requireApiPermission(request);
    return Response.json({ recommendations: await listTLRecommendations(actor) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "request_failed" }, { status: 403 });
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const actor = await requireApiPermission(request);
    const input = salaryAdjustmentInputSchema.parse(await request.json());
    return Response.json({ recommendation: await createTLSalaryAdjustmentRecommendation(actor, input) }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "invalid_request", issues: error.issues }, { status: 400 });
    return Response.json({ error: error instanceof Error ? error.message : "request_failed" }, { status: 403 });
  }
}
