"use client";
import Link from "next/link";
export default function EmployeeDetailsError({ reset }: { error: Error; reset: () => void }) {
  return <main className="flex min-h-0 flex-1 items-center justify-center p-6"><div role="alert" className="rounded-2xl border border-[#EDEAF6] bg-white p-8 text-center shadow-sm"><h1 className="text-xl font-semibold">Employee details could not be loaded</h1><p className="mt-2 text-sm text-[#73718A]">Check your connection and try again.</p><div className="mt-5 flex justify-center gap-3"><button onClick={reset} className="rounded-lg bg-[#7C3AED] px-4 py-2 text-sm font-semibold text-white">Retry</button><Link href="/hr/employees" className="rounded-lg border border-[#EDEAF6] px-4 py-2 text-sm font-semibold">Back to employees</Link></div></div></main>;
}
