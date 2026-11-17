import CompanyClient from "../company/CompanyClient";
import { requirePagePermission } from "../../lib/auth/page-guard.server";

export default async function CompanyPage() {
  await requirePagePermission("company:read");
  return <CompanyClient />;
}
