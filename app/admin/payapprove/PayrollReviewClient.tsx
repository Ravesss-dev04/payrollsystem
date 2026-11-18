"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import {
  formatPayrollAmount,
  formatPayrollDateTime,
  payrollLineCategoryLabel,
  payrollStatusLabel,
} from "../../lib/payroll-results/format";
import {
  PayrollApiError,
  requestPayrollApi,
  requestPayrollReport,
} from "../../lib/payroll-results/client-api";
import {
  payrollReviewResponseSchema,
  type PayrollReviewResponse,
} from "../../lib/payroll-results/views";
import { payrollBatchInputSchema } from "../../lib/payroll-results/schemas";
import { PayrollEmployeeList } from "./PayrollEmployeeList";

type Decision = "Approved" | "Rejected" | "Returned";

function requestError(error: unknown): string {
  if (error instanceof PayrollApiError) {
    switch (error.code) {
      case "forbidden":
        return "You are not authorized to perform this action.";
      case "validation_blocked":
        return "This version has unresolved validation exceptions. Return it to HR for correction before approval.";
      case "version_conflict":
        return "This version changed while you were reviewing it. Reload the latest batch state.";
      case "invalid_request":
        return "Check the decision and reason, then try again.";
      case "batch_number_conflict":
        return "That batch number is already in use.";
      case "version_not_found":
        return "The selected payroll version was not found.";
      case "session_validation_required":
        return "Refresh the page to validate your session before changing payroll.";
      case "report_too_large":
        return "This report exceeds the safe download size. Contact a system administrator; approval status was not changed.";
      case "invalid_report_data":
      case "report_generation_failed":
      case "invalid_report_response":
        return "The report could not be generated from this snapshot. No approval status was changed.";
      default:
        return "The payroll request could not be completed. Refresh and try again.";
    }
  }
  return error instanceof Error
    ? error.message
    : "The payroll request could not be completed.";
}

