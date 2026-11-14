import { LuClock3 } from "react-icons/lu";
export default function PendingApprovalsCard({ count }: { count: number }) {
  return (
    <section className="flex items-start gap-4 rounded-2xl border border-[#EDEAF6] bg-white p-5 shadow-sm">
      <span className="rounded-full bg-[#7C3AED] p-3 text-white">
        <LuClock3 size={22} />
      </span>
      <div>
        <p className="text-xl font-bold text-[#17152D]">{count}</p>
        <h2 className="mt-1 text-sm font-semibold">Pending Approvals</h2>
        <p className="mt-1 text-xs text-[#73718A]">
          Payroll, Leave, Adjustments
        </p>
      </div>
    </section>
  );
}
