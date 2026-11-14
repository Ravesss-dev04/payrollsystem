"use client";
import { useState } from "react";
import {
  LuSearch,
  LuPlus,
  LuShieldCheck,
  LuEye,
  LuPencil,
  LuCopy,
  LuUserX,
} from "react-icons/lu";
import { modules } from "../users-roles/data";
import { Role, User } from "../users-roles/types";
import { Badge, input, primary } from "./UsersTable";
export default function RolesPermissions({
  roles,
  users,
  onCreate,
  onView,
  onEdit,
  onDuplicate,
  onStatus,
}: {
  roles: Role[];
  users: User[];
  onCreate: () => void;
  onView: (r: Role) => void;
  onEdit: (r: Role) => void;
  onDuplicate: (r: Role) => void;
  onStatus: (r: Role) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All Status");
  const visible = roles.filter(
    (r) =>
      `${r.name} ${r.description}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "All Status" || r.status === filter),
  );
  return (
    <section>
      <h2 className="text-xl font-bold">Roles & Permissions</h2>
      <p className="mt-1 text-sm text-[#73718A]">
        Define access levels and control what each role can do.
      </p>
      <div className="mt-5 rounded-xl border border-[#EDEAF6] bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <LuSearch className="absolute top-3.5 left-3 text-[#73718A]" />
            <input
              aria-label="Search roles"
              placeholder="Search role (name or description)..."
              className={`${input} pl-9`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            aria-label="Filter roles by status"
            className={`${input} sm:w-40`}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option>All Status</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>
          <button className={primary} onClick={onCreate}>
            <LuPlus /> Create Role
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left text-sm">
            <thead className="bg-[#F7F6FF] text-xs text-[#57556B]">
              <tr>
                {[
                  "Role Name",
                  "Description",
                  "Assigned Users",
                  "Permission Summary",
                  "Status",
                  "Last Updated",
                  "Actions",
                ].map((x) => (
                  <th key={x} className="px-3 py-3">
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} className="border-b border-[#f0eef6]">
                  <td className="px-3 py-3">
                    <button
                      onClick={() => onView(r)}
                      className="flex items-center gap-2 font-semibold hover:text-purple-700"
                    >
                      <span className="rounded-full bg-purple-100 p-2 text-purple-700">
                        <LuShieldCheck />
                      </span>
                      <span>
                        {r.name}
                        {r.system && (
                          <small className="ml-1 text-[#73718A]">System</small>
                        )}
                      </span>
                    </button>
                  </td>
                  <td className="max-w-[230px] px-3 py-3 text-xs text-[#57556B]">
                    {r.description}
                  </td>
                  <td className="px-3 py-3">
                    {users.filter((u) => u.roleId === r.id).length}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {
                      modules.filter((m) =>
                        r.permissions.some((p) => p.startsWith(m.id + ":")),
                      ).length
                    }{" "}
                    modules · {r.permissions.length} permissions
                  </td>
                  <td className="px-3 py-3">
                    <Badge>{r.status}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs text-[#73718A]">
                    {r.updatedAt}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex">
                      {[
                        [LuEye, "View", () => onView(r)],
                        [LuPencil, "Edit", () => onEdit(r)],
                        [LuCopy, "Duplicate", () => onDuplicate(r)],
                        [
                          LuUserX,
                          r.status === "Active" ? "Deactivate" : "Reactivate",
                          () => onStatus(r),
                        ],
                      ].map(([Icon, label, action]) => {
                        const I = Icon as typeof LuEye;
                        const disabled = label === "Deactivate" && !!r.system;
                        return (
                          <button
                            key={label as string}
                            title={
                              disabled
                                ? "Protected system roles cannot be deactivated"
                                : `${label} role`
                            }
                            aria-label={`${label} ${r.name}`}
                            disabled={disabled}
                            onClick={action as () => void}
                            className="rounded-lg p-2 text-[#73718A] hover:bg-purple-50 hover:text-purple-700 disabled:opacity-30"
                          >
                            <I size={16} />
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
        {!visible.length && (
          <p className="py-12 text-center text-sm text-[#73718A]">
            No roles found. Try a different search or status.
          </p>
        )}
        <p className="mt-4 text-xs text-[#73718A]">
          Showing {visible.length} of {roles.length} roles
        </p>
      </div>
    </section>
  );
}
