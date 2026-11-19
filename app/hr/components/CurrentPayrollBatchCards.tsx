import { LuCalendarDays } from "react-icons/lu";
export default function CurrentPayrollBatchCards({
  value,
  number,
}: {
  value: string;
  number: string;
}) {
  return (
    <div className="flex h-full items-center gap-4 rounded-2xl border border-[#edeaf6] bg-white p-4 shadow-sm">
      <span className="rounded-full bg-violet-100 p-3 text-violet-700">
        <LuCalendarDays size={23} />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold">Current Payroll Batch</p>
        <p className="mt-1 truncate text-xl font-bold">{value}</p>
        <p className="mt-1 text-xs text-slate-500">Batch #{number}</p>
      </div>
    </div>
  );
}
