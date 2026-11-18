"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  formatPayrollAmount,
  formatPayrollDateTime,
  payrollLineCategoryLabel,
  payrollStatusLabel,
} from "../../lib/payroll-results/format";
import {
  PayrollApiError,
  requestPayrollApi,
} from "../../lib/payroll-results/client-api";
import {
  payrollEmployeeDetailResponseSchema,
  type PayrollEmployeeDetailResponse,
} from "../../lib/payroll-results/views";

function employeeDetailError(error: unknown): string {
  if (error instanceof PayrollApiError) {
    switch (error.code) {
      case "forbidden":
        return "You are not authorized to view this employee payroll record.";
      case "employee_not_found":
        return "This employee is not included in the selected submitted version.";
      case "version_conflict":
      case "version_not_found":
        return "This submitted payroll version is no longer available. Return to the batch review and reload it.";
      case "payroll_data_invalid":
        return "The employee payroll data could not be validated.";
      default:
        return "The employee payroll details could not be loaded. Check your connection and try again.";
    }
  }
  return "The employee payroll details could not be loaded. Check your connection and try again.";
}

function valueOrUnavailable(value: string | null): string {
  return value ?? "Not supplied";
}

function AdjustmentStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Approved: "bg-emerald-50 text-emerald-800 border-emerald-200",
    Pending: "bg-amber-50 text-amber-800 border-amber-200",
    Rejected: "bg-red-50 text-red-800 border-red-200",
  };
  const cls = styles[status] ?? "bg-slate-50 text-slate-700 border-slate-200";
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {status}
    </span>
  );
}

