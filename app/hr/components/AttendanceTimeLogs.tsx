import { LuArrowRight, LuClock3, LuTimer } from "react-icons/lu";
import type { DailyAttendanceRecord } from "../attendance-management/detail-data";
import {
  formatDate,
  formatMinutes,
} from "../attendance-management/detail-data";

export default function AttendanceTimeLogs({
  record,
}: {
  record?: DailyAttendanceRecord;
}) {
  const rows = record?.timeIn
    ? [
        [
          "Time In",
          record.timeIn,
          record.source ?? "Web (Office)",
          record.remark ?? "—",
          <LuArrowRight key="in" className="text-emerald-600" />,
        ],
        [
          "Time Out",
          record.timeOut ?? "—",
          record.source ?? "Web (Office)",
          "—",
          <LuArrowRight key="out" className="rotate-180 text-rose-600" />,
        ],
        [
          "Total Work Hours",
          formatMinutes(record.creditedMinutes ?? 0),
          "—",
          "Credited duration",
          <LuClock3 key="hours" className="text-[#73718a]" />,
        ],
        [
          "Overtime",
          record.overtimeMinutes ? formatMinutes(record.overtimeMinutes) : "—",
          "—",
          record.overtimeStatus ? `${record.overtimeStatus}` : "—",
          <LuTimer key="ot" className="text-violet-600" />,
        ],
      ]
    : [];
  return (
    <section className="min-w-0 rounded-2xl border border-[#edeaf6] bg-white p-4 shadow-[0_3px_8px_rgba(62,32,120,.08)]">
      <h2 className="text-base font-bold">
        Time Logs —{" "}
        {record
          ? formatDate(record.date, {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "Selected Date"}
      </h2>
      {rows.length ? (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-xs">
            <thead className="text-[11px] text-[#73718a]">
              <tr>
                <th className="py-2">Log Type</th>
                <th>Time</th>
                <th>Source</th>
                <th>Remark</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([type, time, source, remark, icon]) => (
                <tr key={String(type)} className="border-t border-[#f0edf7]">
                  <td className="py-2 font-semibold">
                    <span className="mr-2 inline-block align-middle">
                      {icon}
                    </span>
                    {type}
                  </td>
                  <td>{time}</td>
                  <td>{source}</td>
                  <td>
                    {remark === "Late by 28m" ? (
                      <span className="rounded-md bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-600">
                        {remark}
                      </span>
                    ) : (
                      remark
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-5 rounded-xl bg-[#faf9ff] p-4 text-sm text-[#73718a]">
          No time logs recorded for this rest day or absence.
        </p>
      )}
    </section>
  );
}
