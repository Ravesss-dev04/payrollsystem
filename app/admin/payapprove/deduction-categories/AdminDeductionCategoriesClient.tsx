"use client";

import { useCallback, useEffect, useState } from "react";
import { requestPayrollApi } from "../../../lib/payroll-results/client-api";
import {
  deductionCategorySetsResponseSchema,
  type DeductionCategorySetsResponse,
} from "../../../lib/payroll/deduction-categories";
import { formatPayrollDateTime } from "../../../lib/payroll-results/format";

export function AdminDeductionCategoriesClient() {
  const [sets, setSets] = useState<DeductionCategorySetsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const reload = useCallback(async (signal?: AbortSignal) => {
    const response = deductionCategorySetsResponseSchema.parse(
      await requestPayrollApi("/api/admin/payroll/deduction-categories", {
        ...(signal ? { signal } : {}),
      }),
    );
    setSets(response);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    reload(controller.signal)
      .catch((caught: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Deduction categories could not be loaded.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [reload]);

  async function activateDraft() {
    if (!sets?.latestDraft) return;
    const version = sets.latestDraft.version;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await requestPayrollApi("/api/admin/payroll/deduction-categories", {
        method: "POST",
        body: {
          version,
          expectedActiveVersion: sets.active?.version ?? null,
        },
      });
      await reload();
      setMessage(`Deduction categories version ${version} activated.`);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The deduction category draft could not be activated.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 p-5 sm:p-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">
          Deduction category approval
        </h1>
        <p className="text-sm text-[#73718A]">
          Review HR-submitted category names. Activation affects category
          validation only; it does not calculate or approve deduction amounts.
        </p>
      </header>

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
      {loading ? (
        <p role="status">Loading deduction category configuration…</p>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2">
          <CategorySetCard title="Active configuration" categorySet={sets?.active ?? null} />
          <CategorySetCard title="HR draft" categorySet={sets?.latestDraft ?? null} />
          {sets?.latestDraft && (
            <button
              type="button"
              onClick={() => void activateDraft()}
              disabled={saving}
              className="min-h-10 justify-self-start rounded-lg bg-[#7C3AED] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6D28D9] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Activating…" : "Approve and activate draft"}
            </button>
          )}
        </section>
      )}
    </main>
  );
}

function CategorySetCard({
  title,
  categorySet,
}: {
  title: string;
  categorySet: NonNullable<DeductionCategorySetsResponse["active"]> | null;
}) {
  return (
    <article className="rounded-xl border border-[#EDEAF6] bg-white p-4">
      <h2 className="font-semibold">{title}</h2>
      {categorySet ? (
        <>
          <p className="mt-1 text-sm text-[#73718A]">
            Version {categorySet.version} · {categorySet.status}
            {categorySet.createdBy ? ` · prepared by ${categorySet.createdBy}` : ""}
            {categorySet.approvedBy
              ? ` · approved by ${categorySet.approvedBy} at ${formatPayrollDateTime(categorySet.approvedAt)}`
              : ""}
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            {categorySet.categories.map((category: string) => (
              <li key={category}>{category}</li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-1 text-sm text-[#73718A]">None</p>
      )}
    </article>
  );
}
