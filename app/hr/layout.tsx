import { Suspense, type ReactNode } from "react";
import { connection } from "next/server";
import { requirePagePermission } from "../lib/auth/page-guard.server";

export async function HrRequestLayout({
  children,
}: {
  children: ReactNode;
}) {
  await connection();
  await requirePagePermission("employees:manage");
  return children;
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
