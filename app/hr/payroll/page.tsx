import Link from "next/link";
import { requirePagePermission } from "../../lib/auth/page-guard.server";
import { PayrollPreparationClient } from "./PayrollPreparationClient";

export default async function PayrollPage() {
  await requirePagePermission("payroll:manage");
  return (
    <>
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-4 px-5 pt-5 sm:px-8 sm:pt-8">
        <Link
          href="/hr/payroll/deduction-categories"
          className="text-sm font-semibold text-[#7C3AED] hover:underline"
        >
          Manage deduction category draft
        </Link>
        <span className="text-gray-300">|</span>
        <Link
          href="/hr/payroll/config"
          className="text-sm font-semibold text-[#7C3AED] hover:underline"
        >
          Payroll Setup &amp; Configuration
        </Link>
      </div>
      <PayrollPreparationClient />
    </>
  );
}
