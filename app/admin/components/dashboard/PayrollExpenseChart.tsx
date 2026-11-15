import { LuChartNoAxesCombined } from "react-icons/lu";
import DashboardPanel from "./DashboardPanel";
import { DashboardUnavailableState } from "./DashboardUnavailableState";

export default function PayrollExpenseChart() {
  return (
    <DashboardPanel
      title="Payroll Expense Trend"
      icon={<LuChartNoAxesCombined size={20} />}
    >
      <DashboardUnavailableState
        title="Payroll trend unavailable"
        message="Trend data requires persisted payroll results, Admin approval, and a configured reporting measure."
      />
    </DashboardPanel>
  );
}
