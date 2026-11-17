import { jsonResponse } from "../../../../lib/auth/http";
import { departmentInputSchema } from "../../../../lib/organization/policy";
import {
  createDepartment,
  getDepartments,
} from "../../../../lib/organization/service";
import {
  readSettingsInput,
  rejectSearchParams,
  withAdminSettingsAccess,
} from "../_shared";

export async function GET(request: Request): Promise<Response> {
  return withAdminSettingsAccess(request, async () => {
    const invalidQuery = rejectSearchParams(request);
    if (invalidQuery) return invalidQuery;
    return jsonResponse({ departments: await getDepartments() });
  });
}

export async function POST(request: Request): Promise<Response> {
  return withAdminSettingsAccess(request, async (actor) => {
    const input = await readSettingsInput(request, departmentInputSchema);
    return jsonResponse(
      { department: await createDepartment(actor, input) },
      201,
    );
  });
}
