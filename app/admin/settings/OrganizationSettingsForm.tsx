"use client";

import { useState, type FormEvent } from "react";
import { organizationSettingsInputSchema, supportedTimeZones } from "../../lib/organization/policy";
import {
  organizationSettingsResponseSchema,
  requestSettingsApi,
} from "./settings-api";

export function OrganizationSettingsForm({
  initialSettings,
}: {
  initialSettings: { name: string; timeZone: string } | null;
}) {
  const [name, setName] = useState(initialSettings?.name ?? "");
  const [timeZone, setTimeZone] = useState(
    initialSettings?.timeZone ?? "Asia/Manila",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const input = organizationSettingsInputSchema.parse({ name, timeZone });
      const payload = organizationSettingsResponseSchema.parse(
        await requestSettingsApi("/api/admin/settings/organization", {
          method: "POST",
          body: input,
        }),
      );
      if (!payload.organization) {
        throw new Error("The organization settings could not be confirmed.");
      }
      setName(payload.organization.name);
      setTimeZone(payload.organization.timeZone);
      setMessage("Organization settings saved.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Organization settings could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="space-y-5 rounded-xl border border-[#EDEAF6] bg-white p-5 shadow-sm sm:p-6"
    >
      <div>
        <h2 className="text-lg font-semibold">Organization profile</h2>
        <p className="mt-1 text-sm text-[#73718A]">
          Configure the organization name and reporting time zone used by
          workforce records.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="organization-name" className="text-sm font-medium">
            Organization name
          </label>
          <input
            id="organization-name"
            aria-label="Organization name"
            required
            maxLength={160}
            autoComplete="organization"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-lg border border-[#D8D4E5] px-3 py-2 text-sm outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="organization-time-zone" className="text-sm font-medium">
            Company time zone
          </label>
          <input
            id="organization-time-zone"
            aria-label="Company time zone"
            list="organization-time-zones"
            required
            maxLength={64}
            value={timeZone}
            onChange={(event) => setTimeZone(event.target.value)}
            className="w-full rounded-lg border border-[#D8D4E5] px-3 py-2 text-sm outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20"
          />
          <datalist id="organization-time-zones">
            {supportedTimeZones().map((zone) => <option key={zone} value={zone} />)}
          </datalist>
          <p className="text-xs text-[#73718A]">
            Enter an IANA time-zone name, such as Asia/Manila.
          </p>
        </div>
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
        disabled={saving}
        className="rounded-lg bg-[#7C3AED] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#6D28D9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED] disabled:cursor-wait disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save organization settings"}
      </button>
    </form>
  );
}
