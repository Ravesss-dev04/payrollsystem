import { redirect } from "next/navigation";
export default function AuditLogsRedirect() {
  redirect("/admin/settings?section=audit-logs");
}
