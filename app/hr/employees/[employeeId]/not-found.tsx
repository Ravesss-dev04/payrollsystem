import Link from "next/link";
export default function EmployeeNotFound() {
  return <main className="flex min-h-0 flex-1 items-center justify-center p-6"><div className="rounded-2xl border border-[#EDEAF6] bg-white p-8 text-center shadow-sm"><h1 className="text-xl font-semibold">Employee not found</h1><p className="mt-2 text-sm text-[#73718A]">This employee record is unavailable or the link is invalid.</p><Link href="/hr/employees" className="mt-5 inline-block rounded-lg bg-[#7C3AED] px-4 py-2 text-sm font-semibold text-white">Back to Employee Management</Link></div></main>;
}
