import { notFound } from "next/navigation";
import { requirePagePermission } from "../../../../../lib/auth/page-guard.server";
import { PayrollEmployeeDetailClient } from "../../../PayrollEmployeeDetailClient";

type PageProps = {
  params: Promise<{ batchId: string; employeeId: string }>;
  searchParams: Promise<{ version?: string | string[] }>;
};

export default async function Page({ params, searchParams }: PageProps) {
  const session = await requirePagePermission("payroll:read");
  if (session.role !== "admin") notFound();
  const [{ batchId, employeeId }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  if (
    typeof query.version !== "string" ||
    !/^[1-9]\d*$/.test(query.version) ||
    !Number.isSafeInteger(Number(query.version))
  ) {
    notFound();
  }
  return (
    <PayrollEmployeeDetailClient
      batchId={batchId}
      employeeId={employeeId}
      version={Number(query.version)}
    />
  );
}
