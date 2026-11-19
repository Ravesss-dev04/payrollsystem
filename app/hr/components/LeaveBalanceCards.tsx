import { LuTriangleAlert } from "react-icons/lu";
import { LeaveMetric } from "./LeavePendingRequestCards";
export default function LeaveBalanceCards({
  value,
  onClick,
}: {
  value: number;
  onClick: () => void;
}) {
  return (
    <LeaveMetric
      icon={<LuTriangleAlert />}
      label="Leave Balance Alerts"
      value={value}
      detail="Employees with ≤ 5 days"
      tone="rose"
      onClick={onClick}
    />
  );
}