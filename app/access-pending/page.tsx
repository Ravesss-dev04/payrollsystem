import { redirect } from "next/navigation";
import AdminProfileMenu from "../admin/components/AdminProfileMenu";
import { getCurrentSession } from "../lib/auth/session.server";

export const instant = false;

export default async function AccessPendingPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  if (session.role !== "tl") {
    redirect(
      session.role === "employee" ? "/account" : "/admin/dashboard",
    );
  }

  return (
    <main className="min-h-dvh bg-[#F7F6FF] p-4 text-[#17152D] sm:p-6">
      <header className="relative flex justify-end">
        <AdminProfileMenu
          user={{
            id: session.userId,
            name: session.name,
            email: session.email,
            role: session.role,
          }}
        />
      </header>
      <section className="mx-auto mt-24 w-full max-w-lg rounded-2xl bg-white p-7 shadow-lg">
        <h1 className="text-2xl font-bold">Access not configured</h1>
        <p className="mt-3 text-sm text-[#57556B]">
          Your Team Lead account is authenticated, but Team Lead permissions
          have not been defined. Contact an administrator for access.
        </p>
      </section>
    </main>
  );
}
