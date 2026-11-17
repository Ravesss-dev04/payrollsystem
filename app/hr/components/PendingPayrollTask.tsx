import { LuLayers3 } from "react-icons/lu";
import { Metric } from "./TotalEmployees";
export default function PendingPayrollTask() {
  return (
    <Metric
      icon={<LuLayers3 />}
      color="bg-rose-100 text-rose-600"
      value="12"
      label="Pending Payroll Tasks"
      trend="36.8%"
      negative
    />
  );
}
