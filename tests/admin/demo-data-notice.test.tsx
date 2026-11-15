import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "bun:test";

const noticePath = fileURLToPath(
  new URL(
    "../../app/admin/components/DemoDataNotice.tsx",
    import.meta.url,
  ),
);

describe("demo data notice", () => {
  it("identifies demo records and actions as non-persistent", async () => {
    expect(existsSync(noticePath)).toBe(true);
    const { DemoDataNotice } = await import(pathToFileURL(noticePath).href);
    const markup = renderToStaticMarkup(
      createElement(DemoDataNotice),
    );

    expect(markup).toContain('role="note"');
    expect(markup).toContain("Demo data only");
    expect(markup).toContain("actions are simulated");
    expect(markup).toContain("do not update the company database");
  });
});
