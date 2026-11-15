"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  LuArrowRight,
  LuCalendarDays,
  LuCheck,
  LuCircleX,
  LuFileText,
  LuHistory,
  LuPaperclip,
  LuTag,
  LuTrendingDown,
  LuTrendingUp,
  LuUndo2,
  LuUserRound,
  LuX,
} from "react-icons/lu";
import type {
  EmployeeCompensationReference,
  SalaryAdjustment,
} from "../compensation/types";

type Action = "Approve" | "Reject" | "Return for Revision";
const button =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600";
const neutral = `${button} border border-[#dedbed] bg-white text-[#302b48] hover:bg-violet-50`;
const primary = `${button} bg-violet-600 text-white hover:bg-violet-700`;
const card = "rounded-xl border border-[#edeaf6] bg-white p-4 sm:p-5";
const money = (value: string | number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value));
const date = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Intl.DateTimeFormat("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${value}T00:00:00Z`))
    : value;
function initials(name: string) {
  const words = name.trim().split(/\s+/);
  return (
    words.length > 1 ? words[0][0] + words[1][0] : words[0]?.slice(0, 2) || "?"
  ).toUpperCase();
}
function Avatar({
  employee,
  small = false,
}: {
  employee?: EmployeeCompensationReference;
  small?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-violet-100 font-semibold text-violet-700 ${small ? "h-11 w-11 text-sm" : "h-14 w-14 text-lg sm:h-16 sm:w-16"}`}
    >
      {initials(employee?.name || "?")}
    </div>
  );
}
function Identity({
  employee,
  id,
  small = false,
}: {
  employee?: EmployeeCompensationReference;
  id: string;
  small?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-4">
      <Avatar employee={employee} small={small} />
      <div className="min-w-0">
        <p className="break-words font-bold text-[#17152D]">
          {employee?.name || "Unknown employee"}
        </p>
        <p className="mt-0.5 text-sm text-[#73718A]">{id}</p>
        {!small && (
          <p className="mt-2 text-sm leading-relaxed text-[#514c67]">
            {employee?.position || "Position unavailable"}
            <br />
            {employee?.department || "Department unavailable"}
          </p>
        )}
      </div>
    </div>
  );
}
function Status({ status }: { status: SalaryAdjustment["status"] }) {
  const colors =
    status === "Approved"
      ? "bg-green-100 text-green-700"
      : status === "Rejected"
        ? "bg-red-100 text-red-700"
        : status === "Returned for Revision"
          ? "bg-violet-100 text-violet-700"
          : status === "Pending Review"
            ? "bg-amber-100 text-amber-800"
            : "bg-slate-100 text-slate-600";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${colors}`}
    >
      {status}
    </span>
  );
}
function difference(record: SalaryAdjustment) {
  const delta = Number(record.proposed) - Number(record.current);
  return {
    delta,
    label: `${delta > 0 ? "+" : ""}${money(delta)} (${delta > 0 ? "+" : ""}${((delta / Number(record.current)) * 100).toFixed(2)}%)`,
  };
}
function Comparison({ record }: { record: SalaryAdjustment }) {
  const { delta, label } = difference(record);
  return (
    <section className={card}>
      <h3 className="mb-4 text-sm font-bold">Salary Change (Base Pay)</h3>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1 rounded-lg bg-[#f5f4f8] p-3">
          <p className="text-xs text-[#73718A]">Current Base Pay</p>
          <p className="mt-1 break-words font-bold">
            {money(record.current)}{" "}
            <span className="text-xs font-medium">
              / {record.basis.toLowerCase()}
            </span>
          </p>
        </div>
        <LuArrowRight
          aria-hidden="true"
          className="mx-auto rotate-90 text-violet-600 sm:rotate-0"
          size={20}
        />
        <div className="min-w-0 flex-1 rounded-lg bg-violet-50 p-3">
          <p className="text-xs text-[#73718A]">Proposed Base Pay</p>
          <p className="mt-1 break-words font-bold text-violet-700">
            {money(record.proposed)}{" "}
            <span className="text-xs font-medium">
              / {record.basis.toLowerCase()}
            </span>
          </p>
        </div>
      </div>
      <div
        className={`mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${delta > 0 ? "bg-green-100 text-green-700" : delta < 0 ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}
      >
        {delta < 0 ? <LuTrendingDown /> : <LuTrendingUp />}
        {label}
      </div>
      {delta < 0 && (
        <p className="mt-2 text-xs text-[#73718A]">
          Salary decrease requires heightened review.
        </p>
      )}
    </section>
  );
}
function Info({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span className="mt-0.5 shrink-0 text-violet-600">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-[#73718A]">{label}</p>
        <p className="mt-1 break-words text-sm font-semibold">{value || "—"}</p>
      </div>
    </div>
  );
}
function Timeline({ record }: { record: SalaryAdjustment }) {
  return (
    <section className={card}>
      <h3 className="flex items-center gap-2 text-sm font-bold">
        <LuHistory className="text-violet-600" size={18} />
        Approval Timeline
      </h3>
      <ol className="mt-5 space-y-0">
        {record.events.map((event, i) => {
          const rejected = event.action === "Rejected";
          const returned = event.action === "Returned for Revision";
          return (
            <li
              key={`${event.action}-${i}`}
              className="relative flex gap-3 pb-5 last:pb-0"
            >
              {i < record.events.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute left-[11px] top-6 h-[calc(100%-1.5rem)] w-px bg-violet-200"
                />
              )}
              <span
                className={`relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white ${rejected ? "bg-red-500" : returned ? "bg-amber-500" : "bg-violet-600"}`}
              >
                {rejected ? (
                  <LuX size={14} />
                ) : returned ? (
                  <LuUndo2 size={14} />
                ) : (
                  <LuCheck size={14} />
                )}
              </span>
              <div className="min-w-0 text-sm">
                <p className="font-semibold">{event.action}</p>
                <p className="mt-1 break-words text-xs leading-relaxed text-[#73718A]">
                  {event.actor} · {date(event.time)}
                </p>
                {event.note && (
                  <p className="mt-2 whitespace-pre-wrap break-words text-[#514c67]">
                    {event.note}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
function ReviewDialog({
  action,
  record,
  employee,
  note,
  onNote,
  onCancel,
  onConfirm,
}: {
  action: Action;
  record: SalaryAdjustment;
  employee?: EmployeeCompensationReference;
  note: string;
  onNote: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const el = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    el?.showModal();
    return () => {
      el?.close();
      previous?.focus();
    };
  }, []);
  const title =
    action === "Approve"
      ? "Approve Salary Adjustment?"
      : action === "Reject"
        ? "Reject Salary Adjustment?"
        : "Return for Revision?";
  const submit = () => {
    if (action !== "Approve" && !note.trim()) {
      setError(
        action === "Reject"
          ? "Enter a rejection reason."
          : "Enter revision feedback.",
      );
      return;
    }
    onConfirm();
  };
  return (
    <dialog
      ref={ref}
      aria-labelledby="review-title"
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-[480px] overflow-hidden rounded-2xl border border-[#edeaf6] bg-white p-0 text-[#17152D] shadow-2xl backdrop:bg-[#17152d]/50"
    >
      <div className="flex max-h-[90dvh] min-h-0 flex-col">
        <header className="flex shrink-0 items-start gap-3 border-b border-[#edeaf6] px-5 py-4">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${action === "Reject" ? "bg-red-100 text-red-600" : "bg-violet-100 text-violet-700"}`}
          >
            {action === "Approve" ? (
              <LuCheck />
            ) : action === "Reject" ? (
              <LuCircleX />
            ) : (
              <LuUndo2 />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="review-title" className="font-bold">
              {title}
            </h2>
            <p className="mt-1 text-sm text-[#73718A]">
              {action === "Approve"
                ? "Review the proposed compensation change before confirming."
                : action === "Reject"
                  ? "Provide a reason for this decision."
                  : "Provide feedback so the requester can revise this salary adjustment."}
            </p>
          </div>
          <button
            onClick={onCancel}
            aria-label="Close confirmation"
            className="rounded p-1 hover:bg-violet-50"
          >
            <LuX size={20} />
          </button>
        </header>
        <div className="min-h-0 overflow-y-auto px-5 py-4">
          <Identity employee={employee} id={record.employeeId} small />
          <p className="mt-3 text-xs text-[#73718A]">Request {record.id}</p>
          <dl className="mt-4 space-y-2 rounded-lg bg-[#f8f7fc] p-4 text-sm">
            {[
              [
                "Current Base Pay",
                `${money(record.current)} / ${record.basis.toLowerCase()}`,
              ],
              [
                "Proposed Base Pay",
                `${money(record.proposed)} / ${record.basis.toLowerCase()}`,
              ],
              ["Difference", difference(record).label],
              ["Effective Date", date(record.effective)],
            ].map(([label, value]) => (
              <div
                className="flex flex-wrap justify-between gap-x-3 gap-y-1"
                key={label}
              >
                <dt className="text-[#73718A]">{label}</dt>
                <dd className="break-words font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
          {action === "Approve" ? (
            <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
              This action approves the proposed salary adjustment in the
              frontend demo. It does not modify live payroll or employee
              compensation records.
            </p>
          ) : (
            <label
              className="mt-4 block text-sm font-semibold"
              htmlFor="review-note"
            >
              {action === "Reject" ? "Rejection Reason" : "Revision Feedback"}{" "}
              <span className="text-red-600">*</span>
              <textarea
                id="review-note"
                autoFocus
                maxLength={500}
                value={note}
                onChange={(e) => {
                  onNote(e.target.value);
                  setError("");
                }}
                placeholder={
                  action === "Reject"
                    ? "Enter reason for rejection..."
                    : "Describe the information or changes required..."
                }
                aria-invalid={!!error}
                aria-describedby={error ? "review-error" : undefined}
                className="mt-2 min-h-24 w-full resize-y rounded-lg border border-[#dedbed] p-3 text-sm font-normal outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
              />
              <span className="block text-right text-xs font-normal text-[#73718A]">
                {note.length} / 500
              </span>
              {error && (
                <span
                  id="review-error"
                  role="alert"
                  className="block text-xs font-normal text-red-600"
                >
                  {error}
                </span>
              )}
            </label>
          )}
        </div>
        <footer className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-[#edeaf6] px-5 py-4">
          <button className={neutral} onClick={onCancel}>
            Cancel
          </button>
          <button
            className={
              action === "Reject"
                ? `${button} bg-red-600 text-white hover:bg-red-700`
                : primary
            }
            onClick={submit}
          >
            {action === "Approve"
              ? "Confirm Approval"
              : action === "Reject"
                ? "Reject Request"
                : "Return for Revision"}
          </button>
        </footer>
      </div>
    </dialog>
  );
}
export default function SalaryAdjustmentDetails({
  record,
  employee,
  role,
  action,
  note,
  onNote,
  onClose,
  onAction,
  onCancelAction,
  onConfirm,
  onRevise,
}: {
  record: SalaryAdjustment;
  employee?: EmployeeCompensationReference;
  role: "Company Admin" | "HR";
  action: Action | null;
  note: string;
  onNote: (value: string) => void;
  onClose: () => void;
  onAction: (action: Action) => void;
  onCancelAction: () => void;
  onConfirm: () => void;
  onRevise: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    const main = document.querySelector("main");
    const old = main?.style.overflowY;
    if (main) main.style.overflowY = "hidden";
    el?.showModal();
    return () => {
      el?.close();
      if (main) main.style.overflowY = old || "";
      previous?.focus();
    };
  }, []);
  return (
    <>
      <dialog
        ref={ref}
        aria-labelledby="salary-detail-title"
        onCancel={(e) => {
          e.preventDefault();
          onClose();
        }}
        className="fixed inset-0 m-auto max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-[1050px] overflow-hidden rounded-2xl border border-[#edeaf6] bg-white p-0 text-[#17152D] shadow-2xl backdrop:bg-[#17152d]/60 sm:max-h-[90dvh]"
      >
        <div className="flex max-h-[92dvh] min-h-0 flex-col sm:max-h-[90dvh]">
          <header className="flex shrink-0 items-start gap-3 border-b border-[#edeaf6] px-4 py-4 sm:px-6">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
              <LuFileText size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id="salary-detail-title" className="text-lg font-bold">
                Salary Adjustment Details
              </h2>
              <p className="mt-1 text-sm text-[#73718A]">
                Review employee compensation changes and approval information.
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close details"
              className="rounded p-1 hover:bg-violet-50"
            >
              <LuX size={20} />
            </button>
          </header>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[#faf9ff] p-4 sm:p-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-bold">{record.id}</span>
              <Status status={record.status} />
            </div>
            <div className="grid gap-4 md:grid-cols-[0.8fr_1.2fr]">
              <section className={card}>
                <h3 className="mb-4 text-sm font-bold">Employee Information</h3>
                <Identity employee={employee} id={record.employeeId} />
                <p className="mt-4 text-xs text-[#73718A]">
                  Current pay grade:{" "}
                  <span className="font-semibold text-[#514c67]">
                    {employee?.grade || "Not available"}
                  </span>
                </p>
              </section>
              <Comparison record={record} />
            </div>
            <section
              aria-label="Request information"
              className={`${card} grid grid-cols-1 gap-5 min-[400px]:grid-cols-2 lg:grid-cols-4`}
            >
              <Info
                icon={<LuCalendarDays size={18} />}
                label="Effective Date"
                value={date(record.effective)}
              />
              <Info
                icon={<LuUserRound size={18} />}
                label="Requested By"
                value={record.requestedBy}
              />
              <Info
                icon={<LuCalendarDays size={18} />}
                label="Request Date"
                value={date(record.requestedAt)}
              />
              <Info
                icon={<LuTag size={18} />}
                label="Adjustment Category"
                value={record.category}
              />
            </section>
            <div className="grid items-start gap-4 md:grid-cols-2">
              <div className="space-y-4">
                <section className={card}>
                  <h3 className="flex items-center gap-2 text-sm font-bold">
                    <LuFileText className="text-violet-600" size={18} />
                    Reason for Adjustment
                  </h3>
                  <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-[#514c67]">
                    {record.reason}
                  </p>
                </section>
                <section className={card}>
                  <h3 className="flex items-center gap-2 text-sm font-bold">
                    <LuPaperclip className="text-violet-600" size={18} />
                    Supporting Documents
                  </h3>
                  {record.document ? (
                    <div className="mt-3 flex items-start gap-3 rounded-lg bg-[#f8f7fc] p-3">
                      <LuFileText className="mt-0.5 shrink-0 text-violet-600" />
                      <div className="min-w-0">
                        <p className="break-words text-sm font-semibold">
                          {record.document}
                        </p>
                        <p className="mt-1 text-xs text-[#73718A]">
                          Metadata only · file unavailable in this demo
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-[#73718A]">
                      No supporting documents attached.
                    </p>
                  )}
                </section>
                {record.notes && (
                  <section className={card}>
                    <h3 className="text-sm font-bold">Reviewer Notes</h3>
                    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-[#514c67]">
                      {record.notes}
                    </p>
                  </section>
                )}
              </div>
              <Timeline record={record} />
            </div>
          </div>
          <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[#edeaf6] bg-white px-4 py-4 sm:px-6">
            <button className={neutral} onClick={onClose}>
              Close
            </button>
            <div className="flex flex-wrap gap-2">
              {record.status === "Pending Review" &&
                role === "Company Admin" && (
                  <>
                    <button
                      className={`${button} border border-red-300 text-red-600 hover:bg-red-50`}
                      onClick={() => onAction("Reject")}
                    >
                      <LuCircleX />
                      Reject
                    </button>
                    <button
                      className={`${button} border border-violet-300 text-violet-700 hover:bg-violet-50`}
                      onClick={() => onAction("Return for Revision")}
                    >
                      <LuUndo2 />
                      Return for Revision
                    </button>
                    <button
                      className={primary}
                      onClick={() => onAction("Approve")}
                    >
                      <LuCheck />
                      Approve
                    </button>
                  </>
                )}
              {record.status === "Returned for Revision" && role === "HR" && (
                <button className={primary} onClick={onRevise}>
                  Revise and resubmit
                </button>
              )}
            </div>
          </footer>
        </div>
      </dialog>
      {action && (
        <ReviewDialog
          action={action}
          record={record}
          employee={employee}
          note={note}
          onNote={onNote}
          onCancel={onCancelAction}
          onConfirm={onConfirm}
        />
      )}
    </>
  );
}
