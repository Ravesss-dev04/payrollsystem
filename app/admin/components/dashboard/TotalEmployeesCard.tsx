import { LuUsers } from "react-icons/lu";
import DashboardPanel from "./DashboardPanel";
import { DashboardUnavailableState } from "./DashboardUnavailableState";

export default function TotalEmployeesCard() {
  return (
    <DashboardPanel title="Total Employees" icon={<LuUsers size={20} />}>
      <DashboardUnavailableState
        title="Employee records unavailable"
        message="Headcount requires HR employment records and an Admin status policy."
      />
    </DashboardPanel>
  );
}
