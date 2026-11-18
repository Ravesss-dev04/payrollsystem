import { redirect } from "next/navigation";
import { getCurrentSession } from "../lib/auth/session.server";
import LoginClient from "./LoginClient";

export const instant = false;

export default async function LoginPage() {
  const session = await getCurrentSession();
  if (session) {
    redirect(
      session.role === "employee"
        ? "/account"
        : session.role === "tl"
          ? "/access-pending"
          : "/admin/dashboard",
    );
  }
  return <LoginClient />;
}
