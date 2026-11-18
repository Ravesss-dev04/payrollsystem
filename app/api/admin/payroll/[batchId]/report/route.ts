import { requireApiPermission } from "../../../../../lib/auth/api-guard.server";
import { jsonResponse } from "../../../../../lib/auth/http";
import { payrollApiErrorResponse } from "../../../../_shared/payroll-errors";
import {
  getPayrollBatchReview,
  PayrollServiceError,
  recordPayrollReportExport,
} from "../../../../../lib/payroll-results/service";
import { generatePayrollXlsx, PayrollReportGenerationError } from "../../../../../lib/payroll-results/xlsx";

type RouteContext = { params: Promise<{ batchId: string }> };

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
    const version = Number(params.get("version"));
    const review = await getPayrollBatchReview(actor, batchId, version);
    if (
      ![
        "PendingAdminApproval",
        "Approved",
        "Rejected",
        "Returned",
        "Processing",
        "Processed",
      ].includes(review.batch.status)
      || !review.batch.submittedAt
      || !review.batch.submittedBy
    ) {
      throw new PayrollServiceError("version_conflict", 409);
    }
    const workbook = generatePayrollXlsx(review);
    await recordPayrollReportExport(actor, batchId, version);

    const filename =
      `${review.batch.batchNumber}-v${review.batch.version}.xlsx`.replace(
        /[^A-Za-z0-9._-]/g,
        "_",
      );
    return new Response(new Uint8Array(workbook), {
      headers: {
        "content-type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "private, no-store, max-age=0",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof PayrollReportGenerationError) {
      return jsonResponse(
        { error: error.code },
        error.code === "report_too_large" ? 413 : 500,
      );
    }
    return payrollApiErrorResponse(error);
  }
}
