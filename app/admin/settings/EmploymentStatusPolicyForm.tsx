"use client";

import { useState, type FormEvent } from "react";
import { employmentStatusPolicyInputSchema } from "../../lib/organization/policy";
import {
  employmentStatusResponseSchema,
  requestSettingsApi,
  type SettingsEmploymentStatus,
} from "./settings-api";

type PolicyDefinition = SettingsEmploymentStatus & { active: boolean };

export function EmploymentStatusPolicyForm({
  initialDefinitions,
}: {
  initialDefinitions: SettingsEmploymentStatus[];
}) {
  const [definitions, setDefinitions] = useState<PolicyDefinition[]>(
    initialDefinitions.map((definition) => ({ ...definition, active: true })),
  );
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newHeadcountEligible, setNewHeadcountEligible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function addStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const code = newCode.trim().toUpperCase();
    const label = newLabel.trim();
    if (definitions.some((definition) => definition.code === code)) {
      setError("Each employment status code must be unique.");
      return;
    }
    setDefinitions((current) => [
      ...current,
      {
        code,
        label,
        active: true,
        headcountEligible: newHeadcountEligible,
      },
    ]);
    setNewCode("");
    setNewLabel("");
    setNewHeadcountEligible(false);
  }

  async function savePolicy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const input = employmentStatusPolicyInputSchema.parse({
        effectiveFrom,
        definitions,
      });
      const result = employmentStatusResponseSchema.parse(
        await requestSettingsApi(
          "/api/admin/settings/employment-statuses",
          { method: "POST", body: input },
        ),
      );
      setDefinitions(
        result.definitions.map((definition) => ({
          ...definition,
          active: true,
        })),
      );
      setMessage("A new employment status policy version was saved.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The employment status policy could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-[#EDEAF6] bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold">Employment status policy</h2>
        <p className="mt-1 text-sm text-[#73718A]">
          Create versioned employment status definitions and explicitly choose
          which statuses count toward workforce headcount.
        </p>
        {definitions.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-[#D8D4E5] px-4 py-3 text-sm text-[#73718A]">
            No employment status policy is configured yet.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {definitions.map((definition, index) => (
              <li
                key={`${definition.code}-${index}`}
                className="flex flex-col gap-3 rounded-lg border border-[#EDEAF6] p-3 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{definition.label}</p>
                  <p className="text-xs text-[#73718A]">{definition.code}</p>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={definition.headcountEligible}
                    onChange={(event) =>
                      setDefinitions((current) =>
                        current.map((item, currentIndex) =>
                          currentIndex === index
                            ? {
                                ...item,
                                headcountEligible: event.target.checked,
                              }
                            : item,
                        ),
                      )
                    }
                    disabled={saving}
                  />
                  Headcount eligible
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setDefinitions((current) =>
                      current.filter((_, currentIndex) => currentIndex !== index),
                    )
                  }
                  disabled={saving}
                  className="rounded-lg border border-[#D8D4E5] px-3 py-2 text-sm font-medium hover:bg-purple-50 disabled:opacity-50"
                  aria-label={`Remove ${definition.label} from the new policy`}
                >
                  Remove from new policy
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form
        onSubmit={(event) => void addStatus(event)}
        className="grid gap-3 rounded-xl border border-[#EDEAF6] bg-white p-5 shadow-sm sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end sm:p-6"
      >
        <div className="space-y-1">
          <label htmlFor="status-code" className="text-sm font-medium">
            Status code
          </label>
          <input
            id="status-code"
            required
            maxLength={40}
            pattern="[A-Za-z][A-Za-z0-9_]*"
            value={newCode}
            onChange={(event) => setNewCode(event.target.value.toUpperCase())}
            placeholder="e.g. ACTIVE"
            className="w-full rounded-lg border border-[#D8D4E5] px-3 py-2 text-sm focus:border-[#7C3AED] focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="status-label" className="text-sm font-medium">
            Display name
          </label>
          <input
            id="status-label"
            required
            maxLength={100}
            value={newLabel}
            onChange={(event) => setNewLabel(event.target.value)}
            placeholder="e.g. Active employee"
            className="w-full rounded-lg border border-[#D8D4E5] px-3 py-2 text-sm focus:border-[#7C3AED] focus:outline-none"
          />
        </div>
        <label className="flex items-center gap-2 py-2 text-sm">
          <input
            type="checkbox"
            checked={newHeadcountEligible}
            onChange={(event) =>
              setNewHeadcountEligible(event.target.checked)
            }
          />
          Headcount eligible
        </label>
        <button
          type="submit"
          className="rounded-lg border border-[#D8D4E5] px-4 py-2 text-sm font-semibold hover:bg-purple-50"
        >
          Add employment status
        </button>
      </form>

      <form
        onSubmit={(event) => void savePolicy(event)}
        className="space-y-4 rounded-xl border border-[#EDEAF6] bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="space-y-1">
          <label htmlFor="policy-effective-from" className="text-sm font-medium">
            Effective from
          </label>
          <input
            id="policy-effective-from"
            type="date"
            required
            value={effectiveFrom}
            onChange={(event) => setEffectiveFrom(event.target.value)}
            className="block rounded-lg border border-[#D8D4E5] px-3 py-2 text-sm focus:border-[#7C3AED] focus:outline-none"
          />
          <p className="text-xs text-[#73718A]">
            The effective date must be later than the current policy version.
          </p>
        </div>
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
            {message}
          </p>
        )}
        <button
          type="submit"
          disabled={saving || definitions.length === 0 || !effectiveFrom}
          className="rounded-lg bg-[#7C3AED] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#6D28D9] disabled:cursor-wait disabled:opacity-60"
        >
          {saving ? "Saving policy..." : "Save new policy version"}
        </button>
      </form>
    </div>
  );
}
