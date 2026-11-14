"use client";
import { useEffect, useRef, useState } from "react";
import { LuBell } from "react-icons/lu";
type Notice = {
  title: string;
  description: string;
  time: string;
  unread: boolean;
};
const initial: Notice[] = [
  {
    title: "Payroll Approval Required",
    description: "Payroll for Nov 1?15 is awaiting review.",
    time: "10 minutes ago",
    unread: true,
  },
  {
    title: "Leave Request Submitted",
    description: "Mark Rivera submitted a leave request.",
    time: "30 minutes ago",
    unread: true,
  },
  {
    title: "New Employee Added",
    description: "Jane Dela Cruz was added to the employee directory.",
    time: "2 hours ago",
    unread: false,
  },
  {
    title: "Workstation Reassigned",
    description: "Workstation 2C has been reassigned.",
    time: "5 hours ago",
    unread: false,
  },
];
export default function AdminNotifications() {
  const [notices, setNotices] = useState(initial);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"All" | "Unread">("All");
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    function outside(e: MouseEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    }
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    }
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  const count = notices.filter((n) => n.unread).length;
  return (
    <div ref={root}>
      <button
        ref={trigger}
        type="button"
        aria-label={`Notifications${count ? `, ${count} unread` : ""}`}
        aria-expanded={open}
        aria-controls="admin-notifications"
        onClick={() => setOpen(!open)}
        className="relative rounded-lg p-2 text-[#504b64] hover:bg-purple-50 focus-visible:outline-2 focus-visible:outline-[#7C3AED]"
      >
        <LuBell size={21} />
        {count > 0 && (
          <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {count}
          </span>
        )}
      </button>
      {open && (
        <section
          id="admin-notifications"
          aria-label="Notifications"
          className="absolute right-2 top-[calc(100%-4px)] z-30 w-[min(380px,calc(100vw-1rem))] rounded-xl border border-[#EDEAF6] bg-white text-[#17152D] shadow-xl sm:right-4"
        >
          <div className="flex items-center justify-between gap-3 px-4 pt-4">
            <h2 className="font-bold">Notifications</h2>
            <button
              type="button"
              onClick={() =>
                setNotices(notices.map((n) => ({ ...n, unread: false })))
              }
              disabled={!count}
              className="text-xs font-semibold text-[#6D28D9] disabled:text-gray-400 focus-visible:outline-2 focus-visible:outline-[#7C3AED]"
            >
              Mark all as read
            </button>
          </div>
          <p className="px-4 pt-1 text-xs text-[#73718A]">Demo notifications</p>
          <div className="flex gap-4 border-b border-[#EDEAF6] px-4 pt-3">
            {(["All", "Unread"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                aria-pressed={filter === tab}
                className={`border-b-2 pb-2 text-sm focus-visible:outline-2 focus-visible:outline-[#7C3AED] ${filter === tab ? "border-[#7C3AED] font-semibold text-[#6D28D9]" : "border-transparent text-[#73718A]"}`}
              >
                {tab}
              </button>
            ))}
          </div>
          <ul className="max-h-[min(55vh,400px)] overflow-y-auto">
            {notices
              .filter((n) => filter === "All" || n.unread)
              .map((n) => (
                <li
                  key={n.title}
                  className={`border-b border-[#EDEAF6] px-4 py-3 last:border-0 ${n.unread ? "bg-[#FAF7FF]" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold">{n.title}</p>
                    {n.unread && (
                      <button
                        type="button"
                        onClick={() =>
                          setNotices(
                            notices.map((item) =>
                              item.title === n.title
                                ? { ...item, unread: false }
                                : item,
                            ),
                          )
                        }
                        className="shrink-0 text-xs font-semibold text-[#6D28D9] focus-visible:outline-2 focus-visible:outline-[#7C3AED]"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-[#625e73]">{n.description}</p>
                  <p className="mt-1 text-xs text-[#73718A]">{n.time}</p>
                </li>
              ))}
            {filter === "Unread" && count === 0 && (
              <li className="p-5 text-sm text-[#73718A]">
                No unread notifications.
              </li>
            )}
          </ul>
        </section>
      )}
    </div>
  );
}
