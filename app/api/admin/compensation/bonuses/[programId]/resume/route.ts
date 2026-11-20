import { requireApiPermission } from "@/app/lib/auth/api-guard.server";
import { resumeBonusProgram } from "@/app/lib/compensation/bonuses.server";

export async function POST(request: Request, { params }: { params: Promise<{ programId: string }> }) {
  try {
    const actor = await requireApiPermission(request, "compensation:policy:manage");
    const { programId } = await params;
    return Response.json({ program: await resumeBonusProgram(actor, programId, "Resumed from compensation UI") });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "request_failed" }, { status: 400 });
  }
}
