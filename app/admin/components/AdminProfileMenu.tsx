"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LuChevronDown } from "react-icons/lu";
import { AdminAvatar, useAdminProfile } from "./AdminProfileContext";
import { Modal, secondary } from "./AdminSettingsUI";
export default function AdminProfileMenu() {
  const [open, setOpen] = useState(false);
  const [showSignOutInfo, setShowSignOutInfo] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const { profile } = useAdminProfile();
  useEffect(() => {
    if (!open) return;
    const outside = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  return (
    <div ref={root}>
      <button
        ref={trigger}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label="Admin profile menu"
        className="flex items-center gap-2 rounded-lg p-1 text-left hover:bg-purple-50"
      >
        <AdminAvatar profile={profile} size="h-9 w-9" />
        <span className="hidden sm:block">
          <span className="block text-sm font-semibold">{profile.name}</span>
          <span className="block text-xs text-[#73718A]">
            Company Administrator
          </span>
        </span>
        <LuChevronDown className="hidden sm:block" />
      </button>
      {open && (
        <section className="absolute right-2 top-[calc(100%-4px)] z-30 w-64 rounded-xl border border-[#EDEAF6] bg-white p-4 shadow-xl">
          <p className="font-semibold">{profile.name}</p>
          <p className="text-xs text-[#73718A]">Company Administrator</p>
          <div className="mt-3 grid gap-1 border-t border-[#EDEAF6] pt-2 text-sm">
            <Link
              onClick={() => setOpen(false)}
              href="/admin/settings?section=profile"
              className="rounded-lg px-2 py-2 hover:bg-purple-50"
            >
              My Profile
            </Link>
            <Link
              onClick={() => setOpen(false)}
              href="/admin/settings"
              className="rounded-lg px-2 py-2 hover:bg-purple-50"
            >
              Settings
            </Link>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setShowSignOutInfo(true);
              }}
              className="rounded-lg px-2 py-2 text-left hover:bg-purple-50 focus-visible:outline-2 focus-visible:outline-[#7C3AED]"
            >
              Sign Out
            </button>
          </div>
        </section>
      )}
      {showSignOutInfo && (
        <Modal
          title="Sign Out Unavailable"
          description="Authentication is not connected."
          onClose={() => setShowSignOutInfo(false)}
          footer={
            <button className={secondary} onClick={() => setShowSignOutInfo(false)}>
              Close
            </button>
          }
        >
          <p className="text-sm text-[#73718A]">
            Sign out will be available when an authentication provider is connected.
          </p>
        </Modal>
      )}
    </div>
  );
}
