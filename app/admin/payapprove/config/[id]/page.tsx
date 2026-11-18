import { notFound } from "next/navigation";
import { requirePagePermission } from "../../../../lib/auth/page-guard.server";
import { getConfigurationComparison } from "../../../../lib/payroll/config-service.server";
import { ConfigReviewClient } from "./ConfigReviewClient";

export default async function ConfigReviewPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const session = await requirePagePermission("payroll:approve");
  if (session.role !== "admin") notFound();

  let comparison: Awaited<ReturnType<typeof getConfigurationComparison>>;
  try {
    comparison = await getConfigurationComparison(session, id);
  } catch {
    notFound();
  }

  return (
    <ConfigReviewClient
      comparison={comparison as any}
      actorId={session.userId}
    />
  );
}
