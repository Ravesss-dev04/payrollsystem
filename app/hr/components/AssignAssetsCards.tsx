import { LuLaptop } from "react-icons/lu";
export default function AssignedAssetsCard({
  value = "0",
}: {
  value?: string;
}) {
  return (
    <div className="flex min-h-[112px] items-start gap-3 rounded-xl border border-[#EDEAF6] bg-white p-4 shadow-[0_3px_8px_rgba(62,32,120,.08)]">
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-purple-100 text-violet-600">
        <LuLaptop size={24} />
      </div>
      <div>
        <p className="text-xs font-semibold">Assigned Assets</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
        <p className="mt-1 text-xs text-[#73718A]">Data unavailable</p>
      </div>
    </div>
  );
}
