import { notFound } from "next/navigation";
import { requirePagePermission } from "../../../lib/auth/page-guard.server";
import { DeductionCategoriesClient } from "./DeductionCategoriesClient";

export default async function HrDeductionCategoriesPage() {
  const actor = await requirePagePermission("payroll:manage");
  if (actor.role !== "hr") notFound();
  return <DeductionCategoriesClient />;
}
