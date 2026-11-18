import { notFound } from "next/navigation";
import { requirePagePermission } from "../../../lib/auth/page-guard.server";
import { hasPermission } from "../../../lib/auth/authorization";
import { PayrollReviewClient } from "../PayrollReviewClient";

type PageProps = {
  params: Promise<{ batchId: string }>;
  searchParams: Promise<{ version?: string | string[] }>;
};

export default async function Page({ params, searchParams }: PageProps) {
  const session = await requirePagePermission("payroll:read");
  if (session.role !== "admin") notFound();
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
      canApprove={hasPermission({
        role: session.role,
        permission: "payroll:approve",
        actorId: session.userId,
        grantedPermissions: session.grantedPermissions,
        deniedPermissions: session.deniedPermissions,
      })}
    />
  );
}
