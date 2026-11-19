"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { requestPayrollApi, PayrollApiError } from "../../../../lib/payroll-results/client-api";

type SimulationResult = {
  sampleCount: number;
  currentGross: string;
  proposedGross: string;
  diffGross: string;
  diffDeductions: string;
  diffNetPay: string;
  estimatedAggregateFinancialImpact: string;
};

type ComparisonData = {
  target: {
    id: string;
    version: number;
    category: string;
    status: string;
    effectiveFrom: string;
    effectiveTo: string | null;
    changeReason: string;
    supportingReference: string | null;
    configuration: Record<string, unknown>;
    submittedBy?: { id: string; name: string; email: string } | null;
    createdBy?: { id: string; name: string; email: string } | null;
    rejectionReason?: string | null;
    simulationImpact?: SimulationResult | null;
    submittedByUserId?: string | null;
    applicability?: unknown;
  };
  previous: {
    version: number;
    effectiveFrom: string;
    configuration: Record<string, unknown>;
  } | null;
  simulation: SimulationResult;
};

function flattenConfig(cfg: Record<string, unknown>, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(cfg)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(result, flattenConfig(v as Record<string, unknown>, key));
    } else {
      result[key] = Array.isArray(v) ? JSON.stringify(v) : String(v ?? "");
    }
  }
  return result;
}

