import { LuCircleCheck, LuTimer, LuTriangleAlert } from "react-icons/lu";
import type { DailyAttendanceRecord } from "../attendance-management/detail-data";
import { formatMinutes } from "../attendance-management/detail-data";

export default function AttendanceFlagsExceptions({
  record,
}: {
  record?: DailyAttendanceRecord;
}) {
  const rows = [
    [
      "Lateness",
      record?.lateMinutes ? `${record.lateMinutes} minutes` : "—",
      record?.lateMinutes ? (
        <LuTriangleAlert key="late" className="text-rose-600" />
      ) : (
        <LuCircleCheck key="ok" className="text-emerald-600" />
      ),
    ],
    [
      "Undertime",
      record?.undertimeMinutes ? formatMinutes(record.undertimeMinutes) : "—",
      <LuCircleCheck key="under" className="text-emerald-600" />,
    ],
    [
      "OT",
      record?.overtimeMinutes
        ? `${formatMinutes(record.overtimeMinutes)} (${record.overtimeStatus ?? "Pending"})`
        : "—",
      <LuTimer key="ot" className="text-violet-600" />,
    ],
  ];
  return (
    <section className="rounded-2xl border border-[#edeaf6] bg-white p-4 shadow-[0_3px_8px_rgba(62,32,120,.08)]">
      <h2 className="flex items-center gap-2 text-base font-bold">
        <LuTriangleAlert className="text-violet-600" size={18} />
        Flags &amp; Exceptions
      </h2>
      <div className="mt-3">
        {rows.map(([label, value, icon]) => (
          <div
            key={String(label)}
            className={`flex items-center justify-between gap-2 border-b border-[#f0edf7] py-3 last:border-0 ${label === "Lateness" && record?.lateMinutes ? "text-rose-700" : ""}`}
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              {icon}
              {label}
            </span>
            <span className="text-right text-sm">{value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
