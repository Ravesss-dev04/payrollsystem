import { z } from "zod";
import { requireApiPermission } from "@/app/lib/auth/api-guard.server";
import {
  bonusProgramInputSchema,
  getBonusProgram,
  updateBonusProgram,
} from "@/app/lib/compensation/bonuses.server";

export async function GET(request: Request, { params }: { params: Promise<{ programId: string }> }) {
  try {
    const actor = await requireApiPermission(request, "compensation:read");
    const { programId } = await params;
    return Response.json({ program: await getBonusProgram(actor, programId) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "request_failed" }, { status: 404 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ programId: string }> }) {
  try {
    const actor = await requireApiPermission(request, "compensation:policy:manage");
    const { programId } = await params;
    const input = bonusProgramInputSchema.partial().parse(await request.json());
    return Response.json({ program: await updateBonusProgram(actor, programId, input) });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "invalid_request", issues: error.issues }, { status: 400 });
    return Response.json({ error: error instanceof Error ? error.message : "request_failed" }, { status: 400 });
  }
}
