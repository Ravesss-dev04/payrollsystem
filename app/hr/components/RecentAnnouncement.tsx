import { LuMegaphone, LuFileText, LuCalendarDays } from "react-icons/lu";
const items = [
  ["Company Townhall ? Feb 5", "Jan 27, 2025", "All Employees"],
  ["Updated Leave Policy", "Jan 24, 2025", "All Employees"],
  ["Office Wellness Week", "Jan 20, 2025", "All Offices"],
];
export default function RecentAnnouncement() {
  return (
    <section
      id="announcements"
      className="flex min-h-0 flex-col rounded-2xl border border-[#eeeaf8] bg-white p-4 shadow-[0_3px_8px_rgba(62,32,120,.08)]"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <LuMegaphone size={19} className="text-violet-600" />
          Recent Announcements
        </h2>
        <a
          href="#announcements"
          className="whitespace-nowrap text-[10px] font-bold text-violet-600 hover:underline"
        >
          View All
        </a>
      </div>
      <div className="mt-3 max-h-[160px] overflow-y-auto [scrollbar-color:#c4b5df_transparent] [scrollbar-width:thin]">
        {items.map(([title, date, audience], i) => (
          <a
            href="#announcements"
            key={title}
            className="flex items-center gap-2 border-t border-[#f0edf7] py-3 hover:bg-violet-50"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-600">
              <LuFileText />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-bold">{title}</span>
              <span className="mt-1 flex items-center gap-1 text-[10px] text-[#606687]">
                <LuCalendarDays /> {date} <span className="mx-1">|</span>{" "}
                {audience}
              </span>
            </span>
            {i === 0 && (
              <span className="rounded-md bg-violet-100 px-2 py-1 text-[10px] font-bold text-violet-700">
                New
              </span>
            )}
          </a>
        ))}
      </div>
    </section>
  );
}
