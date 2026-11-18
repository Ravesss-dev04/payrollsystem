import { z } from "zod";
import {
  ApiAuthorizationError,
  apiAuthorizationErrorResponse,
  requireApiPermission,
} from "../../../../lib/auth/api-guard.server";
import {
  HttpInputError,
  jsonResponse,
  readJsonBody,
} from "../../../../lib/auth/http";
import {
  createPayrollRuleSetDraft,
  getLatestPayrollRuleSet,
  PayrollRuleSetServiceError,
} from "../../../../lib/payroll/rules-service.server";
import { payrollRuleSetDraftInputSchema } from "../../../../lib/payroll/rules";
import type { SessionPrincipal } from "../../../../lib/auth/session-policy";

function errorResponse(error: unknown): Response {
  if (error instanceof ApiAuthorizationError) {
    return apiAuthorizationErrorResponse(error);
  }
  if (error instanceof HttpInputError) {
    return jsonResponse({ error: error.code }, error.status);
  }
  if (error instanceof z.ZodError) {
    return jsonResponse({ error: "invalid_request" }, 400);
  }
  if (error instanceof PayrollRuleSetServiceError) {
    return jsonResponse({ error: error.code }, error.status);
  }
  throw error;
}

export async function GET(request: Request): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "payroll:approve");
    if (new URL(request.url).search) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }
    return jsonResponse({ ruleSet: await getLatestPayrollRuleSet(actor) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  let actor: SessionPrincipal;
  try {
    actor = await requireApiPermission(request, "payroll:approve");
    const input = payrollRuleSetDraftInputSchema.parse(
      await readJsonBody(request),
    );
    const ruleSet = await createPayrollRuleSetDraft(actor, input);
    return jsonResponse({ ruleSet }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
