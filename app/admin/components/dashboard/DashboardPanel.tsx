import type { ReactNode } from "react";

export default function DashboardPanel({
  title,
  icon,
  children,
  className = "",
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const headingId = `dashboard-panel-${title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;

  return (
    <section
      aria-labelledby={headingId}
      className={`min-w-0 rounded-2xl border border-[#EDEAF6] bg-white p-5 shadow-sm ${className}`}
    >
      <header className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#F0EAFE] text-[#6D28D9]"
        >
          {icon}
        </span>
        <h2 id={headingId} className="text-base font-bold text-[#17152D]">
          {title}
        </h2>
      </header>
      {children}
    </section>
  );
}
