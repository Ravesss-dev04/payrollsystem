"use client";
import { useEffect, useRef, useState } from "react";
import { Role, User } from "../users-roles/types";
import { Avatar, input, Modal, primary, secondary } from "./UsersTable";
import { LuInfo, LuX, LuTriangleAlert } from "react-icons/lu";
import PermissionMatrix from "./PermissionMatrix";
export default function RoleFormModal({
  role,
  source,
  roles,
  users,
  onClose,
  onSave,
}: {
  role: Role | null;
  source: Role | null;
  roles: Role[];
  users: User[];
  onClose: () => void;
  onSave: (r: Role) => void;
}) {
  const [form, setForm] = useState({
    name: role?.name || (source ? `${source.name} Copy` : ""),
    description: role?.description || source?.description || "",
    status: role?.status || ("Active" as "Active" | "Inactive"),
    permissions: [...(role?.permissions || source?.permissions || [])],
  });
  const [initial] = useState(form);
  const normalize = (v: typeof form) => JSON.stringify({ ...v, name: v.name.trim(), description: v.description.trim(), permissions: [...v.permissions].sort() });
  const dirty = normalize(form) !== normalize(initial);
  const [overlay, setOverlay] = useState<"discard" | "users" | null>(null);
  const [search, setSearch] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const overlayRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!role) return;
    const dialog = dialogRef.current;
    const previous = document.activeElement as HTMLElement | null;
    const main = document.querySelector("main");
    const oldMain = main?.style.overflowY;
    const oldBody = document.body.style.overflow;
    if (main) main.style.overflowY = "hidden";
    document.body.style.overflow = "hidden";
    dialog?.showModal();
    return () => { dialog?.close(); if (main) main.style.overflowY = oldMain || ""; document.body.style.overflow = oldBody; previous?.focus(); };
  }, [role]);
  useEffect(() => {
    if (!overlay) return;
    const dialog = overlayRef.current;
    const previous = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => { dialog?.close(); previous?.focus(); };
  }, [overlay]);
  function requestClose() { if (dirty) setOverlay("discard"); else onClose(); }
  const [error, setError] = useState("");
  const assigned = users.filter((u) => u.roleId === role?.id).length;
  function update<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) {
    setError("");
    setForm((current) => ({ ...current, [key]: value }));
  }
  function save(e: React.FormEvent) {
    e.preventDefault();
    const name = form.name.trim(),
      description = form.description.trim();
    if (!name || name.length > 60 || !description) {
      setError("Enter a role name (up to 60 characters) and description.");
      return;
    }
    if (
      roles.some(
        (r) => r.id !== role?.id && r.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      setError("Role names must be unique.");
      return;
    }
    if (role?.system && name !== role.name) {
      setError("System role names are protected.");
      return;
    }
    if (form.status === "Inactive" && (assigned > 0 || role?.system)) {
      setError("Assigned or protected roles cannot be deactivated.");
      return;
    }
    onSave({
      id: role?.id || crypto.randomUUID(),
      name,
      description,
      status: form.status,
      permissions: form.permissions,
      updatedAt: new Date().toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      system: role?.system,
    });
  }
  if (role) {
    const assignedUsers = users.filter((u) => u.roleId === role.id);
    return (
      <>
        <dialog ref={dialogRef} aria-labelledby="edit-role-title" onCancel={e => { e.preventDefault(); requestClose(); }} onClick={e => { if (e.target === e.currentTarget) requestClose(); }} className="fixed inset-0 m-auto max-h-[min(90dvh,800px)] w-[calc(100%-1.5rem)] max-w-[1050px] overflow-hidden rounded-2xl border border-[#EDEAF6] bg-white p-0 text-[#17152D] shadow-2xl backdrop:bg-black/50">
          <form onSubmit={save} className="flex max-h-[min(90dvh,800px)] min-h-0 flex-col">
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#EDEAF6] px-5 py-4 sm:px-6"><h2 id="edit-role-title" className="text-lg font-semibold">Edit Role: {role.name}</h2><button type="button" aria-label="Close Edit Role" className="rounded-lg p-1 hover:bg-purple-50" onClick={requestClose}><LuX size={20}/></button></header>
            <div className="min-h-0 flex-1 overflow-y-auto lg:overflow-hidden"><div className="grid min-h-0 gap-5 p-5 lg:h-full lg:grid-cols-[minmax(240px,0.32fr)_minmax(0,0.68fr)] sm:p-6">
              <section className="min-h-0 min-w-0 space-y-4 lg:overflow-y-auto lg:border-r lg:border-[#EDEAF6] lg:pr-5">
                <h3 className="text-sm font-bold">Role Information</h3>
                <label className="block text-xs font-semibold">Role Name <span className="text-red-500">*</span><input className={`${input} mt-1.5`} maxLength={60} value={form.name} disabled={!!role.system} onChange={e => update("name", e.target.value)} required/></label>
                <label className="block text-xs font-semibold">Description <span className="text-red-500">*</span><textarea className={`${input} mt-1.5 min-h-20`} rows={3} value={form.description} onChange={e => update("description", e.target.value)} required/></label>
                <label className="block text-xs font-semibold">Status<select className={`${input} mt-1.5`} value={form.status} disabled={!!role.system || assigned > 0} onChange={e => update("status", e.target.value as "Active" | "Inactive")}><option>Active</option><option>Inactive</option></select></label>
                {(role.system || assigned > 0) && <p className="text-xs text-[#73718A]">{role.system ? "System roles are protected." : "Reassign users before deactivating this role."}</p>}
                <div className="border-t border-[#EDEAF6] pt-4"><div className="flex items-center justify-between gap-2"><h4 className="text-sm font-bold">Assigned Users ({assigned})</h4><button type="button" onClick={() => setOverlay("users")} className="text-xs font-semibold text-purple-700 hover:underline">Manage</button></div><div className="mt-3 space-y-2">{assignedUsers.length ? assignedUsers.map(user => <div key={user.id} className="flex items-center gap-2 text-sm"><Avatar name={user.name}/><span>{user.name}</span></div>) : <p className="text-xs text-[#73718A]">No users assigned.</p>}</div></div>
              </section>
              <section className="min-h-0 min-w-0"><PermissionMatrix value={form.permissions} onChange={v => update("permissions", v)} protectedRole={role.id === "admin"} editLayout/></section>
            </div></div>
            {error && <p role="alert" className="px-5 py-2 text-sm text-red-600">{error}</p>}
            <footer className="flex shrink-0 flex-col gap-3 border-t border-[#EDEAF6] bg-[#F7F6FF] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><p className="flex items-start gap-2 text-xs text-[#57556B]"><LuInfo className="shrink-0" size={16}/><span>Changes will update the role&apos;s access within the system (demo only).</span></p><div className="flex shrink-0 justify-end gap-3"><button type="button" className={secondary} onClick={requestClose}>Cancel</button><button className={primary} disabled={!dirty}>Save Changes</button></div></footer>
          </form>
        </dialog>
        {overlay && <dialog ref={overlayRef} aria-labelledby="role-overlay-title" onCancel={e => { e.preventDefault(); setOverlay(null); }} onClick={e => { if (e.target === e.currentTarget) setOverlay(null); }} className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl bg-white p-6 text-[#17152D] shadow-2xl backdrop:bg-black/50">
          {overlay === "discard" ? <><LuTriangleAlert className="mb-4 text-amber-600" size={28}/><h2 id="role-overlay-title" className="text-lg font-semibold">Discard Unsaved Changes?</h2><p className="mt-2 text-sm text-[#57556B]">You have unsaved changes to this role. If you leave now, your changes will be lost.</p><div className="mt-6 flex flex-wrap justify-end gap-3"><button type="button" autoFocus className={secondary} onClick={() => setOverlay(null)}>Keep Editing</button><button type="button" className={primary} onClick={onClose}>Discard Changes</button></div></> : <><h2 id="role-overlay-title" className="text-lg font-semibold">Assigned Users ({assigned})</h2><p className="mt-2 text-sm text-[#57556B]">To reassign a user, close this dialog and the role form, then edit the user in the Users tab.</p><label className="mt-4 block text-sm font-semibold">Search users<input className={`${input} mt-1`} value={search} onChange={e => setSearch(e.target.value)} /></label><div className="mt-4 space-y-3">{assignedUsers.filter(u => u.name.toLowerCase().includes(search.toLowerCase())).map(u => <div key={u.id} className="flex items-center gap-3"><Avatar name={u.name}/><div><p className="text-sm font-semibold">{u.name}</p><p className="text-xs text-[#73718A]">{role.name}</p></div></div>)}</div><div className="mt-6 flex justify-end"><button type="button" className={secondary} onClick={() => setOverlay(null)}>Close</button></div></>}
        </dialog>}
      </>
    );
  }
  return (
    <Modal
      wide
      title="Create New Role"
      subtitle="Configure a role and assign access permissions."
      onClose={onClose}
      dirty={dirty}
    >
      <form onSubmit={save} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            Role Name
            <input
              className={`${input} mt-1.5`}
              maxLength={60}
              value={form.name}
              disabled={false}
              onChange={(e) => update("name", e.target.value)}
              required
            />
          </label>
          <label className="text-sm font-semibold">
            Status
            <select
              className={`${input} mt-1.5`}
              value={form.status}
              disabled={assigned > 0}
              onChange={(e) =>
                update("status", e.target.value as "Active" | "Inactive")
              }
            >
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </label>
          <label className="text-sm font-semibold sm:col-span-2">
            Description
            <textarea
              className={`${input} mt-1.5`}
              rows={2}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              required
            />
          </label>
        </div>
        {assigned > 0 && (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            Assigned users: {assigned}. Changes to this role will affect the
            access assigned to its users in this demo. Production enforcement is
            not implemented.
          </p>
        )}
        <div>
          <h3 className="font-bold">Permissions</h3>
          <p className="mt-1 mb-4 text-sm text-[#73718A]">
            Select what users assigned to this role can access and perform.
          </p>
          <PermissionMatrix
            value={form.permissions}
            onChange={(v) => update("permissions", v)}
            protectedRole={false}
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 border-t border-[#edeaf6] pt-4">
          <button
            type="button"
            className={secondary}
            onClick={() => {
              if (!dirty || window.confirm("Discard unsaved changes?"))
                onClose();
            }}
          >
            Cancel
          </button>
          <button className={primary}>
            Create Role
          </button>
        </div>
      </form>
    </Modal>
  );
}

