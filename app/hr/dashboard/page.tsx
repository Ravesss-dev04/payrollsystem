"use client";
import { useEffect, useState } from "react";
import {
  LuCalendarDays,
  LuChevronDown,
  LuChevronLeft,
  LuChevronRight,
} from "react-icons/lu";
import TotalEmployees from "../components/TotalEmployees";
import AttendanceRate from "../components/AttendanceRate";
import PendingPayrollTask from "../components/PendingPayrollTask";
import LeaveRequest from "../components/LeaveRequest";
import AttendanceTrend from "../components/AttendanceTrend";
import WorkforceAnalytics from "../components/WorkforceAnalytics";
import PayrollStatus from "../components/PayrollStatus";
import RecentAnnouncement from "../components/RecentAnnouncement";
import UpcomingScheduleCard from "../components/UpcomingScheduleCard";

function DatePicker() {
  const [selected, setSelected] = useState(new Date(2025, 0, 28));
  const [month, setMonth] = useState(new Date(2025, 0, 1));
  const [open, setOpen] = useState(false);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const offset = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const formatted = selected.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex items-center gap-3 rounded-lg border border-[#ded7f1] bg-white px-3 py-2.5 text-xs font-semibold shadow-sm hover:border-violet-400"
      >
        <LuCalendarDays size={17} />
        {selected.getTime() === new Date(2025, 0, 28).getTime()
          ? "Today, "
          : ""}
        {formatted}
        <LuChevronDown />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-64 rounded-xl border border-violet-100 bg-white p-3 shadow-xl">
          <div className="flex items-center justify-between">
            <button
              aria-label="Previous month"
              onClick={() =>
                setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
              }
              className="rounded p-1 hover:bg-violet-100"
            >
              <LuChevronLeft />
            </button>
            <strong className="text-sm">
              {month.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </strong>
            <button
              aria-label="Next month"
              onClick={() =>
                setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
              }
              className="rounded p-1 hover:bg-violet-100"
            >
              <LuChevronRight />
            </button>
          </div>
          <div className="mt-3 grid grid-cols-7 text-center text-xs">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <span key={i} className="py-2 text-slate-400">
                {d}
              </span>
            ))}
            {Array.from({ length: offset }, (_, i) => (
              <span key={`blank${i}`} />
            ))}
            {Array.from({ length: days }, (_, i) => {
              const date = new Date(
                month.getFullYear(),
                month.getMonth(),
                i + 1,
              );
              return (
                <button
                  key={i}
                  onClick={() => {
                    setSelected(date);
                    setOpen(false);
                  }}
                  className={`rounded-lg py-2 hover:bg-violet-100 ${date.getTime() === selected.getTime() ? "bg-violet-600 font-bold text-white hover:bg-violet-700" : ""}`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
export default function Dashboard() {
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (data?.user) setUser(data.user); })
      .catch(() => {});
  }, []);

  return (
        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-7 [scrollbar-color:#c6b5df_transparent] [scrollbar-width:thin] lg:px-4">
          <div className="mx-auto max-w-[1500px]">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 px-1">
              <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">
                  Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}! <span aria-hidden="true">👋</span>
                </h1>
                <p className="mt-1 text-sm text-[#52597e]">
                  Here’s what’s happening in WorkPulse HR today.
                </p>
              </div>
              <DatePicker />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <TotalEmployees />
              <AttendanceRate />
              <PendingPayrollTask />
              <LeaveRequest />
            </div>
            <div className="mt-5 grid gap-3 xl:grid-cols-[1.14fr_1fr]">
              <AttendanceTrend />
              <WorkforceAnalytics />
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <PayrollStatus />
              <RecentAnnouncement />
              <UpcomingScheduleCard />
            </div>
          </div>
        </main>
  );
}
