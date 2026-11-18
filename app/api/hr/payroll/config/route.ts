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
  createConfigurationDraft,
  getActiveConfiguration,
  listConfigurationVersions,
  PayrollConfigServiceError,
} from "../../../../lib/payroll/config-service.server";

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
  if (error instanceof PayrollConfigServiceError) {
    return jsonResponse({ error: error.code, message: error.message }, error.status);
  }
  throw error;
}

const listQuerySchema = z
  .object({
    category: z.string().trim().max(64).optional(),
    status: z.string().trim().max(32).optional(),
    page: z.coerce.number().int().min(1).max(100_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export async function GET(request: Request): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "payroll:manage");
    const url = new URL(request.url);

    const allowedKeys = new Set(["category", "status", "page", "pageSize"]);
    if ([...url.searchParams.keys()].some((k) => !allowedKeys.has(k))) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }

    const query = listQuerySchema.safeParse({
      category: url.searchParams.get("category") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      page: url.searchParams.get("page") ?? 1,
      pageSize: url.searchParams.get("pageSize") ?? 20,
    });

    if (!query.success) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }

    const [active, history] = await Promise.all([
      getActiveConfiguration(query.data.category ?? "GeneralSettings"),
      listConfigurationVersions(actor, query.data),
    ]);

    return jsonResponse({ active, history });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "payroll:manage");
    if (new URL(request.url).search) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }
    const body = await readJsonBody(request);
    const draft = await createConfigurationDraft(actor, body as any);
    return jsonResponse({ draft }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
