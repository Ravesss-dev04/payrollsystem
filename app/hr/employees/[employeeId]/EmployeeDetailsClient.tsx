"use client";
import { useState } from "react";
import { LuCalendarCheck, LuCalendarDays, LuLaptop, LuUserRound } from "react-icons/lu";
import type { EmployeeSummary } from "../../../lib/employees/schemas";
import { EmployeeDetailsHeader } from "./EmployeeDetailsHeader";
import { ProfileTab } from "./ProfileTab";
import { ShiftScheduleTab } from "./ShiftScheduleTab";
import { AssetsDevicesTab } from "./AssetsDevicesTab";
import { AttendanceSummaryTab } from "./AttendanceSummaryTab";

const tabs = [
  { id: "profile", label: "Profile", icon: LuUserRound },
  { id: "schedule", label: "Shift & Schedule", icon: LuCalendarDays },
  { id: "assets", label: "Assets & Devices", icon: LuLaptop },
  { id: "attendance", label: "Attendance Summary", icon: LuCalendarCheck },
] as const;
type TabId = (typeof tabs)[number]["id"];

export function EmployeeDetailsClient({ employee }: { employee: EmployeeSummary }) {
  const [active, setActive] = useState<TabId>("profile");
  return <div className="space-y-6"><EmployeeDetailsHeader employee={employee} /><div role="tablist" aria-label="Employee details" className="flex overflow-x-auto rounded-xl border border-[#EDEAF6] bg-white shadow-[0_3px_12px_rgba(62,32,120,.07)] [scrollbar-color:#c6b5df_transparent] [scrollbar-width:thin]">{tabs.map(({ id, label, icon: Icon }) => <button key={id} id={`tab-${id}`} type="button" role="tab" aria-selected={active === id} aria-controls={`panel-${id}`} onClick={() => setActive(id)} className={`flex min-w-max flex-1 items-center justify-center gap-3 border-b-[3px] px-5 py-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#7C3AED] ${active === id ? "border-[#7C3AED] text-[#7C3AED]" : "border-transparent text-[#37314E] hover:bg-violet-50 hover:text-[#7C3AED]"}`}><Icon size={20} />{label}</button>)}</div><div role="tabpanel" id={`panel-${active}`} aria-labelledby={`tab-${active}`}>{active === "profile" && <ProfileTab employee={employee} />}{active === "schedule" && <ShiftScheduleTab />}{active === "assets" && <AssetsDevicesTab />}{active === "attendance" && <AttendanceSummaryTab />}</div></div>;
}
