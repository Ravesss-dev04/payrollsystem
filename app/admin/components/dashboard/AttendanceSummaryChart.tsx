import { LuCalendarCheck2 } from "react-icons/lu";
import DashboardPanel from "./DashboardPanel";
import { DashboardUnavailableState } from "./DashboardUnavailableState";

export default function AttendanceSummaryChart() {
  return (
    <DashboardPanel
      title="Attendance Summary (Today)"
      icon={<LuCalendarCheck2 size={20} />}
    >
      <DashboardUnavailableState
        title="Attendance data unavailable"
        message="Attendance requires HR schedule and evidence records plus a complete Admin policy."
      />
    </DashboardPanel>
  );
}
