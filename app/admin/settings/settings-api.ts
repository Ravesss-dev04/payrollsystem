"use client";

import { z } from "zod";
import { parseCsrfCookie } from "../../lib/auth/csrf";
export { parseCsrfCookie } from "../../lib/auth/csrf";

const unitSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  active: z.boolean(),
});

const organizationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  timeZone: z.string().min(1),
});

const teamSchema = unitSchema.extend({
  department: z.object({ id: z.string().min(1), name: z.string().min(1) }),
});

export const organizationSettingsResponseSchema = z.object({
  organization: organizationSchema.nullable(),
});
export const branchesResponseSchema = z.object({
  branches: z.array(unitSchema),
});
export const departmentsResponseSchema = z.object({
  departments: z.array(unitSchema),
});
export const teamsResponseSchema = z.object({ teams: z.array(teamSchema) });
export const branchResponseSchema = z.object({ branch: unitSchema });
export const departmentResponseSchema = z.object({ department: unitSchema });
export const teamResponseSchema = z.object({ team: teamSchema });
export const employmentStatusResponseSchema = z.object({
  definitions: z.array(
    z.object({
      code: z.string(),
      label: z.string(),
      headcountEligible: z.boolean(),
    }),
  ),
});

export type SettingsUnit = z.infer<typeof unitSchema>;
export type SettingsTeam = z.infer<typeof teamSchema>;
export type SettingsEmploymentStatus = z.infer<
  typeof employmentStatusResponseSchema
>["definitions"][number];

function messageForApiError(code: unknown): string {
  if (code === "forbidden") {
    return "You do not have permission to change these settings.";
  }
  if (code === "organization_not_configured") {
    return "Save organization settings before adding organizational units or policies.";
  }
  if (code === "conflict") {
    return "The change conflicts with existing settings. Check for duplicate names or policy dates.";
  }
  if (code === "version_conflict") {
    return "Another rules draft was saved at the same time. Reload the latest version and try again.";
  }
  if (code === "department_has_active_teams") {
    return "Deactivate this department's teams before deactivating the department.";
  }
  if (code === "policy_effective_date_must_increase") {
    return "The new policy date must be later than the current policy date.";
  }
  if (code === "invalid_request") {
    return "Check the entered values and try again.";
  }
  return "The settings could not be saved. Try again.";
}

export async function requestSettingsApi(
  path: string,
  options: { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown } = {},
): Promise<unknown> {
  const method = options.method ?? "GET";
  const headers = new Headers();
  let body: string | undefined;
  if (options.body !== undefined) {
    headers.set("content-type", "application/json");
    body = JSON.stringify(options.body);
  }
  if (method !== "GET") {
    const csrfToken =
      typeof document === "undefined" ? null : parseCsrfCookie(document.cookie);
    if (!csrfToken) {
      throw new Error("Session validation is required before changing settings.");
    }
    headers.set("x-csrf-token", csrfToken);
  }

  const response = await fetch(path, {
    method,
    headers,
    body,
    cache: "no-store",
  });
  const payload: unknown = await response.json();
  if (!response.ok) {
    const code =
      typeof payload === "object" && payload !== null && "error" in payload
        ? payload.error
        : undefined;
    throw new Error(messageForApiError(code));
  }
  return payload;
}
