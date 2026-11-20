import { jsonResponse } from "../../../../../lib/auth/http";
import { getEmploymentStatusPolicyDetails } from "../../../../../lib/organization/service";
import { withAdminSettingsAccess } from "../../_shared";

export async function GET(request: Request, { params }: { params: Promise<{ policyId: string }> }): Promise<Response> {
  return withAdminSettingsAccess(request, async () => {
    const { policyId } = await params;
    const policy = await getEmploymentStatusPolicyDetails(policyId);
    return policy ? jsonResponse({ policy }) : jsonResponse({ error: "policy_not_found" }, 404);
  });
}
