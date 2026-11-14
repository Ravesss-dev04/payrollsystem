"use client";
import { useRef, useState } from "react";
import AdminSidebar from "./components/AdminSidebar";
import AdminHeader from "./components/AdminHeader";
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  function close() {
    dialog.current?.close();
  }
  return (
    <div className="flex h-dvh overflow-hidden bg-[#F7F6FF] font-sans text-[#17152D]">
      <div className="hidden h-full shrink-0 lg:block">
        <AdminSidebar />
      </div>
      <dialog
        ref={dialog}
        aria-label="Admin navigation"
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-black/50 lg:hidden"
      >
        <div className="h-full w-64 max-w-[85vw]">
          <AdminSidebar onNavigate={close} />
        </div>
      </dialog>
      <div
        className="flex min-w-0 flex-1 flex-col overflow-hidden"
        inert={open}
      >
        <AdminHeader
          onMenu={() => {
            setOpen(true);
            dialog.current?.showModal();
          }}
        />
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden [scrollbar-width:thin] [scrollbar-color:#B9A3E8_#F7F6FF]">
          {children}
        </main>
      </div>
    </div>
  );
}
