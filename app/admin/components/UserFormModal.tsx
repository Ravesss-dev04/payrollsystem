"use client";
import { useState } from "react";
import { departments } from "../users-roles/data";
import { Department, Role, User } from "../users-roles/types";
import { input, Modal, primary, secondary } from "./UsersTable";
export default function UserFormModal({
  user,
  users,
  roles,
  onClose,
  onSave,
}: {
  user: User | null;
  users: User[];
  roles: Role[];
  onClose: () => void;
  onSave: (u: User) => void;
}) {
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    roleId: user?.roleId || "",
    department: user?.department || ("Operations" as Department),
    message: "",
  });
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  function change(field: string, value: string) {
    setDirty(true);
    setForm({ ...form, [field]: value });
  }
  function save(e: React.FormEvent) {
    e.preventDefault();
    const name = form.name.trim(),
      email = form.email.trim();
    if (!name || !/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter a full name and a valid email address.");
      return;
    }
    if (
      users.some(
        (u) =>
          u.id !== user?.id && u.email.toLowerCase() === email.toLowerCase(),
      )
    ) {
      setError("This email address is already in use.");
      return;
    }
    if (!roles.some((r) => r.id === form.roleId && r.status === "Active")) {
      setError("Select an active role.");
      return;
    }
    if (!departments.includes(form.department)) {
      setError("Select a valid department.");
      return;
    }
    if (
      user?.roleId === "admin" &&
      user.status === "Active" &&
      form.roleId !== "admin" &&
      users.filter((u) => u.roleId === "admin" && u.status === "Active")
        .length <= 1
    ) {
      setError("The last active Admin account must retain its role.");
      return;
    }
    onSave(
      user
        ? {
            ...user,
            name,
            email,
            roleId: form.roleId,
            department: form.department,
          }
        : {
            id: crypto.randomUUID(),
            name,
            email,
            roleId: form.roleId,
            department: form.department,
            status: "Invited",
            lastLogin: null,
            createdAt: new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            }),
          },
    );
  }
  return (
    <Modal
      title={user ? "Edit User" : "Invite New User"}
      subtitle={
        user
          ? "Update user information and account access."
          : "Send an invitation to join the company workspace."
      }
      onClose={onClose}
      dirty={dirty}
    >
      <form onSubmit={save} className="space-y-4">
        {[
          ["Full Name", "name", "text"],
          ["Email Address", "email", "email"],
        ].map(([label, field, type]) => (
          <label key={field} className="block text-sm font-semibold">
            {label}
            <input
              className={`${input} mt-1.5`}
              type={type}
              value={form[field as "name" | "email"]}
              onChange={(e) => change(field, e.target.value)}
              required
            />
          </label>
        ))}
        <label className="block text-sm font-semibold">
          Role
          <select
            className={`${input} mt-1.5`}
            value={form.roleId}
            onChange={(e) => change("roleId", e.target.value)}
            required
          >
            <option value="">Select a role</option>
            {roles
              .filter((r) => r.status === "Active")
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Department
          <select
            className={`${input} mt-1.5`}
            value={form.department}
            onChange={(e) => change("department", e.target.value)}
          >
            {departments.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
        {user ? (
          <p className="text-sm text-[#73718A]">
            Account status: <strong>{user.status}</strong>. Use the account
            action to change access status.
          </p>
        ) : (
          <label className="block text-sm font-semibold">
            Personal invitation message{" "}
            <span className="font-normal text-[#73718A]">(optional)</span>
            <textarea
              className={`${input} mt-1.5`}
              rows={3}
              value={form.message}
              onChange={(e) => change("message", e.target.value)}
            />
          </label>
        )}
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
            {user ? "Save Changes" : "Send Invitation"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
