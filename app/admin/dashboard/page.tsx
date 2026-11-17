import { requirePagePermission } from "../../lib/auth/page-guard.server";
import { getDashboardPresentation } from "./presentation";
import AdminDashboardClient from "./AdminDashboardClient";

export default async function DashboardPage() {
  const session = await requirePagePermission("dashboard:read");
  const presentation = getDashboardPresentation(new Date(), session.name);
  return (
    <div className="min-w-0 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px]">
        <AdminDashboardClient
          greeting={presentation.greeting}
          snapshotDate={presentation.snapshotDate}
        />
      </div>
    </div>
  );
}
