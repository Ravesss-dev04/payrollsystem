import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, mock } from "bun:test";

mock.module("next/navigation", () => ({
  usePathname: () => "/admin/settings",
}));

describe("Admin settings navigation", () => {
  it("activates Settings while keeping the temporary Company route hidden", async () => {
    const sidebarModule = await import(
      "../../app/admin/components/AdminSidebar"
    ).catch(() => null);
    expect(sidebarModule).not.toBeNull();

    const markup = renderToStaticMarkup(
      createElement(sidebarModule!.default, {
        user: { name: "Riley Admin", role: "admin" },
      }),
    );

    expect(markup).toContain('href="/admin/settings"');
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain("Riley Admin");
    expect(markup).toContain("Administrator");
    expect(markup).not.toContain('href="/admin/company"');
    expect(markup).not.toContain("<span>Company</span>");
  });
});
