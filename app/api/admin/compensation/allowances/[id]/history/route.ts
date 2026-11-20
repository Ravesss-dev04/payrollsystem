import { requireCompensationActor } from "../../../_auth";
import { getAllowanceHistory } from "@/app/lib/compensation/allowances-v2.server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireCompensationActor(request, "compensation:read");
    const { id } = await params;
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") || "50")));
    const history = await getAllowanceHistory(id, { offset: (page - 1) * pageSize, limit: pageSize });
    return Response.json({ history, pagination: { page, pageSize, returned: history.length } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "request_failed" }, { status: 400 });
  }
}
