"use client";
import { useState } from "react";
import Link from "next/link";
import { LuArrowLeft, LuChevronRight, LuEllipsis, LuMail, LuMapPin, LuPencil, LuPhone } from "react-icons/lu";
import type { EmployeeSummary } from "../../../lib/employees/schemas";

export function EmployeeDetailsHeader({ employee }: { employee: EmployeeSummary }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const editHref = `/hr/employees?edit=${encodeURIComponent(employee.id)}`;
  const name = `${employee.firstName} ${employee.lastName}`;
  return <header>
    <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-3 text-sm text-[#37314E]"><Link href="/hr/employees" aria-label="Back to Employee Management" className="rounded-full border border-[#EDEAF6] bg-white p-2 shadow-sm hover:bg-violet-50"><LuArrowLeft /></Link><Link href="/hr/employees" className="hover:text-[#7C3AED]">Employee Management</Link><LuChevronRight className="text-[#73718A]" /><span aria-current="page" className="font-semibold">Employee Details</span></nav>
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
        <div aria-label={`${name} initials`} className="grid h-28 w-28 shrink-0 place-items-center rounded-full border-4 border-white bg-gradient-to-br from-violet-100 to-purple-200 text-3xl font-bold text-[#6D28D9] shadow-sm">{employee.firstName[0]}{employee.lastName[0]}</div>
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-3"><h1 className="text-[26px] font-bold tracking-tight text-[#17152D]">{name}</h1><span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">{employee.employmentStatus.label}</span></div><div className="mt-1 flex flex-wrap items-center gap-3 text-sm font-medium text-[#5A5572]"><span>{employee.employeeNumber}</span><span aria-hidden="true" className="text-violet-300">|</span><span>{employee.department.name}</span></div><div className="mt-5 flex flex-wrap gap-x-8 gap-y-3 text-sm text-[#514B68]"><span className="flex items-center gap-2 break-all"><LuMail className="shrink-0" />{employee.workEmail}</span><span className="flex items-center gap-2 text-[#73718A]"><LuPhone /> Contact unavailable</span><span className="flex items-center gap-2 text-[#73718A]"><LuMapPin /> Work location unavailable</span></div></div>
      </div>
      <div className="flex shrink-0 items-center gap-3"><div className="relative"><button type="button" aria-label="More actions" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)} className="rounded-xl border border-[#DED7EF] bg-white p-3 text-[#393452] shadow-sm hover:bg-violet-50"><LuEllipsis size={20} /></button>{menuOpen && <div className="absolute right-0 z-20 mt-2 w-44 rounded-xl border border-[#EDEAF6] bg-white p-1 shadow-lg"><Link href={editHref} onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-violet-50"><LuPencil size={16} /> Edit employee</Link></div>}</div><Link href={editHref} className="flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#9B4DFA] to-[#6D28D9] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:from-[#8B3FEB] hover:to-[#5B21B6]"><LuPencil size={17} /> Edit Employee</Link></div>
    </div>
  </header>;
}
