import { LuHourglass } from "react-icons/lu";
import type { ReactNode } from "react";
export function LeaveMetric({ icon, label, value, detail, tone, onClick }: { icon: ReactNode; label: string; value: number; detail: string; tone: "rose" | "green" | "purple"; onClick: () => void }) {
  const colors = { rose: "bg-rose-100 text-rose-600", green: "bg-emerald-100 text-emerald-600", purple: "bg-violet-100 text-violet-700" };
  return <button type="button" onClick={onClick} className="flex min-h-[108px] w-full items-center gap-3 rounded-2xl border border-[#EDEAF6] bg-white px-4 text-left shadow-[0_3px_9px_rgba(84,42,154,.11)] transition hover:border-violet-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600">
    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-[23px] ${colors[tone]}`}>{icon}</span>
    <span className="min-w-0"><span className="block text-[12px] font-semibold text-[#29233e]">{label}</span><span className="block text-[26px] font-bold leading-tight text-[#17152D]">{value}</span><span className="block text-[11px] text-[#73718A]">{detail}</span></span>
  </button>;
}
export default function LeavePendingRequestCards({ value, onClick }: { value: number; onClick: () => void }) { return <LeaveMetric icon={<LuHourglass />} label="Pending Requests" value={value} detail="Awaiting review" tone="rose" onClick={onClick} />; }
