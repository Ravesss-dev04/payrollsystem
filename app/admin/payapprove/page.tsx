import { notFound } from "next/navigation";
import { requirePagePermission } from "../../lib/auth/page-guard.server";
import { PayrollApprovalClient } from "./PayrollApprovalClient";

export default async function Page() {
  const session = await requirePagePermission("payroll:read");
  if (session.role !== "admin") notFound();
  return <PayrollApprovalClient />;
}
