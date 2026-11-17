import { LuPlane } from "react-icons/lu";
import { Metric } from "./TotalEmployees";
export default function LeaveRequest() {
  return (
    <Metric
      icon={<LuPlane />}
      color="bg-violet-100 text-violet-600"
      value="28"
      label="Leave Requests"
      trend="12.0%"
    />
  );
}
