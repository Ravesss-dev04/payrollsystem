"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import AttendanceDetailClient from "./AttendanceDetailClient";
import { getAttendanceEmployee } from "../detail-data";

export default function AttendanceDetailPage() {
  const params = useParams<{ employeeId: string }>();
  const searchParams = useSearchParams();
  const employeeId = params.employeeId;
  const employee = employeeId ? getAttendanceEmployee(employeeId) : undefined;

  if (!employee) {
    return (
      <main className="grid min-h-0 flex-1 place-items-center bg-[#f7f6ff] p-6">
        <section className="w-full max-w-md rounded-2xl border border-[#edeaf6] bg-white p-6 text-center shadow-[0_3px_8px_rgba(62,32,120,.08)]">
          <h1 className="text-lg font-bold text-[#17152d]">Attendance record not found</h1>
          <p className="mt-2 text-sm text-[#73718a]">The selected employee does not have an available demo attendance record.</p>
          <Link href="/hr/attendance-management" className="mt-5 inline-flex rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700">Back to Attendance Management</Link>
        </section>
      </main>
    );
  }

  return <AttendanceDetailClient employeeId={employee.employeeId} initialDate={searchParams.get("date") ?? undefined} />;
}
