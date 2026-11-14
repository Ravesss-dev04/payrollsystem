"use client";
import { useEffect, useRef, useState } from "react";
import { LuChevronDown } from "react-icons/lu";
export default function AdminProfileMenu() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    function outside(e: MouseEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    }
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") {
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
          AU
        </span>
        <span className="hidden sm:block">
          <span className="block text-sm font-semibold">Admin User</span>
          <span className="block text-xs text-[#73718A]">
            Company Administrator
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
          <p className="font-semibold">Admin User</p>
          <p className="text-xs text-[#73718A]">
            Company Administrator
          </p>
          <ul className="mt-3 border-t border-[#EDEAF6] pt-2">
            {["My Profile", "Account Settings", "Sign Out"].map((label) => (
              <li
                key={label}
                className="flex justify-between py-2 text-sm text-[#73718A]"
              >
                <span>{label}</span>
                
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
