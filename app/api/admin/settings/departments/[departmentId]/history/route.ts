import { jsonResponse } from "../../../../../../lib/auth/http";
import { getOrganizationHistory } from "../../../../../../lib/organization/service";
import { withAdminSettingsAccess } from "../../../_shared";

export async function GET(request: Request, { params }: { params: Promise<{ departmentId: string }> }): Promise<Response> {
  return withAdminSettingsAccess(request, async () => {
    const { departmentId } = await params;
    return jsonResponse({ history: await getOrganizationHistory("department", departmentId) });
  });
}