function DiffTable({
  current,
  proposed,
}: {
  current: Record<string, string>;
  proposed: Record<string, string>;
}) {
  const allKeys = Array.from(new Set([...Object.keys(current), ...Object.keys(proposed)]));
  const changed = allKeys.filter((k) => current[k] !== proposed[k]);

  if (changed.length === 0) {
    return (
      <p className="text-sm text-[#73718A]">
        No field-level differences detected between previous and proposed configuration.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs font-semibold uppercase text-[#73718A]">
          <tr>
            <th className="px-4 py-3 text-left">Field</th>
            <th className="px-4 py-3 text-left">Previous Value</th>
            <th className="px-4 py-3 text-left">Proposed Value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {changed.map((key) => (
            <tr key={key} className="bg-yellow-50/40">
              <td className="px-4 py-2 font-mono text-xs text-[#1E1B4B]">{key}</td>
              <td className="px-4 py-2 text-red-700 line-through">{current[key] ?? "—"}</td>
              <td className="px-4 py-2 font-semibold text-green-700">{proposed[key] ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SimulationCard({ sim }: { sim: SimulationResult }) {
  return (
    <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {[
        ["Sample Employees", sim.sampleCount.toString()],
        ["Current Gross", `₱${sim.currentGross}`],
        ["Proposed Gross", `₱${sim.proposedGross}`],
        ["Δ Gross Pay", `₱${sim.diffGross}`],
        ["Δ Deductions", `₱${sim.diffDeductions}`],
        ["Δ Net Pay", `₱${sim.diffNetPay}`],
        ["Aggregate Impact", `₱${sim.estimatedAggregateFinancialImpact}`],
      ].map(([label, value]) => (
        <div key={label} className="rounded-lg border border-gray-200 bg-white p-3">
          <dt className="text-xs font-medium text-[#73718A]">{label}</dt>
          <dd className="mt-1 text-sm font-semibold text-[#1E1B4B]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ConfigReviewClient({
  comparison,
  actorId,
}: {
  comparison: ComparisonData;
  actorId: string;
}) {
  const { target, previous, simulation } = comparison;

  const [decision, setDecision] = useState<"Approved" | "Rejected" | "">("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isSelfApproval = target.submittedByUserId === actorId;
  const isDecidable = target.status === "PendingApproval";

  const currentFlat = previous ? flattenConfig(previous.configuration) : {};
  const proposedFlat = flattenConfig(target.configuration);

  function handleDecide(e: React.FormEvent) {
    e.preventDefault();
    if (!decision) { setError("Select Approve or Reject."); return; }
    if (decision === "Rejected" && !reason.trim()) {
      setError("A rejection reason is required.");
      return;
    }
    if (isSelfApproval && decision === "Approved") {
      setError("Separation of duties: you cannot approve your own submission.");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await requestPayrollApi(`/api/admin/payroll/config/${target.id}/decision`, {
          method: "POST",
          body: { decision, reason: reason.trim() || undefined },
        });
        setSuccess(
          decision === "Approved"
            ? "Configuration approved successfully. It is now active (or scheduled)."
            : "Configuration rejected. HR has been notified.",
        );
      } catch (err) {
        setError(
          err instanceof PayrollApiError
            ? `Decision failed: ${err.code}`
            : "Could not process decision. Please try again.",
        );
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 p-5 sm:p-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/payapprove/config"
            className="mb-1 inline-block text-xs font-semibold text-[#7C3AED] hover:underline"
          >
            ← Back to Config Queue
          </Link>
          <h1 className="text-2xl font-bold sm:text-3xl">
            Configuration Review — v{target.version}
          </h1>
          <p className="text-sm text-[#73718A]">
            Category: <strong>{target.category}</strong> · Effective:{" "}
            <strong>{target.effectiveFrom}</strong>
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${
            target.status === "PendingApproval"
              ? "bg-yellow-100 text-yellow-800"
              : target.status === "Active"
                ? "bg-purple-100 text-purple-800"
                : target.status === "Rejected"
                  ? "bg-red-100 text-red-800"
                  : "bg-gray-100 text-gray-700"
          }`}
        >
          {target.status}
        </span>
      </header>

      {/* Metadata */}
      <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-[#1E1B4B]">Submission Details</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-[#73718A]">Submitted By</dt>
            <dd className="font-medium">
              {target.submittedBy?.name ?? target.createdBy?.name ?? "Unknown"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[#73718A]">Email</dt>
            <dd className="font-medium">
              {target.submittedBy?.email ?? target.createdBy?.email ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[#73718A]">Effective From</dt>
            <dd className="font-medium">{target.effectiveFrom}</dd>
          </div>
          <div className="col-span-2 sm:col-span-3">
            <dt className="text-xs text-[#73718A]">Change Reason</dt>
            <dd className="font-medium">{target.changeReason}</dd>
          </div>
          {target.supportingReference && (
            <div className="col-span-2 sm:col-span-3">
              <dt className="text-xs text-[#73718A]">Supporting Reference</dt>
              <dd className="break-all font-medium">{target.supportingReference}</dd>
            </div>
          )}
        </dl>
      </section>

      {/* Field-level diff */}
      <section className="space-y-3">
        <h2 className="font-semibold text-[#1E1B4B]">Field-Level Differences</h2>
        {previous ? (
          <p className="text-xs text-[#73718A]">Comparing against previous version v{previous.version}.</p>
        ) : (
          <p className="text-xs text-[#73718A]">No previous version — this is the first configuration draft.</p>
        )}
        <DiffTable current={currentFlat} proposed={proposedFlat} />
      </section>

      {/* Financial impact */}
      <section className="space-y-3">
        <h2 className="font-semibold text-[#1E1B4B]">Estimated Financial Impact</h2>
        <SimulationCard sim={simulation} />
      </section>

      {/* Self-approval warning */}
      {isSelfApproval && isDecidable && (
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm font-medium text-red-800"
        >
          ⚠ Separation of duties: You submitted this configuration. You cannot approve your own
          changes. Another Admin must review this.
        </div>
      )}

      {/* Decision form */}
      {isDecidable && !success && (
        <form onSubmit={handleDecide} className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="font-semibold text-[#1E1B4B]">Admin Decision</h2>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setDecision("Approved")}
              disabled={isSelfApproval}
              className={`rounded-lg px-5 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                decision === "Approved"
                  ? "bg-green-600 text-white"
                  : "border border-green-600 text-green-700 hover:bg-green-50"
              }`}
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => setDecision("Rejected")}
              className={`rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${
                decision === "Rejected"
                  ? "bg-red-600 text-white"
                  : "border border-red-400 text-red-700 hover:bg-red-50"
              }`}
            >
              Reject
            </button>
          </div>

          {decision === "Rejected" && (
            <div className="space-y-1">
              <label htmlFor="rejection-reason" className="block text-sm font-medium">
                Rejection Reason <span className="text-red-600">*</span>
              </label>
              <textarea
                id="rejection-reason"
                rows={3}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why this configuration is being rejected…"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#7C3AED] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
              />
            </div>
          )}

          {error && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending || !decision}
            className="rounded-lg bg-[#7C3AED] px-6 py-2 text-sm font-semibold text-white hover:bg-[#6D28D9] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Submitting…" : "Confirm Decision"}
          </button>
        </form>
      )}

      {/* Already decided */}
      {!isDecidable && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-5 text-sm text-[#73718A]">
          This configuration has already been decided (status: <strong>{target.status}</strong>).
          {target.rejectionReason && (
            <p className="mt-1">
              Rejection reason: <em>{target.rejectionReason}</em>
            </p>
          )}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-800"
        >
          {success}
        </div>
      )}
    </div>
  );
}
