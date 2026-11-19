import { LuTriangleAlert } from "react-icons/lu";
export default function PendingAdjustmentCards({ count }: { count: number }) {
  return (
    <div className="flex h-full items-center gap-4 rounded-2xl border border-[#edeaf6] bg-white p-4 shadow-sm">
      <span className="rounded-full bg-orange-100 p-3 text-orange-500">
        <LuTriangleAlert size={23} />
      </span>
      <div>
        <p className="text-xs font-semibold">Pending Adjustments</p>
        <p className="mt-1 text-2xl font-bold">{count}</p>
        <p className="mt-1 text-xs text-slate-500">Selected batch</p>
      </div>
    </div>
  );
}
