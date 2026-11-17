"use client";
import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { LuInfo } from "react-icons/lu";
const colors = [
  "#7725dd",
  "#3689ef",
  "#20bba9",
  "#ffb038",
  "#f45b89",
  "#d1b5fb",
];
const groups: Record<string, { name: string; value: number }[]> = {
  "By Department": [
    { name: "Engineering", value: 411 },
    { name: "Operations", value: 255 },
    { name: "Sales", value: 203 },
    { name: "Marketing", value: 156 },
    { name: "HR & Admin", value: 109 },
    { name: "Other", value: 114 },
  ],
  "By Role": [
    { name: "Individual contributor", value: 730 },
    { name: "Manager", value: 260 },
    { name: "Leadership", value: 108 },
    { name: "Other", value: 150 },
  ],
  "By Employment Type": [
    { name: "Full-time", value: 980 },
    { name: "Part-time", value: 150 },
    { name: "Contract", value: 118 },
  ],
};
export default function WorkforceAnalytics() {
  const [group, setGroup] = useState("By Department");
  const data = groups[group];
  return (
    <section className="rounded-2xl border border-[#eeeaf8] bg-white p-4 shadow-[0_3px_8px_rgba(62,32,120,.08)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-bold">
          Workforce Analytics <LuInfo size={14} className="text-[#343b65]" />
        </h2>
        <select
          aria-label="Workforce grouping"
          value={group}
          onChange={(e) => setGroup(e.target.value)}
          className="rounded-lg border border-[#ded7f1] bg-white px-2 py-2 text-[11px] font-semibold outline-violet-500"
        >
          {Object.keys(groups).map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
        <div className="relative h-[155px] w-[155px] shrink-0">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                innerRadius={48}
                outerRadius={72}
                stroke="#fff"
                strokeWidth={2}
                startAngle={90}
                endAngle={-270}
              >
                {data.map((x, i) => (
                  <Cell key={x.name} fill={colors[i]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
            <strong className="text-xl">1,248</strong>
            <span className="text-xs text-[#555b7d]">Employees</span>
          </div>
        </div>
        <div className="min-w-[155px] flex-1 space-y-2">
          {data.map((x, i) => (
            <div key={x.name} className="flex items-center gap-2 text-[11px]">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: colors[i] }}
              />
              <span className="flex-1">{x.name}</span>
              <strong>{((x.value / 1248) * 100).toFixed(1)}%</strong>
              <span className="text-[#535878]">({x.value})</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
