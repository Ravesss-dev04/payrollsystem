import { LuLayers } from "react-icons/lu";
import DashboardPanel from "./DashboardPanel";
import { DashboardUnavailableState } from "./DashboardUnavailableState";

export default function DepartmentsCard() {
  return (
    <DashboardPanel title="Departments" icon={<LuLayers size={20} />}>
      <DashboardUnavailableState
        title="Department data unavailable"
        message="No persisted organization structure is available yet."
      />
    </DashboardPanel>
  );
}
