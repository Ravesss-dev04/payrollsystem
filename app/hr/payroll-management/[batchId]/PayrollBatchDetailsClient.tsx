"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LuActivity, LuArrowLeft, LuCalendarDays, LuHistory, LuLayers, LuPencil, LuTable, LuTriangleAlert, LuTrendingDown, LuTrendingUp, LuUserRound, LuUsersRound, LuWallet } from "react-icons/lu";
import PayrollStatusCards from "../../components/PayrollStatusCards";
import { type Batch, date, loadDemoDrafts, money, periodLabel, referenceBatches, saveDemoDrafts } from "../batch-data";

const panel = "rounded-2xl border border-[#EDEAF6] bg-white p-5 shadow-sm";
const field = "mt-1 w-full rounded-lg border border-[#DED8ED] bg-white px-3 py-2 text-sm outline-violet-500";

export default function PayrollBatchDetailsClient({ batchId, initialEdit }: { batchId: string; initialEdit: boolean }) {
  const router = useRouter();
  const [batch, setBatch] = useState<Batch | null | undefined>(undefined);
  const [editing, setEditing] = useState(initialEdit);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const found = [...loadDemoDrafts(), ...referenceBatches].find((item) => item.id === batchId) ?? null;
      setBatch(found);
      if (found) { setStart(found.start); setEnd(found.end); }
    });
    return () => cancelAnimationFrame(frame);
  }, [batchId]);

  const editable = batch?.status === "Draft" && batch.id.startsWith("DEMO-");
  function leave() {
    if (dirty) setDiscard(true);
    else router.push("/hr/payroll-management");
  }
  function save() {
    if (!batch || !editable) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || Number.isNaN(Date.parse(start)) || Number.isNaN(Date.parse(end)) || start > end) {
      setError("Enter a valid cut-off start and end date."); return;
    }
    if ([...loadDemoDrafts(), ...referenceBatches].some((other) => other.id !== batch.id && start <= other.end && end >= other.start)) {
      setError("This cut-off overlaps another reference batch."); return;
    }
    const updated: Batch = { ...batch, start, end, period: periodLabel(start) };
    try {
      saveDemoDrafts([updated, ...loadDemoDrafts().filter((item) => item.id !== batch.id)]);
      setBatch(updated); setDirty(false); setEditing(false); setError(""); setToast("Demo draft saved in this browser only.");
      router.replace(`/hr/payroll-management/${encodeURIComponent(batch.id)}`);
    } catch { setError("Browser storage is unavailable. The draft was not saved."); }
  }

  if (batch === undefined) return <main className="min-h-0 flex-1 animate-pulse overflow-y-auto p-6"><div className="h-24 rounded-2xl bg-violet-100" /></main>;
  if (batch === null) return <main className="min-h-0 flex-1 overflow-y-auto p-6"><div className={panel}><h1 className="text-2xl font-bold">Payroll batch not found</h1><p className="mt-2 text-sm text-[#73718A]">This reference batch does not exist in the Payroll Management dashboard.</p><Link className="mt-4 inline-block font-semibold text-violet-700" href="/hr/payroll-management">Back to Payroll Management</Link></div></main>;

  const kpis = [
    { label: "Included Employees", value: batch.count.toLocaleString(), icon: LuUsersRound },
    { label: "Total Earnings", value: money(batch.earnings), icon: LuTrendingUp },
    { label: "Total Deductions", value: money(batch.deductions), icon: LuTrendingDown },
    { label: "Net Payable", value: money(batch.earnings - batch.deductions), icon: LuWallet },
  ];
  return <main className="min-h-0 flex-1 overflow-y-auto p-4 text-[#17152D] [scrollbar-color:#C4B5FD_transparent] [scrollbar-width:thin] sm:p-6">
    <div className="mx-auto max-w-[1600px] space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <button onClick={leave} className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-violet-700 hover:underline"><LuArrowLeft size={17} /> Back to Payroll Management</button>
          <h1 className="flex items-center gap-2 text-[28px] font-bold"><LuLayers className="text-violet-700" /> Payroll Batch Details</h1>
          <p className="mt-1 text-sm text-[#73718A]">Reference payroll batch {batch.id} · illustrative data, not a persisted payroll result.</p>
        </div>
        {editable && !editing && <button onClick={() => setEditing(true)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#7C3AED] px-4 text-sm font-semibold text-white hover:bg-[#6D28D9]"><LuPencil size={17} /> Edit Draft</button>}
      </header>
      {toast && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{toast}</div>}
      {editing && !editable && <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Only locally created Draft reference batches can be edited. This batch is {batch.status}.</div>}
      <section className={`${panel} grid gap-4 sm:grid-cols-2 xl:grid-cols-4`} aria-label="Batch identity">
        {[{ label: "Batch Number", value: batch.id, icon: LuLayers }, { label: "Processing Status", value: batch.status, icon: LuActivity }, { label: "Cut-off Period", value: `${date(batch.start)} – ${date(batch.end)}`, icon: LuCalendarDays }, { label: "Prepared By", value: batch.prepared, icon: LuUserRound }].map(({ label, value, icon: Icon }) => <div key={label} className="min-w-0"><div className="flex items-center gap-2 text-xs font-medium text-[#73718A]"><Icon size={16} />{label}</div><div className="mt-2 break-words text-lg font-bold">{value}</div></div>)}
      </section>
      {editing && editable && <section className={panel}><h2 className="text-lg font-bold">Edit Demo Draft</h2><p className="mt-1 text-sm text-[#73718A]">Only the cut-off period is editable in this reference dashboard. Financial amounts remain calculated or read-only.</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Cut-off start<input className={field} type="date" value={start} onChange={(event) => { setStart(event.target.value); setDirty(true); setError(""); }} /></label><label className="text-sm font-medium">Cut-off end<input className={field} type="date" value={end} onChange={(event) => { setEnd(event.target.value); setDirty(true); setError(""); }} /></label></div>{error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}<div className="mt-5 flex flex-wrap gap-2"><button onClick={save} className="rounded-lg bg-[#7C3AED] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6D28D9]">Save Demo Draft</button><button onClick={() => dirty ? setDiscard(true) : setEditing(false)} className="rounded-lg border px-4 py-2 text-sm font-semibold">Cancel</button></div></section>}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Batch summary">{kpis.map(({ label, value, icon: Icon }) => <div key={label} className={panel}><div className="flex items-center gap-2 text-xs font-semibold text-[#73718A]"><Icon size={17} className="text-violet-700" />{label}</div><strong className="mt-3 block break-words text-xl">{value}</strong></div>)}</section>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className={panel}><h2 className="text-lg font-bold">Batch Overview</h2><p className="mt-1 text-sm text-[#73718A]">Processing counts in this reference record.</p><div className="mt-4"><PayrollStatusCards counts={batch.progress} onContinue={() => {}} showContinue={false} embedded /></div></div>
        <div className={panel}><h2 className="flex items-center gap-2 text-lg font-bold"><LuTriangleAlert className="text-amber-500" /> Adjustments &amp; Exceptions</h2><div className="mt-5 text-3xl font-bold text-violet-700">{batch.adjustments}</div><p className="mt-1 text-sm text-[#73718A]">Pending adjustments in the reference summary. Individual adjustment and validation records are unavailable.</p></div>
      </div>
      <section className={panel}><h2 className="flex items-center gap-2 text-lg font-bold"><LuTable className="text-violet-700" /> Employee Breakdown</h2><p className="mt-4 rounded-xl bg-[#F7F6FF] p-5 text-sm text-[#73718A]">Employee-level payroll breakdown is not available for this reference batch.</p></section>
      <section className={panel}><h2 className="flex items-center gap-2 text-lg font-bold"><LuHistory className="text-violet-700" /> History / Audit Timeline</h2><p className="mt-4 border-l-2 border-violet-200 py-3 pl-4 text-sm text-[#73718A]">No recorded audit events are available for this reference batch.</p></section>
    </div>
    {discard && <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"><div role="alertdialog" aria-modal="true" aria-labelledby="discard-title" aria-describedby="discard-message" className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"><h2 id="discard-title" className="text-lg font-bold">Discard Unsaved Changes?</h2><p id="discard-message" className="mt-2 text-sm text-[#73718A]">Your payroll batch contains unsaved changes.</p><div className="mt-5 flex justify-end gap-2"><button className="rounded-lg border px-3 py-2 text-sm" onClick={() => setDiscard(false)}>Keep Editing</button><button className="rounded-lg bg-violet-700 px-3 py-2 text-sm text-white" onClick={() => { setDiscard(false); setDirty(false); setEditing(false); setStart(batch.start); setEnd(batch.end); router.push("/hr/payroll-management"); }}>Discard Changes</button></div></div></div>}
  </main>;
}
