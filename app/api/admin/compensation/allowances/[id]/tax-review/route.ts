import { z } from "zod";
import { requireCompensationActor } from "../../../_auth";
import { reviewTaxTreatment } from "@/app/lib/compensation/allowances-v2.server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireCompensationActor(request, "compensation:tax:review");
    const { id } = await params;
    const input = z.object({ taxTreatment: z.enum(["Taxable", "NonTaxable", "Pending", "Conditional"]), reason: z.string().max(1000).optional() }).parse(await request.json());
    return Response.json({ allowance: await reviewTaxTreatment(id, actor.userId, input.taxTreatment, input.reason) });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "invalid_request", issues: error.issues }, { status: 400 });
    return Response.json({ error: error instanceof Error ? error.message : "request_failed" }, { status: 400 });
  }
}
