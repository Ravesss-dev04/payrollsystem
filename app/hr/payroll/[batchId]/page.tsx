import { notFound } from "next/navigation";
import { requirePagePermission } from "../../../lib/auth/page-guard.server";
import { PayrollReviewClient } from "../../../admin/payapprove/PayrollReviewClient";

type PageProps = {
  params: Promise<{ batchId: string }>;
  searchParams: Promise<{ version?: string | string[] }>;
};

export default async function HrPayrollBatchPage({
  params,
  searchParams,
}: PageProps) {
  await requirePagePermission("payroll:manage");
  const [{ batchId }, query] = await Promise.all([params, searchParams]);
  if (
    typeof query.version !== "string" ||
    !/^[1-9]\d*$/.test(query.version) ||
    !Number.isSafeInteger(Number(query.version))
  ) {
    notFound();
  }
  return (
    <PayrollReviewClient
      batchId={batchId}
      version={Number(query.version)}
      mode="hr"
    />
  );
}
