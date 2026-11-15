import { LuWallet } from "react-icons/lu";
import DashboardPanel from "./DashboardPanel";
import { DashboardUnavailableState } from "./DashboardUnavailableState";

export default function ProjectedPayrollCard() {
  return (
    <DashboardPanel title="Projected Payroll" icon={<LuWallet size={20} />}>
      <DashboardUnavailableState
        title="Projected payroll unavailable"
        message="No authoritative HR-entered payroll projection is available."
      />
    </DashboardPanel>
  );
}
