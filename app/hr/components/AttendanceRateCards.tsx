import type { ReactNode } from "react";

export type AttendanceKpiCardProps = {
  label: string;
  value: string;
  trend: string;
  icon: ReactNode;
  iconClassName: string;
  trendClassName?: string;
  onClick?: () => void;
};

export function AttendanceKpiCard({
  label,
  value,
  trend,
  icon,
  iconClassName,
  trendClassName = "text-emerald-600",
  onClick,
}: AttendanceKpiCardProps) {
  const content = (
    <>
      <div className="flex items-center gap-3">
        <span
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${iconClassName}`}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[12px] font-semibold text-[#17152d]">
            {label}
          </p>
          <p className="mt-0.5 text-[25px] font-bold tracking-tight text-[#111329]">
            {value}
          </p>
        </div>
      </div>
      <p className={`mt-2 text-[11px] font-semibold ${trendClassName}`}>
        {trend}
      </p>
    </>
  );
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl border border-[#edeaf6] bg-white p-3.5 text-left shadow-[0_3px_8px_rgba(62,32,120,.08)] transition hover:-translate-y-0.5 hover:shadow-md"
    >
      {content}
    </button>
  ) : (
    <div className="rounded-2xl border border-[#edeaf6] bg-white p-3.5 shadow-[0_3px_8px_rgba(62,32,120,.08)]">
      {content}
    </div>
  );
}

export default function AttendanceRateCards(props: AttendanceKpiCardProps) {
  return <AttendanceKpiCard {...props} />;
}
