import { z } from "zod";
import {
  ApiAuthorizationError,
  apiAuthorizationErrorResponse,
  requireApiPermission,
} from "../../../../../lib/auth/api-guard.server";
import {
  HttpInputError,
  jsonResponse,
  readJsonBody,
} from "../../../../../lib/auth/http";
import {
  fullPayrollConfigurationSchema,
} from "../../../../../lib/payroll/company-config";
import {
  getActiveConfiguration,
} from "../../../../../lib/payroll/config-service.server";
import {
  simulateConfigurationImpact,
} from "../../../../../lib/payroll/simulation";

const simulationRequestSchema = z.object({
  category: z.string().default("GeneralSettings"),
  proposedConfiguration: fullPayrollConfigurationSchema,
  sampleEmployees: z.array(z.any()).optional(),
});

function errorResponse(error: unknown): Response {
  if (error instanceof ApiAuthorizationError) {
    return apiAuthorizationErrorResponse(error);
  }
  if (error instanceof HttpInputError) {
    return jsonResponse({ error: error.code }, error.status);
  }
  if (error instanceof z.ZodError) {
    return jsonResponse({ error: "invalid_request", issues: error.issues }, 400);
  }
  throw error;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "payroll:manage");
    const rawBody = await readJsonBody(request);
    const parsed = simulationRequestSchema.parse(rawBody);

    const active = await getActiveConfiguration(parsed.category);
    const result = simulateConfigurationImpact(
      active.configuration,
      parsed.proposedConfiguration,
      parsed.sampleEmployees,
    );

    return jsonResponse({ simulation: result });
  } catch (error) {
    return errorResponse(error);
  }
}
