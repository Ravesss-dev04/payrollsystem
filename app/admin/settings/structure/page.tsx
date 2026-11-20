import Link from "next/link";
import { OrganizationStructureForm } from "../OrganizationStructureForm";
import { requirePagePermission } from "../../../lib/auth/page-guard.server";
import {
  getBranches,
  getDepartments,
  getOrganizationSettings,
} from "../../../lib/organization/service";

export default async function OrganizationStructurePage() {
  await requirePagePermission("company:manage");
  const [organization, branches, departments] = await Promise.all([
    getOrganizationSettings(),
    getBranches(),
    getDepartments(),
  ]);

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
          Organization structure
        </h1>
        <p className="mt-2 text-sm text-[#73718A]">
          Maintain branches and departments. Records are deactivated
          rather than deleted so linked history can be retained.
        </p>
      </header>
      <OrganizationStructureForm
        initialBranches={branches}
        initialDepartments={departments}
        organizationConfigured={organization !== null}
      />
    </div>
  );
}
