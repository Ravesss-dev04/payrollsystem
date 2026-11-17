import { PayrollList } from "../components/PayrollBatchDetails";
import { requirePagePermission } from "../../lib/auth/page-guard.server";

export default async function Page() {
  await requirePagePermission("payroll:approve");
  return <PayrollList />;
}
