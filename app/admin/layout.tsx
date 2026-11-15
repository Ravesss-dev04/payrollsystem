import type { ReactNode } from "react";
import { Suspense } from "react";
import AdminLayoutFallback from "./components/AdminLayoutFallback";
import AdminRequestLayout from "./AdminRequestLayout";

export const instant = false;

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense fallback={<AdminLayoutFallback />}>
      <AdminRequestLayout>{children}</AdminRequestLayout>
    </Suspense>
  );
}
