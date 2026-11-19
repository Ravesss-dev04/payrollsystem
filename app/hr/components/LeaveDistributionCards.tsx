"use client";
import {
  LuBaby,
  LuCircleHelp,
  LuHeartPulse,
  LuUser,
  LuUserRound,
} from "react-icons/lu";
import type { LeaveRequest } from "../leave-management/leave-data";
import { employeeFor, localDate } from "../leave-management/leave-data";
import { useState } from "react";
const types = [
  "Annual Leave",
  "Sick Leave",
  "Personal Leave",
  "Maternity Leave",
  "Other",
] as const;
const icons = [LuUserRound, LuHeartPulse, LuUser, LuBaby, LuCircleHelp];
export default function LeaveDistributionCards({
  requests,
  month,
}: {
  requests: LeaveRequest[];
  month: Date;
}) {
  const [group, setGroup] = useState<"type" | "department" | "status">("type");
  const inMonth = requests.filter((r) => {
    const start = localDate(r.start),
      end = localDate(r.end);
    return (
      start <= new Date(month.getFullYear(), month.getMonth() + 1, 0) &&
      end >= new Date(month.getFullYear(), month.getMonth(), 1)
    );
  });
  const labels =
    group === "type"
      ? [...types]
      : group === "department"
        ? [
            ...new Set(
              inMonth.map((r) => employeeFor(r)?.department ?? "Unknown"),
            ),
          ]
        : ["Pending", "Approved", "Rejected"];
  const rows = labels.map((label, index) => ({
    label,
    icon: group === "type" ? icons[index] : LuUserRound,
    value: inMonth.filter((r) =>
      group === "type"
        ? r.type === label
        : group === "department"
          ? employeeFor(r)?.department === label
          : r.status === label,
    ).length,
  }));
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <section className="min-w-0 rounded-2xl border border-[#EDEAF6] bg-white px-5 py-4 shadow-[0_3px_9px_rgba(84,42,154,.10)]">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[17px] font-bold">
          Leave Distribution (This Month)
        </h2>
        <select
          aria-label="Group leave distribution"
          value={group}
          onChange={(e) => setGroup(e.target.value as typeof group)}
          className="h-9 rounded-lg border border-[#ded8ef] bg-white px-3 text-xs font-semibold outline-violet-500"
        >
          <option value="type">By Leave Type</option>
          <option value="department">By Department</option>
          <option value="status">By Status</option>
        </select>
      </div>
      <div className="space-y-2.5">
        {rows.map((row, index) => (
          <div key={row.label} className="flex items-center gap-3 text-xs">
            <span className="flex w-[138px] shrink-0 items-center gap-2 truncate text-[#312b47]">
              <row.icon className="shrink-0 text-violet-700" size={15} />
              {row.label}
            </span>
            <div
              tabIndex={0}
              title={`${row.label}: ${row.value} requests in ${month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`}
              aria-label={`${row.label}, ${row.value} requests`}
              className="relative h-5 min-w-0 flex-1 rounded-sm bg-[#f7f4ff] focus-visible:outline-2 focus-visible:outline-violet-600"
            >
              <div
                className="h-full rounded-r-md bg-gradient-to-r from-[#7C3AED] to-[#8b4cf1]"
                style={{
                  width: `${row.value ? Math.max(5, (row.value / max) * 100) : 0}%`,
                  opacity: 1 - index * 0.1,
                }}
              />
            </div>
            <span className="w-5 text-right font-semibold">{row.value}</span>
          </div>
        ))}
      </div>
      <div className="ml-[150px] mt-3 flex justify-between border-t border-[#e9e4f5] pt-1 text-[10px] text-[#73718A]">
        <span>0</span>
        <span>{Math.ceil(max / 2)}</span>
        <span>{max}</span>
      </div>
      <p className="mt-2 text-[10px] text-[#73718A]">
        Number of requests overlapping the selected month · Historical demo
        fixture
      </p>
    </section>
  );
}
