"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LuLayoutDashboard,
  LuBuilding2,
  LuUsers,
  LuClipboardCheck,
  LuWallet,
  LuCalendarClock,
  LuMonitor,
  LuChartNoAxesCombined,
  LuShieldCheck,
  LuHistory,
  LuCreditCard,
  LuSettings,
} from "react-icons/lu";

const items = [
  {
    label: "Dashboard",
    href: "/admin/dashboard",
    icon: LuLayoutDashboard,
    available: true,
  },
  { label: "Company", href: "/admin/company", icon: LuBuilding2, available: true },
  { label: "Users & Roles", href: "/admin/users-roles", icon: LuUsers, available: true },
  {
    label: "Payroll Approvals",
    href: "/admin/payapprove",
    icon: LuClipboardCheck,
    available: true,
  },
  { label: "Compensation", href: "/admin/compensation", icon: LuWallet },
  {
    label: "Attendance Policies",
    href: "/admin/attendance-policies",
    icon: LuCalendarClock,
  },
  { label: "Floor & Assets", href: "/admin/florsets", icon: LuMonitor },
  { label: "Analytics", href: "/admin/analytics", icon: LuChartNoAxesCombined },
  { label: "Compliance", href: "/admin/compliance", icon: LuShieldCheck },
  { label: "Audit Logs", href: "/admin/audit-logs", icon: LuHistory },
  { label: "Billing & Subscription", icon: LuCreditCard },
  { label: "Settings", href: "/admin/settings", icon: LuSettings },
];
export default function AdminSidebar({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <aside className="flex h-full w-64 flex-col bg-[#211D3B] text-white">
      <div className="shrink-0 px-5 pt-6 pb-5">
        <div className="flex items-center gap-3 text-lg font-bold">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#7C3AED] text-sm">
            W
          </span>
          WorkPulse HR
        </div>
        <p className="mt-5 text-xs font-semibold text-[#c3bdd8]">
          Admin Portal
        </p>
      </div>
      <nav
        aria-label="Admin navigation"
        className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 [scrollbar-width:thin] [scrollbar-color:#7C3AED_#211D3B]"
      >
        <p className="px-3 pb-2 text-[10px] font-semibold tracking-wider text-[#a8a1bd]">
          MAIN NAVIGATION
        </p>
        <ul className="space-y-1">
          {items.map(({ label, href, icon: Icon, available }) => {
            const active =
              !!href && (pathname === href || pathname.startsWith(href + "/"));
            const classes = `flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm ${active ? "bg-[#7C3AED] text-white" : "text-[#aaa4bb]"}`;
            return (
              <li key={label}>
                {available && href ? (
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`${classes} hover:bg-[#7041ce] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white`}
                  >
                    <Icon size={19} aria-hidden="true" />
                    <span>{label}</span>
                  </Link>
                ) : (
                  <span
                    className={classes}
                    aria-label={`${label}, unavailable`}
                  >
                    <Icon size={19} aria-hidden="true" />
                    <span className="flex-1">{label}</span>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="m-3 flex shrink-0 items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ddd6fe] text-xs font-bold text-[#5b21b6]">
          AU
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">Admin User</p>
          <p className="text-xs text-[#b9b3c9]">Company Administrator</p>
        </div>
      </div>
    </aside>
  );
}

