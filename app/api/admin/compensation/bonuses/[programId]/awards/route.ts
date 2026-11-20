import { z } from "zod";
import { requireApiPermission } from "@/app/lib/auth/api-guard.server";
import { createBonusAward } from "@/app/lib/compensation/bonuses.server";
import { prisma } from "@/app/lib/db";

export async function GET(request: Request, { params }: { params: Promise<{ programId: string }> }) {
  try {
    await requireApiPermission(request, "compensation:read");
    const { programId } = await params;
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") || "20")));
    const where = { bonusProgramId: programId, ...(url.searchParams.get("status") ? { status: url.searchParams.get("status")! } : {}) };
    const [awards, total] = await Promise.all([
      prisma.bonusAward.findMany({ where, include: { employee: { select: { id: true, employeeNumber: true, firstName: true, lastName: true } }, createdBy: { select: { id: true, name: true } }, approvedBy: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.bonusAward.count({ where }),
    ]);
    return Response.json({ awards, pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "request_failed" }, { status: 400 });
  }
}

const schema = z.object({
  employeeId: z.string().min(1),
  awardAmount: z.coerce.number().positive(),
  awardPeriodStart: z.coerce.date(),
  awardPeriodEnd: z.coerce.date(),
  qualifyingMetric: z.string().max(255).optional(),
  supportingReference: z.string().max(512).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ programId: string }> }) {
  try {
    const actor = await requireApiPermission(request, "compensation:assignment:manage");
    const { programId } = await params;
    const input = schema.parse(await request.json());
    return Response.json({ award: await createBonusAward(actor, programId, input.employeeId, input.awardAmount, input.awardPeriodStart, input.awardPeriodEnd, input.qualifyingMetric, input.supportingReference) }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "invalid_request", issues: error.issues }, { status: 400 });
    return Response.json({ error: error instanceof Error ? error.message : "request_failed" }, { status: 400 });
  }
}
