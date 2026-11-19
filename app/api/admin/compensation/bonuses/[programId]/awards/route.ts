import { z } from "zod";
import { requireApiPermission } from "@/app/lib/auth/api-guard.server";
import { createBonusAward } from "@/app/lib/compensation/bonuses.server";

const schema = z.object({
  employeeId: z.string().min(1),
  awardAmount: z.coerce.number().positive(),
  awardPeriodStart: z.coerce.date(),
  awardPeriodEnd: z.coerce.date(),
  qualifyingMetric: z.string().max(255).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ programId: string }> }) {
  try {
    const actor = await requireApiPermission(request, "compensation:policy:manage");
    const { programId } = await params;
    const input = schema.parse(await request.json());
    return Response.json({ award: await createBonusAward(actor, programId, input.employeeId, input.awardAmount, input.awardPeriodStart, input.awardPeriodEnd, input.qualifyingMetric) }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "invalid_request", issues: error.issues }, { status: 400 });
    return Response.json({ error: error instanceof Error ? error.message : "request_failed" }, { status: 400 });
  }
}