function DownloadReportButton({
  review,
}: {
  review: PayrollReviewResponse;
}) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  async function download() {
    setDownloading(true);
    setError("");
    try {
      const report = await requestPayrollReport(
        `/api/admin/payroll/${encodeURIComponent(review.batch.id)}/report?version=${review.batch.version}`,
      );
      const objectUrl = URL.createObjectURL(report);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${review.batch.batchNumber}-v${review.batch.version}.xlsx`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (caught) {
      setError(requestError(caught));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={downloading}
        onClick={() => void download()}
        className="min-h-10 rounded-lg border border-[#D8D4E5] bg-white px-4 py-2 text-sm font-semibold text-[#49329B] hover:bg-[#F7F5FB] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {downloading ? "Preparing XLSX…" : "Download XLSX report"}
      </button>
      {error && <p role="alert" className="max-w-md text-sm text-red-800">{error}</p>}
    </div>
  );
}

function inputFromReview(review: PayrollReviewResponse) {
  return {
    batchNumber: review.batch.batchNumber,
    periodStart: review.batch.periodStart,
    periodEnd: review.batch.periodEnd,
    cutoffReference: review.batch.cutoffReference,
    currencyCode: review.batch.currencyCode,
    sourceReference: review.batch.sourceReference,
    sourceCalculatedAt: review.batch.sourceCalculatedAt,
    grossPayable: review.batch.grossPayable,
    totalDeductions: review.batch.totalDeductions,
    netPayable: review.batch.netPayable,
    employerContributions: review.batch.employerContributions,
    laborCost: review.batch.laborCost,
    overtimeCost: review.batch.overtimeCost,
    employees: review.employees.map((employee) => ({
      employeeId: employee.employeeReference,
      employeeNumber: employee.employeeNumber,
      employeeName: employee.employeeName,
      department: employee.department,
      position: employee.position,
      compensationBasis: employee.compensationBasis,
      applicableRate: employee.applicableRate,
      daysWorked: employee.daysWorked,
      regularHours: employee.regularHours,
      overtimeHours: employee.overtimeHours,
      grossPay: employee.grossPay,
      totalDeductions: employee.totalDeductions,
      netPay: employee.netPay,
      sourceReference: employee.sourceReference,
      earnings: employee.earnings,
      deductions: employee.deductions,
      attendance: employee.attendance,
      adjustments: employee.adjustments,
    })),
  };
}

function PayrollDraftActions({
  review,
  onChanged,
}: {
  review: PayrollReviewResponse;
  onChanged: () => void;
}) {
  const router = useRouter();
  const canEdit = review.batch.status === "Draft";
  const canCorrect = review.batch.status === "Returned";
  const canSubmit = canEdit;
  const [initialPayload] = useState(() =>
    JSON.stringify(inputFromReview(review), null, 2),
  );
  const [payload, setPayload] = useState(initialPayload);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const hasUnsavedChanges = payload !== initialPayload;

  if (!canEdit && !canCorrect && !canSubmit) {
    return (
      <section className="rounded-xl border border-[#EDEAF6] bg-white p-5">
        <h2 className="font-semibold">HR preparation</h2>
        <p className="mt-2 text-sm text-[#625F73]">
          This version is {payrollStatusLabel(review.batch.status)} and is
          read-only. Corrections can be created only for a version returned by
          Admin.
        </p>
      </section>
    );
  }

  function parsedInput() {
    return payrollBatchInputSchema.parse(JSON.parse(payload));
  }

  async function saveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const input = parsedInput();
      if (canEdit) {
        await requestPayrollApi(
          `/api/hr/payroll/${encodeURIComponent(review.batch.id)}/versions/${review.batch.version}`,
          { method: "PATCH", body: input },
        );
        setMessage("Draft saved.");
        onChanged();
      } else {
        const response = await requestPayrollApi(
          `/api/hr/payroll/${encodeURIComponent(review.batch.id)}/versions`,
          { method: "POST", body: input },
        );
        const result = z.object({ version: z.number().int().positive() }).parse(response);
        router.replace(
          `/hr/payroll/${encodeURIComponent(review.batch.id)}?version=${result.version}`,
        );
      }
    } catch (caught) {
      setError(
        caught instanceof PayrollApiError
          ? requestError(caught)
          : caught instanceof Error
            ? caught.message
            : "The payroll data could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function submitVersion() {
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      await requestPayrollApi(
        `/api/hr/payroll/${encodeURIComponent(review.batch.id)}/versions/${review.batch.version}/submit`,
        { method: "POST" },
      );
      setMessage("This version was submitted to Admin for review.");
      onChanged();
    } catch (caught) {
      setError(requestError(caught));
    } finally {
      setSubmitting(false);
    }
  }

  const returnDecision = review.decisions.find(
    (d) => d.decision === "Returned",
  );

  return (
    <section className="space-y-4 rounded-xl border border-[#EDEAF6] bg-white p-5 shadow-sm">
      {canCorrect && returnDecision && (
        <div
          role="alert"
          className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <span className="text-xl">↩️</span>
            <div className="space-y-1">
              <h3 className="font-semibold text-amber-950">
                Batch Returned for Correction
              </h3>
              <p className="text-xs text-amber-800">
                Returned by <strong>{returnDecision.actor}</strong> on{" "}
                {formatPayrollDateTime(
                  returnDecision.createdAt,
                  review.organization.timeZone,
                )}
              </p>
              {returnDecision.reason && (
                <div className="mt-2 rounded-lg border border-amber-200 bg-white/90 p-3 text-sm">
                  <p className="font-medium text-amber-950">
                    Administrator Correction Note:
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-amber-900">
                    {returnDecision.reason}
                  </p>
                </div>
              )}
              {review.exceptions.length > 0 && (
                <p className="mt-2 text-xs font-semibold text-amber-800">
                  ⚠️ {review.exceptions.length} employee record
                  {review.exceptions.length === 1 ? " has" : "s have"} unresolved
                  validation exceptions highlighted in the employee list below.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      <div>
        <h2 className="font-semibold">
          {canCorrect ? "Create correction version" : "HR preparation"}
        </h2>
        <p className="mt-1 text-sm text-[#625F73]">
          Enter the calculated results from your approved payroll source. This
          application reconciles submitted totals; it does not calculate salary
          or independently verify source records. Keep monetary values as
          decimal strings and retain source references.
        </p>
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
          {message}
        </p>
      )}
      <form onSubmit={(event) => void saveDraft(event)} className="space-y-3">
        <label htmlFor="payroll-results-json" className="text-sm font-medium">
          Payroll result data (JSON)
        </label>
        <textarea
          id="payroll-results-json"
          value={payload}
          onChange={(event) => setPayload(event.target.value)}
          rows={24}
          spellCheck={false}
          maxLength={5 * 1024 * 1024}
          aria-describedby="payroll-results-json-help"
          className="w-full rounded-lg border border-[#D8D4E5] px-3 py-2 font-mono text-xs outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20"
        />
        <p id="payroll-results-json-help" className="text-xs text-[#73718A]">
          Batch number is fixed for this batch. Dates, employee identifiers,
          totals, line items, attendance evidence, adjustments, and provenance
          are preserved in each version.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving}
            className="min-h-10 rounded-lg bg-[#7C3AED] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6D28D9] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "Saving…"
              : canCorrect
                ? "Create correction version"
                : "Save draft"}
          </button>
          {canSubmit && (
            <button
              type="button"
              disabled={submitting || saving || hasUnsavedChanges}
              onClick={() => void submitVersion()}
              className="min-h-10 rounded-lg border border-[#D8D4E5] px-4 py-2 text-sm font-semibold text-[#382477] hover:bg-[#F7F5FB] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Submit this version to Admin"}
            </button>
          )}
        </div>
        {canSubmit && hasUnsavedChanges && (
          <p className="text-sm text-amber-900">
            Save your changes before submitting; the current saved version is
            the one sent to Admin.
          </p>
        )}
      </form>
    </section>
  );
}

function DecisionActions({
  review,
  onChanged,
  canApprove,
}: {
  review: PayrollReviewResponse;
  onChanged: () => void;
  canApprove: boolean;
}) {
  const [decision, setDecision] = useState<Decision | null>(null);
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const employeeCountMismatch =
    review.batch.employeeCount !== review.batch.recordedEmployeeCount;
  const unresolvedCount = review.exceptions.filter(
    (exception) => !exception.resolvedAt,
  ).length;
  const reconciliationBlocked =
    employeeCountMismatch ||
    !review.payableBreakdownReconciles ||
    !review.deductionBreakdownReconciles;

  const approvalBlocked =
    unresolvedCount > 0 || reconciliationBlocked;

  if (review.batch.status !== "PendingAdminApproval" || !canApprove) {
    return (
      <section className="rounded-xl border border-[#EDEAF6] bg-white p-5">
        <h2 className="font-semibold">Approval decision</h2>
        <p className="mt-2 text-sm text-[#625F73]">
          {review.batch.status !== "PendingAdminApproval"
            ? (
                <>
                  This version is {payrollStatusLabel(review.batch.status)}.
                  Decisions are recorded against an exact, immutable version.
                </>
              )
            : (
                <>
                  You have read-only access to this version. Approval actions
                  are not available to your account.
                </>
              )}
        </p>
        {review.batch.status === "Approved" && (
          <p className="mt-2 text-sm text-[#625F73]">
            Approval does not initiate or confirm employee disbursement.
          </p>
        )}
      </section>
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!decision || saving) return;
    if (decision !== "Approved" && !reason.trim()) {
      setError("A reason is required to reject or return this batch.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await requestPayrollApi(
        `/api/admin/payroll/${encodeURIComponent(review.batch.id)}/decision`,
        {
          method: "POST",
          body: {
            version: review.batch.version,
            decision,
            reason: reason.trim() || null,
          },
        },
      );
      setMessage(`Version ${review.batch.version} was ${decision.toLowerCase()}.`);
      setDecision(null);
      setConfirming(false);
      onChanged();
    } catch (caught) {
      setError(requestError(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-[#EDEAF6] bg-white p-5 shadow-sm">
      <div>
        <h2 className="font-semibold">Approval decision</h2>
        <p className="mt-1 text-sm text-[#625F73]">
          Review and record a decision for batch version {review.batch.version}.
        </p>
      </div>
      {unresolvedCount > 0 && (
        <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          Approval is blocked while {unresolvedCount} validation{" "}
          {unresolvedCount === 1 ? "exception remains" : "exceptions remain"}{" "}
          unresolved. Return this version to HR for a corrected snapshot.
        </p>
      )}
      {reconciliationBlocked && (
        <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          Approval is blocked because the earnings, deduction, or included
          employee totals do not reconcile.
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
          {message}
        </p>
      )}

      <form onSubmit={(event) => void submit(event)} className="space-y-4">
        <fieldset className="flex flex-wrap gap-2">
          <legend className="mb-2 text-sm font-medium">Choose a decision</legend>
          {(["Approved", "Returned", "Rejected"] as const).map((value) => (
            <button
              key={value}
              type="button"
              disabled={saving || (value === "Approved" && approvalBlocked)}
              aria-pressed={decision === value}
              onClick={() => {
                setDecision(value);
                setConfirming(false);
                setError("");
              }}
              className={`min-h-10 rounded-lg border px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED] ${
                decision === value
                  ? "border-[#49329B] bg-[#F1EEFA] text-[#382477]"
                  : "border-[#D8D4E5] hover:bg-[#F7F5FB]"
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {value === "Approved"
                ? "Approve Payroll"
                : value === "Returned"
                  ? "Return for Correction"
                  : "Reject Batch"}
            </button>
          ))}
        </fieldset>

        {decision && decision !== "Approved" && (
          <div className="space-y-1.5">
            <label htmlFor="payroll-decision-reason" className="text-sm font-medium">
              Reason for {decision.toLowerCase()} (required)
            </label>
            <textarea
              id="payroll-decision-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={1000}
              rows={3}
              required
              className="w-full rounded-lg border border-[#D8D4E5] px-3 py-2 text-sm outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20"
            />
          </div>
        )}

        {!confirming ? (
          <button
            type="button"
            disabled={
              !decision ||
              (decision === "Approved" && approvalBlocked) ||
              (decision !== "Approved" && !reason.trim())
            }
            onClick={() => setConfirming(true)}
            className="min-h-10 rounded-lg bg-[#7C3AED] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6D28D9] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Review decision
          </button>
        ) : (
          <div className="space-y-3 rounded-lg border border-[#D8D4E5] bg-[#F7F5FB] p-4">
            <p className="text-sm">
              Confirm <strong>{decision}</strong> for{" "}
              <strong>{review.batch.batchNumber}, version {review.batch.version}</strong>{" "}
              with net payable{" "}
              <strong>
                {formatPayrollAmount(
                  review.batch.netPayable,
                  review.batch.currencyCode,
                )}
              </strong>
              . This records an approval decision only; no payment is sent.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={saving}
                className="min-h-10 rounded-lg bg-[#7C3AED] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6D28D9] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving decision…"
                  : decision
                    ? `Confirm ${decision.toLowerCase()}`
                    : "Confirm decision"}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => setConfirming(false)}
                className="min-h-10 rounded-lg border border-[#D8D4E5] px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </form>
    </section>
  );
}

