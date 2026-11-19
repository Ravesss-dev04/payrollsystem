import { LuCalendarDays } from "react-icons/lu";
import { LeaveMetric } from "./LeavePendingRequestCards";
export default function LeaveUpcomingCards({
  value,
  onClick,
}: {
  value: number;
  onClick: () => void;
}) {
  return (
    <LeaveMetric
      icon={<LuCalendarDays />}
      label="Upcoming Leaves"
      value={value}
      detail="Next 30 days"
      tone="purple"
      onClick={onClick}
    />
  );
}
