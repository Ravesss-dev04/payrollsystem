import { Suspense, type ReactNode } from "react";
import Sidebar, { HrHeader } from "./components/Sidebar";
import { connection } from "next/server";
import { requirePagePermission } from "../lib/auth/page-guard.server";

export async function HrRequestLayout({
  children,
}: {
  children: ReactNode;
}) {
  await connection();
  const session = await requirePagePermission("employees:manage");
  return (
    <div className="h-dvh overflow-hidden bg-[#f5f2fc] text-[#17152D]">
      <Sidebar />
      <div className="flex h-full min-w-0 flex-col lg:ml-[205px]">
        <HrHeader user={{ name: session.name, email: session.email }} />
        {children}
      </div>
    </div>
  );
}

export default function HrLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div aria-busy="true" className="p-6 text-sm text-[#73718A]">
          Loading HR workspace...
        </div>
      }
    >
      <HrRequestLayout>{children}</HrRequestLayout>
    </Suspense>
  );
}
