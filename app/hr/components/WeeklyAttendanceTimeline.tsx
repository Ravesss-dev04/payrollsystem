import {
  LuCircleCheck as LuCheckCircle2,
  LuClock3,
  LuMinus,
} from "react-icons/lu";
import type { DailyAttendanceRecord } from "../attendance-management/detail-data";
import {
  addDays,
  formatDate,
  formatMinutes,
  toDateKey,
} from "../attendance-management/detail-data";

export default function WeeklyAttendanceTimeline({
  weekStart,
  records,
  selectedDate,
  onSelectDate,
}: {
  weekStart: Date;
  records: DailyAttendanceRecord[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-[#edeaf6] bg-white p-4 shadow-[0_3px_8px_rgba(62,32,120,.08)]">
      <h2 className="text-lg font-bold">Weekly Attendance Timeline</h2>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {Array.from({ length: 7 }, (_, index) => {
          const date = addDays(weekStart, index);
          const dateKey = toDateKey(date);
          const record = records.find((item) => item.date === dateKey);
          const status = record?.status ?? "Rest Day";
          const selected = selectedDate === dateKey;
          return (
            <button
              type="button"
              key={dateKey}
              aria-pressed={selected}
              onClick={() => onSelectDate(dateKey)}
              className={`min-w-[92px] flex-1 rounded-xl border p-3 text-center transition ${selected ? "border-2 border-violet-500 bg-violet-50" : status === "Present" ? "border-emerald-100 bg-emerald-50/70" : status === "Late" ? "border-amber-100 bg-amber-50/80" : status === "Absent" ? "border-rose-100 bg-rose-50" : "border-[#edeaf6] bg-[#faf9ff]"}`}
            >
              <span className="block text-xs font-bold">
                {date.toLocaleDateString("en-US", { weekday: "short" })}
              </span>
              <span className="block text-[11px] text-[#73718a]">
                {formatDate(dateKey, { month: "short", day: "numeric" })}
              </span>
              <span className="my-3 grid place-items-center">
                {status === "Present" ? (
                  <LuCheckCircle2 className="text-emerald-600" size={25} />
                ) : status === "Late" ? (
                  <LuClock3 className="text-amber-600" size={25} />
                ) : status === "Absent" ? (
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-rose-500 text-white">
                    !
                  </span>
                ) : (
                  <LuMinus className="text-[#9290a5]" size={24} />
                )}
                
              </span>

              <span className="block text-xs font-semibold">
                {record?.creditedMinutes
                  ? formatMinutes(record.creditedMinutes)
                  : status === "Rest Day"
                    ? "—"
                    : "Absent"}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
