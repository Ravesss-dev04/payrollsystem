import { requireApiPermission } from "@/app/lib/auth/api-guard.server";
import { getSalaryAdjustment } from "@/app/lib/compensation/salary-adjustments.server";

export async function GET(request: Request, { params }: { params: Promise<{ adjustmentId: string }> }) {
  try {
    const actor = await requireApiPermission(request, "compensation:adjustment:request");
    const { adjustmentId } = await params;
    return Response.json({ adjustment: await getSalaryAdjustment(actor, adjustmentId) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "request_failed" }, { status: 404 });
  }
}
