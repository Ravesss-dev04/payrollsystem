"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { formatPayrollAmount } from "../../lib/payroll-results/format";
import {
  PayrollApiError,
  requestPayrollApi,
} from "../../lib/payroll-results/client-api";
import {
  payrollEmployeeListResponseSchema,
  type PayrollEmployeeListResponse,
} from "../../lib/payroll-results/views";

function employeeListError(error: unknown): string {
  if (error instanceof PayrollApiError) {
    if (error.code === "forbidden") {
      return "You are not authorized to view these employee payroll records.";
    }
    if (error.code === "version_conflict" || error.code === "version_not_found") {
      return "This submitted payroll version is no longer available. Return to the batch review and reload it.";
    }
    if (error.code === "payroll_data_invalid") {
      return "The employee payroll data could not be validated.";
    }
  }
  return "Employee payroll records could not be loaded. Check your connection and try again.";
}

export function PayrollEmployeeList({
  batchId,
  version,
  currencyCode,
}: {
  batchId: string;
  version: number;
  currencyCode: string;
}) {
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [basisInput, setBasisInput] = useState("");
  const [basis, setBasis] = useState("");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<PayrollEmployeeListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      version: String(version),
      q: query,
      page: String(page),
      pageSize: "25",
    });
    if (basis) params.set("compensationBasis", basis);

    async function load() {
      setLoading(true);
      setError("");
      setResult(null);
      try {
        const response = await requestPayrollApi(
          `/api/admin/payroll/${encodeURIComponent(batchId)}/employees?${params.toString()}`,
          { signal: controller.signal },
        );
        setResult(payrollEmployeeListResponseSchema.parse(response));
      } catch (caught) {
        if (controller.signal.aborted) return;
        setError(employeeListError(caught));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [batchId, version, query, basis, page, revision]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setQuery(queryInput.trim());
    setBasis(basisInput);
  }

  const totalPages = result
    ? Math.max(1, Math.ceil(result.total / result.pageSize))
    : 1;

  return (
    <div className="space-y-4">
      <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
        Employee values are from the submitted HR snapshot and have not been
        independently verified or approved.
      </p>

      <form
        onSubmit={applyFilters}
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="w-full max-w-sm space-y-1.5">
          <label htmlFor="payroll-employee-search" className="text-sm font-medium">
            Search employee
          </label>
          <input
            id="payroll-employee-search"
            value={queryInput}
            onChange={(event) => setQueryInput(event.target.value)}
            maxLength={100}
            placeholder="ID, name, department, or position"
            className="min-h-10 w-full rounded-lg border border-[#D8D4E5] px-3 py-2 text-sm outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="payroll-employee-basis" className="block text-sm font-medium">
            Compensation basis
          </label>
          <select
            id="payroll-employee-basis"
            value={basisInput}
            onChange={(event) => setBasisInput(event.target.value)}
            className="min-h-10 rounded-lg border border-[#D8D4E5] px-3 py-2 text-sm outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20"
          >
            <option value="">All bases</option>
            <option value="Monthly">Monthly</option>
            <option value="Daily">Daily</option>
            <option value="Hourly">Hourly</option>
          </select>
        </div>
        <button
          type="submit"
          className="min-h-10 rounded-lg bg-[#7C3AED] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6D28D9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
        >
          Search
        </button>
      </form>

      {loading && (
        <p role="status" className="text-sm text-[#73718A]">
          Loading employee payroll records…
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
      {result && (
        <>
          {result.items.length ? (
            <div className="overflow-x-auto rounded-xl border border-[#EDEAF6] bg-white">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-[#F7F5FB] text-xs uppercase text-[#625F73]">
                  <tr>
                    <th scope="col" className="px-3 py-3">Employee</th>
                    <th scope="col" className="px-3 py-3">Position</th>
                    <th scope="col" className="px-3 py-3">Days worked</th>
                    <th scope="col" className="px-3 py-3">Rate</th>
                    <th scope="col" className="px-3 py-3">Additional earnings</th>
                    <th scope="col" className="px-3 py-3">Deductions</th>
                    <th scope="col" className="px-3 py-3">Net amount</th>
                    <th scope="col" className="px-3 py-3"><span className="sr-only">Details</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDEAF6]">
                  {result.items.map((employee) => (
                    <tr key={employee.employeeId}>
                      <td className="px-3 py-3">
                        <strong className="block">{employee.employeeNumber}</strong>
                        <span>{employee.employeeName}</span>
                        <span className="block text-xs text-[#73718A]">
                          {employee.department}
                        </span>
                      </td>
                      <td className="px-3 py-3">{employee.position ?? "Not supplied"}</td>
                      <td className="px-3 py-3 tabular-nums">{employee.daysWorked ?? "Not supplied"}</td>
                      <td className="px-3 py-3">
                        <span className="block">{employee.compensationBasis}</span>
                        <span className="tabular-nums">
                          {formatPayrollAmount(employee.applicableRate, currencyCode)}
                        </span>
                      </td>
                      <td className="px-3 py-3 tabular-nums">
                        {formatPayrollAmount(employee.additionalEarningsTotal, currencyCode)}
                      </td>
                      <td className="px-3 py-3 tabular-nums">
                        {formatPayrollAmount(employee.totalDeductions, currencyCode)}
                      </td>
                      <td className="px-3 py-3 font-semibold tabular-nums">
                        {formatPayrollAmount(employee.netAmount, currencyCode)}
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          href={`/admin/payapprove/${encodeURIComponent(batchId)}/employees/${encodeURIComponent(employee.employeeId)}?version=${version}`}
                          className="inline-flex min-h-9 items-center rounded-lg border border-[#D8D4E5] px-3 py-1.5 font-semibold text-[#49329B] hover:bg-[#F7F5FB] focus-visible:outline-2 focus-visible:outline-[#7C3AED]"
                        >
                          View breakdown
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="rounded-xl border border-[#EDEAF6] bg-white p-4 text-sm text-[#625F73]">
              No employees matched this payroll version and filter.
            </p>
          )}

          <nav
            aria-label="Employee payroll pages"
            className="flex flex-wrap items-center justify-between gap-3 text-sm"
          >
            <p>
              {result.total} included employee{result.total === 1 ? "" : "s"}
              {" · "}Page {result.page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                className="min-h-9 rounded-lg border border-[#D8D4E5] px-3 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((value) => value + 1)}
                className="min-h-9 rounded-lg border border-[#D8D4E5] px-3 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
