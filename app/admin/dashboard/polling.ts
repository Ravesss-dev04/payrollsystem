interface DashboardPollingOptions {
  onRefresh: () => void | Promise<void>;
  documentRef: {
    visibilityState: DocumentVisibilityState;
    addEventListener(type: "visibilitychange", listener: () => void): void;
    removeEventListener(type: "visibilitychange", listener: () => void): void;
  };
  setIntervalFn: (handler: () => void, timeout: number) => number;
  clearIntervalFn: (timerId: number) => void;
}

export function startDashboardPolling({
  onRefresh,
  documentRef,
  setIntervalFn,
  clearIntervalFn,
}: DashboardPollingOptions): () => void {
  const refreshWhenVisible = () => {
    if (documentRef.visibilityState === "visible") void onRefresh();
  };
  const timer = setIntervalFn(refreshWhenVisible, 30_000);
  documentRef.addEventListener("visibilitychange", refreshWhenVisible);

  return () => {
    clearIntervalFn(timer);
    documentRef.removeEventListener("visibilitychange", refreshWhenVisible);
  };
}
