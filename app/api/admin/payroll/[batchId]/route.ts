import { requireApiPermission } from "../../../../lib/auth/api-guard.server";
import { jsonResponse } from "../../../../lib/auth/http";
import { payrollApiErrorResponse } from "../../../_shared/payroll-errors";
import {
  getPayrollBatchReview,
  PayrollServiceError,
} from "../../../../lib/payroll-results/service";

type RouteContext = { params: Promise<{ batchId: string }> };

const submittedStatuses = new Set([
  "PendingAdminApproval",
  "Approved",
  "Rejected",
  "Returned",
  "Processing",
  "Processed",
]);

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "payroll:read");
    if (actor.role !== "admin") {
      return jsonResponse({ error: "forbidden" }, 403);
    }
    const params = new URL(request.url).searchParams;
    if (
      [...params.keys()].some((key) => key !== "version") ||
      params.getAll("version").length !== 1 ||
      !/^[1-9]\d*$/.test(params.get("version") ?? "") ||
      !Number.isSafeInteger(Number(params.get("version")))
    ) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }
    const { batchId } = await context.params;
    const review = await getPayrollBatchReview(
      actor,
      batchId,
      Number(params.get("version")),
    );
    if (
      !submittedStatuses.has(review.batch.status) ||
      !review.batch.submittedAt ||
      !review.batch.submittedBy
    ) {
      throw new PayrollServiceError("version_conflict", 409);
    }
    return jsonResponse(review);
  } catch (error) {
    return payrollApiErrorResponse(error);
  }
}
