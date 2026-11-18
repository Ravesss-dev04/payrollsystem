"use client";

import { useState, type FormEvent } from "react";
import {
  payrollRuleSetDraftInputSchema,
  payrollRuleConfigurationSchema,
  type PayrollRuleConfiguration,
} from "../../../lib/payroll/rules";
import {
  payrollRuleSetDraftResponseSchema,
  requestPayrollRulesApi,
  type PayrollRuleSet,
} from "./rules-api";

const emptyConfiguration: PayrollRuleConfiguration = {
  schemaVersion: 1,
  currencyCode: null,
  rounding: {},
  compensation: {},
  earnings: [],
  deductions: [],
};

function configurationText(configuration: PayrollRuleConfiguration): string {
  return JSON.stringify(configuration, null, 2);
}

export function PayrollRulesEditor({
  initialRuleSet,
}: {
  initialRuleSet: PayrollRuleSet | null;
}) {
  const [effectiveFrom, setEffectiveFrom] = useState(
    initialRuleSet?.effectiveFrom.slice(0, 10) ??
      new Date().toISOString().slice(0, 10),
  );
  const [configuration, setConfiguration] = useState(
    configurationText(initialRuleSet?.configuration ?? emptyConfiguration),
  );
  const [ruleSet, setRuleSet] = useState(initialRuleSet);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const parsedJson: unknown = JSON.parse(configuration);
      const parsedConfiguration = payrollRuleConfigurationSchema.parse(
        parsedJson,
      );
      const input = payrollRuleSetDraftInputSchema.parse({
        effectiveFrom,
        configuration: parsedConfiguration,
      });
      const response = payrollRuleSetDraftResponseSchema.parse(
        await requestPayrollRulesApi("POST", input),
      );
      setRuleSet(response.ruleSet);
      setEffectiveFrom(response.ruleSet.effectiveFrom.slice(0, 10));
      setConfiguration(configurationText(response.ruleSet.configuration));
      setMessage(`Draft version ${response.ruleSet.version} saved.`);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The payroll rules draft could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <section
        aria-labelledby="payroll-rules-status"
        className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950"
      >
        <h2 id="payroll-rules-status" className="font-semibold">
          Payroll calculations are not configured
        </h2>
        <p className="mt-1">
          Saved documents are versioned drafts only. They are not used to
          calculate, validate, approve, or disburse payroll.
        </p>
        {ruleSet && (
          <p className="mt-2">
            Latest draft: v{ruleSet.version}, effective {ruleSet.effectiveFrom.slice(0, 10)}.
          </p>
        )}
      </section>

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

      <form
        onSubmit={(event) => void submit(event)}
        className="space-y-5 rounded-xl border border-[#EDEAF6] bg-white p-5 shadow-sm sm:p-6"
      >
        <div>
          <h2 className="text-lg font-semibold">Calculation rules draft</h2>
          <p className="mt-1 text-sm text-[#73718A]">
            No rates or formulas are prefilled. Only the document's top-level
            structure is checked; inner rule fields remain draft data and are
            not used by a calculation engine.
          </p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="payroll-rules-effective-date" className="text-sm font-medium">
            Effective from
          </label>
          <input
            id="payroll-rules-effective-date"
            type="date"
            required
            value={effectiveFrom}
            onChange={(event) => setEffectiveFrom(event.target.value)}
            className="w-full max-w-xs rounded-lg border border-[#D8D4E5] px-3 py-2 text-sm outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="payroll-rules-configuration" className="text-sm font-medium">
            Rule document
          </label>
          <textarea
            id="payroll-rules-configuration"
            required
            spellCheck={false}
            value={configuration}
            onChange={(event) => setConfiguration(event.target.value)}
            rows={24}
            className="w-full rounded-lg border border-[#D8D4E5] px-3 py-2 font-mono text-xs outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20"
            aria-describedby="payroll-rules-format"
          />
          <p id="payroll-rules-format" className="text-xs text-[#73718A]">
            Required top-level keys: schemaVersion (1), currencyCode (ISO
            currency code or null), rounding, compensation, earnings, and
            deductions. Unknown top-level keys are rejected. Keep monetary
            values as decimal strings.
          </p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#7C3AED] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6D28D9] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save new draft version"}
        </button>
      </form>
    </div>
  );
}

