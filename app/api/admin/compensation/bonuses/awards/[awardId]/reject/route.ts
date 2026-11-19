import { z } from "zod";
import { requireApiPermission } from "@/app/lib/auth/api-guard.server";
import { rejectBonusAward } from "@/app/lib/compensation/bonuses.server";

export async function POST(request: Request, { params }: { params: Promise<{ awardId: string }> }) {
  try {
    const actor = await requireApiPermission(request, "compensation:adjustment:approve");
    const { awardId } = await params;
    const { reason } = z.object({ reason: z.string().min(1).max(1000) }).parse(await request.json());
    return Response.json({ award: await rejectBonusAward(actor, awardId, reason) });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "invalid_request", issues: error.issues }, { status: 400 });
    return Response.json({ error: error instanceof Error ? error.message : "request_failed" }, { status: 400 });
  }
}