function DisbursementManager({
  review,
  onChanged,
}: {
  review: PayrollReviewResponse;
  onChanged: () => void;
}) {
  const currentStatus =
    review.batch.disbursementStatus ?? "PendingDisbursement";
  const [status, setStatus] = useState<string>(currentStatus);
  const [paymentMethod, setPaymentMethod] = useState("BankTransfer");
  const [paymentDate, setPaymentDate] = useState("");
  const [notes, setNotes] = useState("");
  const [failureReason, setFailureReason] = useState("");
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function updateDisbursement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUpdating(true);
    setError("");
    setMessage("");
    try {
      await requestPayrollApi(
        `/api/admin/payroll/${encodeURIComponent(review.batch.id)}/disbursement`,
        {
          method: "PATCH",
          body: {
            status,
            paymentMethod: paymentMethod.trim() || null,
            notes: notes.trim() || null,
            failureReason:
              status === "PaymentFailed" ? failureReason.trim() || null : null,
            paymentDate: paymentDate.trim()
              ? new Date(paymentDate).toISOString()
              : null,
          },
        },
      );
      setMessage("Disbursement status updated.");
      onChanged();
    } catch (caught) {
      setError(
        caught instanceof PayrollApiError
          ? caught.message
          : caught instanceof Error
            ? caught.message
            : "Failed to update disbursement status.",
      );
    } finally {
      setUpdating(false);
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-[#EDEAF6] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EDEAF6] pb-3">
        <div>
          <h2 className="font-semibold">Disbursement management</h2>
          <p className="mt-1 text-sm text-[#625F73]">
            Track and record payment disbursement independently from payroll approval.
          </p>
        </div>
        <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          Current: {review.batch.disbursementStatus ?? "PendingDisbursement"}
        </span>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
          {message}
        </p>
      )}

      <form onSubmit={(e) => void updateDisbursement(e)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="disbursement-status" className="block text-sm font-medium">
              Disbursement status
            </label>
            <select
              id="disbursement-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-[#D8D4E5] px-3 py-2 text-sm outline-none focus:border-[#7C3AED]"
            >
              <option value="PendingDisbursement">Ready for disbursement</option>
              <option value="Processing">Processing</option>
              <option value="PartiallyPaid">Partially paid</option>
              <option value="Paid">Paid</option>
              <option value="PaymentFailed">Payment failed</option>
            </select>
          </div>

          <div>
            <label htmlFor="payment-method" className="block text-sm font-medium">
              Payment method
            </label>
            <input
              id="payment-method"
              type="text"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              placeholder="e.g. BankTransfer, Check, DirectDeposit"
              className="mt-1 block w-full rounded-lg border border-[#D8D4E5] px-3 py-2 text-sm outline-none focus:border-[#7C3AED]"
            />
          </div>

          <div>
            <label htmlFor="payment-date" className="block text-sm font-medium">
              Payment date (optional)
            </label>
            <input
              id="payment-date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-[#D8D4E5] px-3 py-2 text-sm outline-none focus:border-[#7C3AED]"
            />
          </div>

          <div>
            <label htmlFor="disbursement-notes" className="block text-sm font-medium">
              Disbursement notes
            </label>
            <input
              id="disbursement-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. BDO Corporate Batch Reference #94821"
              className="mt-1 block w-full rounded-lg border border-[#D8D4E5] px-3 py-2 text-sm outline-none focus:border-[#7C3AED]"
            />
          </div>
        </div>

        {status === "PaymentFailed" && (
          <div>
            <label htmlFor="failure-reason" className="block text-sm font-medium text-red-700">
              Failure reason (required for failed payments)
            </label>
            <textarea
              id="failure-reason"
              value={failureReason}
              onChange={(e) => setFailureReason(e.target.value)}
              rows={2}
              required
              className="mt-1 block w-full rounded-lg border border-red-300 px-3 py-2 text-sm outline-none focus:border-red-500"
              placeholder="Explain the bank or network failure..."
            />
          </div>
        )}

        <button
          type="submit"
          disabled={updating}
          className="rounded-lg bg-[#49329B] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3C2783] focus-visible:outline-2 focus-visible:outline-[#7C3AED] disabled:opacity-50"
        >
          {updating ? "Updating..." : "Update disbursement status"}
        </button>
      </form>
    </section>
  );
}

