"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { requestPayrollApi, PayrollApiError } from "../../../../lib/payroll-results/client-api";

type AuditEvent = {
  id: string;
  actorUserId: string | null;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  details: {
    version?: number;
    previousVersion?: number;
    category?: string;
    status?: string;
    approvalStatus?: string;
    approvingAdministratorName?: string;
    approvingAdministratorRole?: string;
    approvalTimestamp?: string;
    correlationId?: string;
    rejectionReason?: string;
    supportingReference?: string;
    changeReason?: string;
    reason?: string;
    effectiveFrom?: string;
    integrityHash?: string;
    fieldLevelChanges?: Array<{
      field: string;
      previousValue: unknown;
      newValue: unknown;
    }>;
    simulationImpact?: {
      sampleCount?: number;
      estimatedAggregateFinancialImpact?: string;
    };
    applicability?: {
      scope?: string;
      departmentIds?: string[];
    };
  } | null;
  createdAt: string;
  actor: {
    id: string;
    name: string;
    email: string;
  } | null;
};

type AuditResponse = {
  items: AuditEvent[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const ACTION_LABELS: Record<string, { label: string; badge: string }> = {
  "payroll.config.draft_created": { label: "Draft Created", badge: "bg-gray-100 text-gray-700" },
  "payroll.config.draft_updated": { label: "Draft Updated", badge: "bg-blue-100 text-blue-700" },
  "payroll.config.submitted": { label: "Submitted", badge: "bg-yellow-100 text-yellow-800" },
  "payroll.config.approved": { label: "Approved / Activated", badge: "bg-green-100 text-green-800" },
  "payroll.config.rejected": { label: "Rejected", badge: "bg-red-100 text-red-800" },
  "payroll.config.retired": { label: "Retired", badge: "bg-purple-100 text-purple-800" },
};

export function ConfigAuditClient({ initialData }: { initialData: AuditResponse }) {
  const [data, setData] = useState<AuditResponse>(initialData);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [category, setCategory] = useState("");
  const [action, setAction] = useState("");
  const [userId, setUserId] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [page, setPage] = useState(1);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);

  function loadData(targetPage = 1) {
    setError(null);
    startTransition(async () => {
      try {
        const params = new URLSearchParams({
          page: String(targetPage),
          pageSize: "20",
        });
        if (category) params.set("category", category);
        if (action) params.set("action", action);
        if (userId) params.set("userId", userId);
        if (status) params.set("status", status);
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);
        if (effectiveDate) params.set("effectiveDate", effectiveDate);
        if (departmentId) params.set("departmentId", departmentId);

        const res = (await requestPayrollApi(
          `/api/admin/payroll/config/audit?${params.toString()}`,
        )) as AuditResponse;
        setData(res);
        setPage(targetPage);
      } catch (err) {
        setError(
          err instanceof PayrollApiError
            ? `Failed to load audit history: ${err.code}`
            : "Could not retrieve audit history.",
        );
      }
    });
  }

  function handleFilterSubmit(e: React.FormEvent) {
    e.preventDefault();
    loadData(1);
  }

  function handleReset() {
    setCategory("");
    setAction("");
    setUserId("");
    setStatus("");
    setDateFrom("");
    setDateTo("");
    setEffectiveDate("");
    setDepartmentId("");
    setError(null);
    startTransition(async () => {
      try {
        const res = (await requestPayrollApi(
          "/api/admin/payroll/config/audit?page=1&pageSize=20",
        )) as AuditResponse;
        setData(res);
        setPage(1);
      } catch {
        setError("Failed to reset audit list.");
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-5 sm:p-8">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/payapprove/config"
              className="text-xs font-semibold text-[#7C3AED] hover:underline"
            >
              ← Config Approvals
            </Link>
            <span className="text-gray-300">|</span>
            <Link
              href="/admin/payapprove"
              className="text-xs font-semibold text-[#7C3AED] hover:underline"
            >
              Batch Approvals
            </Link>
          </div>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl text-[#1E1B4B]">
            Payroll Configuration Audit Log
          </h1>
          <p className="text-sm text-[#73718A]">
            Centralized append-only tamper-evident audit ledger capturing every configuration lifecycle event.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          Tamper-Evident SHA-256 Ledger
        </span>
      </div>

      {/* Filters Form */}
      <form
        onSubmit={handleFilterSubmit}
        className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4"
      >
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#73718A]">
          Filter Audit Events
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="filter-category" className="block text-xs font-semibold text-[#73718A]">
              Category
            </label>
            <select
              id="filter-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm focus:border-[#7C3AED] focus:outline-none"
            >
              <option value="">All Categories</option>
              <option value="GeneralSettings">GeneralSettings</option>
              <option value="StatutoryRules">StatutoryRules</option>
              <option value="Earnings">Earnings</option>
              <option value="Deductions">Deductions</option>
              <option value="Benefits">Benefits</option>
              <option value="Applicability">Applicability</option>
            </select>
          </div>

          <div>
            <label htmlFor="filter-action" className="block text-xs font-semibold text-[#73718A]">
              Action Type
            </label>
            <select
              id="filter-action"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm focus:border-[#7C3AED] focus:outline-none"
            >
              <option value="">All Actions</option>
              <option value="payroll.config.draft_created">Draft Created</option>
              <option value="payroll.config.draft_updated">Draft Updated</option>
              <option value="payroll.config.submitted">Submitted for Approval</option>
              <option value="payroll.config.approved">Approved / Activated</option>
              <option value="payroll.config.rejected">Rejected</option>
              <option value="payroll.config.retired">Retired</option>
            </select>
          </div>

          <div>
            <label htmlFor="filter-date-from" className="block text-xs font-semibold text-[#73718A]">
              Date Modified From
            </label>
            <input
              id="filter-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="filter-date-to" className="block text-xs font-semibold text-[#73718A]">
              Date Modified To
            </label>
            <input
              id="filter-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="filter-effective-date" className="block text-xs font-semibold text-[#73718A]">
              Effective Date
            </label>
            <input
              id="filter-effective-date"
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="filter-department" className="block text-xs font-semibold text-[#73718A]">
              Affected Department ID
            </label>
            <input
              id="filter-department"
              type="text"
              placeholder="e.g. dept-it, dept-sales"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="filter-user" className="block text-xs font-semibold text-[#73718A]">
              User ID
            </label>
            <input
              id="filter-user"
              type="text"
              placeholder="Filter by actor ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-md bg-[#7C3AED] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6D28D9] disabled:opacity-50"
            >
              {isPending ? "Filtering…" : "Apply Filters"}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Reset
            </button>
          </div>
        </div>
      </form>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Audit Log Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 bg-gray-50 px-5 py-3">
          <p className="text-xs font-medium text-[#73718A]">
            Showing {data.items.length} of {data.total} recorded configuration events
          </p>
        </div>

        {data.items.length === 0 ? (
          <p className="p-8 text-center text-sm text-[#73718A]">
            No audit records match the current criteria.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase text-[#73718A]">
                <tr>
                  <th className="px-4 py-3 text-left">Configuration</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Changed By</th>
                  <th className="px-4 py-3 text-left">Date Modified</th>
                  <th className="px-4 py-3 text-left">Previous Version</th>
                  <th className="px-4 py-3 text-left">New Version</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Effective Date</th>
                  <th className="px-4 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.items.map((ev) => {
                  const actionMeta = ACTION_LABELS[ev.action] ?? {
                    label: ev.action,
                    badge: "bg-gray-100 text-gray-700",
                  };
                  const version = ev.details?.version;
                  const prevVersion = ev.details?.previousVersion;
                  const category = ev.details?.category ?? "GeneralSettings";
                  const status = ev.details?.status ?? ev.details?.approvalStatus ?? "Recorded";
                  const effectiveDate = ev.details?.effectiveFrom ?? "Immediate";
                  const hash = ev.details?.integrityHash;

                  return (
                    <tr key={ev.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-[#1E1B4B]">
                        <div>{category}</div>
                        <div className="font-mono text-xs text-[#73718A]">
                          {version ? `v${version}` : "Draft"} · {ev.entityId.slice(0, 10)}…
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">{category}</td>
                      <td className="px-4 py-3">
                        <div className="text-xs font-medium text-[#1E1B4B]">
                          {ev.actor?.name ?? "System"}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {ev.actorRole.toUpperCase()} · {ev.actor?.email ?? ev.actorUserId ?? ""}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-500">
                        {new Date(ev.createdAt).toISOString().replace("T", " ").slice(0, 19)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[#73718A]">
                        {prevVersion !== undefined && prevVersion !== null ? `v${prevVersion}` : "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-bold text-[#1E1B4B]">
                        {version !== undefined && version !== null ? `v${version}` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            status === "Active"
                              ? "bg-purple-100 text-purple-800"
                              : status === "Approved"
                                ? "bg-green-100 text-green-800"
                                : status === "Scheduled"
                                  ? "bg-blue-100 text-blue-800"
                                  : status === "PendingApproval"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : status === "Rejected"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs font-mono text-gray-600">
                        {effectiveDate}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs">
                        <button
                          type="button"
                          onClick={() => setSelectedEvent(ev)}
                          className="rounded-lg bg-[#7C3AED] px-3 py-1 font-semibold text-white hover:bg-[#6D28D9]"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 text-xs text-[#73718A]">
            <span>
              Page {data.page} of {data.totalPages}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={data.page <= 1 || isPending}
                onClick={() => loadData(data.page - 1)}
                className="rounded border border-gray-200 px-2.5 py-1 text-xs font-semibold disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={data.page >= data.totalPages || isPending}
                onClick={() => loadData(data.page + 1)}
                className="rounded border border-gray-200 px-2.5 py-1 text-xs font-semibold disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Inspection Modal */}
      {selectedEvent && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-3xl rounded-xl border border-gray-200 bg-white p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-[#1E1B4B]">
                  Historical Configuration Audit Record
                </h3>
                <p className="text-xs text-[#73718A]">
                  Event ID: <span className="font-mono">{selectedEvent.id}</span> · Correlation ID: <span className="font-mono">{selectedEvent.details?.correlationId ?? "—"}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="rounded-lg bg-blue-50/70 border border-blue-200 p-3 text-xs text-blue-900">
              ℹ Historical values and configurations below are loaded directly from this append-only domain audit record, completely immutable and independent of the current live configuration.
            </div>

            {/* Approval and Actor Information */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#73718A]">
                Event & Approval Information
              </h4>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div>
                  <dt className="text-gray-500">Action Type</dt>
                  <dd className="font-semibold text-[#1E1B4B]">{selectedEvent.action}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Timestamp</dt>
                  <dd>{new Date(selectedEvent.createdAt).toISOString()}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Acting User</dt>
                  <dd>{selectedEvent.actor?.name ?? "System"} ({selectedEvent.actorRole})</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Configuration ID</dt>
                  <dd className="font-mono truncate">{selectedEvent.entityId}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Version</dt>
                  <dd className="font-mono font-bold text-[#1E1B4B]">v{selectedEvent.details?.version ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Status</dt>
                  <dd className="font-semibold text-[#1E1B4B]">
                    {selectedEvent.details?.status ?? selectedEvent.details?.approvalStatus ?? "Recorded"}
                  </dd>
                </div>
                {selectedEvent.details?.approvingAdministratorName && (
                  <div>
                    <dt className="text-gray-500">Approving Administrator</dt>
                    <dd className="font-medium text-green-700">
                      {selectedEvent.details.approvingAdministratorName} ({selectedEvent.details.approvingAdministratorRole ?? "admin"})
                    </dd>
                  </div>
                )}
                {selectedEvent.details?.approvalTimestamp && (
                  <div>
                    <dt className="text-gray-500">Approval Timestamp</dt>
                    <dd>{new Date(selectedEvent.details.approvalTimestamp).toISOString()}</dd>
                  </div>
                )}
                {selectedEvent.details?.rejectionReason && (
                  <div className="col-span-2 sm:col-span-3 text-red-700 bg-red-50 p-2 rounded border border-red-200">
                    <dt className="font-semibold text-red-800">Rejection Reason</dt>
                    <dd>{selectedEvent.details.rejectionReason}</dd>
                  </div>
                )}
                {selectedEvent.details?.integrityHash && (
                  <div className="col-span-2 sm:col-span-3">
                    <dt className="text-gray-500">Tamper-Evident SHA-256 Digest</dt>
                    <dd className="break-all font-mono text-[11px] text-green-700 bg-green-50 p-1.5 rounded border border-green-200">
                      ✓ {selectedEvent.details.integrityHash}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Change Reason & Supporting Reference */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#73718A]">
                Reason & Supporting Reference
              </h4>
              <div className="rounded-lg border border-gray-200 p-3 text-xs space-y-2">
                <div>
                  <span className="font-semibold text-gray-500">Reason for Change: </span>
                  <span className="text-[#1E1B4B]">
                    {selectedEvent.details?.changeReason ?? selectedEvent.details?.reason ?? selectedEvent.summary}
                  </span>
                </div>
                {selectedEvent.details?.supportingReference && (
                  <div>
                    <span className="font-semibold text-gray-500">Supporting Reference: </span>
                    <span className="break-all font-mono text-[#1E1B4B]">
                      {selectedEvent.details.supportingReference}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Affected Payroll Scope */}
            {selectedEvent.details?.applicability && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#73718A]">
                  Affected Payroll Scope
                </h4>
                <div className="rounded-lg border border-gray-200 p-3 text-xs space-y-1">
                  <div>
                    <span className="font-semibold text-gray-500">Scope Type: </span>
                    <span className="font-medium">
                      {(selectedEvent.details.applicability as any).scope ?? "All Eligible Employees"}
                    </span>
                  </div>
                  {Array.isArray((selectedEvent.details.applicability as any).departmentIds) &&
                    (selectedEvent.details.applicability as any).departmentIds.length > 0 && (
                      <div>
                        <span className="font-semibold text-gray-500">Departments: </span>
                        <span>{(selectedEvent.details.applicability as any).departmentIds.join(", ")}</span>
                      </div>
                    )}
                  {Array.isArray((selectedEvent.details.applicability as any).employmentTypes) &&
                    (selectedEvent.details.applicability as any).employmentTypes.length > 0 && (
                      <div>
                        <span className="font-semibold text-gray-500">Employment Types: </span>
                        <span>{(selectedEvent.details.applicability as any).employmentTypes.join(", ")}</span>
                      </div>
                    )}
                </div>
              </div>
            )}

            {/* Financial Impact */}
            {selectedEvent.details?.simulationImpact && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#73718A]">
                  Estimated Financial Impact
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="rounded border border-gray-200 p-2">
                    <div className="text-gray-400">Sample Count</div>
                    <div className="font-bold text-[#1E1B4B]">
                      {selectedEvent.details.simulationImpact.sampleCount ?? 0} employees
                    </div>
                  </div>
                  <div className="rounded border border-gray-200 p-2">
                    <div className="text-gray-400">Current Gross</div>
                    <div className="font-bold text-[#1E1B4B]">
                      ₱{(selectedEvent.details.simulationImpact as any).currentGross ?? "0.00"}
                    </div>
                  </div>
                  <div className="rounded border border-gray-200 p-2">
                    <div className="text-gray-400">Proposed Gross</div>
                    <div className="font-bold text-[#1E1B4B]">
                      ₱{(selectedEvent.details.simulationImpact as any).proposedGross ?? "0.00"}
                    </div>
                  </div>
                  <div className="rounded border border-gray-200 p-2">
                    <div className="text-gray-400">Aggregate Impact</div>
                    <div className="font-bold text-[#1E1B4B]">
                      ₱{selectedEvent.details.simulationImpact.estimatedAggregateFinancialImpact ?? "0.00"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Complete Before-and-After Comparison */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#73718A]">
                Complete Before-and-After Comparison (Field-Level Diffs)
              </h4>
              {Array.isArray((selectedEvent.details as any)?.fieldChanges) &&
              (selectedEvent.details as any).fieldChanges.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 uppercase text-gray-500">
                      <tr>
                        <th className="px-3 py-2 text-left">Configuration Field</th>
                        <th className="px-3 py-2 text-left">Previous Value</th>
                        <th className="px-3 py-2 text-left">New Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(selectedEvent.details as any).fieldChanges.map((change: any) => (
                        <tr key={change.field} className="bg-yellow-50/40">
                          <td className="px-3 py-1.5 font-mono text-[#1E1B4B]">{change.field}</td>
                          <td className="px-3 py-1.5 text-red-700 line-through">
                            {change.previousValue !== null && change.previousValue !== undefined
                              ? String(change.previousValue)
                              : "—"}
                          </td>
                          <td className="px-3 py-1.5 font-semibold text-green-700">
                            {change.newValue !== null && change.newValue !== undefined
                              ? String(change.newValue)
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-500">
                  No individual field-level value changes recorded for this event type ({selectedEvent.action}).
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              {selectedEvent.entityId && (
                <Link
                  href={`/admin/payapprove/config/${selectedEvent.entityId}`}
                  className="rounded-lg bg-[#7C3AED] px-4 py-2 text-xs font-semibold text-white hover:bg-[#6D28D9]"
                >
                  Open Full Configuration View →
                </Link>
              )}
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
