import { requireApiPermission } from "@/app/lib/auth/api-guard.server";
import { approveSalaryAdjustment } from "@/app/lib/compensation/salary-adjustments.server";

export async function POST(request: Request, { params }: { params: Promise<{ adjustmentId: string }> }) {
  try {
    const actor = await requireApiPermission(request, "compensation:adjustment:approve");
    const { adjustmentId } = await params;
    return Response.json({ adjustment: await approveSalaryAdjustment(actor, adjustmentId) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "request_failed" }, { status: 400 });
  }
}
