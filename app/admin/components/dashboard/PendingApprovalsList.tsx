import { LuBriefcaseBusiness } from "react-icons/lu";
import DashboardPanel from "./DashboardPanel";
import { DashboardUnavailableState } from "./DashboardUnavailableState";

export default function PendingApprovalsList() {
  return (
    <DashboardPanel
      title="Pending Approvals"
      icon={<LuBriefcaseBusiness size={20} />}
    >
      <DashboardUnavailableState
        title="Approvals unavailable"
        message="No workflow records are available to review."
      />
    </DashboardPanel>
  );
}