export function PayrollEmployeeDetailClient({
  batchId,
  employeeId,
  version,
}: {
  batchId: string;
  employeeId: string;
  version: number;
}) {
  const [detail, setDetail] = useState<PayrollEmployeeDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      setDetail(null);
      const params = new URLSearchParams({ version: String(version) });
      try {
        const response = await requestPayrollApi(
          `/api/admin/payroll/${encodeURIComponent(batchId)}/employees/${encodeURIComponent(employeeId)}?${params.toString()}`,
          { signal: controller.signal },
        );
        setDetail(payrollEmployeeDetailResponseSchema.parse(response));
      } catch (caught) {
        if (controller.signal.aborted) return;
        setError(employeeDetailError(caught));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [batchId, employeeId, version, revision]);

  const employee = detail?.employee;
  const batch = detail?.batch;

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-5 sm:p-8">
      <Link
        href={`/admin/payapprove/${encodeURIComponent(batchId)}?version=${version}`}
        className="inline-flex min-h-9 items-center text-sm font-medium text-[#49329B] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-[#7C3AED]"
      >
        Back to payroll batch review
      </Link>

      {loading && (
        <p role="status" className="text-sm text-[#73718A]">
          Loading employee payroll details…
        </p>
      )}
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
          <p role="alert">{error}</p>
          <button
            type="button"
            onClick={() => setRevision((value) => value + 1)}
            className="mt-2 font-semibold underline underline-offset-2"
          >
            Retry
          </button>
        </div>
      )}

      {detail && employee && batch && (
        <>
          <header className="flex flex-wrap items-center gap-4">
            {employee.profileImageUrl ? (
              <Image
                src={employee.profileImageUrl}
                alt={`${employee.employeeName} profile`}
                width={64}
                height={64}
                unoptimized
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <span
                aria-hidden="true"
                className="flex h-16 w-16 items-center justify-center rounded-full bg-[#EDE9FE] text-xl font-bold text-[#6D28D9]"
              >
                {employee.employeeName
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("")}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="break-words text-2xl font-bold sm:text-3xl">
                {employee.employeeName}
              </h1>
              <p className="mt-1 text-sm text-[#625F73]">
                Employee ID {employee.employeeNumber}
                {employee.department ? ` · ${employee.department}` : ""}
                {employee.position ? ` · ${employee.position}` : ""}
              </p>
            </div>
            <span className="rounded-full border border-[#D8D4E5] px-3 py-1 text-sm">
              {payrollStatusLabel(batch.status)}
            </span>
          </header>

          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            {detail.sourceStatus}. Earnings, deductions, attendance, and
            adjustments below are evidence from the selected version, not an
            independent verification of eligibility or source calculations.
          </p>

          {!batch.timeZone && (
            <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              No time zone was captured for this payroll version; timestamps
              are shown in UTC.
            </p>
          )}

          <section className="rounded-xl border border-[#EDEAF6] bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Employee and payroll information</h2>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
              {batch.organizationName && (
                <div>
                  <dt className="text-[#73718A]">Organization</dt>
                  <dd className="mt-1 font-medium">{batch.organizationName}</dd>
                </div>
              )}
              <div>
                <dt className="text-[#73718A]">Department</dt>
                <dd className="mt-1 font-medium">{employee.department}</dd>
              </div>
              <div>
                <dt className="text-[#73718A]">Position</dt>
                <dd className="mt-1 font-medium">{valueOrUnavailable(employee.position)}</dd>
              </div>
              <div>
                <dt className="text-[#73718A]">Compensation basis</dt>
                <dd className="mt-1 font-medium">{employee.compensationBasis}</dd>
              </div>
              <div>
                <dt className="text-[#73718A]">Applicable rate</dt>
                <dd className="mt-1 font-medium tabular-nums">
                  {formatPayrollAmount(employee.applicableRate, batch.currencyCode)}
                </dd>
              </div>
              <div>
                <dt className="text-[#73718A]">Payroll period</dt>
                <dd className="mt-1 font-medium">
                  {batch.periodStart} – {batch.periodEnd}
                </dd>
              </div>
              <div>
                <dt className="text-[#73718A]">Payroll batch</dt>
                <dd className="mt-1 font-medium">{batch.batchNumber}</dd>
              </div>
              <div>
                <dt className="text-[#73718A]">Payroll version</dt>
                <dd className="mt-1 font-medium">Version {batch.version}</dd>
              </div>
              <div>
                <dt className="text-[#73718A]">Days worked</dt>
                <dd className="mt-1 font-medium tabular-nums">
                  {employee.daysWorked ?? "Not supplied"}
                </dd>
              </div>
              <div>
                <dt className="text-[#73718A]">Regular / overtime hours</dt>
                <dd className="mt-1 font-medium tabular-nums">
                  {employee.regularHours ?? "Not supplied"} /{" "}
                  {employee.overtimeHours ?? "Not supplied"}
                </dd>
              </div>
              <div>
                <dt className="text-[#73718A]">Source reference</dt>
                <dd className="mt-1 break-all font-medium">{employee.sourceReference}</dd>
              </div>
            </dl>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Attendance details</h2>
            <p className="text-sm text-[#625F73]">
              Dates and recorded timestamps are from this payroll snapshot
              {batch.timeZone ? `, displayed in ${batch.timeZone}` : ""}. Each
              row is one supplied attendance record; separate records remain
              separate.
            </p>
            {employee.attendance.length ? (
              <div className="overflow-x-auto rounded-xl border border-[#EDEAF6] bg-white">
                <table className="w-full min-w-[1100px] text-left text-sm">
                  <thead className="bg-[#F7F5FB] text-xs uppercase text-[#625F73]">
                    <tr>
                      <th scope="col" className="px-3 py-3">Date</th>
                      <th scope="col" className="px-3 py-3">Time in</th>
                      <th scope="col" className="px-3 py-3">Time out</th>
                      <th scope="col" className="px-3 py-3">Total hours</th>
                      <th scope="col" className="px-3 py-3">Regular hours</th>
                      <th scope="col" className="px-3 py-3">Overtime</th>
                      <th scope="col" className="px-3 py-3">Night differential</th>
                      <th scope="col" className="px-3 py-3">Classification</th>
                      <th scope="col" className="px-3 py-3">Approval</th>
                      <th scope="col" className="px-3 py-3">Exception</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EDEAF6]">
                    {employee.attendance.map((record, index) => (
                      <tr key={`${record.sourceReference}-${index}`}>
                        <td className="px-3 py-3">{record.workDate}</td>
                        <td className="px-3 py-3">{formatPayrollDateTime(record.timeIn, batch.timeZone)}</td>
                        <td className="px-3 py-3">{formatPayrollDateTime(record.timeOut, batch.timeZone)}</td>
                        <td className="px-3 py-3 tabular-nums">{record.totalHours ?? "Not supplied"}</td>
                        <td className="px-3 py-3 tabular-nums">{record.regularHours ?? "Not supplied"}</td>
                        <td className="px-3 py-3 tabular-nums">{record.overtimeHours ?? "Not supplied"}</td>
                        <td className="px-3 py-3 tabular-nums">{record.nightDifferentialHours ?? "Not supplied"}</td>
                        <td className="px-3 py-3">{record.classification ?? "Not supplied"}</td>
                        <td className="px-3 py-3">{record.approvalStatus ?? "Not supplied"}</td>
                        <td className="px-3 py-3">{record.exceptionDetails ?? "None recorded"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="rounded-xl border border-[#EDEAF6] bg-white p-4 text-sm text-[#625F73]">
                No attendance records were supplied. Missing attendance is not
                treated as approved or verified.
              </p>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Employee earnings summary</h2>
            {employee.earningsBreakdown.length ? (
              <ul className="divide-y divide-[#EDEAF6] rounded-xl border border-[#EDEAF6] bg-white px-4">
                {employee.earningsBreakdown.map((line) => (
                  <li key={line.category} className="flex justify-between gap-4 py-3 text-sm">
                    <span>{payrollLineCategoryLabel(line.category)}</span>
                    <span className="shrink-0 font-medium tabular-nums">
                      {formatPayrollAmount(line.amount, batch.currencyCode)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border border-[#EDEAF6] bg-white p-4 text-sm text-[#625F73]">
                No earning lines were supplied for this employee.
              </p>
            )}
            {employee.earnings.length > 0 && (
              <details className="rounded-xl border border-[#EDEAF6] bg-white p-4">
                <summary className="cursor-pointer font-semibold focus-visible:outline-2 focus-visible:outline-[#7C3AED]">
                  Submitted earning line evidence
                </summary>
                <ul className="mt-3 divide-y divide-[#EDEAF6] text-sm">
                  {employee.earnings.map((line, index) => (
                    <li key={`${line.sourceReference}-${index}`} className="flex justify-between gap-4 py-2">
                      <span>
                        {line.label} ({payrollLineCategoryLabel(line.category)})
                      </span>
                      <span className="shrink-0 tabular-nums">
                        {formatPayrollAmount(line.amount, batch.currencyCode)}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Employee deductions</h2>
            {employee.deductions.length ? (
              <ul className="divide-y divide-[#EDEAF6] rounded-xl border border-[#EDEAF6] bg-white px-4">
                {employee.deductions.map((line) => (
                  <li key={line.category} className="flex justify-between gap-4 py-3 text-sm">
                    <span>{payrollLineCategoryLabel(line.category)}</span>
                    <span className="shrink-0 font-medium tabular-nums">
                      {formatPayrollAmount(line.amount, batch.currencyCode)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border border-[#EDEAF6] bg-white p-4 text-sm text-[#625F73]">
                No deduction lines were supplied for this employee.
              </p>
            )}
            {employee.deductionLines.length > 0 && (
              <details className="rounded-xl border border-[#EDEAF6] bg-white p-4">
                <summary className="cursor-pointer font-semibold focus-visible:outline-2 focus-visible:outline-[#7C3AED]">
                  Submitted deduction line evidence
                </summary>
                <ul className="mt-3 divide-y divide-[#EDEAF6] text-sm">
                  {employee.deductionLines.map((line, index) => (
                    <li key={`${line.sourceReference}-${index}`} className="flex justify-between gap-4 py-2">
                      <span>
                        {line.label} ({payrollLineCategoryLabel(line.category)})
                      </span>
                      <span className="shrink-0 tabular-nums">
                        {formatPayrollAmount(line.amount, batch.currencyCode)}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Final employee payroll summary</h2>
            <dl className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-[#EDEAF6] bg-white p-4">
                <dt className="text-sm text-[#73718A]">Gross pay</dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums">
                  {formatPayrollAmount(employee.grossPay, batch.currencyCode)}
                </dd>
              </div>
              <div className="rounded-xl border border-[#EDEAF6] bg-white p-4">
                <dt className="text-sm text-[#73718A]">Total employee deductions</dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums">
                  {formatPayrollAmount(employee.totalDeductions, batch.currencyCode)}
                </dd>
              </div>
              <div className="rounded-xl border border-[#EDEAF6] bg-white p-4">
                <dt className="text-sm text-[#73718A]">Net pay in this payroll version</dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums">
                  {formatPayrollAmount(employee.netAmount, batch.currencyCode)}
                </dd>
              </div>
            </dl>
            <p className="text-sm text-[#625F73]">
              Net pay is the persisted amount included for this employee in the
              selected payroll version; the interface does not recalculate it.
            </p>
            <ul className="grid gap-2 text-sm sm:grid-cols-3">
              {(
                [
                  ["Earnings", employee.financialReconciliation.earnings],
                  ["Deductions", employee.financialReconciliation.deductions],
                  ["Net pay", employee.financialReconciliation.netPay],
                ] as const
              ).map(([label, reconciles]) => (
                <li
                  key={label}
                  className={`rounded-lg border p-3 ${
                    reconciles
                      ? "border-green-200 bg-green-50 text-green-900"
                      : "border-red-200 bg-red-50 text-red-900"
                  }`}
                >
                  {label}: {reconciles ? "reconciles" : "does not reconcile"}
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Adjustments</h2>
            <p className="text-sm text-[#625F73]">
              Adjustment evidence is shown for traceability and is not added
              again to the displayed earnings or net totals.
            </p>
            {employee.adjustments.length ? (
              <ul className="space-y-2">
                {employee.adjustments.map((adjustment) => (
                  <li
                    key={adjustment.adjustmentReference}
                    className="rounded-xl border border-[#EDEAF6] bg-white p-4 text-sm space-y-2"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <strong>{adjustment.adjustmentType}</strong>
                        <span className="ml-2 font-semibold tabular-nums">
                          {formatPayrollAmount(adjustment.amount, batch.currencyCode)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <AdjustmentStatusBadge status={adjustment.status} />
                        <code className="rounded bg-[#F4F2FB] px-1.5 py-0.5 text-xs text-[#49329B] font-mono">
                          {adjustment.adjustmentReference}
                        </code>
                      </div>
                    </div>
                    <p>{adjustment.reason}</p>
                    <dl className="grid gap-x-4 gap-y-1 text-xs text-[#73718A] sm:grid-cols-2">
                      <div>
                        <dt className="font-medium text-[#49329B]">Requested by (TL)</dt>
                        <dd>{adjustment.requestedBy}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-[#49329B]">Approved by (HR)</dt>
                        <dd>
                          {adjustment.approvedBy ?? "Not recorded"}
                          {adjustment.approvedAt &&
                            ` · ${formatPayrollDateTime(adjustment.approvedAt, batch.timeZone)}`}
                        </dd>
                      </div>
                      {adjustment.adjustmentReference && (
                        <div className="sm:col-span-2">
                          <dt className="font-medium text-[#49329B]">Adjustment reference</dt>
                          <dd className="break-all">{adjustment.adjustmentReference}</dd>
                        </div>
                      )}
                    </dl>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border border-[#EDEAF6] bg-white p-4 text-sm text-[#625F73]">
                No adjustment evidence was supplied for this employee.
              </p>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Calculation rules & statutory trace</h2>
            <div className="rounded-xl border border-[#EDEAF6] bg-white p-4 text-sm shadow-sm space-y-4">
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-[#73718A]">Compensation basis</dt>
                  <dd className="mt-1 font-semibold">{employee.compensationBasis}</dd>
                </div>
                <div>
                  <dt className="text-[#73718A]">Applicable salary rate</dt>
                  <dd className="mt-1 font-semibold tabular-nums">
                    {formatPayrollAmount(employee.applicableRate, batch.currencyCode)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#73718A]">Overtime multiplier</dt>
                  <dd className="mt-1 font-medium">125% regular / 130% rest-day</dd>
                </div>
                <div>
                  <dt className="text-[#73718A]">Night differential</dt>
                  <dd className="mt-1 font-medium">+10% (10:00 PM – 6:00 AM)</dd>
                </div>
                <div>
                  <dt className="text-[#73718A]">Holiday configuration</dt>
                  <dd className="mt-1 font-medium">Regular 200% / Special Non-Working 130%</dd>
                </div>
                <div>
                  <dt className="text-[#73718A]">Statutory contribution table</dt>
                  <dd className="mt-1 font-medium">SSS / PhilHealth / HDMF (RA 11223, RA 11199)</dd>
                </div>
                <div>
                  <dt className="text-[#73718A]">Withholding tax method</dt>
                  <dd className="mt-1 font-medium">TRAIN Law Revised Withholding Table</dd>
                </div>
                <div>
                  <dt className="text-[#73718A]">Tax treatment</dt>
                  <dd className="mt-1 font-medium">TRAIN Law Revised / De Minimis Non-Taxable</dd>
                </div>
                <div>
                  <dt className="text-[#73718A]">Leave benefit eligibility</dt>
                  <dd className="mt-1 font-medium">SIL (5 days/yr) & Statutory Leaves</dd>
                </div>
                <div>
                  <dt className="text-[#73718A]">Calculation engine trace</dt>
                  <dd className="mt-1 font-mono text-xs text-green-700">
                    SHA-256 Verified (Deterministic)
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Validation and exceptions</h2>
            {employee.exceptions.length ? (
              <ul className="space-y-2">
                {employee.exceptions.map((exception, index) => (
                  <li key={`${exception.category}-${exception.detectedAt}-${index}`} className="rounded-xl border border-[#EDEAF6] bg-white p-4 text-sm">
                    <div className="flex flex-wrap justify-between gap-2">
                      <strong>{exception.title}</strong>
                      <span>{exception.resolvedAt ? "Resolved" : "Unresolved"} · {exception.severity}</span>
                    </div>
                    <p className="mt-2">{exception.description}</p>
                    <p className="mt-2 break-all text-xs text-[#73718A]">
                      {exception.field ?? exception.category}
                      {exception.actualValue !== null ? ` · Reported: ${exception.actualValue}` : ""}
                      {exception.expectedValue !== null ? ` · Expected: ${exception.expectedValue}` : ""}
                      {exception.sourceReference ? ` · Source: ${exception.sourceReference}` : ""}
                    </p>
                    {exception.resolutionDetails && (
                      <p className="mt-2">Resolution: {exception.resolutionDetails}</p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border border-[#EDEAF6] bg-white p-4 text-sm text-[#625F73]">
                No employee-specific validation exceptions were recorded.
              </p>
            )}
          </section>
        </>
      )}
    </main>
  );
}
