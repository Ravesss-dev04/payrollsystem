import Link from "next/link";
import { requirePagePermission } from "../../../lib/auth/page-guard.server";
import {
  getActiveConfiguration,
  listConfigurationVersions,
} from "../../../lib/payroll/config-service.server";
import { PayrollConfigPortalClient } from "./PayrollConfigPortalClient";

export default async function PayrollConfigPage() {
  const actor = await requirePagePermission("payroll:manage");
  const [active, history] = await Promise.all([
    getActiveConfiguration("GeneralSettings"),
    listConfigurationVersions(actor, { page: 1, pageSize: 20 }),
  ]);

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-5 sm:p-8">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm text-[#73718A]">
          <Link href="/hr/payroll" className="font-semibold text-[#7C3AED] hover:underline">
            Payroll Workspace
          </Link>
          <span>/</span>
          <span className="text-[#1E1B4B]">Configuration &amp; Setup</span>
        </div>
        <h1 className="text-2xl font-bold text-[#1E1B4B] sm:text-3xl">
          HR Payroll Setup &amp; Configuration Portal
        </h1>
        <p className="text-sm text-[#73718A]">
          Configure company payroll calculation rules, statutory components, earnings, deductions,
          and employee benefit policies without modifying code or direct database records. All changes
          support non-destructive simulation and follow maker-checker administrative approval.
        </p>
      </div>

      <PayrollConfigPortalClient
        initialActive={active as any}
        initialHistory={history as any}
      />
    </main>
  );
}
