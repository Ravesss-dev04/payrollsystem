"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LuHouse,
  LuUsersRound,
  LuMap,
  LuCalendarDays,
  LuDatabase,
  LuCalendarCheck,
  LuMegaphone,
  LuMenu,
  LuX,
  LuActivity,
} from "react-icons/lu";
const links = [
  ["Dashboard", "/hr/dashboard", LuHouse],
  ["Employee Management", "/hr/employees", LuUsersRound],
  ["Interactive Floor Plan", "/hr/floor-plan", LuMap],
  ["Attendance Management", "#attendance", LuCalendarDays],
  ["Payroll Management", "#payroll", LuDatabase],
  ["Leave Management", "#leave", LuCalendarCheck],
  ["Announcements", "#announcements", LuMegaphone],
] as const;
export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        className="fixed left-4 top-4 z-30 rounded-lg bg-[#19183d] p-2 text-white lg:hidden"
      >
        <LuMenu size={20} />
      </button>
      {open && (
        <button
          aria-label="Close navigation backdrop"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[205px] flex-col overflow-hidden bg-gradient-to-b from-[#191a40] to-[#11142f] text-white transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="relative z-10 flex items-center gap-3 px-4 py-5">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-purple-500 to-violet-700">
            <LuActivity size={25} />
          </div>
          <div>
            <div className="text-base font-bold">WorkPulse HR</div>
            <div className="text-xs text-violet-200">HR Portal</div>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
            className="ml-auto lg:hidden"
          >
            <LuX />
          </button>
        </div>
        <nav className="relative z-10 mt-5 flex-1 space-y-1 overflow-y-auto px-1 [scrollbar-color:#7662a9_transparent] [scrollbar-width:thin]">
          {links.map(([label, href, Icon]) => (
            <Link
              key={label}
              href={href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-4 rounded-lg px-4 py-3 text-xs font-medium transition ${pathname === href ? "bg-[#7131c5] shadow-md" : "text-white hover:bg-white/10"}`}
            >
              <Icon size={19} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-44 w-80 rotate-[-18deg] rounded-[50%] border border-purple-400/10 bg-gradient-to-t from-purple-600/25 to-purple-500/5" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 h-44 w-80 rotate-[15deg] rounded-[50%] border border-purple-400/10 bg-purple-600/10" />
      </aside>
    </>
  );
}


