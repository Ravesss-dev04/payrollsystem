import { z } from "zod";
import { requireApiPermission } from "@/app/lib/auth/api-guard.server";
import {
  bonusProgramInputSchema,
  createBonusProgram,
  listBonusPrograms,
} from "@/app/lib/compensation/bonuses.server";

export async function GET(request: Request): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "compensation:read");
    const url = new URL(request.url);
    const programs = await listBonusPrograms(actor, {
      status: url.searchParams.get("status") ?? undefined,
      type: url.searchParams.get("type") ?? undefined,
      frequency: url.searchParams.get("frequency") ?? undefined,
      eligibility: url.searchParams.get("eligibility") ?? undefined,
      search: url.searchParams.get("search") ?? undefined,
      page: Number(url.searchParams.get("page") || "1"),
      pageSize: Number(url.searchParams.get("pageSize") || "20"),
    });
    return Response.json({ programs: programs.programs, pagination: { page: programs.page, pageSize: programs.pageSize, total: programs.total, pages: Math.ceil(programs.total / programs.pageSize) } });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "invalid_request" }, { status: 400 });
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "compensation:policy:manage");
    const input = bonusProgramInputSchema.parse(await request.json());
    return Response.json({ program: await createBonusProgram(actor, input) }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "invalid_request", issues: error.issues }, { status: 400 });
    return Response.json({ error: error instanceof Error ? error.message : "request_failed" }, { status: 400 });
  }
}
