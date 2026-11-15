"use client";
import { useMemo, useState } from "react";
import {
  LuArrowRight,
  LuArrowRightLeft,
  LuCalendarDays,
  LuCircleCheck,
  LuClipboardList,
  LuDownload,
  LuEye,
  LuFileText,
  LuLayers,
  LuPencil,
  LuSearch,
  LuShieldCheck,
  LuTag,
  LuTarget,
  LuUserRound,
} from "react-icons/lu";
import { auditEvents } from "../settings/data";
import { AuditEvent } from "../settings/types";
import { initials } from "./AdminProfileContext";
import { input, Modal, secondary } from "./AdminSettingsUI";
const cell = (value: string) =>
  '"' +
  (/^[\s\u0000-\u001f]*[=+\-@]/.test(value) ? "'" + value : value).replace(
    /"/g,
    '""',
  ) +
  '"';
const date = (value: string) =>
  new Date(value).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  });
export default function AdminAuditLogs() {
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [module, setModule] = useState("");
  const [action, setAction] = useState("");
  const [actor, setActor] = useState("");
  const [result, setResult] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AuditEvent | null>(null);
  const filtered = useMemo(
    () =>
      auditEvents
        .filter(
          (e) =>
            [e.actor, e.action, e.module, e.target, e.summary]
              .join(" ")
              .toLowerCase()
              .includes(search.toLowerCase()) &&
            (!from || e.timestamp.slice(0, 10) >= from) &&
            (!to || e.timestamp.slice(0, 10) <= to) &&
            (!module || e.module === module) &&
            (!action || e.action === action) &&
            (!actor || e.actor === actor) &&
            (!result || e.result === result),
        )
        .sort((a, b) =>
          sort === "newest"
            ? b.timestamp.localeCompare(a.timestamp)
            : a.timestamp.localeCompare(b.timestamp),
        ),
    [search, from, to, module, action, actor, result, sort],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 5));
  const current = Math.min(page, pages);
  function reset() {
    setSearch("");
    setFrom("");
    setTo("");
    setModule("");
    setAction("");
    setActor("");
    setResult("");
    setPage(1);
  }
  function exportCsv() {
    const rows = [
      [
        "Event ID",
        "Timestamp",
        "Actor",
        "Module",
        "Action",
        "Target",
        "Result",
        "Summary",
      ],
      ...filtered.map((e) => [
        e.id,
        e.timestamp,
        e.actor,
        e.module,
        e.action,
        e.target,
        e.result,
        e.summary,
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob(
        ["\ufeff" + rows.map((r) => r.map(cell).join(",")).join("\r\n")],
        { type: "text/csv;charset=utf-8" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "workpulse-demo-audit-logs.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const select = (
    label: string,
    value: string,
    set: (v: string) => void,
    options: string[],
  ) => (
    <select
      aria-label={label}
      className={`${input} sm:w-auto`}
      value={value}
      onChange={(e) => {
        set(e.target.value);
        setPage(1);
      }}
    >
      <option value="">All {label}</option>
      {options.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  );
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <LuSearch className="absolute left-3 top-3 text-[#73718A]" />
          <input
            aria-label="Search audit logs"
            placeholder="Search by action, user, or module..."
            className={`${input} pl-10`}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        {select("Modules", module, setModule, [
          ...new Set(auditEvents.map((e) => e.module)),
        ])}
        {select("Actions", action, setAction, [
          ...new Set(auditEvents.map((e) => e.action)),
        ])}
        <label className="sr-only" htmlFor="audit-from">
          From date
        </label>
        <input
          id="audit-from"
          type="date"
          className={`${input} sm:w-auto`}
          value={from}
          onChange={(e) => {
            setFrom(e.target.value);
            setPage(1);
          }}
        />
        <label className="sr-only" htmlFor="audit-to">
          To date
        </label>
        <input
          id="audit-to"
          type="date"
          className={`${input} sm:w-auto`}
          value={to}
          onChange={(e) => {
            setTo(e.target.value);
            setPage(1);
          }}
        />
        <button className={secondary} onClick={exportCsv}>
          <LuDownload /> Export
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {select("Actors", actor, setActor, [
          ...new Set(auditEvents.map((e) => e.actor)),
        ])}
        {select("Results", result, setResult, [
          "Success",
          "Warning",
          "Failure",
        ])}
        <select
          aria-label="Sort audit logs"
          className={`${input} sm:w-auto`}
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
        <button
          onClick={reset}
          className="px-2 text-sm font-semibold text-[#7C3AED]"
        >
          Reset filters
        </button>
        <span className="ml-auto text-xs text-[#73718A]">
          Illustrative demo events only
        </span>
      </div>
      <section className="overflow-hidden rounded-xl border border-[#EDEAF6] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-[#F5F2FC] text-xs text-[#73718A]">
              <tr>
                {[
                  "Date & Time",
                  "User",
                  "Action",
                  "Module",
                  "Details",
                  "Result",
                  "View",
                ].map((h) => (
                  <th className="px-4 py-3 font-semibold" key={h}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice((current - 1) * 5, current * 5).map((e) => (
                <tr key={e.id} className="border-t border-[#F1EFF7]">
                  <td className="whitespace-nowrap px-4 py-4 text-xs">
                    {date(e.timestamp)}
                  </td>
                  <td className="px-4 py-4">
                    <span className="flex items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F3E8FF] text-xs font-bold text-[#6D28D9]">
                        {initials(e.actor)}
                      </span>
                      <span className="whitespace-nowrap font-medium">
                        {e.actor}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="rounded-md bg-[#EDE9FE] px-2 py-1 text-xs font-semibold text-[#6D28D9]">
                      {e.action}
                    </span>
                  </td>
                  <td className="px-4 py-4">{e.module}</td>
                  <td className="px-4 py-4">{e.summary}</td>
                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${e.result === "Success" ? "bg-green-50 text-green-700" : e.result === "Warning" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}
                    >
                      {e.result}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <button
                      aria-label={`View details for ${e.id}`}
                      title="View Details"
                      className="rounded p-2 text-[#6D28D9] hover:bg-purple-50"
                      onClick={() => setSelected(e)}
                    >
                      <LuEye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && (
            <p className="py-10 text-center text-sm text-[#73718A]">
              No events match these filters. Try resetting your filters.
            </p>
          )}
        </div>
      </section>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[#73718A]">
        <span>
          Showing {filtered.length ? (current - 1) * 5 + 1 : 0}–
          {Math.min(current * 5, filtered.length)} of {filtered.length} logs
        </span>
        <div className="flex items-center gap-2">
          <button
            className={secondary}
            disabled={current <= 1}
            onClick={() => setPage(current - 1)}
          >
            Previous
          </button>
          <span className="rounded-lg bg-[#F3E8FF] px-3 py-2 font-semibold text-[#7C3AED]">
            {current}
          </span>
          <span>of {pages}</span>
          <button
            className={secondary}
            disabled={current >= pages}
            onClick={() => setPage(current + 1)}
          >
            Next
          </button>
        </div>
      </div>
      {selected && (
        <Modal
          wide
          title="Audit Log Details"
          description="Complete information about this system activity."
          icon={<LuClipboardList size={21} />}
          onClose={() => setSelected(null)}
          footer={
            <button className={secondary} onClick={() => setSelected(null)}>
              Close
            </button>
          }
        >
          <div className="rounded-xl border border-[#EAE3FA] bg-[#F7F3FF] p-4">
            <div className="flex flex-wrap items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EDE0FF] text-[#7C3AED]">
                <LuPencil size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold">
                  {selected.targetType} {selected.action}
                </h3>
                <p className="mt-1 text-xs text-[#73718A]">
                  {selected.summary}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${selected.result === "Success" ? "bg-green-100 text-green-700" : selected.result === "Warning" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}
                >
                  {selected.result === "Success" && <LuCircleCheck size={13} />}
                  {selected.result}
                </span>
                <p className="mt-2 break-all text-xs text-[#73718A]">
                  Event ID: {selected.id}
                </p>
              </div>
            </div>
          </div>
          <dl className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
            {[
              {
                label: "Timestamp",
                value: date(selected.timestamp) + " (Asia/Manila)",
                icon: LuCalendarDays,
              },
              { label: "Event Type", value: selected.action, icon: LuTag },
              { label: "Actor", value: selected.actor, icon: LuUserRound },
              { label: "Status", value: selected.result, icon: LuShieldCheck },
              { label: "Module", value: selected.module, icon: LuLayers },
              {
                label: "Affected Record",
                value: selected.target,
                icon: LuTarget,
              },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex min-w-0 items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F5F2FC] text-[#6D28D9]">
                  <Icon size={17} />
                </span>
                <div className="min-w-0">
                  <dt className="text-xs text-[#73718A]">{label}</dt>
                  <dd className="mt-0.5 break-words text-sm font-semibold text-[#17152D]">
                    {value}
                  </dd>
                </div>
              </div>
            ))}
          </dl>
          <section className="mt-5 border-t border-[#EDEAF6] pt-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F5F2FC] text-[#7C3AED]">
                <LuFileText size={16} />
              </span>
              <h3 className="text-sm font-bold">Change Summary</h3>
            </div>
            <p className="mt-2 pl-10 text-sm leading-5 text-[#73718A]">
              {selected.summary}
            </p>
          </section>
          <section className="mt-4 border-t border-[#EDEAF6] pt-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F5F2FC] text-[#7C3AED]">
                <LuArrowRightLeft size={16} />
              </span>
              <h3 className="text-sm font-bold">Changes (Before and After)</h3>
            </div>
            {selected.changes?.length ? (
              <div className="mt-3 overflow-x-auto rounded-lg border border-[#EDEAF6]">
                <table className="w-full min-w-[400px] text-left text-sm">
                  <thead className="bg-[#F2EFFB] text-xs text-[#514B69]">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Field</th>
                      <th className="px-3 py-2 font-semibold">
                        Before (Previous Value)
                      </th>
                      <th className="px-3 py-2 font-semibold">
                        After (New Value)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.changes.map((change) => (
                      <tr
                        key={change.field}
                        className="border-t border-[#EDEAF6]"
                      >
                        <th scope="row" className="px-3 py-2.5 font-semibold">
                          {change.field}
                        </th>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="rounded-full bg-[#F0EFF5] px-2.5 py-1 text-xs text-[#514B69]">
                              {change.before}
                            </span>
                            <LuArrowRight
                              aria-hidden="true"
                              className="shrink-0 text-[#8B7BAE]"
                            />
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="rounded-full bg-[#EDE0FF] px-2.5 py-1 text-xs font-semibold text-[#6D28D9]">
                            {change.after}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-2 pl-10 text-sm text-[#73718A]">
                Detailed field changes were not recorded for this event.
              </p>
            )}
          </section>
          <p className="mt-4 text-xs text-[#73718A]">Simulated event</p>
        </Modal>
      )}
    </div>
  );
}
