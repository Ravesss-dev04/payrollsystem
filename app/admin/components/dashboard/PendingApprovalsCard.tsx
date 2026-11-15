import { LuClock3 } from "react-icons/lu";
import DashboardPanel from "./DashboardPanel";
import { DashboardUnavailableState } from "./DashboardUnavailableState";

export default function PendingApprovalsCard() {
  return (
    <DashboardPanel title="Pending Approvals" icon={<LuClock3 size={20} />}>
      <DashboardUnavailableState
        title="Approvals unavailable"
        message="No persisted approval records are available."
      />
    </DashboardPanel>
  );
}
