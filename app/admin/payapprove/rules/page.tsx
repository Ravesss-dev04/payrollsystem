import Link from "next/link";
import { requirePagePermission } from "../../../lib/auth/page-guard.server";
import { getLatestPayrollRuleSet } from "../../../lib/payroll/rules-service.server";
import PayrollRulesEditor from "./PayrollRulesEditor";

export default async function PayrollRulesPage() {
  const actor = await requirePagePermission("payroll:approve");
  const initialRuleSet = await getLatestPayrollRuleSet(actor);

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 p-5 sm:p-8">
      <div>
        <Link
          href="/admin/payapprove"
          className="text-sm font-semibold text-[#7C3AED] hover:underline"
        >
          Payroll Approvals
        </Link>
        <h1 className="mt-3 text-2xl font-bold sm:text-3xl">
          Payroll Calculation Rules
        </h1>
        <p className="mt-2 text-sm text-[#73718A]">
          Manage versioned rule drafts. Drafts are audited and immutable after
          saving.
        </p>
      </div>
      <PayrollRulesEditor initialRuleSet={initialRuleSet} />
    </main>
  );
}
