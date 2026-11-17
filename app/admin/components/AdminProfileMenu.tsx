"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LuChevronDown } from "react-icons/lu";
import { useRouter } from "next/navigation";
import type { Role } from "../../lib/auth/authorization";

const roleLabels: Record<Role, string> = {
  admin: "Administrator",
  hr: "Human Resources",
  employee: "Employee",
};

function readCsrfCookie(): string | null {
  const values = document.cookie
    .split(";")
    .map((part) => part.trim())
    .filter(
      (part) =>
        part.startsWith("__Host-payroll-csrf=") ||
        part.startsWith("payroll-csrf="),
    )
    .map((part) => part.slice(part.indexOf("=") + 1));
  return values.length === 1 && /^[A-Za-z0-9_-]{43}$/.test(values[0])
    ? values[0]
    : null;
}

export default function AdminProfileMenu({
  user,
}: {
  user: { id: string; name: string; email: string; role: Role };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const root = useRef<HTMLDivElement>(null);

  const trigger = useRef<HTMLButtonElement>(null);

  async function signOut() {
    setBusy(true);
    setError("");
    try {
      const csrfToken = readCsrfCookie();
      if (!csrfToken) throw new Error("Session validation required");
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "x-csrf-token": csrfToken },
        cache: "no-store",
      });
      if (!response.ok && response.status !== 401) {
        throw new Error("Sign out could not be confirmed");
      }
      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel("payroll-session");
        channel.postMessage({ type: "session-invalidated" });
        channel.close();
      }
      router.replace("/login");
    } catch {
      setError(
        "Sign out could not be completed while the server is unavailable.",
      );
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    function outside(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function key(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    }
    document.addEventListener("mousedown", outside);

    document.addEventListener("keydown", key);

    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", key);
    };

  }, [open]);

  const initials =
    user.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U";

  return (
    <div ref={root}>
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="admin-profile"
        aria-label="Admin profile menu"
        className="flex items-center gap-2 rounded-lg p-1 text-left hover:bg-purple-50 focus-visible:outline-2 focus-visible:outline-[#7C3AED]"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EDE9FE] text-xs font-bold text-[#6D28D9]">
          {initials}
        </span>
        <span className="hidden sm:block">
          <span className="block text-sm font-semibold">{user.name}</span>
          <span className="block text-xs text-[#73718A]">
            {roleLabels[user.role]}
          </span>
        </span>
        <LuChevronDown size={16} className="hidden sm:block" />
      </button>
      {open && (
        <section
          id="admin-profile"
          aria-label="Admin profile"
          className="absolute right-2 top-[calc(100%-4px)] z-30 w-64 rounded-xl border border-[#EDEAF6] bg-white p-4 text-[#17152D] shadow-xl sm:right-4"
        >
          <p className="font-semibold">{user.name}</p>
          <p className="text-xs text-[#73718A]">{user.email}</p>
          <p className="mt-1 text-xs text-[#73718A]">
            {roleLabels[user.role]}
          </p>
          {user.role === "admin" && (
            <Link
              href="/admin/settings"
              onClick={() => setOpen(false)}
              className="mt-3 block rounded-lg px-2 py-2 text-sm hover:bg-purple-50"
            >
              Settings
            </Link>
          )}
          {error && (
            <p role="alert" className="mt-3 text-xs text-red-700">
              {error}
            </p>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => void signOut()}
            className="mt-3 w-full rounded-lg border border-[#EDEAF6] px-3 py-2 text-left text-sm font-medium hover:bg-purple-50 disabled:opacity-60"
          >
            {busy ? "Signing out..." : "Sign out"}
          </button>
        </section>
      )}
    </div>
  );
}
