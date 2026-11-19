"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  LuCalendarCheck,
  LuCalendarDays,
  LuChevronDown,
  LuChevronLeft,
  LuChevronRight,
  LuCircleCheck,
  LuCircleX,
  LuClock3,
  LuDownload,
  LuEllipsis,
  LuEye,
  LuLayers,
  LuSearch,
  LuTriangleAlert,
  LuUsersRound,
  LuX,
} from "react-icons/lu";
import AttendanceRateCards, {
  AttendanceKpiCard,
} from "../components/AttendanceRateCards";
import PresentTodayCards from "../components/PresentTodayCards";
import RequestOtCards from "../components/RequestOtCards";
import MissingPunchesCards from "../components/MissingPunchesCards";
import AttendanceTrend from "../components/AttendanceTrend";

type Status = "Present" | "Late" | "Absent";
type RecordRow = {
  id: string;
  name: string;
  employeeId: string;
  department: string;
  timeIn: string;
  timeOut: string;
  workHours: string;
  status: Status;
  lateMinutes?: number;
  ot?: string;
  date: string;
  position: string;
};

const records: RecordRow[] = [
  {
    id: "att-10074",
    name: "James Reed",
    employeeId: "EMP-10074",
    department: "Operations",
    timeIn: "08:01 AM",
    timeOut: "05:32 PM",
    workHours: "9h 31m",
    status: "Present",
    ot: "Yes (2h 0m)",
    date: "2025-01-29",
    position: "Operations Lead",
  },
  {
    id: "att-10057",
    name: "Maria Santos",
    employeeId: "EMP-10057",
    department: "Marketing",
    timeIn: "08:12 AM",
    timeOut: "05:08 PM",
    workHours: "8h 56m",
    status: "Present",
    date: "2025-01-29",
    position: "Marketing Specialist",
  },
  {
    id: "att-10069",
    name: "Liam Chen",
    employeeId: "EMP-10069",
    department: "Engineering",
    timeIn: "08:28 AM",
    timeOut: "05:46 PM",
    workHours: "9h 18m",
    status: "Late",
    lateMinutes: 28,
    ot: "Yes (1h 30m)",
    date: "2025-01-29",
    position: "Software Engineer",
  },
  {
    id: "att-10102",
    name: "Ava Mitchell",
    employeeId: "EMP-10102",
    department: "Sales",
    timeIn: "08:00 AM",
    timeOut: "04:45 PM",
    workHours: "8h 45m",
    status: "Present",
    date: "2025-01-29",
    position: "Account Executive",
  },
  {
    id: "att-10119",
    name: "Noah Brooks",
    employeeId: "EMP-10119",
    department: "HR & Admin",
    timeIn: "—",
    timeOut: "—",
    workHours: "—",
    status: "Absent",
    date: "2025-01-29",
    position: "HR Coordinator",
  },
];
const departments = [
  "All Departments",
  "Operations",
  "Marketing",
  "Engineering",
  "Sales",
  "HR & Admin",
];
const statusOptions = ["All Statuses", "Present", "Late", "Absent"];
const donut = [
  { name: "Present", value: 1198, color: "#7c3aed" },
  { name: "Late", value: 42, color: "#78a82b" },
  { name: "Absent", value: 8, color: "#c02675" },
];
const otWeeks = [
  { week: "W1", hours: 82 },
  { week: "W2", hours: 146 },
  { week: "W3", hours: 202 },
  { week: "W4", hours: 254 },
  { week: "W5", hours: 318 },
];

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("");
}
function formatRange(start: string, end: string) {
  const f = (value: string) =>
    new Date(`${value}T12:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  return `${f(start)} – ${f(end)}`;
}

function DateRangePicker({
  start,
  end,
  onApply,
}: {
  start: string;
  end: string;
  onApply: (start: string, end: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftStart, setDraftStart] = useState(start);
  const [draftEnd, setDraftEnd] = useState(end);
  const [month, setMonth] = useState(new Date(2025, 0, 1));
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const offset = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  function apply() {
    if (draftStart <= draftEnd) {
      onApply(draftStart, draftEnd);
      setOpen(false);
    }
  }
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setDraftStart(start);
          setDraftEnd(end);
          setOpen(!open);
        }}
        aria-expanded={open}
        className="flex h-11 items-center gap-2 rounded-xl border border-[#ded7f1] bg-white px-3.5 text-xs font-bold text-[#17152d] shadow-sm hover:border-violet-400"
      >
        <LuCalendarDays className="text-violet-600" size={17} />
        {formatRange(start, end)}
        <LuChevronDown className="ml-1 text-[#73718a]" size={16} />
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[304px] rounded-2xl border border-[#edeaf6] bg-white p-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() =>
                setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
              }
              className="rounded-lg p-1.5 hover:bg-violet-50"
            >
              <LuChevronLeft />
            </button>
            <strong className="text-sm">
              {month.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </strong>
            <button
              type="button"
              aria-label="Next month"
              onClick={() =>
                setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
              }
              className="rounded-lg p-1.5 hover:bg-violet-50"
            >
              <LuChevronRight />
            </button>
          </div>
          <div className="mt-3 grid grid-cols-7 text-center text-[11px] font-semibold text-[#9290a5]">
            {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
              <span key={`${day}-${i}`} className="py-1">
                {day}
              </span>
            ))}
            {Array.from({ length: offset }, (_, i) => (
              <span key={`blank-${i}`} />
            ))}
            {Array.from({ length: days }, (_, i) => {
              const value = localDateKey(
                new Date(month.getFullYear(), month.getMonth(), i + 1),
              );
              const selected = value === draftStart || value === draftEnd;
              const inRange = value > draftStart && value < draftEnd;
              return (
                <button
                  type="button"
                  key={value}
                  onClick={() => {
                    if (!draftStart || draftEnd !== draftStart) {
                      setDraftStart(value);
                      setDraftEnd(value);
                    } else if (value >= draftStart) setDraftEnd(value);
                  }}
                  className={`py-1.5 text-xs ${inRange ? "bg-violet-50 text-violet-700" : ""} ${selected ? "rounded-lg bg-violet-600 font-bold text-white" : "hover:rounded-lg hover:bg-violet-100"}`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="text-[10px] font-semibold text-[#73718a]">
              Start
              <input
                type="date"
                value={draftStart}
                onChange={(e) => setDraftStart(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#edeaf6] px-2 py-1.5 text-xs"
              />
            </label>
            <label className="text-[10px] font-semibold text-[#73718a]">
              End
              <input
                type="date"
                value={draftEnd}
                min={draftStart}
                onChange={(e) => setDraftEnd(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#edeaf6] px-2 py-1.5 text-xs"
              />
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-xs font-semibold text-[#73718a] hover:bg-violet-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={apply}
              disabled={draftStart > draftEnd}
              className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="attendance-dialog-title"
        className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-[#edeaf6] px-5 py-4">
          <h2 id="attendance-dialog-title" className="text-lg font-bold">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-violet-50"
          >
            <LuX />
          </button>
        </header>
        <div className="min-h-0 overflow-y-auto p-5">{children}</div>
        <footer className="flex shrink-0 justify-end border-t border-[#edeaf6] px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#ded7f1] px-4 py-2 text-sm font-semibold hover:bg-violet-50"
          >
            Close
          </button>
        </footer>
      </section>
    </div>
  );
}

export default function AttendanceManagementPage() {
  const [range, setRange] = useState({
    start: "2025-01-01",
    end: "2025-01-31",
  });
  const [department, setDepartment] = useState("All Departments");
  const [status, setStatus] = useState("All Statuses");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [selected, setSelected] = useState<string[]>([]);
  const [modal, setModal] = useState<{
    kind: "details" | "ot" | "missing";
    record?: RecordRow;
  } | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const filtered = useMemo(
    () =>
      records.filter(
        (row) =>
          (department === "All Departments" || row.department === department) &&
          (status === "All Statuses" || row.status === status) &&
          `${row.name} ${row.employeeId}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [department, status, search],
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  function updateFilter<T>(setter: (value: T) => void, value: T) {
    setter(value);
    setPage(1);
    setToast("Attendance filters updated");
  }
  function exportCsv() {
    const csv = [
      "Employee,Employee ID,Department,Time In,Time Out,Work Hours,Status,OT Request",
      ...filtered.map((r) =>
        [
          r.name,
          r.employeeId,
          r.department,
          r.timeIn,
          r.timeOut,
          r.workHours,
          r.status,
          r.ot ?? "None",
        ]
          .map((v) => `"${v}"`)
          .join(","),
      ),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "workpulse-attendance-demo.csv";
    link.click();
    URL.revokeObjectURL(url);
    setToast("Export complete — demo records downloaded");
  }
  const allVisibleSelected =
    visible.length > 0 && visible.every((row) => selected.includes(row.id));
  const togglePage = () =>
    setSelected(
      allVisibleSelected
        ? selected.filter((id) => !visible.some((row) => row.id === id))
        : [...new Set([...selected, ...visible.map((row) => row.id)])],
    );
  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-[#f7f6ff] px-4 py-5 [scrollbar-color:#c6b5df_transparent] [scrollbar-width:thin] lg:px-5">
      <div className="mx-auto max-w-[1540px]">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <LuCalendarDays
              className="mt-1 text-violet-600"
              size={36}
              strokeWidth={1.8}
            />
            <div>
              <h1 className="text-[27px] font-bold tracking-tight text-[#17152d]">
                Attendance Management
              </h1>
              <p className="mt-1 text-[13px] text-[#73718a]">
                Track, monitor, and manage employee attendance, time logs, and
                overtime.
              </p>
            </div>
          </div>
          <DateRangePicker
            start={range.start}
            end={range.end}
            onApply={(start, end) => {
              setRange({ start, end });
              setToast(
                start === "2025-01-01" && end === "2025-01-31"
                  ? "January 2025 demo snapshot selected"
                  : "No records in the selected demo range",
              );
            }}
          />
        </header>
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          <AttendanceRateCards
            label="Attendance Rate"
            value="96.4%"
            trend="↑ +1.8 pp from last month"
            icon={<LuCalendarCheck size={23} />}
            iconClassName="bg-emerald-50 text-emerald-600"
          />
          <PresentTodayCards
            label="Present Today"
            value="1,198"
            trend="↑ +24 employees"
            icon={<LuUsersRound size={23} />}
            iconClassName="bg-violet-50 text-violet-600"
          />
          <AttendanceKpiCard
            label="Late Employees"
            value="42"
            trend="↓ -10 from last week"
            trendClassName="text-rose-600"
            icon={<LuClock3 size={23} />}
            iconClassName="bg-rose-50 text-rose-600"
          />
          <RequestOtCards
            label="OT Requests"
            value="86"
            trend="↑ +18 from last week"
            icon={<LuLayers size={23} />}
            iconClassName="bg-violet-50 text-violet-600"
            onClick={() => setModal({ kind: "ot" })}
          />
          <MissingPunchesCards
            label="Missing Punches"
            value="16"
            trend="↓ -6 from last week"
            trendClassName="text-amber-600"
            icon={<LuTriangleAlert size={23} />}
            iconClassName="bg-amber-50 text-amber-600"
            onClick={() => setModal({ kind: "missing" })}
          />
        </section>
        <section className="mt-4 grid gap-3 xl:grid-cols-[1.25fr_1fr_1fr]">
          <AttendanceTrend
            hasData={range.start === "2025-01-01" && range.end === "2025-01-31"}
          />
          <section className="rounded-2xl border border-[#edeaf6] bg-white p-4 shadow-[0_3px_8px_rgba(62,32,120,.08)]">
            <h2 className="text-base font-bold">Today&apos;s Attendance</h2>
            <div className="mt-3 flex min-h-[165px] items-center justify-center gap-4">
              <div className="relative h-[150px] w-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donut}
                      dataKey="value"
                      innerRadius={48}
                      outerRadius={70}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {donut.map((item) => (
                        <Cell key={item.name} fill={item.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [`${value}`, name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                  <div>
                    <strong className="block text-2xl">1,248</strong>
                    <span className="text-[11px] font-semibold text-[#73718a]">
                      Employees
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-3 text-xs">
                {donut.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="min-w-[42px]">{item.name}</span>
                    <strong>
                      {item.value.toLocaleString()}{" "}
                      <span className="font-normal text-[#73718a]">
                        ({((item.value / 1248) * 100).toFixed(1)}%)
                      </span>
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          </section>
          <section className="rounded-2xl border border-[#edeaf6] bg-white p-4 shadow-[0_3px_8px_rgba(62,32,120,.08)]">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold">OT Hours (This Month)</h2>
                <strong className="mt-2 block text-center text-lg">
                  342.5 hrs
                </strong>
                <p className="text-center text-[11px] font-semibold text-emerald-600">
                  ↑ +12.4%{" "}
                  <span className="font-normal text-[#73718a]">
                    vs last month
                  </span>
                </p>
              </div>
            </div>
            <div className="mt-2 h-[145px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={otWeeks}
                  margin={{ top: 8, right: 2, left: -20, bottom: 0 }}
                >
                  <CartesianGrid vertical={false} stroke="#eeeaf6" />
                  <XAxis
                    dataKey="week"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: "#73718a" }}
                  />
                  <YAxis
                    domain={[0, 400]}
                    ticks={[0, 100, 200, 300, 400]}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: "#73718a" }}
                  />
                  <Tooltip
                    formatter={(value) => [`${value} hrs`, "OT Hours"]}
                  />
                  <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                    {otWeeks.map((item, index) => (
                      <Cell
                        key={item.week}
                        fill={
                          index === otWeeks.length - 1 ? "#7c3aed" : "#a66bf0"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </section>
        <section className="mt-4 overflow-hidden rounded-2xl border border-[#edeaf6] bg-white shadow-[0_3px_8px_rgba(62,32,120,.08)]">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <h2 className="text-lg font-bold">Attendance Records</h2>
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Department"
                value={department}
                onChange={(e) => updateFilter(setDepartment, e.target.value)}
                className="h-9 rounded-lg border border-[#ded7f1] bg-white px-2.5 text-xs font-semibold"
              >
                <option>{departments[0]}</option>
                {departments.slice(1).map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
              <select
                aria-label="Status"
                value={status}
                onChange={(e) => updateFilter(setStatus, e.target.value)}
                className="h-9 rounded-lg border border-[#ded7f1] bg-white px-2.5 text-xs font-semibold"
              >
                {statusOptions.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
              <label className="relative">
                <LuSearch
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#73718a]"
                  size={16}
                />
                <input
                  aria-label="Search employee"
                  placeholder="Search employee..."
                  value={search}
                  onChange={(e) => updateFilter(setSearch, e.target.value)}
                  className="h-9 w-48 rounded-lg border border-[#ded7f1] pl-8 pr-2 text-xs outline-violet-400"
                />
              </label>
              <button
                type="button"
                onClick={exportCsv}
                className="flex h-9 items-center gap-1.5 rounded-lg border border-violet-200 px-3 text-xs font-bold text-violet-700 hover:bg-violet-50"
              >
                <LuDownload size={16} />
                Export
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-xs">
              <thead className="bg-[#faf9ff] text-[11px] font-bold text-[#73718a]">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label="Select visible records"
                      checked={allVisibleSelected}
                      onChange={togglePage}
                    />
                  </th>
                  <th className="px-2 py-3">Employee Name</th>
                  <th className="px-2 py-3">Department</th>
                  <th className="px-2 py-3">Time In</th>
                  <th className="px-2 py-3">Time Out</th>
                  <th className="px-2 py-3">Work Hours</th>
                  <th className="px-2 py-3">Status</th>
                  <th className="px-2 py-3">OT Request</th>
                  <th className="w-12 px-2 py-3"> </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-[#f0edf7] hover:bg-[#fbfaff]"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Select ${row.name}`}
                        checked={selected.includes(row.id)}
                        onChange={() =>
                          setSelected((current) =>
                            current.includes(row.id)
                              ? current.filter((id) => id !== row.id)
                              : [...current, row.id],
                          )
                        }
                      />
                    </td>
                    <td className="px-2 py-2.5">
                      <Link
                        href={`/hr/attendance-management/${row.employeeId}?date=${row.date}`}
                        className="flex items-center gap-2 text-left"
                      >
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-violet-100 text-[11px] font-bold text-violet-700">
                          {initials(row.name)}
                        </span>
                        <span>
                          <strong className="block text-[13px]">
                            {row.name}
                          </strong>
                          <small className="text-[11px] text-[#73718a]">
                            {row.employeeId}
                          </small>
                        </span>
                      </Link>
                    </td>
                    <td className="px-2">
                      <span className="rounded-md bg-[#f1e8ff] px-2 py-1 text-[11px] font-semibold text-violet-700">
                        {row.department}
                      </span>
                    </td>
                    <td className="px-2 font-medium">{row.timeIn}</td>
                    <td className="px-2 font-medium">{row.timeOut}</td>
                    <td className="px-2 font-semibold">{row.workHours}</td>
                    <td className="px-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${row.status === "Present" ? "bg-emerald-50 text-emerald-700" : row.status === "Late" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}
                      >
                        {row.status === "Present" ? (
                          <LuCircleCheck size={13} />
                        ) : row.status === "Late" ? (
                          <LuClock3 size={13} />
                        ) : (
                          <LuCircleX size={13} />
                        )}
                        {row.status === "Late"
                          ? `Late (${row.lateMinutes}m)`
                          : row.status}
                      </span>
                    </td>
                    <td className="px-2">
                      {row.ot ? (
                        <button
                          type="button"
                          onClick={() => setModal({ kind: "ot", record: row })}
                          className="rounded-full bg-violet-50 px-2 py-1 text-[11px] font-semibold text-violet-700"
                        >
                          ✓ {row.ot}
                        </button>
                      ) : (
                        <span className="text-[#9290a5]">—</span>
                      )}
                    </td>
                    <td className="relative px-2">
                      <button
                        type="button"
                        aria-label={`More actions for ${row.name}`}
                        onClick={() => setMenu(menu === row.id ? null : row.id)}
                        className="rounded-lg p-1.5 hover:bg-violet-100"
                      >
                        <LuEllipsis />
                      </button>
                      {menu === row.id && (
                        <div className="absolute right-3 top-10 z-20 w-44 rounded-xl border border-[#edeaf6] bg-white p-1.5 shadow-xl">
                          <Link
                            href={`/hr/attendance-management/${row.employeeId}?date=${row.date}`}
                            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs hover:bg-violet-50"
                          >
                            <LuEye size={14} />
                            View Attendance Details
                          </Link>
                          {row.ot && (
                            <button
                              type="button"
                              onClick={() => {
                                setModal({ kind: "ot", record: row });
                                setMenu(null);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs hover:bg-violet-50"
                            >
                              <LuLayers size={14} />
                              View OT Request
                            </button>
                          )}
                          {row.status === "Absent" && (
                            <button
                              type="button"
                              onClick={() => {
                                setModal({ kind: "missing", record: row });
                                setMenu(null);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs hover:bg-violet-50"
                            >
                              <LuTriangleAlert size={14} />
                              View absence details
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visible.length === 0 && (
              <div className="p-10 text-center text-sm text-[#73718a]">
                No attendance records match these filters.
              </div>
            )}
          </div>
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edeaf6] p-3 text-xs text-[#73718a]">
            <span>
              Showing {filtered.length ? (page - 1) * pageSize + 1 : 0}–
              {Math.min(page * pageSize, filtered.length)} of {filtered.length}{" "}
              demo employees
            </span>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1">
                Rows{" "}
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="rounded-lg border border-[#ded7f1] bg-white px-2 py-1"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                </select>
              </label>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="rounded-lg border border-[#ded7f1] p-1.5 disabled:opacity-40"
              >
                <LuChevronLeft size={15} />
              </button>
              <span className="rounded-lg bg-violet-600 px-2.5 py-1.5 font-bold text-white">
                {page}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="rounded-lg border border-[#ded7f1] p-1.5 disabled:opacity-40"
              >
                <LuChevronRight size={15} />
              </button>
            </div>
          </footer>
        </section>
      </div>
      {toast && (
        <div className="fixed right-4 top-20 z-50 flex items-center gap-2 rounded-xl border border-violet-100 bg-white px-4 py-3 text-xs font-semibold text-[#17152d] shadow-xl">
          <LuCircleCheck className="text-emerald-600" size={17} />
          {toast}
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <LuX size={14} />
          </button>
        </div>
      )}
      {modal && (
        <Modal
          title={
            modal.kind === "details"
              ? "Attendance Details"
              : modal.kind === "ot"
                ? "OT Request Details"
                : "Missing Punches"
          }
          onClose={() => setModal(null)}
        >
          {modal.record ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-violet-100 font-bold text-violet-700">
                  {initials(modal.record.name)}
                </span>
                <div>
                  <h3 className="font-bold">{modal.record.name}</h3>
                  <p className="text-xs text-[#73718a]">
                    {modal.record.employeeId} · {modal.record.department} ·{" "}
                    {modal.record.position}
                  </p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Attendance Date", modal.record.date],
                  ["Scheduled Shift", "08:00 AM – 05:00 PM"],
                  ["Time In", modal.record.timeIn],
                  ["Time Out", modal.record.timeOut],
                  ["Elapsed Duration", modal.record.workHours],
                  ["Attendance Status", modal.record.status],
                  [
                    "Late Duration",
                    modal.record.lateMinutes
                      ? `${modal.record.lateMinutes} minutes`
                      : "—",
                  ],
                  ["Overtime Request", modal.record.ot ?? "None"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-[#faf9ff] p-3">
                    <p className="text-[11px] text-[#73718a]">{label}</p>
                    <p className="mt-1 text-sm font-semibold">{value}</p>
                  </div>
                ))}
              </div>
              {modal.kind === "ot" && (
                <div className="rounded-xl border border-violet-100 bg-violet-50 p-3 text-sm">
                  <strong>Demo-only request</strong>
                  <p className="mt-1 text-xs text-[#73718a]">
                    This submitted request is not automatically approved
                    overtime and does not change payroll.
                  </p>
                </div>
              )}
              {modal.kind === "missing" && (
                <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm">
                  <strong>Read-only demo exception</strong>
                  <p className="mt-1 text-xs text-[#73718a]">
                    No correction is persisted. Raw attendance evidence remains
                    unchanged.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <p>
                There are 16 missing-punch exceptions in the reference demo
                snapshot.
              </p>
              <div className="rounded-xl bg-[#faf9ff] p-3">
                <p className="font-semibold">Noah Brooks · EMP-10119</p>
                <p className="mt-1 text-xs text-[#73718a]">
                  2025-01-29 · Missing Time In and Time Out · Read-only demo
                  exception
                </p>
              </div>
            </div>
          )}
        </Modal>
      )}
    </main>
  );
}
