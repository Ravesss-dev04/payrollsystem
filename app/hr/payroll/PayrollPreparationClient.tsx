"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import {
  formatPayrollAmount,
  formatPayrollDateTime,
  payrollStatusLabel,
} from "../../lib/payroll-results/format";
import {
  PayrollApiError,
  requestPayrollApi,
} from "../../lib/payroll-results/client-api";
import { payrollBatchInputSchema } from "../../lib/payroll-results/schemas";
import {
  payrollListResponseSchema,
  type PayrollListResponse,
} from "../../lib/payroll-results/views";

const statusTabs = [
  "all",
  "Draft",
  "PendingAdminApproval",
  "Returned",
  "Approved",
  "Rejected",
] as const;

const initialPayload = {
  batchNumber: "",
  periodStart: "",
  periodEnd: "",
  cutoffReference: "",
  currencyCode: "",
  sourceReference: "",
  sourceCalculatedAt: null,
  grossPayable: "",
  totalDeductions: "",
  netPayable: "",
  employerContributions: null,
  laborCost: null,
  overtimeCost: null,
  employees: [],
};

function requestError(error: unknown): string {
  if (error instanceof PayrollApiError) {
    switch (error.code) {
      case "forbidden":
        return "You do not have permission to prepare payroll.";
      case "batch_number_conflict":
        return "That batch number already exists. Use a unique batch number.";
      case "invalid_request":
        return "Check the payroll result fields and try again.";
      case "session_validation_required":
        return "Refresh the page to validate your session before saving.";
      default:
        return "The payroll request could not be completed. Refresh and try again.";
    }
  }
  return error instanceof Error ? error.message : "The request could not be completed.";
}

