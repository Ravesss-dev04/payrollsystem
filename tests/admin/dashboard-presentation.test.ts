import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "bun:test";

const presentationPath = fileURLToPath(
  new URL("../../app/admin/dashboard/presentation.ts", import.meta.url),
);

async function getPresentationModule() {
  expect(existsSync(presentationPath)).toBe(true);
  return import(pathToFileURL(presentationPath).href);
}

describe("dashboard presentation", () => {
  it("uses the Manila-local date and morning greeting", async () => {
    const { getDashboardPresentation } = await getPresentationModule();

    expect(
      getDashboardPresentation(
        new Date("2026-11-14T16:30:00Z"),
        "Casey",
      ),
    ).toEqual({
      greeting: "Good morning, Casey!",
      snapshotDate: "November 15, 2026",
    });
  });

  it("uses the Manila-local evening greeting", async () => {
    const { getDashboardPresentation } = await getPresentationModule();

    expect(
      getDashboardPresentation(
        new Date("2026-11-15T12:30:00Z"),
        "Casey",
      ).greeting,
    ).toBe("Good evening, Casey!");
  });
});
