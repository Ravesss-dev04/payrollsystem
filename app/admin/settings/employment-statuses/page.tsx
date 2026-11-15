import Link from "next/link";
import { EmploymentStatusPolicyForm } from "../EmploymentStatusPolicyForm";
import { requirePagePermission } from "../../../lib/auth/page-guard.server";
import { getEmploymentStatusPolicy } from "../../../lib/organization/service";

export default async function EmploymentStatusesPage() {
  await requirePagePermission("company:manage");
  const definitions = await getEmploymentStatusPolicy();

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
      <Link
        href="/admin/settings"
        className="text-sm font-medium text-[#6D28D9] hover:underline"
      >
        Back to Settings
      </Link>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          Employment status policy
        </h1>
        <p className="mt-2 text-sm text-[#73718A]">
          Configure employment-specific status definitions. Login account
          availability does not determine workforce headcount.
        </p>
      </header>
      <EmploymentStatusPolicyForm initialDefinitions={definitions} />
    </div>
  );
}
