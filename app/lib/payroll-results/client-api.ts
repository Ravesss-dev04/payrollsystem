"use client";

import { parseCsrfCookie } from "../auth/csrf";

export class PayrollApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
  ) {
    super(code);
  }
}

export async function requestPayrollApi(
  path: string,
  options: {
    method?: "GET" | "POST" | "PATCH";
    body?: unknown;
    signal?: AbortSignal;
  } = {},
): Promise<unknown> {
  const method = options.method ?? "GET";
  const headers = new Headers();
  let body: string | undefined;
  if (options.body !== undefined) {
    headers.set("content-type", "application/json");
    body = JSON.stringify(options.body);
  }
  if (method !== "GET") {
    const token =
      typeof document === "undefined"
        ? null
        : parseCsrfCookie(document.cookie);
    if (!token) throw new PayrollApiError("session_validation_required", 403);
    headers.set("x-csrf-token", token);
  }

  const response = await fetch(path, {
    method,
    headers,
    body,
    signal: options.signal,
    cache: "no-store",
  });
  const payload: unknown = await response.json();
  if (!response.ok) {
    const code =
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : "request_failed";
    throw new PayrollApiError(code, response.status);
  }
  return payload;
}

export async function requestPayrollReport(path: string): Promise<Blob> {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    const body = await response.text();
    let payload: unknown = null;
    try {
      payload = JSON.parse(body);
    } catch {
      throw new PayrollApiError("request_failed", response.status);
    }
    const code =
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : "request_failed";
    throw new PayrollApiError(code, response.status);
  }
  if (
    response.headers.get("content-type") !==
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    throw new PayrollApiError("invalid_report_response", 500);
  }
  return response.blob();
}
