import Link from "next/link";
import { OrganizationSettingsForm } from "../OrganizationSettingsForm";
import { requirePagePermission } from "../../../lib/auth/page-guard.server";
import { getOrganizationSettings } from "../../../lib/organization/service";

export default async function OrganizationSettingsPage() {
  await requirePagePermission("company:manage");
  const settings = await getOrganizationSettings();

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
          Organization profile
        </h1>
        <p className="mt-2 text-sm text-[#73718A]">
          The time zone is used for organization reporting and effective-date
          interpretation.
        </p>
      </header>
      <OrganizationSettingsForm
        initialSettings={
          settings
            ? { name: settings.name, timeZone: settings.timeZone }
            : null
        }
      />
    </div>
  );
}
