"use client";
import { useEffect, useRef, useState } from "react";
import {
  LuX,
  LuSearch,
  LuPlus,
  LuEye,
  LuPencil,
  LuUserX,
  LuUserRoundCheck,
} from "react-icons/lu";
import { Role, User } from "../users-roles/types";

export const input =
  "w-full rounded-lg border border-[#dedbea] bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500";
export const primary =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-[#7C3AED] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#6D28D9] disabled:cursor-not-allowed disabled:opacity-50";
export const secondary =
  "rounded-lg border border-[#dedbea] bg-white px-4 py-2.5 text-sm font-semibold hover:bg-purple-50";
export function Badge({ children }: { children: React.ReactNode }) {
  const s = String(children);
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${s === "Active" ? "bg-green-100 text-green-700" : s === "Invited" ? "bg-blue-100 text-blue-700" : s === "Suspended" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"}`}
    >
      {children}
    </span>
  );
}
export function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
  dirty = false,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
  dirty?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    const main = document.querySelector("main");
    const old = main?.style.overflowY;
    if (main) main.style.overflowY = "hidden";
    d?.showModal();
    return () => {
      d?.close();
      if (main) main.style.overflowY = old || "";
      previous?.focus();
    };
  }, []);
  function close() {
    if (!dirty || window.confirm("Discard unsaved changes?")) onClose();
  }
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      aria-labelledby="feature-dialog-title"
      className={`fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] ${wide ? "max-w-5xl" : "max-w-xl"} overflow-hidden rounded-2xl bg-white p-0 text-[#17152D] shadow-2xl backdrop:bg-black/50`}
    >
      <div className="flex max-h-[90dvh] flex-col">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#edeaf6] px-5 py-4 sm:px-6">
          <div>
            <h2 id="feature-dialog-title" className="text-lg font-bold">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1 text-sm text-[#73718A]">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close dialog"
            className="rounded-lg p-1 hover:bg-purple-50"
          >
            <LuX size={20} />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto p-5 sm:p-6">{children}</div>
      </div>
    </dialog>
  );
}
export function Avatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-700"
    >
      {name
        .split(" ")
        .map((x) => x[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()}
    </span>
  );
}
export default function UsersTable({
  users,
  roles,
  filter,
  setFilter,
  onInvite,
  onView,
  onEdit,
  onStatus,
}: {
  users: User[];
  roles: Role[];
  filter: string;
  setFilter: (s: string) => void;
  onInvite: () => void;
  onView: (u: User) => void;
  onEdit: (u: User) => void;
  onStatus: (u: User) => void;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const visible = users.filter(
    (u) =>
      `${u.name} ${u.email}`.toLowerCase().includes(query.toLowerCase()) &&
      (filter === "All Roles" || u.roleId === filter),
  );
  const pages = Math.max(1, Math.ceil(visible.length / 8));
  const current = Math.min(page, pages);
  return (
    <div className="rounded-xl border border-[#EDEAF6] bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <LuSearch className="absolute top-3.5 left-3 text-[#73718A]" />
          <input
            aria-label="Search users"
            placeholder="Search user (name or email)..."
            className={`${input} pl-9`}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          aria-label="Filter by role"
          className={`${input} sm:w-48`}
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(1);
          }}
        >
          <option>All Roles</option>
          {roles
            .filter((r) => r.status === "Active" || r.id === filter)
            .map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
        </select>
        <button className={primary} onClick={onInvite}>
          <LuPlus /> Invite User
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-[#F7F6FF] text-xs text-[#57556B]">
            <tr>
              {["User", "Email", "Role", "Status", "Last Login", "Actions"].map(
                (x) => (
                  <th key={x} className="px-3 py-3 font-semibold">
                    {x}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {visible.slice((current - 1) * 8, current * 8).map((u) => (
              <tr key={u.id} className="border-b border-[#f0eef6]">
                <td className="px-3 py-3">
                  <button
                    onClick={() => onView(u)}
                    className="flex items-center gap-3 text-left font-semibold hover:text-purple-700"
                  >
                    <Avatar name={u.name} />
                    {u.name}
                  </button>
                </td>
                <td
                  className="max-w-[220px] truncate px-3 py-3"
                  title={u.email}
                >
                  {u.email}
                </td>
                <td className="px-3 py-3">
                  {roles.find((r) => r.id === u.roleId)?.name}
                </td>
                <td className="px-3 py-3">
                  <Badge>{u.status}</Badge>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-[#73718A]">
                  {u.lastLogin || "Never logged in"}
                </td>
                <td className="px-3 py-3">
                  <div className="flex gap-1">
                    {[
                      [LuEye, "View user", () => onView(u)],
                      [LuPencil, "Edit user", () => onEdit(u)],
                      [
                        u.status === "Inactive" ? LuUserRoundCheck : LuUserX,
                        u.status === "Inactive"
                          ? "Reactivate user"
                          : "Deactivate user",
                        () => onStatus(u),
                      ],
                    ].map(([Icon, label, action]) => {
                      const I = Icon as typeof LuEye;
                      return (
                        <button
                          key={label as string}
                          title={label as string}
                          aria-label={`${label} ${u.name}`}
                          onClick={action as () => void}
                          className="rounded-lg p-2 text-[#73718A] hover:bg-purple-50 hover:text-purple-700"
                        >
                          <I size={17} />
                        </button>
                      );
                    })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {visible.length === 0 && (
        <p className="py-12 text-center text-sm text-[#73718A]">
          No users found. Try a different search or role.
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[#73718A]">
        <span>
          Showing {visible.length ? (current - 1) * 8 + 1 : 0}
          {Math.min(current * 8, visible.length)} of {visible.length} users
        </span>
        <div className="flex items-center gap-2">
          <button
            disabled={current === 1}
            onClick={() => setPage(current - 1)}
            className={`${secondary} disabled:opacity-40`}
          >
            Previous
          </button>
          <span>
            {current} / {pages}
          </span>
          <button
            disabled={current === pages}
            onClick={() => setPage(current + 1)}
            className={`${secondary} disabled:opacity-40`}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
