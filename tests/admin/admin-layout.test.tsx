import { createElement, Suspense } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, mock } from "bun:test";

const calls: string[] = [];

mock.module("next/server", () => ({
  connection: async () => {
    calls.push("connection");
  },
}));

mock.module("../../app/lib/auth/page-guard.server", () => ({
  requirePagePermission: async () => {
    calls.push("permission");
    return {
      userId: "admin-1",
      name: "Admin",
      email: "admin@example.test",
      role: "admin",
    };
  },
}));

describe("Admin request-time layout", () => {
  it("defers authentication into a Suspense boundary", async () => {
    const [{ default: AdminLayout }, { default: AdminRequestLayout }] =
      await Promise.all([
        import("../../app/admin/layout"),
        import("../../app/admin/AdminRequestLayout"),
      ]);

    const layout = AdminLayout({ children: createElement("p", null, "content") });

    expect(layout.type).toBe(Suspense);
    expect(layout.props.children.type).toBe(AdminRequestLayout);
  });

  it("waits for the incoming request before checking the Admin session", async () => {
    const { default: AdminRequestLayout } = await import(
      "../../app/admin/AdminRequestLayout"
    );
    calls.length = 0;

    await AdminRequestLayout({ children: createElement("p", null, "content") });

    expect(calls).toEqual(["connection", "permission"]);
  });

  it("renders a non-sensitive accessible loading fallback", async () => {
    const { default: AdminLayoutFallback } = await import(
      "../../app/admin/components/AdminLayoutFallback"
    );
    const markup = renderToStaticMarkup(createElement(AdminLayoutFallback));

    expect(markup).toContain('role="status"');
    expect(markup).toContain("Loading admin workspace");
    expect(markup).not.toContain("admin@example.test");
  });
});
