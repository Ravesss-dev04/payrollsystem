import { LuMonitor, LuUsers, LuWallet } from "react-icons/lu";
import type { RecentActivity } from "../../dashboard/types";
export default function RecentActivities({
  activities,
}: {
  activities: RecentActivity[];
}) {
  const icons = {
    payroll: LuWallet,
    employee: LuUsers,
    workstation: LuMonitor,
  };
  return (
    <section className="rounded-2xl border border-[#EDEAF6] bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold">Recent Activities</h2>
      <ul className="mt-3">
        {activities.map((activity) => {
          const Icon = icons[activity.kind];
          return (
            <li
              key={activity.text}
              className="flex items-center gap-3 border-t border-[#EDEAF6] py-3"
            >
              <span className="rounded-full bg-[#F3E8FF] p-2 text-[#7C3AED]">
                <Icon size={18} />
              </span>
              <p className="min-w-0 flex-1 text-sm">{activity.text}</p>
              <span className="shrink-0 text-xs text-[#73718A]">
                {activity.time}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
