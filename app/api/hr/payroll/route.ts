import { z } from "zod";
import { payrollApiErrorResponse } from "../../_shared/payroll-errors";
import { requireApiPermission } from "../../../lib/auth/api-guard.server";
import { jsonResponse, readJsonBody } from "../../../lib/auth/http";
import {
  MAX_PAYROLL_REQUEST_BYTES,
  payrollBatchListInputSchema,
} from "../../../lib/payroll-results/schemas";
import {
  createPayrollBatch,
  listPayrollBatches,
} from "../../../lib/payroll-results/service";

export async function GET(request: Request): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "payroll:read");
    const params = new URL(request.url).searchParams;
    const allowed = new Set(["status", "q", "page", "pageSize"]);
    if (
      [...params.keys()].some((key) => !allowed.has(key)) ||
      [...allowed].some((key) => params.getAll(key).length > 1)
    ) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }
    const input = payrollBatchListInputSchema.parse({
      status: params.get("status") ?? "all",
      query: params.get("q") ?? "",
      page: params.get("page") ?? "1",
      pageSize: params.get("pageSize") ?? "20",
    });
    return jsonResponse(await listPayrollBatches(actor, input));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }
    return payrollApiErrorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "payroll:manage");
    if (new URL(request.url).search) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }
    const result = await createPayrollBatch(
      actor,
      await readJsonBody(request, MAX_PAYROLL_REQUEST_BYTES),
    );
    return jsonResponse(result, 201);
  } catch (error) {
    return payrollApiErrorResponse(error);
  }
}
