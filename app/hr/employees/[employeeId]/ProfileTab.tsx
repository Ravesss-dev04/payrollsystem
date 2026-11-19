import { LuArrowLeftRight, LuBriefcaseBusiness, LuBuilding2, LuCalendarDays, LuCalendarPlus, LuIdCard, LuLaptop, LuMapPin, LuNetwork, LuUserRound, LuUsersRound } from "react-icons/lu";
import type { EmployeeSummary } from "../../../lib/employees/schemas";

const missing = "Not available";
function PersonalInformation({ employee }: { employee: EmployeeSummary }) {
  const rows = [
    { label: "Full Name", value: `${employee.firstName} ${employee.lastName}`, icon: LuUserRound },
    { label: "Employee ID", value: employee.employeeNumber, icon: LuIdCard },
    { label: "Department", value: employee.department.name, icon: LuBuilding2 },
    { label: "Role", value: missing, icon: LuBriefcaseBusiness },
    { label: "Reporting To", value: "Not assigned", icon: LuUsersRound },
    { label: "Employment Type", value: missing, icon: LuBriefcaseBusiness },
    { label: "Date of Hire", value: missing, icon: LuCalendarDays },
    { label: "Work Location", value: missing, icon: LuMapPin },
  ];
  return <section className="rounded-2xl border border-[#E7DFF5] bg-white p-5 shadow-[0_5px_14px_rgba(73,38,132,.08)] sm:p-6"><h2 className="mb-3 text-lg font-bold">Personal Information</h2><dl>{rows.map(({ label, value, icon: Icon }) => <div key={label} className="grid grid-cols-[22px_minmax(110px,38%)_1fr] items-center gap-3 border-b border-[#EDEAF6] py-3 last:border-b-0"><Icon size={18} className="text-[#81809A]" aria-hidden="true" /><dt className="text-[13px] font-medium text-[#59536D]">{label}</dt><dd className={`min-w-0 break-words text-sm font-semibold ${value === missing || value === "Not assigned" ? "text-[#89859A]" : "text-[#28213D]"}`}>{value}</dd></div>)}</dl></section>;
}

function EmployeeStats() {
  const metrics = [
    { label: "Attendance Rate", note: "Attendance source unavailable" },
    { label: "Schedule Adherence", note: "Schedule source unavailable" },
    { label: "Completed Shifts", note: "Shift source unavailable" },
    { label: "Leave Balance", note: "Leave ledger unavailable" },
  ];
  return <section className="rounded-2xl border border-[#E7DFF5] bg-white p-5 shadow-[0_5px_14px_rgba(73,38,132,.08)] sm:p-6"><h2 className="mb-4 text-lg font-bold">Employee Stats</h2><div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{metrics.map(metric => <div key={metric.label} className="min-h-28 rounded-xl border border-[#EDEAF6] bg-[#FCFBFF] p-3 shadow-sm"><h3 className="text-xs font-semibold text-[#504A62]">{metric.label}</h3><p className="mt-3 text-base font-bold text-[#8A849B]">Unavailable</p><p className="mt-1 text-[11px] leading-tight text-[#89859A]">{metric.note}</p></div>)}</div></section>;
}

function EmployeeQuickActions() {
  const actions = [
    { label: "Reassign Shift", icon: LuArrowLeftRight, reason: "Shift assignment workflow is not available" },
    { label: "Assign Asset", icon: LuLaptop, reason: "Asset assignment workflow is not available" },
    { label: "Move Desk", icon: LuNetwork, reason: "Desk assignment workflow is not available" },
    { label: "Record Leave", icon: LuCalendarPlus, reason: "Leave recording workflow is not available" },
  ];
  return <section className="rounded-2xl border border-[#E7DFF5] bg-white p-5 shadow-[0_5px_14px_rgba(73,38,132,.08)] sm:p-6"><h2 className="mb-4 text-lg font-bold">Quick Actions</h2><div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{actions.map(({ label, icon: Icon, reason }) => <button key={label} type="button" disabled title={reason} aria-label={`${label}: ${reason}`} className="flex min-h-24 flex-col items-center justify-center gap-3 rounded-xl border border-[#E9DDFB] bg-[#F3E8FF] p-3 text-center text-[#7C3AED] opacity-65"><Icon size={27} /><span className="text-xs font-semibold text-[#3A2D54]">{label}</span></button>)}</div><p className="mt-3 text-xs text-[#73718A]">Actions become available when their official workflows are implemented.</p></section>;
}

export function ProfileTab({ employee }: { employee: EmployeeSummary }) {
  return <div className="grid gap-6 lg:grid-cols-[minmax(0,45%)_minmax(0,55%)]"><PersonalInformation employee={employee} /><div className="min-w-0 space-y-4"><EmployeeStats /><EmployeeQuickActions /></div></div>;
}
