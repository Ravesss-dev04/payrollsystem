import { LuCalendarDays, LuUsersRound, LuMoon } from "react-icons/lu";
const shifts = [
  ["Today", "Jan 28", "Day Shift (9:00 AM ? 6:00 PM)", "492 Employees"],
  ["Wed", "Jan 29", "Day Shift (9:00 AM ? 6:00 PM)", "510 Employees"],
  ["Thu", "Jan 30", "Night Shift (10:00 PM ? 7:00 AM)", "186 Employees"],
];
export default function UpcomingScheduleCard() {
  return (
    <section
      id="schedule"
      className="flex min-h-0 flex-col rounded-2xl border border-[#eeeaf8] bg-white p-4 shadow-[0_3px_8px_rgba(62,32,120,.08)]"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <LuCalendarDays size={19} className="text-violet-600" />
          Upcoming Shift Schedule
        </h2>
        <a
          href="#schedule"
          className="whitespace-nowrap text-[10px] font-bold text-violet-600 hover:underline"
        >
          View Schedule
        </a>
      </div>
      <div className="mt-3 max-h-[160px] overflow-y-auto [scrollbar-color:#c4b5df_transparent] [scrollbar-width:thin]">
        {shifts.map(([day, date, shift, count], i) => (
          <div
            key={day}
            className="flex items-center gap-3 border-t border-[#f0edf7] py-2"
          >
            <div className="w-12 shrink-0 rounded-lg bg-violet-100 py-1.5 text-center text-[10px] text-violet-800">
              <strong className="block">{day}</strong>
              {date}
            </div>
            <div className="min-w-0 text-[10px]">
              <div className="flex items-center gap-1 font-bold">
                {i === 2 ? <LuMoon /> : <LuUsersRound />}
                {shift}
              </div>
              <div className="mt-1 flex items-center gap-1 text-[#606687]">
                <LuUsersRound />
                {count}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
