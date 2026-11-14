"use client";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { AttendanceSummaryItem } from "../../dashboard/types";
export default function AttendanceSummaryChart({
  data,
}: {
  data: AttendanceSummaryItem[];
}) {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  return (
    <section
      aria-labelledby="attendance-chart"
      className="min-w-0 rounded-2xl border border-[#EDEAF6] bg-white p-5 shadow-sm"
    >
      <h2 id="attendance-chart" className="text-base font-bold">
        Attendance Summary (Today)
      </h2>
      <p className="sr-only">
        November 12 snapshot:{" "}
        {data.map((item) => `${item.status}: ${item.count}`).join(", ")}.
      </p>
      <div className="mt-3 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-7">
        <div className="relative h-56 w-56 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="status"
                innerRadius="64%"
                outerRadius="92%"
                startAngle={90}
                endAngle={-270}
                isAnimationActive={false}
              >
                {data.map((item) => (
                  <Cell key={item.status} fill={item.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value} employees`, "Count"]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold">{total}</span>
            <span className="text-xs text-[#73718A]">Employees</span>
          </div>
        </div>
        <ul className="w-full max-w-56 space-y-3">
          {data.map((item) => (
            <li key={item.status} className="flex items-center gap-2 text-sm">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="flex-1">{item.status}</span>
              <strong>{item.count}</strong>
              <span className="w-14 text-right text-xs text-[#73718A]">
                ({(Math.round((item.count / total) * 1000) / 10).toFixed(1)}%)
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
