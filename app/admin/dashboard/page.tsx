import { LuCalendarDays } from "react-icons/lu";
import ProjectedPayrollCard from "../components/dashboard/ProjectedPayrollCard";
import TotalEmployeesCard from "../components/dashboard/TotalEmployeesCard";
import DepartmentsCard from "../components/dashboard/DepartmentsCard";
import PendingApprovalsCard from "../components/dashboard/PendingApprovalsCard";
import PayrollExpenseChart from "../components/dashboard/PayrollExpenseChart";
import AttendanceSummaryChart from "../components/dashboard/AttendanceSummaryChart";
import RecentActivities from "../components/dashboard/RecentActivities";
import PendingApprovalsList from "../components/dashboard/PendingApprovalsList";
import { dashboardData as data } from "./data";

export default function DashboardPage() {
  const total = data.attendance.reduce((sum, item) => sum + item.count, 0);
  return (
    <div className="min-w-0 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">
              Good morning, Admin!
            </h1>
            <p className="mt-1 text-sm text-[#73718A]">
              Here&apos;s the company overview and key operations today.
            </p>
          </div>
          <label className="flex items-center gap-2 rounded-lg border border-[#EDEAF6] bg-white px-3 py-2 text-sm shadow-sm">
            <LuCalendarDays aria-hidden="true" className="text-[#73718A]" />
            <span className="sr-only">Dashboard snapshot date</span>
            <select
              defaultValue={data.date}
              className="bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
            >
              <option value={data.date}>{data.date}</option>
            </select>
          </label>
        </header>
        <p className="mb-4 text-xs text-[#73718A]">
        November 12 snapshot
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ProjectedPayrollCard amount={data.projectedPayroll} />
          <TotalEmployeesCard count={total} />
          <DepartmentsCard departments={data.departments} />
          <PendingApprovalsCard count={data.approvals.length} />
        </div>
        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
          <PayrollExpenseChart data={data.payrollTrend} />
          <AttendanceSummaryChart data={data.attendance} />
        </div>
        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
          <RecentActivities activities={data.activities} />
          <PendingApprovalsList approvals={data.approvals} />
        </div>
      </div>
    </div>
  );
}
