import Link from "next/link";
import { requirePagePermission } from "../../lib/auth/page-guard.server";

export default async function HrSettingsPage() {
  const session = await requirePagePermission("employees:manage");
  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-[#f5f2fc] p-6 text-[#111329]">
      <div className="mx-auto max-w-3xl">
        <Link href="/hr/dashboard" className="text-sm font-semibold text-violet-700 hover:underline">? HR dashboard</Link>
        <h1 className="mt-6 text-2xl font-bold">Account settings</h1>
        <section className="mt-5 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="font-semibold">Profile</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div><dt className="text-[#62688b]">Name</dt><dd>{session.name}</dd></div>
            <div><dt className="text-[#62688b]">Email</dt><dd>{session.email}</dd></div>
            <div><dt className="text-[#62688b]">Role</dt><dd>Human Resources</dd></div>
          </dl>
        </section>
      </div>
    </main>
  );
}
