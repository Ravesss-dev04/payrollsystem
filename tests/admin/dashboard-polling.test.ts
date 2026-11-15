import { describe, expect, it } from "bun:test";

describe("dashboard snapshot polling", () => {
  it("polls only while visible and removes its timer and listener on cleanup", async () => {
    const { startDashboardPolling } = await import(
      "../../app/admin/dashboard/polling"
    );
    let visibilityListener: (() => void) | undefined;
    let intervalCallback: (() => void) | undefined;
    let clearedTimer: number | undefined;
    let removedListener: (() => void) | undefined;
    let refreshes = 0;
    const documentRef = {
      visibilityState: "hidden" as DocumentVisibilityState,
      addEventListener: (_type: "visibilitychange", listener: () => void) => {
        visibilityListener = listener;
      },
      removeEventListener: (_type: "visibilitychange", listener: () => void) => {
        removedListener = listener;
      },
    };

    const stop = startDashboardPolling({
      onRefresh: () => {
        refreshes++;
      },
      documentRef,
      setIntervalFn: (callback, delay) => {
        expect(delay).toBe(30_000);
        intervalCallback = callback as () => void;
        return 17;
      },
      clearIntervalFn: (timerId) => {
        clearedTimer = timerId;
      },
    });

    intervalCallback?.();
    expect(refreshes).toBe(0);
    documentRef.visibilityState = "visible";
    visibilityListener?.();
    expect(refreshes).toBe(1);
    intervalCallback?.();
    expect(refreshes).toBe(2);
    stop();

    expect(clearedTimer).toBe(17);
    expect(removedListener).toBe(visibilityListener);
  });
});
