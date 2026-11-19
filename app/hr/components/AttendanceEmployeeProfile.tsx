import { LuBriefcaseBusiness, LuCalendarDays } from "react-icons/lu";
import type { AttendanceEmployee } from "../attendance-management/detail-data";

export default function AttendanceEmployeeProfile({
  employee,
  onPreviousWeek,
  onNextWeek,
  formatWeek,
}: {
  employee: AttendanceEmployee;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  formatWeek: string;
}) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-[#edeaf6] bg-white p-5 shadow-[0_3px_8px_rgba(62,32,120,.08)]">
      <div className="flex items-center gap-4">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-violet-100 text-xl font-bold text-violet-700">
          {employee.name
            .split(" ")
            .map((part) => part[0])
            .join("")}
        </div>
        <div>
          <h2 className="text-xl font-bold">{employee.name}</h2>
          <p className="text-sm text-[#73718a]">{employee.employeeId}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-lg bg-[#f1e8ff] px-2.5 py-1 text-xs font-semibold text-violet-700">
              {employee.department}
            </span>
            <span className="flex items-center gap-1 rounded-lg bg-[#f5f3fa] px-2.5 py-1 text-xs font-semibold text-[#73718a]">
              <LuBriefcaseBusiness size={13} />
              {employee.employmentType}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex h-11 items-center gap-2 rounded-xl border border-[#ded7f1] px-3 text-sm font-semibold">
          <LuCalendarDays className="text-violet-600" size={17} />
          {formatWeek}
        </div>
        <button
          type="button"
          onClick={onPreviousWeek}
          aria-label="Previous week"
          className="grid h-11 w-11 place-items-center rounded-xl border border-[#ded7f1] hover:bg-violet-50"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={onNextWeek}
          aria-label="Next week"
          className="grid h-11 w-11 place-items-center rounded-xl border border-[#ded7f1] hover:bg-violet-50"
        >
          ›
        </button>
      </div>
    </section>
  );
}
