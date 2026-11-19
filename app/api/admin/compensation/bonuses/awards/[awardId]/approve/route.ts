import { requireApiPermission } from "@/app/lib/auth/api-guard.server";
import { approveBonusAward } from "@/app/lib/compensation/bonuses.server";

export async function POST(request: Request, { params }: { params: Promise<{ awardId: string }> }) {
  try {
    const actor = await requireApiPermission(request, "compensation:adjustment:approve");
    const { awardId } = await params;
    return Response.json({ award: await approveBonusAward(actor, awardId) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "request_failed" }, { status: 400 });
  }
}
