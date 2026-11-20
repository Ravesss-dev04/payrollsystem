import { requireApiPermission } from "@/app/lib/auth/api-guard.server";
import { getSalaryAdjustment } from "@/app/lib/compensation/salary-adjustments.server";

export async function GET(request: Request, { params }: { params: Promise<{ adjustmentId: string }> }) {
  try {
    const actor = await requireApiPermission(request, "compensation:read");
    const { adjustmentId } = await params;
    const adjustment = await getSalaryAdjustment(actor, adjustmentId);
    return Response.json(
      { documents: adjustment.supportingDocumentReference ? [{ reference: adjustment.supportingDocumentReference }] : [] },
      { headers: { "cache-control": "no-store, max-age=0" } },
    );
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "request_failed" }, { status: 400 });
  }
}
