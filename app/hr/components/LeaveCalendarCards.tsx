"use client";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";
import type { LeaveRequest } from "../leave-management/leave-data";
import {
  addDays,
  dateKey,
  employeeFor,
  formatRange,
} from "../leave-management/leave-data";
export default function LeaveCalendarCards({
  month,
  onMonth,
  requests,
  onDate,
}: {
  month: Date;
  onMonth: (date: Date) => void;
  requests: LeaveRequest[];
  onDate: (date: string) => void;
}) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = addDays(first, -first.getDay());
  const cellCount =
    Math.ceil(
      (first.getDay() +
        new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()) /
        7,
    ) * 7;
  const days = Array.from({ length: cellCount }, (_, i) => addDays(start, i));
  return (
    <section className="min-w-0 rounded-2xl border border-[#EDEAF6] bg-white px-5 py-4 shadow-[0_3px_9px_rgba(84,42,154,.10)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[17px] font-bold">Leave Calendar</h2>
        <div className="flex h-9 items-center rounded-lg border border-[#ded8ef] text-xs font-semibold">
          <button
            aria-label="Previous month"
            className="px-2 focus-visible:outline-violet-600"
            onClick={() =>
              onMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
            }
          >
            <LuChevronLeft />
          </button>
          <span className="min-w-[82px] text-center">
            {month.toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
            })}
          </span>
          <button
            aria-label="Next month"
            className="px-2 focus-visible:outline-violet-600"
            onClick={() =>
              onMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
            }
          >
            <LuChevronRight />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-[#30294a]">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <span key={day} className="py-1">
            {day}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5 text-center">
        {days.map((day) => {
          const key = dateKey(day);
          const events = requests.filter(
            (r) => r.status !== "Rejected" && r.start <= key && r.end >= key,
          );
          const approved = events.some((r) => r.status === "Approved");
          return (
            <button
              key={key}
              type="button"
              onClick={() => onDate(key)}
              title={
                events.length
                  ? `${key}: ${events.map((r) => `${employeeFor(r)?.name} · ${r.type} · ${formatRange(r)} · ${r.status}`).join("; ")}`
                  : key
              }
              className={`relative mx-auto grid h-8 w-8 place-items-center rounded-full text-[12px] focus-visible:outline-2 focus-visible:outline-violet-700 ${day.getMonth() !== month.getMonth() ? "text-[#aaa7b9]" : "text-[#27233d]"} ${events.length ? (approved ? "bg-violet-700 font-semibold text-white hover:bg-violet-800" : "bg-[#e8d7ff] font-semibold text-violet-800 hover:bg-[#d9b9ff]") : "hover:bg-[#f3e8ff]"}`}
            >
              {day.getDate()}
              {events.length > 1 && (
                <span className="absolute -right-1 -top-1 grid h-3.5 w-3.5 place-items-center rounded-full bg-[#17152D] text-[8px] text-white">
                  {events.length}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 border-t border-[#f0ecf6] pt-3 text-[11px]">
        <span className="flex items-center gap-1.5">
          <i className="h-3 w-3 rounded-full bg-violet-700" />
          Approved leave
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-3 w-3 rounded-full bg-[#d9b9ff]" />
          Pending leave
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-3 w-3 rounded-full bg-emerald-400" />
          Holiday
        </span>
      </div>
    </section>
  );
}
