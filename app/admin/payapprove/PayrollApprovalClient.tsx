"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import {
  formatPayrollAmount,
  formatPayrollDateTime,
  payrollStatusLabel,
} from "../../lib/payroll-results/format";
import { requestPayrollApi } from "../../lib/payroll-results/client-api";
import {
  payrollListResponseSchema,
  type PayrollListResponse,
} from "../../lib/payroll-results/views";

const statusTabs = [
  { value: "PendingAdminApproval", label: "Pending" },
  { value: "Approved", label: "Approved" },
  { value: "RejectedOrReturned", label: "Rejected / Returned" },
] as const;

function periodLabel(start: string, end: string): string {
  return start === end ? start : `${start} – ${end}`;
}

export function PayrollApprovalClient() {
  const [status, setStatus] = useState<(typeof statusTabs)[number]["value"]>(
    "PendingAdminApproval",
  );
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [periodFromInput, setPeriodFromInput] = useState("");
  const [periodToInput, setPeriodToInput] = useState("");
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PayrollListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      status,
      q: query,
      page: String(page),
      pageSize: "20",
    });
    if (periodFrom) params.set("periodFrom", periodFrom);
    if (periodTo) params.set("periodTo", periodTo);

    async function load() {
      setLoading(true);
      setError("");
      setResult(null);
      try {
        const response = await requestPayrollApi(
          `/api/admin/payroll?${params.toString()}`,
          { signal: controller.signal },
        );
        setResult(payrollListResponseSchema.parse(response));
      } catch (caught) {
        if (controller.signal.aborted) return;
        setError(
          caught instanceof Error
            ? caught.message
            : "Payroll batches could not be loaded.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [status, query, periodFrom, periodTo, page]);

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (periodFromInput && periodToInput && periodFromInput > periodToInput) {
      setError("The period end date must not precede the period start date.");
      return;
    }
    setError("");
    setPage(1);
    setQuery(queryInput.trim());
    setPeriodFrom(periodFromInput);
    setPeriodTo(periodToInput);
  }

  function resetFilters() {
    setError("");
    setPage(1);
    setQueryInput("");
    setQuery("");
    setPeriodFromInput("");
    setPeriodToInput("");
    setPeriodFrom("");
    setPeriodTo("");
  }

  const totalPages = result
    ? Math.max(1, Math.ceil(result.total / result.pageSize))
    : 1;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-5 sm:p-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">Payroll Approvals</h1>
        <p className="max-w-3xl text-sm text-[#73718A]">
          Review HR-submitted payroll result snapshots and decide on the exact
          version shown. Approval records a decision; it does not initiate
          employee disbursement.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/admin/payapprove/deduction-categories"
            className="inline-block text-sm font-semibold text-[#7C3AED] hover:underline"
          >
            Review deduction category drafts
          </Link>
          <Link
            href="/admin/payapprove/config"
            className="inline-block text-sm font-semibold text-[#7C3AED] hover:underline"
          >
            Review payroll configuration approvals
          </Link>
          <Link
            href="/admin/payapprove/config/audit"
            className="inline-block text-sm font-semibold text-[#7C3AED] hover:underline"
          >
            Configuration audit log
          </Link>
        </div>
      </header>

      {result && !result.organization.timeZone && (
        <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          Organization time zone is not configured; timestamps are shown in UTC.
        </p>
      )}

      <section
        aria-label="Payroll batch status"
        className="flex flex-wrap gap-2"
      >
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            aria-pressed={status === tab.value}
            onClick={() => {
              setPage(1);
              setStatus(tab.value);
            }}
            className={`min-h-10 rounded-lg border px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED] ${
              status === tab.value
                ? "border-[#7C3AED] bg-[#7C3AED] text-white"
                : "border-[#D8D4E5] bg-white text-[#343047] hover:bg-[#F7F5FB]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </section>

      <form
        onSubmit={search}
        className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
      >
        <div className="w-full max-w-sm space-y-1.5">
          <label htmlFor="payroll-batch-search" className="text-sm font-medium">
            Search batch number
          </label>
          <input
            id="payroll-batch-search"
            value={queryInput}
            onChange={(event) => setQueryInput(event.target.value)}
            maxLength={100}
            className="min-h-10 w-full rounded-lg border border-[#D8D4E5] px-3 py-2 text-sm outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="payroll-period-from" className="block text-sm font-medium">
            Period from
          </label>
          <input
            id="payroll-period-from"
            type="date"
            value={periodFromInput}
            onChange={(event) => setPeriodFromInput(event.target.value)}
            className="min-h-10 rounded-lg border border-[#D8D4E5] px-3 py-2 text-sm outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="payroll-period-to" className="block text-sm font-medium">
            Period through
          </label>
          <input
            id="payroll-period-to"
            type="date"
            value={periodToInput}
            onChange={(event) => setPeriodToInput(event.target.value)}
            className="min-h-10 rounded-lg border border-[#D8D4E5] px-3 py-2 text-sm outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20"
          />
        </div>
        <button
          type="submit"
          className="min-h-10 rounded-lg bg-[#7C3AED] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6D28D9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
        >
          Search
        </button>
        <button
          type="button"
          onClick={resetFilters}
          className="min-h-10 rounded-lg border border-[#D8D4E5] px-4 py-2 text-sm font-medium hover:bg-[#F7F5FB] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
        >
          Reset filters
        </button>
      </form>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
          {error}
        </p>
      )}

      <section
        aria-label="Payroll batches"
        aria-busy={loading}
        className="overflow-hidden rounded-xl border border-[#EDEAF6] bg-white shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EDEAF6] px-4 py-3 sm:px-5">
          <h2 className="font-semibold">{payrollStatusLabel(status)}</h2>
          <p className="text-sm text-[#73718A]" aria-live="polite">
            {loading ? "Loading payroll batches…" : `${result?.total ?? 0} batches`}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] border-collapse text-left text-sm">
            <thead className="bg-[#F7F5FB] text-xs uppercase tracking-wide text-[#625F73]">
              {status === "Approved" ? (
                <tr>
                  <th scope="col" className="px-4 py-3">Payroll batch</th>
                  <th scope="col" className="px-4 py-3">Date period</th>
                  <th scope="col" className="px-4 py-3">Approved net payable</th>
                  <th scope="col" className="px-4 py-3">Employee count</th>
                  <th scope="col" className="px-4 py-3">Disbursement status</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              ) : status === "RejectedOrReturned" ? (
                <tr>
                  <th scope="col" className="px-4 py-3">Payroll batch</th>
                  <th scope="col" className="px-4 py-3">Date period</th>
                  <th scope="col" className="px-4 py-3">Original submission</th>
                  <th scope="col" className="px-4 py-3">Latest decision</th>
                  <th scope="col" className="px-4 py-3">Returns</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              ) : (
                <tr>
                  <th scope="col" className="px-4 py-3">Batch</th>
                  <th scope="col" className="px-4 py-3">Period</th>
                  <th scope="col" className="px-4 py-3">Employees</th>
                  <th scope="col" className="px-4 py-3">Net payable</th>
                  <th scope="col" className="px-4 py-3">Submitted</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3">
                    <span className="sr-only">Review batch</span>
                  </th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-[#EDEAF6]">
              {result?.items.map((item) => (
                <tr key={item.versionId} className="align-top">
                  <td className="px-4 py-3">
                    <span className="font-semibold">{item.batchNumber}</span>
                    <span className="mt-1 block text-xs text-[#73718A]">
                      Version {item.version}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {periodLabel(item.periodStart, item.periodEnd)}
                  </td>

                  {status === "Approved" ? (
                    <>
                      <td className="px-4 py-3 font-medium tabular-nums text-emerald-800">
                        {formatPayrollAmount(item.netPayable, item.currencyCode)}
                      </td>
                      <td className="px-4 py-3">{item.employeeCount}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            item.disbursementStatus === "Paid"
                              ? "bg-emerald-100 text-emerald-800"
                              : item.disbursementStatus === "Processing"
                                ? "bg-blue-100 text-blue-800"
                                : item.disbursementStatus === "PartiallyPaid"
                                  ? "bg-purple-100 text-purple-800"
                                  : item.disbursementStatus === "PaymentFailed"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {item.disbursementStatus === "Paid"
                            ? "Paid / Disbursed"
                            : item.disbursementStatus === "Processing"
                              ? "Processing Payment"
                              : item.disbursementStatus === "PartiallyPaid"
                                ? "Partially Paid"
                                : item.disbursementStatus === "PaymentFailed"
                                  ? "Payment Failed"
                                  : "Ready for Disbursement"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          Approved
                        </span>
                      </td>
                    </>
                  ) : status === "RejectedOrReturned" ? (
                    <>
                      <td className="px-4 py-3 text-xs">
                        {formatPayrollDateTime(
                          item.originalSubmissionDate ?? item.submittedAt,
                          result?.organization.timeZone ?? null,
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {item.latestDecisionDate
                          ? formatPayrollDateTime(
                              item.latestDecisionDate,
                              result?.organization.timeZone ?? null,
                            )
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                          {item.returnCount ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                            item.status === "Returned"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {payrollStatusLabel(item.status)}
                        </span>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3">{item.employeeCount}</td>
                      <td className="px-4 py-3 font-medium tabular-nums">
                        {formatPayrollAmount(item.netPayable, item.currencyCode)}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {formatPayrollDateTime(
                          item.submittedAt,
                          result?.organization.timeZone ?? null,
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {payrollStatusLabel(item.status)}
                      </td>
                    </>
                  )}

                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/payapprove/${encodeURIComponent(item.id)}?version=${item.version}`}
                      className="inline-flex min-h-9 items-center rounded-lg border border-[#D8D4E5] px-3 py-1.5 text-sm font-medium text-[#49329B] hover:bg-[#F7F5FB] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
                    >
                      {status === "PendingAdminApproval" ? "Review" : "View"}
                    </Link>
                  </td>
                </tr>
              ))}
              {!loading && result?.items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-[#73718A]">
                    No payroll batches match this view.
                  </td>
                </tr>
              )}
              {loading && !result && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-[#73718A]">
                    Loading payroll batches…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-[#EDEAF6] px-4 py-3">
          <p className="text-sm text-[#73718A]">
            Page {Math.min(page, totalPages)} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((value) => value - 1)}
              className="min-h-9 rounded-lg border border-[#D8D4E5] px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((value) => value + 1)}
              className="min-h-9 rounded-lg border border-[#D8D4E5] px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
