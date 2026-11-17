import { LuCalendarCheck } from "react-icons/lu";
import { Metric } from "./TotalEmployees";
export default function AttendanceRate() {
  return (
    <Metric
      icon={<LuCalendarCheck />}
      color="bg-teal-100 text-teal-600"
      value="96.4%"
      label="Attendance Rate"
      trend="1.8 pp"
    />
  );
}
