import { z } from "zod";
import { requireApiPermission } from "@/app/lib/auth/api-guard.server";
import { pauseBonusProgram } from "@/app/lib/compensation/bonuses.server";

export async function POST(request: Request, { params }: { params: Promise<{ programId: string }> }) {
  try {
    const actor = await requireApiPermission(request, "compensation:policy:manage");
    const { programId } = await params;
    const input = z.object({ effectiveDate: z.coerce.date(), reason: z.string().max(1000).optional() }).parse(await request.json());
    return Response.json({ program: await pauseBonusProgram(actor, programId, input.effectiveDate, input.reason) });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "invalid_request", issues: error.issues }, { status: 400 });
    return Response.json({ error: error instanceof Error ? error.message : "request_failed" }, { status: 400 });
  }
}
