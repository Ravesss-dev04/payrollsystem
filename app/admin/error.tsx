"use client";

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      role="alert"
      className="m-6 rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-950"
    >
      <h1 className="font-semibold">We could not verify your session.</h1>
      <p className="mt-1 text-sm">
        Your session has not been cleared. Check your connection and try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-lg border border-amber-500 px-3 py-2 text-sm font-medium"
      >
        Retry
      </button>
    </div>
  );
}
