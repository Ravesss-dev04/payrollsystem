import { z } from "zod";
import { requireApiPermission } from "../../../../../lib/auth/api-guard.server";
import { jsonResponse, readJsonBody } from "../../../../../lib/auth/http";
import { payrollApiErrorResponse } from "../../../../_shared/payroll-errors";
import {
  getDisbursementRecord,
  updateDisbursementRecord,
} from "../../../../../lib/payroll-results/disbursement-service.server";
import { payrollBatchIdSchema } from "../../../../../lib/payroll-results/schemas";
import { prisma } from "../../../../../lib/db";
import { PayrollServiceError } from "../../../../../lib/payroll-results/service";

type RouteContext = { params: Promise<{ batchId: string }> };

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "payroll:approve");
    if (actor.role !== "admin") {
      return jsonResponse({ error: "forbidden" }, 403);
    }
    if (new URL(request.url).search) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }

    const { batchId: rawBatchId } = await context.params;
    const batchId = payrollBatchIdSchema.safeParse(rawBatchId);
    if (!batchId.success) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }

    // Verify the batch exists and belongs to an approved version
    const version = await prisma.payrollBatchVersion.findFirst({
      where: {
        batchId: batchId.data,
        status: "Approved",
      },
      select: { id: true },
      orderBy: { version: "desc" },
    });
    if (!version) {
      return jsonResponse({ error: "batch_not_found" }, 404);
    }

    const record = await getDisbursementRecord(version.id);
    if (!record) {
      return jsonResponse({ error: "batch_not_found" }, 404);
    }

    return jsonResponse({ disbursement: record });
  } catch (error) {
    return payrollApiErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "payroll:approve");
    if (actor.role !== "admin") {
      return jsonResponse({ error: "forbidden" }, 403);
    }
    if (new URL(request.url).search) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }

    const { batchId: rawBatchId } = await context.params;
    const batchId = payrollBatchIdSchema.safeParse(rawBatchId);
    if (!batchId.success) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }

    // Resolve the approved payroll version for this batch
    const version = await prisma.payrollBatchVersion.findFirst({
      where: {
        batchId: batchId.data,
        status: "Approved",
      },
      select: { id: true },
      orderBy: { version: "desc" },
    });
    if (!version) {
      throw new PayrollServiceError("batch_not_found", 404);
    }

    const body = await readJsonBody(request);
    const updated = await updateDisbursementRecord(actor, version.id, body as any);

    return jsonResponse({ disbursement: updated });
  } catch (error) {
    return payrollApiErrorResponse(error);
  }
}
