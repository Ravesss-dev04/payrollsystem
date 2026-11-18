import { LuCalendarDays } from "react-icons/lu";
export default function UpcomingShiftCard({ value = "0" }: { value?: string }) {
  return (
    <div className="flex min-h-[112px] items-start gap-3 rounded-xl border border-[#EDEAF6] bg-white p-4 shadow-[0_3px_8px_rgba(62,32,120,.08)]">
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-pink-100 text-pink-600">
        <LuCalendarDays size={24} />
      </div>
      <div>
        <p className="text-xs font-semibold">Upcoming Shift Changes</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
        <p className="mt-1 text-xs text-[#73718A]">Data unavailable</p>
      </div>
    </div>
  );
}
