import { LuUsers } from "react-icons/lu";
export default function TotalEmployeesCard({ count }: { count: number }) {
  return (
    <section className="flex items-start gap-4 rounded-2xl border border-[#EDEAF6] bg-white p-5 shadow-sm">
      <span className="rounded-full bg-[#7C3AED] p-3 text-white">
        <LuUsers size={22} />
      </span>
      <div>
        <p className="text-xl font-bold text-[#17152D]">{count}</p>
        <h2 className="mt-1 text-sm font-semibold">Total Employees</h2>
        <p className="mt-1 text-xs text-[#73718A]">
          <span className="font-semibold text-green-600">+4</span> from last
          month
        </p>
      </div>
    </section>
  );
}