export function PayrollPreparationClient() {
  const router = useRouter();
  const [status, setStatus] = useState<(typeof statusTabs)[number]>("all");
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PayrollListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [createError, setCreateError] = useState("");
  const [payload, setPayload] = useState(JSON.stringify(initialPayload, null, 2));
  const [fileError, setFileError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      status,
      q: query,
      page: String(page),
      pageSize: "20",
    });

    async function load() {
      setLoading(true);
      setListError("");
      setResult(null);
      try {
        const response = await requestPayrollApi(
          `/api/hr/payroll?${params.toString()}`,
          { signal: controller.signal },
        );
        setResult(payrollListResponseSchema.parse(response));
      } catch (caught) {
        if (controller.signal.aborted) return;
        setListError(requestError(caught));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [status, query, page]);

  async function createDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setCreateError("");
    try {
      const input = payrollBatchInputSchema.parse(
        JSON.parse(payload),
      );
      const response = await requestPayrollApi("/api/hr/payroll", {
        method: "POST",
        body: input,
      });
      const created = z
        .object({
          id: z.string(),
          version: z.number().int().positive(),
        })
        .parse(response);
      router.push(
        `/hr/payroll/${encodeURIComponent(created.id)}?version=${created.version}`,
      );
    } catch (caught) {
      setCreateError(
        caught instanceof Error
          ? requestError(caught)
          : "Check the JSON data and try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function loadFile(file: File | undefined) {
    setFileError("");
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setFileError("Choose a JSON file no larger than 5 MiB.");
      return;
    }
    try {
      setPayload(await file.text());
    } catch {
      setFileError("The selected JSON file could not be read.");
    }
  }

  const totalPages = result
    ? Math.max(1, Math.ceil(result.total / result.pageSize))
    : 1;

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-5 sm:p-8">
      <header className="space-y-2">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#7C3AED]">HR workspace</p>
            <h1 className="text-2xl font-bold sm:text-3xl">Payroll preparation</h1>
            <p className="mt-2 max-w-3xl text-sm text-[#73718A]">
              Save HR-submitted calculation results as versioned snapshots, review
              reconciliation exceptions, then submit a specific version to Admin.
              This application does not calculate payroll or initiate disbursement.
            </p>
          </div>
          <Link
            href="/hr/employees"
            className="inline-flex min-h-10 items-center rounded-lg border border-[#D8D4E5] bg-white px-4 py-2 text-sm font-semibold text-[#49329B] hover:bg-[#F7F5FB] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
          >
            Employee records
          </Link>
        </div>
      </header>

      {result && !result.organization.timeZone && (
        <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          Organization time zone is not configured; timestamps are shown in UTC.
        </p>
      )}

      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <h2 className="font-semibold">Use approved source results only</h2>
        <p className="mt-1">
          Employee earnings, deductions, attendance and adjustment evidence are
          provided by HR. Reconciliation checks submitted values, but does not
          verify statutory rules or external source records.
        </p>
      </section>

      <details className="rounded-xl border border-[#EDEAF6] bg-white shadow-sm">
        <summary className="cursor-pointer p-4 font-semibold focus-visible:outline-2 focus-visible:outline-[#7C3AED]">
          Create payroll batch draft
        </summary>
        <form onSubmit={(event) => void createDraft(event)} className="space-y-4 border-t border-[#EDEAF6] p-4">
          <div className="space-y-1.5">
            <label htmlFor="payroll-json-file" className="text-sm font-medium">
              Load a JSON file from the approved payroll source
            </label>
            <input
              id="payroll-json-file"
              type="file"
              accept=".json,application/json"
              onChange={(event) => void loadFile(event.target.files?.[0])}
              className="block w-full text-sm file:mr-3 file:min-h-9 file:rounded-lg file:border-0 file:bg-[#F1EEFA] file:px-3 file:font-medium file:text-[#382477]"
            />
            {fileError && <p role="alert" className="text-sm text-red-800">{fileError}</p>}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="new-payroll-json" className="text-sm font-medium">
              Payroll result data (JSON)
            </label>
            <textarea
              id="new-payroll-json"
              value={payload}
              onChange={(event) => setPayload(event.target.value)}
              rows={22}
              maxLength={5 * 1024 * 1024}
              spellCheck={false}
              aria-describedby="new-payroll-json-help"
              className="w-full rounded-lg border border-[#D8D4E5] px-3 py-2 font-mono text-xs outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20"
            />
            <p id="new-payroll-json-help" className="text-xs text-[#73718A]">
              Required data includes a unique batch number, period, source
              references, exact decimal-string totals, and one or more employee
              results with earnings, deductions and attendance evidence.
            </p>
          </div>
          {createError && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
              {createError}
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="min-h-10 rounded-lg bg-[#7C3AED] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6D28D9] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving draft…" : "Create draft"}
          </button>
        </form>
      </details>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Payroll batches</h2>
        <div className="flex flex-wrap gap-2" aria-label="Filter payroll batches by status">
          {statusTabs.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={status === value}
              onClick={() => {
                setStatus(value);
                setPage(1);
              }}
              className={`min-h-10 rounded-lg border px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED] ${
                status === value
                  ? "border-[#7C3AED] bg-[#7C3AED] text-white"
                  : "border-[#D8D4E5] bg-white hover:bg-[#F7F5FB]"
              }`}
            >
              {value === "all" ? "All" : payrollStatusLabel(value)}
            </button>
          ))}
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setQuery(queryInput.trim());
          }}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="w-full max-w-md space-y-1.5">
            <label htmlFor="hr-payroll-search" className="text-sm font-medium">
              Search batch number
            </label>
            <input
              id="hr-payroll-search"
              value={queryInput}
              onChange={(event) => setQueryInput(event.target.value)}
              maxLength={100}
              className="min-h-10 w-full rounded-lg border border-[#D8D4E5] px-3 py-2 text-sm outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20"
            />
          </div>
          <button type="submit" className="min-h-10 rounded-lg border border-[#D8D4E5] px-4 py-2 text-sm font-medium hover:bg-[#F7F5FB]">
            Search
          </button>
        </form>
        {listError && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
            {listError}
          </p>
        )}
        <section
          aria-label="Payroll batch results"
          aria-busy={loading}
          className="overflow-hidden rounded-xl border border-[#EDEAF6] bg-white shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-[#EDEAF6] px-4 py-3">
            <p className="text-sm text-[#73718A]" aria-live="polite">
              {loading ? "Loading…" : `${result?.total ?? 0} batches`}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-[#F7F5FB] text-xs uppercase text-[#625F73]">
                <tr>
                  <th scope="col" className="px-4 py-3">Batch / version</th>
                  <th scope="col" className="px-4 py-3">Period</th>
                  <th scope="col" className="px-4 py-3">Employees</th>
                  <th scope="col" className="px-4 py-3">Net payable</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3"><span className="sr-only">Open batch</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDEAF6]">
                {result?.items.map((item) => (
                  <tr key={item.versionId}>
                    <td className="px-4 py-3">
                      <strong>{item.batchNumber}</strong>
                      <span className="mt-1 block text-xs text-[#73718A]">Version {item.version}</span>
                    </td>
                    <td className="px-4 py-3">{item.periodStart} – {item.periodEnd}</td>
                    <td className="px-4 py-3">{item.employeeCount}</td>
                    <td className="px-4 py-3 tabular-nums">{formatPayrollAmount(item.netPayable, item.currencyCode)}</td>
                    <td className="px-4 py-3">
                      {payrollStatusLabel(item.status)}
                      {item.submittedAt && (
                        <span className="mt-1 block text-xs text-[#73718A]">
                          {formatPayrollDateTime(item.submittedAt, result?.organization.timeZone ?? null)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/hr/payroll/${encodeURIComponent(item.id)}?version=${item.version}`}
                        className="inline-flex min-h-9 items-center rounded-lg border border-[#D8D4E5] px-3 py-1.5 font-medium text-[#49329B] hover:bg-[#F7F5FB] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
                {!loading && result?.items.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-[#73718A]">No payroll batches match this view.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-[#EDEAF6] px-4 py-3">
            <p className="text-sm text-[#73718A]">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="min-h-9 rounded-lg border border-[#D8D4E5] px-3 text-sm disabled:opacity-50">Previous</button>
              <button type="button" disabled={page >= totalPages || loading} onClick={() => setPage((value) => value + 1)} className="min-h-9 rounded-lg border border-[#D8D4E5] px-3 text-sm disabled:opacity-50">Next</button>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
