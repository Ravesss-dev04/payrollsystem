"use client";
import { useMemo, useState } from "react";
import {
  LuDatabase,
  LuPlus,
  LuUpload,
  LuEllipsisVertical,
  LuSearch,
  LuEye,
  LuPencil,
  LuCalendarCheck,
  LuX,
} from "react-icons/lu";
import CurrentPayrollBatchCards from "../components/CurrentPayrollBatchCards";
import EmployeesAllCard from "../components/EmployeesAllCard";
import NetPayCards from "../components/NetPayCards";
import PendingAdjustmentCards from "../components/PendingAdjustmentCards";
import PayrollStatusCards from "../components/PayrollStatusCards";
import PayrollBreakdownCards from "../components/PayrollBreakdownCards";

type Batch = {
  id: string;
  start: string;
  end: string;
  period: string;
  count: number;
  earnings: number;
  deductions: number;
  progress: [number, number, number];
  status: "Draft" | "In Progress" | "Completed" | "Pending Approval";
  prepared: string;
  adjustments: number;
};
const initial: Batch[] = [
  {
    id: "PB-0128",
    start: "2025-01-01",
    end: "2025-01-31",
    period: "Jan 2025",
    count: 1248,
    earnings: 456278000,
    deductions: 73822000,
    progress: [1098, 138, 12],
    status: "In Progress",
    prepared: "Emma Carter",
    adjustments: 12,
  },

  {
    id: "PB-0127",
    start: "2024-12-01",
    end: "2024-12-31",
    period: "Dec 2024",
    count: 1233,
    earnings: 376241000,
    deductions: 0,
    progress: [1233, 0, 0],
    status: "Completed",
    prepared: "James Miller",
    adjustments: 0,
  },

  {
    id: "PB-0126",
    start: "2024-11-01",
    end: "2024-11-30",
    period: "Nov 2024",
    count: 1220,
    earnings: 370198500,
    deductions: 0,
    progress: [1220, 0, 0],
    status: "Completed",
    prepared: "Emma Carter",
    adjustments: 0,
  },

  {
    id: "PB-0125",
    start: "2024-10-01",
    end: "2024-10-31",
    period: "Oct 2024",
    count: 1214,
    earnings: 368942000,
    deductions: 0,
    progress: [1214, 0, 0],
    status: "Completed",
    prepared: "James Miller",
    adjustments: 0,
  },

];
const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n / 100,
  );

