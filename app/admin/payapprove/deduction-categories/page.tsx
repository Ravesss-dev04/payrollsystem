import { notFound } from "next/navigation";
import { requirePagePermission } from "../../../lib/auth/page-guard.server";
import { AdminDeductionCategoriesClient } from "./AdminDeductionCategoriesClient";

export default async function AdminDeductionCategoriesPage() {
  const actor = await requirePagePermission("payroll:approve");
  if (actor.role !== "admin") notFound();
  return <AdminDeductionCategoriesClient />;
}
