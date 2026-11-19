"use client";
import { LuCalendarCheck, LuEllipsis, LuSearch } from "react-icons/lu";
import { useState } from "react";
import type {
  LeaveRequest,
  LeaveType,
  Status,
} from "../leave-management/leave-data";
import {
  employeeFor,
  formatRange,
  policies,
} from "../leave-management/leave-data";
export default function LeaveRequestsCards({
  requests,
  search,
  onSearch,
  type,
  onType,
  status,
  onStatus,
  approvedMonth,
  month,
  onClearApprovedMonth,
  onAction,
  tableId,
}: {
  requests: LeaveRequest[];
  search: string;
  onSearch: (v: string) => void;
  type: LeaveType | "All";
  onType: (v: LeaveType | "All") => void;
  status: Status | "All";
  onStatus: (v: Status | "All") => void;
  approvedMonth: boolean;
  month: Date;
  onClearApprovedMonth: () => void;
  onAction: (
    action: "view" | "approve" | "reject",
    request: LeaveRequest,
  ) => void;
  tableId: string;
}) {
  const [page, setPage] = useState(1),
    [size, setSize] = useState(5),
    [selected, setSelected] = useState<string[]>([]),
    [menu, setMenu] = useState<string | null>(null);
  const filtered = requests.filter((r) => {
    const employee = employeeFor(r);
    const q = search.toLowerCase().trim();
    return (
      (!q ||
        `${employee?.name} ${employee?.id} ${r.reason} ${r.id}`
          .toLowerCase()
          .includes(q)) &&
      (type === "All" || r.type === type) &&
      (status === "All" || r.status === status) &&
      (!approvedMonth ||
        (r.status === "Approved" &&
          r.reviewedAt?.startsWith(
            `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`,
          )))
    );
  });
  const pages = Math.max(1, Math.ceil(filtered.length / size)),
    current = Math.min(page, pages),
    visible = filtered.slice((current - 1) * size, current * size);
  function reset() {
    onSearch("");
    onType("All");
    onStatus("All");
    onClearApprovedMonth();
    setPage(1);
  }
  function toggle(id: string) {
    setSelected((old) =>
      old.includes(id) ? old.filter((x) => x !== id) : [...old, id],
    );
  }
  return (
    <section
      id={tableId}
      className="min-w-0 rounded-2xl border border-[#EDEAF6] bg-white shadow-[0_3px_9px_rgba(84,42,154,.10)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
        <h2 className="flex items-center gap-2 text-[17px] font-bold">
          <LuCalendarCheck className="text-violet-700" size={23} />
          Leave Requests (Recent)
        </h2>
        <div className="flex w-full flex-wrap gap-2 md:w-auto">
          <label className="relative min-w-[190px] flex-1 md:w-[260px]">
            <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-700" />
            <input
              value={search}
              onChange={(e) => {
                onSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by employee, reason..."
              aria-label="Search leave requests"
              className="h-10 w-full rounded-lg border border-[#ded8ef] bg-[#faf9ff] pl-9 pr-3 text-xs outline-violet-500"
            />
          </label>
          <select
            value={type}
            onChange={(e) => {
              onType(e.target.value as LeaveType | "All");
              setPage(1);
            }}
            aria-label="Filter by leave type"
            className="h-10 flex-1 rounded-lg border border-[#ded8ef] bg-white px-3 text-xs outline-violet-500 sm:flex-none"
          >
            <option value="All">All Leave Types</option>
            {policies.map((p) => (
              <option key={p.type}>{p.type}</option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => {
              onStatus(e.target.value as Status | "All");
              setPage(1);
            }}
            aria-label="Filter by status"
            className="h-10 flex-1 rounded-lg border border-[#ded8ef] bg-white px-3 text-xs outline-violet-500 sm:flex-none"
          >
            <option value="All">All Statuses</option>
            {["Pending", "Approved", "Rejected"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
      {approvedMonth && (
        <div className="px-5 pb-2 text-xs text-violet-700">
          Approved in selected month{" "}
          <button onClick={onClearApprovedMonth} className="ml-2 underline">
            Clear
          </button>
        </div>
      )}
      <div className="max-w-full overflow-x-auto">
        <table className="w-full min-w-[850px] text-left text-[12px]">
          <thead className="bg-[#f3edff] text-[#29233e]">
            <tr>
              <th className="w-12 px-4 py-3">
                <input
                  type="checkbox"
                  aria-label="Select visible requests"
                  checked={
                    visible.length > 0 &&
                    visible.every((r) => selected.includes(r.id))
                  }
                  onChange={(e) =>
                    setSelected((old) =>
                      e.target.checked
                        ? [...new Set([...old, ...visible.map((r) => r.id)])]
                        : old.filter((id) => !visible.some((r) => r.id === id)),
                    )
                  }
                />
              </th>
              {[
                "Employee",
                "Leave Type",
                "Dates",
                "Reason",
                "Status",
                "Action",
              ].map((h) => (
                <th className="px-3 py-3 font-semibold" key={h}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => {
              const employee = employeeFor(r);
              return (
                <tr
                  key={r.id}
                  className="border-t border-[#eeeaf6] hover:bg-[#fcfbff]"
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label={`Select ${r.id}`}
                      checked={selected.includes(r.id)}
                      onChange={() => toggle(r.id)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet-200 font-bold text-violet-700">
                        {employee?.name
                          .split(" ")
                          .map((x) => x[0])
                          .join("")}
                      </span>
                      <span>
                        <b className="block text-[12px]">{employee?.name}</b>
                        <span className="text-[11px] text-[#73718A]">
                          {employee?.id}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2">{r.type}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {formatRange(r)}
                  </td>
                  <td className="max-w-[180px] truncate px-3 py-2">
                    {r.reason}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${r.status === "Pending" ? "bg-orange-100 text-orange-700" : r.status === "Approved" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
                    >
                      ● {r.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      {r.status === "Pending" ? (
                        <>
                          <button
                            onClick={() => onAction("approve", r)}
                            className="rounded-md border border-violet-500 px-2.5 py-1.5 font-semibold text-violet-700 hover:bg-violet-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => onAction("reject", r)}
                            className="rounded-md border border-rose-400 px-2.5 py-1.5 font-semibold text-rose-600 hover:bg-rose-50"
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => onAction("view", r)}
                          className="rounded-md border border-[#ded8ef] px-3 py-1.5 font-semibold hover:bg-violet-50"
                        >
                          View
                        </button>
                      )}
                      <div className="relative">
                        <button
                          aria-label={`More actions for ${r.id}`}
                          onClick={() => setMenu(menu === r.id ? null : r.id)}
                          className="rounded-md p-1.5 hover:bg-violet-100"
                        >
                          <LuEllipsis size={18} />
                        </button>
                        {menu === r.id && (
                          <div className="absolute right-0 top-full z-10 w-32 rounded-lg border bg-white p-1 shadow-lg">
                            <button
                              onClick={() => {
                                onAction("view", r);
                                setMenu(null);
                              }}
                              className="w-full rounded px-2 py-1.5 text-left hover:bg-violet-50"
                            >
                              View details
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!filtered.length && (
        <div className="p-8 text-center text-sm text-[#73718A]">
          No leave requests match your filters.{" "}
          <button className="text-violet-700 underline" onClick={reset}>
            Reset Filters
          </button>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#eeeaf6] px-5 py-3 text-[11px] text-[#73718A]">
        <div>
          Showing {filtered.length ? (current - 1) * size + 1 : 0}–
          {Math.min(current * size, filtered.length)} of {filtered.length}{" "}
          requests{" "}
          {selected.length > 0 && <span>· {selected.length} selected</span>}
        </div>
        <div className="flex items-center gap-2">
          <label>
            Rows per page{" "}
            <select
              value={size}
              onChange={(e) => {
                setSize(Number(e.target.value));
                setPage(1);
              }}
              className="rounded border border-[#ded8ef] p-1"
            >
              {[5, 10, 25, 50].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <button
            disabled={current === 1}
            onClick={() => setPage(current - 1)}
            className="rounded border px-2 py-1 disabled:opacity-40"
          >
            Previous
          </button>
          <span>
            {current} / {pages}
          </span>
          <button
            disabled={current === pages}
            onClick={() => setPage(current + 1)}
            className="rounded border px-2 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
