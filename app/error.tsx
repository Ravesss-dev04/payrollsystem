"use client";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#F7F6FF] p-6 text-[#17152D]">
      <section
        role="alert"
        className="max-w-lg rounded-xl border border-amber-300 bg-amber-50 p-6 text-amber-950"
      >
        <h1 className="font-semibold">The request could not be completed.</h1>
        <p className="mt-2 text-sm">
          Your browser session has not been cleared. Check your connection or
          try again; the server will revalidate access before showing protected
          information.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 rounded-lg border border-amber-500 px-3 py-2 text-sm font-medium"
        >
          Retry
        </button>
      </section>
    </main>
  );
}
