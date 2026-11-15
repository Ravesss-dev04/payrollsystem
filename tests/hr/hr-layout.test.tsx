import { createElement, Suspense } from "react";
import { describe, expect, it, mock } from "bun:test";

const calls: string[] = [];

mock.module("next/server", () => ({
  connection: async () => {
    calls.push("connection");
  },
}));

mock.module("../../app/lib/auth/page-guard.server", () => ({
  requirePagePermission: async (permission?: string) => {
    calls.push(`permission:${permission}`);
    return {
      userId: "hr-1",
      name: "HR User",
      email: "hr@example.test",
      role: "hr",
    };
  },
}));

describe("HR request-time layout", () => {
  it("defers session authorization into a Suspense boundary", async () => {
    const layoutModule = await import("../../app/hr/layout").catch(
      () => null,
    );
    expect(layoutModule).not.toBeNull();

    const layout = layoutModule!.default({
      children: createElement("p", null, "employee records"),
    });

    expect(layout.type).toBe(Suspense);
  });

  it("waits for the request and enforces HR-only employee management", async () => {
    const layoutModule = await import("../../app/hr/layout").catch(
      () => null,
    );
    expect(layoutModule).not.toBeNull();
    calls.length = 0;

    await layoutModule!.HrRequestLayout({
      children: createElement("p", null, "employee records"),
    });

    expect(calls).toEqual(["connection", "permission:employees:manage"]);
  });
});
