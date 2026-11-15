import Link from "next/link";
import { requirePagePermission } from "../../lib/auth/page-guard.server";

const settingsSections = [
  {
    title: "Organization profile",
    description: "Set the organization name and reporting time zone.",
    href: "/admin/settings/organization",
  },
  {
    title: "Branches, departments, and teams",
    description: "Maintain the organization structure used by workforce records.",
    href: "/admin/settings/structure",
  },
  {
    title: "Employment status policy",
    description: "Version employment status definitions and headcount eligibility.",
    href: "/admin/settings/employment-statuses",
  },
];

export default async function AdminSettingsPage() {
  await requirePagePermission("company:manage");

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
      <header>
        <p className="text-sm font-medium text-[#7C3AED]">Admin workspace</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-2 max-w-2xl text-sm text-[#73718A]">
          Configure organization-owned records and policies. Changes are
          permission-checked and recorded in the domain audit history.
        </p>
      </header>
      <nav aria-label="Admin settings sections">
        <ul className="grid gap-4 md:grid-cols-2">
          {settingsSections.map((section) => (
            <li key={section.href}>
              <Link
                href={section.href}
                className="block h-full rounded-xl border border-[#EDEAF6] bg-white p-5 shadow-sm transition hover:border-[#C4B5FD] hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
              >
                <h2 className="font-semibold">{section.title}</h2>
                <p className="mt-2 text-sm text-[#73718A]">
                  {section.description}
                </p>
                <span className="mt-4 inline-block text-sm font-semibold text-[#6D28D9]">
                  Manage settings
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
