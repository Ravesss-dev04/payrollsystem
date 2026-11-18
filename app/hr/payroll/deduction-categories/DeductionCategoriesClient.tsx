"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { requestPayrollApi } from "../../../lib/payroll-results/client-api";
import {
  deductionCategoryDraftInputSchema,
  deductionCategorySetViewSchema,
  deductionCategorySetsResponseSchema,
  type DeductionCategorySetsResponse,
} from "../../../lib/payroll/deduction-categories";

const draftResponseSchema = z.object({
  categorySet: deductionCategorySetViewSchema,
});

export function DeductionCategoriesClient() {
  const [sets, setSets] = useState<DeductionCategorySetsResponse | null>(null);
  const [categoriesText, setCategoriesText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const result = deductionCategorySetsResponseSchema.parse(
          await requestPayrollApi("/api/hr/payroll/deduction-categories", {
            signal: controller.signal,
          }),
        );
        setSets(result);
        setCategoriesText(
          (result.latestDraft?.categories ?? result.active?.categories ?? []).join(
            "\n",
          ),
        );
      } catch (caught) {
        if (!controller.signal.aborted) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Deduction categories could not be loaded.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, []);

  async function saveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const input = deductionCategoryDraftInputSchema.parse({
        categories: categoriesText
          .split(/\r?\n/)
          .map((category) => category.trim())
          .filter(Boolean),
      });
      const { categorySet: response } = draftResponseSchema.parse(
        await requestPayrollApi("/api/hr/payroll/deduction-categories", {
          method: "POST",
          body: input,
        }),
      );
      setSets((current) =>
        current ? { ...current, latestDraft: response } : current,
      );
      setMessage(
        `Draft version ${response.version} saved. An Admin must approve and activate it.`,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The deduction category draft could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 p-5 sm:p-8">
      <header className="space-y-2">
        <Link
          href="/hr/payroll"
          className="text-sm font-semibold text-[#7C3AED] hover:underline"
        >
          Payroll preparation
        </Link>
        <h1 className="text-2xl font-bold sm:text-3xl">
          Deduction categories
        </h1>
        <p className="text-sm text-[#73718A]">
          Edit category names only. This does not calculate deductions or
          validate eligibility. An Admin must approve and activate each draft
          before it can validate a submitted payroll version.
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
        <p role="status">Loading deduction categories…</p>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2">
            <article className="rounded-xl border border-[#EDEAF6] bg-white p-4">
              <h2 className="font-semibold">Active configuration</h2>
              {sets?.active ? (
                <>
                  <p className="mt-1 text-sm text-[#73718A]">
                    Version {sets.active.version} · approved by{" "}
                    {sets.active.approvedBy ?? "Not recorded"}
                  </p>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
                    {sets.active.categories.map((category) => (
                      <li key={category}>{category}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="mt-1 text-sm text-amber-800">
                  No Admin-approved category configuration is active.
                </p>
              )}
            </article>
            <article className="rounded-xl border border-[#EDEAF6] bg-white p-4">
              <h2 className="font-semibold">Latest draft</h2>
              <p className="mt-1 text-sm text-[#73718A]">
                {sets?.latestDraft
                  ? `Version ${sets.latestDraft.version} · awaiting Admin review`
                  : "No draft"}
              </p>
            </article>
          </section>

          <form
            onSubmit={(event) => void saveDraft(event)}
            className="space-y-4 rounded-xl border border-[#EDEAF6] bg-white p-5"
          >
            <div className="space-y-1.5">
              <label
                htmlFor="deduction-category-list"
                className="text-sm font-medium"
              >
                Category names (one per line)
              </label>
              <textarea
                id="deduction-category-list"
                value={categoriesText}
                onChange={(event) => setCategoriesText(event.target.value)}
                maxLength={64 * 42}
                rows={12}
                required
                aria-describedby="deduction-category-help"
                className="w-full rounded-lg border border-[#D8D4E5] px-3 py-2 font-mono text-sm outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20"
              />
              <p id="deduction-category-help" className="text-xs text-[#73718A]">
                Add 1–64 unique names, each up to 40 characters. Drafts are
                versioned; saving a new draft supersedes the prior unapproved
                draft.
              </p>
            </div>
            <button
              type="submit"
              disabled={saving || loading}
              className="min-h-10 rounded-lg bg-[#7C3AED] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6D28D9] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save category draft"}
            </button>
          </form>
        </>
      )}
    </main>
  );
}