function getCorrectiveAction(category: string): string {
  switch (category) {
    case "Attendance":
      return "Return batch to HR. Correct attendance records or punch times in timekeeping source, then re-submit payroll.";
    case "Compensation":
      return "Return batch to HR. Correct employee compensation basis, basic salary rate, or earnings in HRIS, then re-submit.";
    case "Deduction":
    case "DeductionConfiguration":
      return "Return batch to HR or Admin. Update deduction configuration or remove unauthorized deduction lines, then re-validate.";
    case "FinancialReconciliation":
    case "FinancialIntegrity":
    case "FinancialValidation":
      return "Return batch to HR. Reconcile net pay and category sums against employee records so batch totals match strictly.";
    case "EmployeeRecord":
    case "EmployeeEligibility":
      return "Return batch to HR. Verify employee record and active employment assignment in HR records before re-submitting.";
    default:
      return "Return batch to HR for correction of underlying source records and re-validation.";
  }
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

const TIMELINE_ICON: Record<string, string> = {
  BatchCreated: "🗂",
  DraftUpdated: "✏️",
  CalculationCompleted: "🧮",
  HRSubmitted: "📤",
  CorrectionVersionCreated: "🔄",
  ValidationRun: "🔍",
  ExceptionsDetected: "⚠️",
  ReturnedForCorrection: "↩️",
  BatchRejected: "✗",
  BatchApproved: "✓",
  DisbursementHandoff: "💳",
  DisbursementStatusUpdated: "📋",
  AdjustmentRequested: "📝",
  AdjustmentApproved: "✅",
};

function ExceptionCard({
  exception,
  batch,
}: {
  exception: PayrollReviewResponse["exceptions"][number];
  batch: PayrollReviewResponse["batch"];
}) {
  const [expanded, setExpanded] = useState(false);
  const severityBadgeClass =
    exception.severity === "Critical"
      ? "bg-red-50 text-red-800 border-red-200"
      : exception.severity === "High"
        ? "bg-orange-50 text-orange-900 border-orange-200"
        : exception.severity === "Warning"
          ? "bg-amber-50 text-amber-950 border-amber-200"
          : "bg-blue-50 text-blue-900 border-blue-200";

  const scopeLabel = exception.employeeReference
    ? `Employee ${exception.employeeReference}`
    : `Batch ${batch.batchNumber} (v${batch.version})`;

  return (
    <li className="rounded-xl border border-[#EDEAF6] bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${severityBadgeClass}`}
          >
            {exception.severity}
          </span>
          <h3 className="font-semibold text-sm">{exception.title}</h3>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            exception.resolvedAt
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {exception.resolvedAt ? "Resolved" : "Unresolved"}
        </span>
      </div>
      <p className="mt-2 text-sm text-[#3E3B54]">{exception.description}</p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[#73718A]">
        <p className="break-all">
          <span className="font-medium text-[#1E1B4B]">{scopeLabel}</span> ·{" "}
          <span>{exception.field ?? exception.category}</span>
          {exception.actualValue !== null && ` · Reported: ${exception.actualValue}`}
          {exception.expectedValue !== null && ` · Expected: ${exception.expectedValue}`}
        </p>
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="text-xs font-semibold text-purple-700 hover:text-purple-900 underline"
        >
          {expanded ? "Hide details" : "View details"}
        </button>
      </div>
      {expanded && (
        <div className="mt-3 rounded-lg border border-[#EDEAF6] bg-[#FBFBFE] p-3 text-xs space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <span className="font-medium text-[#73718A]">Affected field:</span>{" "}
              <code className="text-[#1E1B4B]">{exception.field ?? exception.category}</code>
            </div>
            <div>
              <span className="font-medium text-[#73718A]">Source record reference:</span>{" "}
              <code className="break-all text-[#1E1B4B]">
                {exception.sourceReference ?? batch.sourceReference}
              </code>
            </div>
            <div>
              <span className="font-medium text-[#73718A]">Reported actual value:</span>{" "}
              <span className="font-mono text-red-700">
                {exception.actualValue ?? "None / Invalid"}
              </span>
            </div>
            <div>
              <span className="font-medium text-[#73718A]">Expected value:</span>{" "}
              <span className="font-mono text-green-700">
                {exception.expectedValue ?? "Valid standard value"}
              </span>
            </div>
          </div>
          <div className="pt-1 border-t border-[#EDEAF6]">
            <span className="font-medium text-[#73718A]">Underlying inconsistency:</span>
            <p className="mt-0.5 text-[#3E3B54]">{exception.description}</p>
          </div>
          <div className="pt-1 border-t border-[#EDEAF6]">
            <span className="font-medium text-[#73718A]">Required corrective action:</span>
            <p className="mt-0.5 font-medium text-amber-900">
              {getCorrectiveAction(exception.category)}
            </p>
          </div>
          {exception.resolutionDetails && (
            <div className="pt-1 border-t border-[#EDEAF6]">
              <span className="font-medium text-[#73718A]">Resolution history:</span>
              <p className="mt-0.5 text-green-800">{exception.resolutionDetails}</p>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function PayrollDetail({
  review,
  mode,
}: {
  review: PayrollReviewResponse;
  mode: "admin" | "hr";
}) {
  const { batch } = review;
  const adjustments = review.employees.flatMap((employee) =>
    employee.adjustments.map((adjustment) => ({ employee, adjustment })),
  );
  const unresolvedCount = review.exceptions.filter(
    (exception) => !exception.resolvedAt,
  ).length;
  const employeeCountMismatch =
    batch.employeeCount !== batch.recordedEmployeeCount;
  const sortedExceptions = [...review.exceptions].sort((a, b) => {
    const rank: Record<string, number> = {
      Critical: 1,
      High: 2,
      Warning: 3,
      Info: 4,
    };
    const diff = (rank[a.severity] ?? 99) - (rank[b.severity] ?? 99);
    if (diff !== 0) return diff;
    return new Date(a.detectedAt).getTime() - new Date(b.detectedAt).getTime();
  });

  return (
    <>
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Financial summary</h2>
        {unresolvedCount > 0 && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            {unresolvedCount} unresolved validation{" "}
            {unresolvedCount === 1 ? "exception" : "exceptions"}.
          </p>
        )}
        {employeeCountMismatch && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900"
          >
            The recorded employee count ({batch.recordedEmployeeCount}) does not
            match the included payroll records ({batch.employeeCount}). Approval
            is blocked.
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Gross payable", batch.grossPayable],
            ["Total deductions", batch.totalDeductions],
            ["Net payable", batch.netPayable],
            ["Included employees", String(batch.employeeCount)],
          ].map(([label, amount]) => (
            <article key={label} className="rounded-xl border border-[#EDEAF6] bg-white p-4 shadow-sm">
              <h3 className="text-sm text-[#73718A]">{label}</h3>
              <p className="mt-2 break-words text-lg font-semibold tabular-nums">
                {label === "Included employees"
                  ? amount
                  : formatPayrollAmount(amount, batch.currencyCode)}
              </p>
            </article>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Employer contributions", batch.employerContributions],
            ["Employer-paid benefits", batch.employerPaidBenefits ?? null],
            ["Labor cost", batch.laborCost],
            ["Overtime cost", batch.overtimeCost],
          ].map(([label, amount]) => (
            <article key={label} className="rounded-xl border border-[#EDEAF6] bg-white p-4">
              <h3 className="text-sm text-[#73718A]">{label}</h3>
              <p className="mt-2 font-semibold tabular-nums">
                {amount === null
                  ? "Not supplied"
                  : formatPayrollAmount(amount, batch.currencyCode)}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Submitted earnings breakdown</h2>
        <p className="text-sm text-[#625F73]">
          Aggregated from the earning lines submitted with this payroll version;
          these amounts are not independently verified or approved.
        </p>
        {review.payableBreakdownReconciles ? (
          <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">
            Submitted earning lines reconcile to gross payable.
          </p>
        ) : (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900"
          >
            Submitted earning lines do not reconcile to gross payable. Review
            the validation exceptions before making a decision.
          </p>
        )}
        {review.payableBreakdown.length ? (
          <ul className="divide-y divide-[#EDEAF6] rounded-xl border border-[#EDEAF6] bg-white px-4">
            {review.payableBreakdown.map((item) => (
              <li
                key={item.category}
                className="flex justify-between gap-4 py-3 text-sm"
              >
                <span>{payrollLineCategoryLabel(item.category)}</span>
                <span className="shrink-0 font-medium tabular-nums">
                  {formatPayrollAmount(item.amount, batch.currencyCode)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-[#EDEAF6] bg-white p-4 text-sm text-[#625F73]">
            No earning lines were supplied for this version.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Employee deductions</h2>
        <p className="text-sm text-[#625F73]">
          Aggregated from deduction lines submitted with this payroll version;
          eligibility and approval are not independently verified.
          {batch.deductionCategorySetVersion !== null &&
            ` Validated against deduction category configuration version ${batch.deductionCategorySetVersion}.`}
          {batch.deductionCategorySetVersion === null &&
            " No active Admin-approved category set was captured for this payroll version."}
        </p>
        {review.deductionBreakdownReconciles ? (
          <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">
            Submitted deduction lines reconcile to total deductions.
          </p>
        ) : (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900"
          >
            Submitted deduction lines do not reconcile to total deductions.
            Review validation exceptions before making a decision.
          </p>
        )}
        {review.deductionBreakdown.length ? (
          <ul className="divide-y divide-[#EDEAF6] rounded-xl border border-[#EDEAF6] bg-white px-4">
            {review.deductionBreakdown.map((item) => (
              <li
                key={item.category}
                className="flex justify-between gap-4 py-3 text-sm"
              >
                <span>{payrollLineCategoryLabel(item.category)}</span>
                <span className="shrink-0 font-medium tabular-nums">
                  {formatPayrollAmount(item.amount, batch.currencyCode)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-[#EDEAF6] bg-white p-4 text-sm text-[#625F73]">
            No deduction lines were supplied for this version.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <h2 className="font-semibold">Validation scope</h2>
        <p className="mt-1">
          This review reconciles submitted decimal totals and checks submitted
          attendance, employee identity, and adjustment evidence. It does not
          independently verify the source payroll calculation, compensation
          eligibility, statutory rates, or external source records.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Employee payroll details</h2>
        {mode === "admin" ? (
          <PayrollEmployeeList
            batchId={batch.id}
            version={batch.version}
            currencyCode={batch.currencyCode}
          />
        ) : (
        <div className="space-y-3">
          {review.employees.map((employee) => {
            const empExceptions = review.exceptions.filter(
              (e) =>
                e.employeeReference === employee.employeeReference,
            );
            const hasExceptions = empExceptions.length > 0;

            return (
              <details
                key={employee.id}
                className={`group rounded-xl border ${
                  hasExceptions
                    ? "border-amber-400 bg-amber-50/20"
                    : "border-[#EDEAF6] bg-white"
                } shadow-sm`}
              >
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-4 focus-visible:outline-2 focus-visible:outline-[#7C3AED]">
                  <span>
                    <span className="flex items-center gap-2">
                      <strong>{employee.employeeNumber}</strong>{" "}
                      <span>{employee.employeeName}</span>
                      {hasExceptions && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                          ⚠️ {empExceptions.length} exception{empExceptions.length === 1 ? "" : "s"}
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-sm text-[#73718A]">
                      {employee.department}
                      {employee.position ? ` · ${employee.position}` : ""}
                    </span>
                  </span>
                  <span className="text-right">
                    <strong className="block tabular-nums">
                      {formatPayrollAmount(employee.netPay, batch.currencyCode)}
                    </strong>
                    <span className="text-xs text-[#73718A]">Net pay</span>
                  </span>
                </summary>
                <div className="space-y-5 border-t border-[#EDEAF6] p-4">
                  {hasExceptions && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                      <p className="font-semibold text-red-950">
                        Unresolved Validation Exceptions:
                      </p>
                      <ul className="mt-1 list-inside list-disc space-y-1 text-xs">
                        {empExceptions.map((ex) => (
                          <li key={ex.id}>
                            <strong>[{ex.severity}] {ex.category}:</strong> {ex.description}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div><dt className="text-[#73718A]">Compensation basis</dt><dd>{employee.compensationBasis}</dd></div>
                  <div><dt className="text-[#73718A]">Reported rate</dt><dd>{formatPayrollAmount(employee.applicableRate, batch.currencyCode)}</dd></div>
                  <div><dt className="text-[#73718A]">Days worked</dt><dd>{employee.daysWorked ?? "Not supplied"}</dd></div>
                  <div><dt className="text-[#73718A]">Regular / overtime hours</dt><dd>{employee.regularHours ?? "—"} / {employee.overtimeHours ?? "—"}</dd></div>
                  <div><dt className="text-[#73718A]">Gross pay</dt><dd>{formatPayrollAmount(employee.grossPay, batch.currencyCode)}</dd></div>
                  <div><dt className="text-[#73718A]">Deductions</dt><dd>{formatPayrollAmount(employee.totalDeductions, batch.currencyCode)}</dd></div>
                  <div><dt className="text-[#73718A]">Source reference</dt><dd className="break-all">{employee.sourceReference}</dd></div>
                </dl>

                <div className="grid gap-5 lg:grid-cols-2">
                  <div>
                    <h3 className="mb-2 font-semibold">Earnings</h3>
                    {employee.earnings.length ? (
                      <ul className="divide-y divide-[#EDEAF6] text-sm">
                        {employee.earnings.map((line, index) => (
                          <li key={`${line.sourceReference}-${index}`} className="flex justify-between gap-3 py-2">
                            <span>{line.label} <span className="text-[#73718A]">({line.category})</span></span>
                            <span className="shrink-0 tabular-nums">{formatPayrollAmount(line.amount, batch.currencyCode)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : <p className="text-sm text-[#73718A]">No earning lines supplied.</p>}
                  </div>
                  <div>
                    <h3 className="mb-2 font-semibold">Deductions</h3>
                    {employee.deductions.length ? (
                      <ul className="divide-y divide-[#EDEAF6] text-sm">
                        {employee.deductions.map((line, index) => (
                          <li key={`${line.sourceReference}-${index}`} className="flex justify-between gap-3 py-2">
                            <span>{line.label} <span className="text-[#73718A]">({line.category})</span></span>
                            <span className="shrink-0 tabular-nums">{formatPayrollAmount(line.amount, batch.currencyCode)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : <p className="text-sm text-[#73718A]">No deduction lines supplied.</p>}
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 font-semibold">Attendance evidence</h3>
                  {employee.attendance.length ? (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[700px] text-left text-sm">
                        <thead className="bg-[#F7F5FB] text-xs uppercase text-[#625F73]">
                          <tr>
                            <th className="px-3 py-2">Date</th>
                            <th className="px-3 py-2">
                              Time in / out ({review.organization.timeZone ?? "UTC"})
                            </th>
                            <th className="px-3 py-2">Hours</th>
                            <th className="px-3 py-2">Classification / approval</th>
                            <th className="px-3 py-2">Exception</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EDEAF6]">
                          {employee.attendance.map((record, index) => (
                            <tr key={`${record.sourceReference}-${index}`}>
                              <td className="px-3 py-2">{record.workDate}</td>
                              <td className="px-3 py-2">
                                {formatPayrollDateTime(record.timeIn, review.organization.timeZone)} /{" "}
                                {formatPayrollDateTime(record.timeOut, review.organization.timeZone)}
                              </td>
                              <td className="px-3 py-2">
                                Total {record.totalHours ?? "—"}; regular {record.regularHours ?? "—"}; OT {record.overtimeHours ?? "—"}; night {record.nightDifferentialHours ?? "—"}
                              </td>
                              <td className="px-3 py-2">{record.classification ?? "—"} / {record.approvalStatus ?? "—"}</td>
                              <td className="px-3 py-2">{record.exceptionDetails ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : <p className="text-sm text-[#73718A]">No attendance evidence supplied.</p>}
                </div>

              </div>
            </details>
          );
        })}
        </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Adjustments</h2>
        {adjustments.length ? (
          <ul className="space-y-2">
            {adjustments.map(({ employee, adjustment }) => (
              <li
                key={`${employee.id}-${adjustment.adjustmentReference}`}
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
                <p className="text-[#625F73]">
                  {employee.employeeNumber} · {employee.employeeName}
                </p>
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
                        ` · ${formatPayrollDateTime(adjustment.approvedAt, review.organization.timeZone)}`}
                    </dd>
                  </div>
                  {adjustment.sourceReference && (
                    <div className="sm:col-span-2">
                      <dt className="font-medium text-[#49329B]">Source reference</dt>
                      <dd className="break-all">{adjustment.sourceReference}</dd>
                    </div>
                  )}
                </dl>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-[#EDEAF6] bg-white p-4 text-sm text-[#625F73]">
            No adjustments were recorded for this version.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Validation and exceptions</h2>
          {unresolvedCount > 0 && (
            <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-800">
              Strict Policy: Approval blocked by {unresolvedCount} unresolved {unresolvedCount === 1 ? "exception" : "exceptions"}
            </span>
          )}
        </div>
        {sortedExceptions.length ? (
          <ul className="space-y-2">
            {sortedExceptions.map((exception) => (
              <ExceptionCard key={exception.id} exception={exception} batch={batch} />
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-[#EDEAF6] bg-white p-4 text-sm text-[#625F73]">
            No reconciliation or evidence exceptions were detected in this snapshot.
          </p>
        )}
      </section>

      {review.historyVersions && review.historyVersions.length > 1 && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Previous payroll versions & resubmission history</h2>
            <span className="text-xs text-[#73718A]">
              {review.historyVersions.length} versions recorded
            </span>
          </div>
          <div className="overflow-hidden rounded-xl border border-[#EDEAF6] bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] border-collapse text-left text-sm">
                <thead className="bg-[#F7F5FB] text-xs uppercase tracking-wide text-[#625F73]">
                  <tr>
                    <th scope="col" className="px-4 py-2.5">Version</th>
                    <th scope="col" className="px-4 py-2.5">Status</th>
                    <th scope="col" className="px-4 py-2.5">Net payable</th>
                    <th scope="col" className="px-4 py-2.5">Submitted at</th>
                    <th scope="col" className="px-4 py-2.5">Prepared / Corrected by</th>
                    <th scope="col" className="px-4 py-2.5">Admin notes / Reason</th>
                    <th scope="col" className="px-4 py-2.5 text-right"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDEAF6]">
                  {review.historyVersions.map((hv) => {
                    const latestDecision = hv.decisions[hv.decisions.length - 1];
                    const isCurrent = hv.version === batch.version;
                    return (
                      <tr key={hv.version} className={`align-top ${isCurrent ? "bg-[#F7F5FB]/70" : ""}`}>
                        <td className="px-4 py-3">
                          <span className="font-semibold">v{hv.version}</span>
                          {isCurrent && (
                            <span className="ml-2 inline-flex rounded bg-[#7C3AED]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#7C3AED]">
                              Viewing
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                            hv.status === "Approved"
                              ? "bg-emerald-100 text-emerald-800"
                              : hv.status === "Returned"
                                ? "bg-amber-100 text-amber-800"
                                : hv.status === "Rejected"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-blue-100 text-blue-800"
                          }`}>
                            {payrollStatusLabel(hv.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium tabular-nums">
                          {formatPayrollAmount(hv.netPayable, batch.currencyCode)}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {hv.submittedAt
                            ? formatPayrollDateTime(hv.submittedAt, review.organization.timeZone)
                            : "Draft (not submitted)"}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span className="font-medium">{hv.preparedBy}</span>
                          {hv.submittedBy && <span className="block text-[#73718A]">Submitted: {hv.submittedBy}</span>}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {latestDecision?.reason ? (
                            <div className="max-w-xs break-words">
                              <span className="font-medium text-[#343047]">
                                [{latestDecision.decision} by {latestDecision.actor}]:
                              </span>{" "}
                              <span>{latestDecision.reason}</span>
                            </div>
                          ) : (
                            <span className="text-[#73718A]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {!isCurrent && (
                            <Link
                              href={
                                mode === "admin"
                                  ? `/admin/payapprove/${encodeURIComponent(batch.id)}?version=${hv.version}`
                                  : `/hr/payroll/${encodeURIComponent(batch.id)}?version=${hv.version}`
                              }
                              className="inline-flex min-h-8 items-center rounded-lg border border-[#D8D4E5] px-2.5 py-1 text-xs font-medium text-[#49329B] hover:bg-[#F7F5FB]"
                            >
                              View v{hv.version}
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {review.allExceptions && review.allExceptions.length > 0 && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Complete validation exceptions history</h2>
            <span className="text-xs text-[#73718A]">
              Preserving all {review.allExceptions.length} exception(s) across all batch versions
            </span>
          </div>
          <div className="overflow-hidden rounded-xl border border-[#EDEAF6] bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] border-collapse text-left text-sm">
                <thead className="bg-[#F7F5FB] text-xs uppercase tracking-wide text-[#625F73]">
                  <tr>
                    <th scope="col" className="px-4 py-2.5">Version</th>
                    <th scope="col" className="px-4 py-2.5">Severity</th>
                    <th scope="col" className="px-4 py-2.5">Category</th>
                    <th scope="col" className="px-4 py-2.5">Issue & description</th>
                    <th scope="col" className="px-4 py-2.5">Employee</th>
                    <th scope="col" className="px-4 py-2.5">Detected at</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDEAF6]">
                  {review.allExceptions.map((ex) => (
                    <tr key={`${ex.version}-${ex.id}`} className="align-top">
                      <td className="px-4 py-3 font-semibold">v{ex.version}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                            ex.severity === "Critical"
                              ? "bg-red-100 text-red-800"
                              : ex.severity === "High"
                                ? "bg-orange-100 text-orange-800"
                                : ex.severity === "Warning"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {ex.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-[#625F73]">
                        {ex.category}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <p className="font-semibold text-[#343047]">{ex.title}</p>
                        <p className="mt-0.5 text-[#625F73]">{ex.description}</p>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {ex.employeeReference ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#73718A]">
                        {formatPayrollDateTime(ex.detectedAt, review.organization.timeZone)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Batch timeline</h2>
        {review.timeline.length ? (
          <ol className="relative border-l border-[#EDEAF6] ml-3 space-y-4">
            {review.timeline.map((event) => (
              <li key={event.id} className="ml-5">
                <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-[#F4F2FB] text-xs ring-2 ring-white">
                  {TIMELINE_ICON[event.eventType] ?? "•"}
                </span>
                <div className="rounded-xl border border-[#EDEAF6] bg-white p-3 text-sm">
                  <p className="font-semibold">{event.description}</p>
                  <p className="mt-0.5 text-xs text-[#73718A]">
                    {event.eventType} · v{event.version} · {event.actorName}
                    {event.actorRole && ` (${event.actorRole})`}
                    {" · "}
                    {formatPayrollDateTime(event.createdAt, review.organization.timeZone)}
                  </p>
                  {event.relatedRecordReference && (
                    <p className="mt-1 break-all text-xs text-[#73718A]">
                      Ref: {event.relatedRecordReference}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="rounded-xl border border-[#EDEAF6] bg-white p-4 text-sm text-[#625F73]">
            No timeline events recorded for this batch.
          </p>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Decision history</h2>
          {review.decisions.length ? (
            <ol className="space-y-2">
              {review.decisions.map((decision, index) => (
                <li key={`${decision.createdAt}-${index}`} className="rounded-xl border border-[#EDEAF6] bg-white p-4 text-sm">
                  <p className="font-semibold">{decision.decision} by {decision.actor}</p>
                  <p className="mt-1 text-[#73718A]">{formatPayrollDateTime(decision.createdAt, review.organization.timeZone)}</p>
                  {decision.reason && <p className="mt-2">{decision.reason}</p>}
                </li>
              ))}
            </ol>
          ) : <p className="rounded-xl border border-[#EDEAF6] bg-white p-4 text-sm text-[#73718A]">No decisions recorded for this version.</p>}
        </section>
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">System audit log</h2>
          {review.audit.length ? (
            <ol className="space-y-2">
              {review.audit.map((event) => (
                <li key={event.id} className="rounded-xl border border-[#EDEAF6] bg-white p-4 text-sm">
                  <p className="font-semibold">{event.summary}</p>
                  <p className="mt-1 text-[#73718A]">
                    {event.actor} ({event.actorRole}) · {formatPayrollDateTime(event.createdAt, review.organization.timeZone)}
                  </p>
                </li>
              ))}
            </ol>
          ) : <p className="rounded-xl border border-[#EDEAF6] bg-white p-4 text-sm text-[#73718A]">No audit activity recorded.</p>}
        </section>
      </div>
    </>
  );
}

export function PayrollReviewClient({
  batchId,
  version,
  mode = "admin",
  canApprove = false,
}: {
  batchId: string;
  version: number;
  mode?: "admin" | "hr";
  canApprove?: boolean;
}) {
  const [review, setReview] = useState<PayrollReviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => {
    setReview(null);
    setRevision((value) => value + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await requestPayrollApi(
          `/api/${mode}/payroll/${encodeURIComponent(batchId)}?version=${version}`,
          { signal: controller.signal },
        );
        setReview(payrollReviewResponseSchema.parse(response));
      } catch (caught) {
        if (controller.signal.aborted) return;
        setError(requestError(caught));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [batchId, mode, version, revision]);

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-5 sm:p-8">
      <Link
        href={mode === "admin" ? "/admin/payapprove" : "/hr/payroll"}
        className="inline-flex min-h-9 items-center text-sm font-medium text-[#49329B] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-[#7C3AED]"
      >
        Back to payroll approvals
      </Link>
      {loading && !review && (
        <p role="status" className="text-sm text-[#73718A]">Loading payroll review…</p>
      )}
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
          {error}
        </p>
      )}
      {review && (
        <>
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold sm:text-3xl">
                {review.batch.batchNumber}
              </h1>
              <span className="rounded-full bg-[#F1EEFA] px-3 py-1 text-sm font-semibold text-[#382477]">
                Version {review.batch.version}
              </span>
              <span className="rounded-full border border-[#D8D4E5] px-3 py-1 text-sm">
                {payrollStatusLabel(review.batch.status)}
              </span>
              </div>
            </div>
          </header>

          {!review.organization.timeZone && (
            <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              Organization time zone is not configured; timestamps are shown in UTC.
            </p>
          )}

          <section
            aria-labelledby="payroll-overview-heading"
            className="rounded-xl border border-[#EDEAF6] bg-white p-4 text-sm shadow-sm"
          >
            <h2
              id="payroll-overview-heading"
              className="text-lg font-semibold"
            >
              Payroll overview
            </h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <dt className="text-[#73718A]">Batch number</dt>
                <dd className="mt-1 break-all font-semibold">
                  {review.batch.batchNumber}
                </dd>
              </div>
              <div>
                <dt className="text-[#73718A]">Date period</dt>
                <dd className="mt-1 font-medium">
                  {review.batch.periodStart} – {review.batch.periodEnd}
                </dd>
              </div>
              <div>
                <dt className="text-[#73718A]">HR assigned</dt>
                <dd className="mt-1">
                  Prepared by {review.batch.preparedBy}
                  <br />
                  Submitted by {review.batch.submittedBy ?? "Not recorded"}
                </dd>
              </div>
              <div>
                <dt className="text-[#73718A]">Date submitted</dt>
                <dd className="mt-1">
                  {formatPayrollDateTime(
                    review.batch.submittedAt,
                    review.organization.timeZone,
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-[#73718A]">Number of employees</dt>
                <dd className="mt-1 font-medium">{review.batch.employeeCount}</dd>
              </div>
              <div>
                <dt className="text-[#73718A]">Payroll cutoff / span</dt>
                <dd className="mt-1 break-words">{review.batch.cutoffReference}</dd>
              </div>
              <div>
                <dt className="text-[#73718A]">Payroll version</dt>
                <dd className="mt-1 break-all font-medium">
                  Version {review.batch.version} · {review.batch.versionId}
                </dd>
              </div>
              <div>
                <dt className="text-[#73718A]">Report</dt>
                <dd className="mt-1">
                  {mode === "admin" &&
                  !["Draft", "HRVerified"].includes(review.batch.status) ? (
                    <DownloadReportButton review={review} />
                  ) : (
                    "Not available"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-[#73718A]">Payroll source</dt>
                <dd className="mt-1 break-all">{review.batch.sourceReference}</dd>
              </div>
              <div>
                <dt className="text-[#73718A]">Source calculated</dt>
                <dd className="mt-1">
                  {formatPayrollDateTime(
                    review.batch.sourceCalculatedAt,
                    review.organization.timeZone,
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-[#73718A]">Calculation engine</dt>
                <dd className="mt-1 font-mono text-xs font-semibold text-[#1E1B4B]">
                  {review.batch.calculationEngineVersion ?? "Engine v2.0 (Centralized)"}
                </dd>
              </div>
              <div>
                <dt className="text-[#73718A]">Applied config versions</dt>
                <dd className="mt-1 text-xs">
                  Earnings: {review.batch.earningsConfigVersion ? `v${review.batch.earningsConfigVersion}` : "v1"} ·
                  Deductions: {review.batch.deductionConfigVersion ?? review.batch.deductionCategorySetVersion ?? "v1"} ·
                  Benefits: {review.batch.benefitsConfigVersion ?? "v1"}
                </dd>
              </div>
              <div>
                <dt className="text-[#73718A]">Statutory rules version</dt>
                <dd className="mt-1 text-xs">
                  {review.batch.statutoryRuleVersion ? `v${review.batch.statutoryRuleVersion}` : "PH-2026.1 (Authoritative)"}
                </dd>
              </div>
              <div>
                <dt className="text-[#73718A]">Disbursement status</dt>
                <dd className="mt-1">
                  <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                    {review.batch.disbursementStatus ?? "PendingDisbursement"}
                  </span>
                </dd>
              </div>
            </dl>
          </section>

          {mode === "admin" ? (
            <>
              <DecisionActions
                review={review}
                onChanged={reload}
                canApprove={canApprove}
              />
              {review.batch.status === "Approved" && (
                <DisbursementManager
                  review={review}
                  onChanged={reload}
                />
              )}
            </>
          ) : (
            <PayrollDraftActions review={review} onChanged={reload} />
          )}
          <PayrollDetail review={review} mode={mode} />
        </>
      )}
    </main>
  );
}
