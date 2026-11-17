"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LuBell,
  LuCalendarDays,
  LuChevronDown,
  LuChevronLeft,
  LuChevronRight,
  LuCircleHelp,
  LuSearch,
  LuUserRound,
} from "react-icons/lu";
import Sidebar from "../components/Sidebar";
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
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (data?.user) setUser(data.user); })
      .catch(() => {});
  }, []);

  async function signOut() {
    setSigningOut(true);
    setSignOutError("");
    try {
      const tokens = document.cookie.split(";").map((part) => part.trim()).filter((part) => part.startsWith("__Host-payroll-csrf=") || part.startsWith("payroll-csrf=")).map((part) => part.slice(part.indexOf("=") + 1));
      if (tokens.length !== 1 || !/^[A-Za-z0-9_-]{43}$/.test(tokens[0])) throw new Error();
      const response = await fetch("/api/auth/logout", { method: "POST", headers: { "x-csrf-token": tokens[0] }, cache: "no-store" });
      if (!response.ok && response.status !== 401) throw new Error();
      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel("payroll-session");
        channel.postMessage({ type: "session-invalidated" });
        channel.close();
      }
      router.replace("/login");
      router.refresh();
    } catch {
      setSignOutError("Sign out could not be completed. Please try again.");
      setSigningOut(false);
    }
  }

  return (
    <div className="h-dvh overflow-hidden bg-[#f5f2fc] text-[#111329]">
      <Sidebar />
      <div className="flex h-full min-w-0 flex-col lg:ml-[205px]">
        <header className="z-20 mx-3 mt-1 flex h-15 shrink-0 items-center gap-4 rounded-2xl bg-white/85 px-4 shadow-[0_3px_18px_rgba(72,42,130,.07)] sm:gap-6 lg:mx-4">
          <div className="relative ml-10 min-w-0 flex-1 lg:ml-0">
            <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#343b65]" />
            <input
              aria-label="Search"
              placeholder="Search employees, departments, reports..."
              className="w-full max-w-md rounded-full border border-[#e2dcf3] bg-[#f5f2fb] py-2 pl-9 pr-3 text-xs outline-violet-400"
            />
          </div>
          <button
            aria-label="Notifications"
            className="relative text-[#20264d] hover:text-violet-600"
          >
            <LuBell size={20} />
            <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-violet-600" />
          </button>
          <button
            aria-label="Help"
            className="hidden text-[#20264d] hover:text-violet-600 sm:block"
          >
            <LuCircleHelp size={20} />
          </button>
          <div className="relative">
            <button type="button" onClick={() => setProfileOpen(!profileOpen)} aria-expanded={profileOpen} aria-label="Profile menu" className="flex items-center gap-2 rounded-lg p-1 text-left hover:bg-violet-50">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#f7ddd6] text-[#8d4c48]"><LuUserRound size={20} /></span>
              <span className="hidden whitespace-nowrap sm:block"><span className="block text-xs font-bold">{user?.name ?? "HR account"}</span><span className="mt-0.5 block text-[11px] text-[#62688b]">Human Resources</span></span>
              <LuChevronDown className="hidden sm:block" />
            </button>
            {profileOpen && <div className="absolute right-0 top-full z-30 mt-2 w-56 rounded-xl border border-violet-100 bg-white p-3 shadow-xl">
              <p className="px-2 text-sm font-semibold">{user?.name}</p><p className="truncate px-2 text-xs text-[#62688b]">{user?.email}</p>
              <Link href="/hr/settings" className="mt-2 block rounded-lg px-2 py-2 text-sm hover:bg-violet-50">Settings</Link>
              <button type="button" disabled={signingOut} onClick={() => void signOut()} className="w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-violet-50 disabled:opacity-60">{signingOut ? "Signing out..." : "Sign out"}</button>
              {signOutError && <p role="alert" className="px-2 text-xs text-red-700">{signOutError}</p>}
            </div>}
          </div>
        </header>
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
      </div>
    </div>
  );
}
