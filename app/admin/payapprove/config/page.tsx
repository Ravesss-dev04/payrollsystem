import { notFound } from "next/navigation";
import Link from "next/link";
import { requirePagePermission } from "../../../lib/auth/page-guard.server";
import { listConfigurationVersions } from "../../../lib/payroll/config-service.server";

const statusBadge: Record<string, string> = {
  PendingApproval: "bg-yellow-100 text-yellow-800",
  Approved: "bg-green-100 text-green-800",
  Scheduled: "bg-blue-100 text-blue-800",
  Active: "bg-purple-100 text-purple-800",
  Rejected: "bg-red-100 text-red-800",
  Draft: "bg-gray-100 text-gray-700",
  Superseded: "bg-gray-100 text-gray-500",
  Retired: "bg-gray-200 text-gray-400",
};

export default async function ConfigApprovalQueuePage() {
  const session = await requirePagePermission("payroll:approve");
  if (session.role !== "admin") notFound();

  const list = await listConfigurationVersions(session, {
    status: "PendingApproval",
    pageSize: 50,
  });

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-5 sm:p-8">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Payroll Configuration Approvals</h1>
            <p className="text-sm text-[#73718A]">
              Review and decide on pending payroll configuration changes submitted by HR.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/payapprove/config/audit"
              className="rounded-lg border border-[#7C3AED] bg-[#7C3AED]/10 px-3.5 py-1.5 text-xs font-semibold text-[#7C3AED] hover:bg-[#7C3AED]/20"
            >
              📜 Configuration Audit Log →
            </Link>
          </div>
        </div>
      </header>

      {list.items.length === 0 ? (
        <p className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center text-sm text-[#73718A]">
          No configurations pending approval.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase text-[#73718A]">
              <tr>
                <th className="px-4 py-3 text-left">Version</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Effective From</th>
                <th className="px-4 py-3 text-left">Submitted By</th>
                <th className="px-4 py-3 text-left">Change Reason</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {list.items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">v{item.version}</td>
                  <td className="px-4 py-3">{item.category}</td>
                  <td className="px-4 py-3">{item.effectiveFrom}</td>
                  <td className="px-4 py-3">
                    {(item as any).submittedBy?.name ?? (item as any).createdBy?.name ?? "—"}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-[#73718A]">
                    {item.changeReason}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge[item.status] ?? "bg-gray-100 text-gray-700"}`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/payapprove/config/${item.id}`}
                      className="font-semibold text-[#7C3AED] hover:underline"
                    >
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
