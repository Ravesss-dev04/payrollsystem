import { LuSquareCheckBig } from "react-icons/lu";
import { LeaveMetric } from "./LeavePendingRequestCards";
export default function LeaveApproveCards({
  value,
  onClick,
}: {
  value: number;
  onClick: () => void;
}) {
  return (
    <LeaveMetric
      icon={<LuSquareCheckBig />}
      label="Approved This Month"
      value={value}
      detail="Approved in selected month"
      tone="green"
      onClick={onClick}
    />
  );
}
