import { LuActivity } from "react-icons/lu";
import DashboardPanel from "./DashboardPanel";
import { DashboardUnavailableState } from "./DashboardUnavailableState";

export default function RecentActivities() {
  return (
    <DashboardPanel title="Recent Activities" icon={<LuActivity size={20} />}>
      <DashboardUnavailableState
        title="Domain activity unavailable"
        message="Only trusted security activity is available until business workflows are configured."
      />
    </DashboardPanel>
  );
}
