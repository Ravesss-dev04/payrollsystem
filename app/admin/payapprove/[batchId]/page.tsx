import { PayrollDetail } from "../../components/PayrollBatchDetails";
import { initialBatches } from "../data";
import { notFound } from "next/navigation";
import { requirePagePermission } from "../../../lib/auth/page-guard.server";
export const instant = false;

export default async function Page({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  await requirePagePermission("payroll:approve");
  const { batchId } = await params;
  if (!initialBatches.some((b) => b.id === batchId)) notFound();
  return <PayrollDetail id={batchId} />;
}
