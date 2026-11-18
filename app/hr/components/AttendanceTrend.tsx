"use client";
import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LuInfo } from "react-icons/lu";
const sets: Record<string, { date: string; rate: number }[]> = {
  "Last 30 Days": [
    { date: "Dec 29", rate: 93.4 },
    { date: "Jan 2", rate: 94.7 },
    { date: "Jan 6", rate: 95.2 },
    { date: "Jan 10", rate: 94.8 },
    { date: "Jan 14", rate: 96.3 },
    { date: "Jan 18", rate: 95.9 },
    { date: "Jan 22", rate: 94.9 },
    { date: "Jan 26", rate: 96.4 },
  ],
  "Last 7 Days": [
    { date: "Jan 22", rate: 94.9 },
    { date: "Jan 23", rate: 95.4 },
    { date: "Jan 24", rate: 95.1 },
    { date: "Jan 25", rate: 96 },
    { date: "Jan 26", rate: 96.4 },
    { date: "Jan 27", rate: 95.8 },
    { date: "Jan 28", rate: 96.4 },
  ],
  "Last 3 Months": [
    { date: "Nov", rate: 93.2 },
    { date: "Nov 15", rate: 94.4 },
    { date: "Dec", rate: 94.1 },
    { date: "Dec 15", rate: 95.2 },
    { date: "Jan", rate: 95.6 },
    { date: "Jan 28", rate: 96.4 },
  ],
};
export default function AttendanceTrend() {
  const [period, setPeriod] = useState("Last 30 Days");
  return (
    <section className="rounded-2xl border border-[#eeeaf8] bg-white p-4 shadow-[0_3px_8px_rgba(62,32,120,.08)]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold">
            Attendance Trend <LuInfo className="text-[#343b65]" size={14} />
          </h2>
          <p className="mt-1 text-xs text-[#666b8a]">
            Daily attendance rate over the last 30 days
          </p>
        </div>
        <select
          aria-label="Attendance period"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="rounded-lg border border-[#ded7f1] bg-white px-2 py-2 text-[11px] font-semibold outline-violet-500"
        >
          {Object.keys(sets).map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </div>
      <div className="mt-4 h-[165px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={sets[period]}
            margin={{ top: 5, right: 8, bottom: 0, left: -24 }}
          >
            <defs>
              <linearGradient id="attendanceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#9b5cf6" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#9b5cf6" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#eeebf5" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: "#555b7d" }}
            />
            <YAxis
              domain={[90, 100]}
              ticks={[90, 92, 94, 96, 98, 100]}
              tickFormatter={(v) => `${v}%`}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: "#555b7d" }}
            />
            <Tooltip
              formatter={(v) => `${v}%`}
              contentStyle={{
                borderRadius: 10,
                borderColor: "#eeeaf8",
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="rate"
              name="Attendance"
              stroke="#7924ef"
              strokeWidth={2.5}
              fill="url(#attendanceFill)"
              activeDot={{ r: 5 }}
              dot={(props) => {
                const { cx, cy, index } = props;
                return index === sets[period].length - 1 ? (
                  <circle
                    key={index}
                    cx={cx}
                    cy={cy}
                    r={5}
                    fill="#7924ef"
                    stroke="white"
                    strokeWidth={2}
                  />
                ) : (
                  <circle key={index} r={0} />
                );
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
