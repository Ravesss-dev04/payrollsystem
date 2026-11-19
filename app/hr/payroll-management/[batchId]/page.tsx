import { requirePagePermission } from "../../../lib/auth/page-guard.server";
import PayrollBatchDetailsClient from "./PayrollBatchDetailsClient";

export default async function PayrollBatchDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ batchId: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  // This route shows the same illustrative records as the HR dashboard, whose
  // enclosing layout requires employees:manage. Persisted payroll records use
  // /hr/payroll/[batchId] and retain their separate payroll:read guard.
  await requirePagePermission("employees:manage");
  const [{ batchId }, query] = await Promise.all([params, searchParams]);
  return <PayrollBatchDetailsClient batchId={batchId} initialEdit={query.edit === "1"} />;
}
