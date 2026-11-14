"use client";
import { useState } from "react";
import { LuChevronLeft, LuChevronRight, LuPlus } from "react-icons/lu";
import { holidayTypes } from "../company/data";
import {
  CompanyBranch,
  CompanyHoliday,
  CompanyStatus,
  HolidayType,
} from "../company/types";
const input =
  "mt-1 w-full rounded-lg border border-[#E4E1EF] bg-white px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-purple-600";
const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export default function CompanyHolidayCalendar({
  holidays,
  onChange,
  branches,
}: {
  holidays: CompanyHoliday[];
  onChange: (v: CompanyHoliday[]) => void;
  branches: CompanyBranch[];
}) {
  const [month, setMonth] = useState(() => new Date(2026, 10, 1));
  const [selected, setSelected] = useState("2026-11-15");
  const [editing, setEditing] = useState<CompanyHoliday | null>(null);
  const [detail, setDetail] = useState<CompanyHoliday | null>(null);
  const [remove, setRemove] = useState<CompanyHoliday | null>(null);
  const [error, setError] = useState("");
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const offset = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const dayEvents = holidays.filter((h) => h.date === selected);
  function add() {
    setError("");
    setEditing({
      id: crypto.randomUUID(),
      name: "",
      date: selected,
      type: "Company Holiday",
      appliesTo: "All Branches",
      description: "",
      status: "Active",
    });
  }
  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    if (!editing.name.trim() || !editing.date) {
      setError("Enter a holiday name and date.");
      return;
    }
    onChange(
      holidays.some((h) => h.id === editing.id)
        ? holidays.map((h) => (h.id === editing.id ? editing : h))
        : [...holidays, editing],
    );
    setSelected(editing.date);
    const [y, m] = editing.date.split("-").map(Number);
    setMonth(new Date(y, m - 1, 1));
    setEditing(null);
  }
  return (
    <section>
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Holiday Calendar</h2>
          <p className="mt-1 text-sm text-[#73718A]">
            Manage holidays and important company dates.
          </p>
        </div>
        <button
          onClick={add}
          className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white"
        >
          <LuPlus /> Add Holiday
        </button>
      </div>
      <p className="mt-4 text-xs text-[#73718A]">
        Demo records are illustrative, not an authoritative holiday schedule.
        This calendar does not affect payroll or attendance.
      </p>
      <div className="mt-5 rounded-xl border border-[#EDEAF6] bg-white p-3 shadow-sm sm:p-5">
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <button
            aria-label="Previous month"
            onClick={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
            }
            className="rounded-lg border p-2"
          >
            <LuChevronLeft />
          </button>
          <h3 className="min-w-36 text-center font-bold">
            {month.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </h3>
          <button
            aria-label="Next month"
            onClick={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
            }
            className="rounded-lg border p-2"
          >
            <LuChevronRight />
          </button>
          <button
            onClick={() => {
              const d = new Date();
              setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
              setSelected(dateKey(d));
            }}
            className="ml-auto rounded-lg border px-3 py-2 text-sm"
          >
            Today
          </button>
        </div>
        <div className="grid grid-cols-7 text-center text-xs font-semibold text-[#73718A]">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
          {Array.from({ length: offset }, (_, i) => (
            <div key={`blank${i}`} className="border-t border-[#EDEAF6]" />
          ))}
          {Array.from({ length: days }, (_, i) => {
            const day = i + 1;
            const key = dateKey(
              new Date(month.getFullYear(), month.getMonth(), day),
            );
            const events = holidays.filter((h) => h.date === key);
            return (
              <button
                key={key}
                onClick={() => setSelected(key)}
                aria-label={`${key}, ${events.length} events`}
                aria-pressed={selected === key}
                className={`min-h-12 border-t border-[#EDEAF6] p-1 text-sm hover:bg-purple-50 sm:min-h-20 ${selected === key ? "bg-purple-100 text-purple-800" : ""}`}
              >
                <span>{day}</span>
                {events.length > 0 && (
                  <span className="mx-auto mt-1 block h-2 w-2 rounded-full bg-purple-600" />
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-5 border-t border-[#EDEAF6] pt-4">
          <h4 className="font-semibold">Events for {selected}</h4>
          {dayEvents.length ? (
            <div className="mt-2 space-y-2">
              {dayEvents.map((h) => (
                <button
                  key={h.id}
                  onClick={() => setDetail(h)}
                  className="block w-full rounded-lg bg-purple-50 p-3 text-left text-sm hover:bg-purple-100"
                >
                  <strong>{h.name}</strong>
                  <span className="ml-2 text-[#73718A]">
                    {h.type} · {h.status}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-[#73718A]">
              No holidays on this day.
            </p>
          )}
        </div>
      </div>
      {(editing || detail || remove) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="holiday-dialog"
            className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6"
          >
            <h3 id="holiday-dialog" className="text-lg font-bold">
              {editing
                ? "Holiday details"
                : remove
                  ? "Remove holiday"
                  : "Holiday details"}
            </h3>
            {editing && (
              <form onSubmit={save} className="mt-4 space-y-3">
                <label className="block text-sm">
                  Holiday Name
                  <input
                    className={input}
                    value={editing.name}
                    onChange={(e) =>
                      setEditing({ ...editing, name: e.target.value })
                    }
                  />
                </label>
                <label className="block text-sm">
                  Holiday Date
                  <input
                    type="date"
                    className={input}
                    value={editing.date}
                    onChange={(e) =>
                      setEditing({ ...editing, date: e.target.value })
                    }
                  />
                </label>
                <label className="block text-sm">
                  Holiday Type
                  <select
                    className={input}
                    value={editing.type}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        type: e.target.value as HolidayType,
                      })
                    }
                  >
                    {holidayTypes.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  Applies To
                  <select
                    className={input}
                    value={editing.appliesTo}
                    onChange={(e) =>
                      setEditing({ ...editing, appliesTo: e.target.value })
                    }
                  >
                    <option>All Branches</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  Description
                  <textarea
                    className={input}
                    value={editing.description}
                    onChange={(e) =>
                      setEditing({ ...editing, description: e.target.value })
                    }
                  />
                </label>
                <label className="block text-sm">
                  Status
                  <select
                    className={input}
                    value={editing.status}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        status: e.target.value as CompanyStatus,
                      })
                    }
                  >
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </label>
                {error && (
                  <p role="alert" className="text-sm text-red-600">
                    {error}
                  </p>
                )}
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="rounded-lg border px-4 py-2"
                  >
                    Cancel
                  </button>
                  <button className="rounded-lg bg-purple-600 px-4 py-2 text-white">
                    Save
                  </button>
                </div>
              </form>
            )}
            {detail && (
              <div className="mt-4 space-y-3 text-sm">
                <p>
                  <strong>{detail.name}</strong> · {detail.date}
                </p>
                <p>
                  {detail.type} · {detail.status}
                </p>
                <p>
                  Applies to:{" "}
                  {branches.find((b) => b.id === detail.appliesTo)?.name ??
                    detail.appliesTo}
                </p>
                <p>{detail.description}</p>
                <div className="flex flex-wrap justify-end gap-3">
                  <button
                    onClick={() => setDetail(null)}
                    className="rounded-lg border px-4 py-2"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setEditing(detail);
                      setDetail(null);
                      setError("");
                    }}
                    className="rounded-lg border px-4 py-2"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setRemove(detail);
                      setDetail(null);
                    }}
                    className="rounded-lg bg-red-600 px-4 py-2 text-white"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
            {remove && (
              <div className="mt-4 text-sm">
                <p>Remove {remove.name} from this session?</p>
                <div className="mt-5 flex justify-end gap-3">
                  <button
                    onClick={() => setRemove(null)}
                    className="rounded-lg border px-4 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      onChange(holidays.filter((h) => h.id !== remove.id));
                      setRemove(null);
                    }}
                    className="rounded-lg bg-red-600 px-4 py-2 text-white"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