const date = (s: string) =>
  new Date(`${s}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  
const input =
  "h-10 rounded-lg border border-[#ded8ed] bg-white px-3 text-sm outline-violet-500";
const btn =
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#ded8ed] bg-white px-4 text-sm font-semibold hover:bg-violet-50";

export default function PayrollPage() {
  const [batches, setBatches] = useState(initial);
  const [selected, setSelected] = useState(initial[0].id);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All Statuses");
  const [period, setPeriod] = useState("Last 6 Months");
  const [checked, setChecked] = useState<string[]>([]);
  const [modal, setModal] = useState("");
  const [menu, setMenu] = useState("");
  const [toast, setToast] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [csv, setCsv] = useState("");
  const [dirty, setDirty] = useState(false);
  const [discard, setDiscard] = useState(false);
  const batch = batches.find((b) => b.id === selected) ?? batches[0];
  const filtered = useMemo(
    () =>
      batches.filter((b) => {
        const term = query.toLowerCase();
        const match =
          `${b.id} ${b.period} ${date(b.start)} ${date(b.end)} ${b.prepared}`
            .toLowerCase()
            .includes(term);
        const reference = new Date("2025-01-31T00:00:00Z");
        const from = new Date(reference);
        if (period === "Last Month") from.setUTCMonth(from.getUTCMonth() - 1);
        else if (period === "Last 3 Months")
          from.setUTCMonth(from.getUTCMonth() - 3);
        else if (period === "Last 6 Months")
          from.setUTCMonth(from.getUTCMonth() - 6);
        else if (period === "This Year") from.setUTCMonth(0, 1);
        else from.setUTCFullYear(1900);
        return (
          match &&
          (status === "All Statuses" || b.status === status) &&
          new Date(b.end + "T00:00:00Z") >= from
        );
      }),
    [batches, query, status, period],
  );
  const open = (m: string, b?: Batch) => {
    if (b) setSelected(b.id);
    setError("");
    setMenu("");
    setModal(m);
  };
  const close = () => {
    if (dirty) {
      setDiscard(true);
      return;
    }
    setModal("");
    setCsv("");
  };
  const create = () => {
    if (!start || !end || start > end) {
      setError("Enter a valid start and end date.");
      return;
    }
    if (
      batches.some(
        (b) => b.status !== "Completed" && start <= b.end && end >= b.start,
      )
    ) {
      setError("This period overlaps an active demo batch.");
      return;
    }
    const id = `DEMO-${Date.now()}`;
    const b: Batch = {
      id,
      start,
      end,
      period: new Date(start + "T00:00:00Z").toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }),
      count: 0,
      earnings: 0,
      deductions: 0,
      progress: [0, 0, 0],
      status: "Draft",
      prepared: "Demo user",
      adjustments: 0,
    };
    setBatches([b, ...batches]);
    setSelected(id);
    setDirty(false);
    setModal("");
    setToast("Demo payroll batch created locally.");
    setStart("");
    setEnd("");
    setNotes("");
  };
  return (
    <main className="min-h-0 flex-1 overflow-y-auto p-4 text-[#17152d] sm:p-6">
      <div className="mx-auto max-w-[1600px] space-y-4">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-3">
            <LuDatabase className="mt-1 text-violet-700" size={32} />
            <div>
              <h1 className="text-[28px] font-bold leading-tight">
                Payroll Management
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Process payroll, manage batches, adjustments, and payroll
                history.
              </p>

            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => open("create")}
              className={`${btn} border-violet-700 bg-violet-700 text-white hover:bg-violet-800`}
            >
              <LuPlus /> Create Payroll Batch
            </button>
            <button onClick={() => open("import")} className={btn}>
              <LuUpload /> Import Adjustments
            </button>
            <div className="relative">
              <button
                aria-label="More actions"
                onClick={() => setMenu(menu === "header" ? "" : "header")}
                className={`${btn} px-3`}
              >
                <LuEllipsisVertical />
              </button>
              {menu === "header" && (
                <div className="absolute right-0 z-10 mt-1 w-52 rounded-lg border bg-white p-1 shadow-lg">
                  <button
                    className="w-full p-2 text-left text-sm hover:bg-violet-50"
                    onClick={() => {
                      setMenu("");
                      document
                        .getElementById("batches")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    View payroll history
                  </button>
                  <button
                    className="w-full p-2 text-left text-sm hover:bg-violet-50"
                    onClick={() => open("details")}
                  >
                    Review selected batch
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <CurrentPayrollBatchCards
            value={`${batch.period} – Regular`}
            number={batch.id}
          />
          <EmployeesAllCard count={batch.count} />
          <NetPayCards value={money(batch.earnings - batch.deductions)} />
          <PendingAdjustmentCards count={batch.adjustments} />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <PayrollStatusCards
            counts={batch.progress}
            onContinue={() => open("processing")}
          />
          <PayrollBreakdownCards
            period={batch.period}
            earnings={batch.earnings}
            deductions={batch.deductions}
            format={money}
          />
        </div>
        <section
          id="batches"
          className="rounded-2xl border border-[#edeaf6] bg-white shadow-sm"
        >
          <div className="flex flex-wrap items-center gap-3 p-4">
            <h2 className="mr-auto flex items-center gap-2 text-lg font-bold">
              <LuCalendarCheck className="text-violet-700" /> Payroll Batches
            </h2>
            <div className="relative">
              <LuSearch className="absolute left-3 top-3 text-slate-500" />
              <input
                className={`${input} w-full pl-9 sm:w-72`}
                placeholder="Search by batch number or period..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <select
              aria-label="Period filter"
              className={input}
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              {[
                "Last Month",
                "Last 3 Months",
                "Last 6 Months",
                "This Year",
                "All Periods",
              ].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
            <select
              aria-label="Status filter"
              className={input}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {[
                "All Statuses",
                "Draft",
                "In Progress",
                "Pending Approval",
                "Completed",
              ].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-[#f5f2fb] text-xs">
                <tr>
                  {[
                    "",
                    "Cut-off Period",
                    "Batch Number",
                    "Employees",
                    "Net Pay",
                    "Status",
                    "Prepared By",
                    "Actions",
                  ].map((x) => (
                    <th key={x} className="px-4 py-3 font-semibold">
                      {x || (
                        <input
                          aria-label="Select all visible batches"
                          type="checkbox"
                          checked={
                            filtered.length > 0 &&
                            filtered.every((b) => checked.includes(b.id))
                          }
                          onChange={(e) =>
                            setChecked(
                              e.target.checked ? filtered.map((b) => b.id) : [],
                            )
                          }
                        />
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr
                    key={b.id}
                    className={`border-t border-slate-100 ${selected === b.id ? "bg-violet-50/40" : ""}`}
                  >
                    <td className="px-4">
                      <input
                        aria-label={`Select ${b.id}`}
                        type="checkbox"
                        checked={checked.includes(b.id)}
                        onChange={(e) =>
                          setChecked(
                            e.target.checked
                              ? [...checked, b.id]
                              : checked.filter((x) => x !== b.id),
                          )
                        }
                      />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <button
                        onClick={() => setSelected(b.id)}
                        className="hover:text-violet-700"
                      >
                        {date(b.start)} – {date(b.end)}
                      </button>
                    </td>
                    <td className="px-4 font-semibold">
                      <button onClick={() => setSelected(b.id)}>{b.id}</button>
                    </td>
                    <td className="px-4">{b.count.toLocaleString()}</td>
                    <td className="whitespace-nowrap px-4 tabular-nums">
                      {money(b.earnings - b.deductions)}
                    </td>
                    <td className="px-4">
                      <span
                        className={`whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold ${b.status === "Completed" ? "bg-emerald-100 text-emerald-700" : b.status === "In Progress" ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-600"}`}
                      >
                        ● {b.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4">{b.prepared}</td>
                    <td className="whitespace-nowrap px-4">
                      <button
                        aria-label={`View ${b.id}`}
                        onClick={() => open("details", b)}
                        className="rounded p-2 hover:bg-violet-100"
                      >
                        <LuEye />
                      </button>
                      <button
                        aria-label={`Edit ${b.id}`}
                        disabled={b.status !== "Draft"}
                        onClick={() => open("edit", b)}
                        className="rounded p-2 hover:bg-violet-100 disabled:opacity-30"
                      >
                        <LuPencil />
                      </button>
                      <button
                        aria-label={`More actions for ${b.id}`}
                        onClick={() =>
                          open(
                            b.status === "In Progress"
                              ? "processing"
                              : "details",
                            b,
                          )
                        }
                        className="rounded p-2 hover:bg-violet-100"
                      >
                        <LuEllipsisVertical />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="p-6 text-center text-sm text-slate-500">
                No batches match these filters.
              </p>
            )}
          </div>
          <div className="border-t p-3 text-xs text-slate-500">
            Showing {filtered.length} of {filtered.length} batches ·{" "}
            {checked.length} selected
          </div>
        </section>
      </div>
      {toast && (
        <div
          role="status"
          className="fixed right-5 top-20 z-50 rounded-xl border bg-white p-4 text-sm shadow-lg"
        >
          {toast}
          <button
            aria-label="Dismiss"
            onClick={() => setToast("")}
            className="ml-4"
          >
            ×
          </button>
        </div>
      )}
      {modal && (
        <div
          className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="payroll-dialog"
            className="flex max-h-[90dvh] w-full max-w-xl flex-col rounded-2xl border border-violet-100 bg-white shadow-xl"
          >
            <div className="flex items-start justify-between border-b p-5">
              <div>
                <h2 id="payroll-dialog" className="text-lg font-bold">
                  {modal === "create"
                    ? "Create Payroll Batch"
                    : modal === "import"
                      ? "Import Payroll Adjustments"
                      : modal === "processing"
                        ? `Payroll Processing — ${batch.id}`
                        : modal === "edit"
                          ? "Edit Draft Batch"
                          : "Payroll Batch Details"}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {modal === "create"
                    ? "Configure the payroll period and employee coverage."
                    : "Reference demo · changes are local to this page"}
                </p>
              </div>
              <button aria-label="Close" onClick={close}>
                <LuX size={20} />
              </button>
            </div>
            <div className="space-y-4 overflow-y-auto p-5 text-sm">
              {modal === "create" || modal === "edit" ? (
                <>
                  <label className="block">
                    Payroll type
                    <select className={`${input} mt-1 w-full`}>
                      <option>Regular</option>
                    </select>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label>
                      Cut-off start
                      <input
                        type="date"
                        value={start}
                        onChange={(e) => {
                          setStart(e.target.value);
                          setDirty(true);
                        }}
                        className={`${input} mt-1 w-full`}
                      />
                    </label>
                    <label>
                      Cut-off end
                      <input
                        type="date"
                        value={end}
                        onChange={(e) => {
                          setEnd(e.target.value);
                          setDirty(true);
                        }}
                        className={`${input} mt-1 w-full`}
                      />
                    </label>
                  </div>
                  <p className="rounded-lg bg-violet-50 p-3">
                    Employee coverage is unavailable in this snapshot. New
                    drafts contain no employees or calculated payroll.
                  </p>
                  <label className="block">
                    Processing notes
                    <textarea
                      value={notes}
                      onChange={(e) => {
                        setNotes(e.target.value);
                        setDirty(true);
                      }}
                      className="mt-1 w-full rounded-lg border p-3"
                    />
                  </label>
                  {error && (
                    <p role="alert" className="text-red-600">
                      {error}
                    </p>
                  )}
                </>
              ) : modal === "import" ? (
                <>
                  <p>
                    Upload a CSV for validation. Employee records are not
                    available in this reference snapshot, so adjustments cannot
                    be imported until employee IDs can be verified.
                  </p>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setCsv(await f.text());
                        setDirty(true);
                      }
                    }}
                  />
                  {csv && (
                    <div className="rounded-lg bg-amber-50 p-3">
                      {csv.split(/\r?\n/).filter(Boolean).length - 1} data rows
                      found. Employee IDs cannot be verified; no rows are
                      eligible for import.
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 rounded-lg bg-violet-50 p-4">
                    <p>
                      Batch
                      <br />
                      <strong>{batch.id}</strong>
                    </p>
                    <p>
                      Status
                      <br />
                      <strong>{batch.status}</strong>
                    </p>
                    <p>
                      Cut-off
                      <br />
                      <strong>
                        {date(batch.start)} – {date(batch.end)}
                      </strong>
                    </p>
                    <p>
                      Prepared by
                      <br />
                      <strong>{batch.prepared}</strong>
                    </p>
                    <p>
                      Included employees
                      <br />
                      <strong>{batch.count.toLocaleString()}</strong>
                    </p>
                    <p>
                      Net payable
                      <br />
                      <strong>
                        {money(batch.earnings - batch.deductions)}
                      </strong>
                    </p>
                  </div>
                  <h3 className="font-bold">
                    {modal === "processing"
                      ? "Validation and processing progress"
                      : "Employee Breakdown"}
                  </h3>
                  <p>
                    {modal === "processing"
                      ? `${batch.progress[0]} processed, ${batch.progress[1]} in progress, ${batch.progress[2]} pending. Review is available locally; processing and approval are not simulated.`
                      : "Employee-level payroll breakdown is not available in this demo."}
                  </p>
                  <h3 className="font-bold">Adjustments and exceptions</h3>
                  <p>
                    {batch.adjustments} pending adjustments. Individual records
                    and validation details are not available in this snapshot.
                  </p>
                  <h3 className="font-bold">History</h3>
                  <p>
                    No audit events are available in this reference snapshot.
                  </p>
                </>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t p-4">
              <button onClick={close} className={btn}>
                Close
              </button>
              {modal === "create" && (
                <button
                  onClick={create}
                  className={`${btn} border-violet-700 bg-violet-700 text-white`}
                >
                  Create demo draft
                </button>
              )}
              {modal === "details" && batch.status === "In Progress" && (
                <button
                  onClick={() => setModal("processing")}
                  className={`${btn} border-violet-700 bg-violet-700 text-white`}
                >
                  Continue Processing
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {discard && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2 className="font-bold">Discard Unsaved Changes?</h2>
            <p className="mt-2 text-sm text-slate-600">
              Your local changes will be lost.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button className={btn} onClick={() => setDiscard(false)}>
                Keep Editing
              </button>
              <button
                className={btn}
                onClick={() => {
                  setDiscard(false);
                  setDirty(false);
                  setModal("");
                  setCsv("");
                }}
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
