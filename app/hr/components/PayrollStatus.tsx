"use client";
import { useState } from "react";
import { LuDatabase, LuInfo, LuArrowRight } from "react-icons/lu";
export default function PayrollStatus() {
  const [period, setPeriod] = useState("Jan 2025 Payroll");
  const progress = period.startsWith("Jan") ? 88 : 100;
  return (
    <section className="rounded-2xl border border-[#eeeaf8] bg-white p-4 shadow-[0_3px_8px_rgba(62,32,120,.08)]">
      <div className="flex items-center justify-between gap-1">
        <h2 className="flex items-center gap-2 whitespace-nowrap text-sm font-bold">
          <LuDatabase className="text-violet-600" size={19} />
          Payroll Status <LuInfo size={13} />
        </h2>
        <select
          aria-label="Payroll period"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="min-w-0 rounded-md border border-[#ded7f1] bg-white p-1 text-[10px] outline-violet-500"
        >
          <option>Jan 2025 Payroll</option>
          <option>Dec 2024 Payroll</option>
        </select>
      </div>
      <div className="my-5 flex items-center justify-between gap-3">
        <div
          className="relative grid h-24 w-24 shrink-0 place-items-center rounded-full"
          style={{
            background: `conic-gradient(#7924df ${progress}%, #e9ddfa 0)`,
          }}
        >
          <div className="grid h-[72px] w-[72px] place-content-center rounded-full bg-white text-center">
            <strong className="text-xl leading-none">{progress}%</strong>
            <span className="mt-1 text-[10px]">Completed</span>
          </div>
        </div>
        <div className="flex-1 space-y-2 text-[10px]">
          {[
            ["Processed", progress === 88 ? "1,098" : "1,248"],
            ["In Progress", progress === 88 ? "138" : "0"],
            ["Pending", progress === 88 ? "12" : "0"],
            ["Total Employees", "1,248"],
          ].map(([label, value], i) => (
            <div
              key={label}
              className={`flex justify-between gap-2 ${i === 3 ? "border-t border-[#eeeaf8] pt-2" : ""}`}
            >
              <span>
                {i < 3 && (
                  <span
                    className={`mr-1 inline-block h-2 w-2 rounded-full ${i === 0 ? "bg-emerald-500" : i === 1 ? "bg-violet-300" : "bg-violet-200"}`}
                  />
                )}
                {label}
              </span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </div>
      <a
        href="#payroll"
        className="flex items-center justify-center gap-2 rounded-lg bg-[#7b29df] py-2 text-xs font-semibold text-white transition hover:bg-violet-800"
      >
        View Payroll Tasks <LuArrowRight />
      </a>
    </section>
  );
}
