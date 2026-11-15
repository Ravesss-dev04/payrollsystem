import { redirect } from "next/navigation";
import { getCurrentSession } from "./lib/auth/session.server";

export const instant = false;

export default async function Home() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  redirect(session.role === "employee" ? "/account" : "/admin/dashboard");
}
