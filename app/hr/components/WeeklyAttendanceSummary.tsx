import {
  LuChartNoAxesCombined,
  LuClock3,
  LuTimer,
  LuTriangleAlert,
} from "react-icons/lu";
import type { DailyAttendanceRecord } from "../attendance-management/detail-data";
import { formatMinutes } from "../attendance-management/detail-data";

export default function WeeklyAttendanceSummary({
  records,
}: {
  records: DailyAttendanceRecord[];
}) {
  const total = records.reduce(
    (sum, record) => sum + (record.creditedMinutes ?? 0),
    0,
  );
  const overtime = records.reduce(
    (sum, record) => sum + record.overtimeMinutes,
    0,
  );
  const lateness = records.filter((record) => record.lateMinutes > 0).length;
  const undertime = records.filter(
    (record) => record.undertimeMinutes > 0,
  ).length;
  const rows = [
    [
      "Total Work Hours",
      formatMinutes(total),
      <LuChartNoAxesCombined key="total" className="text-violet-600" />,
    ],
    [
      "Overtime",
      formatMinutes(overtime),
      <LuTimer key="ot" className="text-violet-600" />,
    ],
    [
      "Lateness",
      `${lateness} day${lateness === 1 ? "" : "s"}`,
      <LuTriangleAlert key="late" className="text-rose-600" />,
    ],
    [
      "Undertime",
      `${undertime} day${undertime === 1 ? "" : "s"}`,
      <LuClock3 key="under" className="text-amber-500" />,
    ],
  ];
  return (
    <section className="rounded-2xl border border-[#edeaf6] bg-white p-4 shadow-[0_3px_8px_rgba(62,32,120,.08)]">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <LuChartNoAxesCombined className="text-violet-600" size={19} />
        Weekly Summary
      </h2>
      <div className="mt-3">
        {rows.map(([label, value, icon]) => (
          <div
            key={String(label)}
            className="flex items-center justify-between border-b border-[#f0edf7] py-3 last:border-0"
          >
            <span className="flex items-center gap-2 text-sm text-[#73718a]">
              {icon}
              {label}
            </span>
            <strong className="text-sm">{value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
