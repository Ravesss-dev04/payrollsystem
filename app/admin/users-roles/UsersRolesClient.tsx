"use client";
import { useRef, useState } from "react";
import { LuShieldCheck } from "react-icons/lu";
import UsersTable, {
  Avatar,
  Badge,
  Modal,
  primary,
  secondary,
} from "../components/UsersTable";
import UserFormModal from "../components/UserFormModal";
import RolesPermissions from "../components/RolesPermissions";
import RoleFormModal from "../components/RoleFormModal";
import { initialRoles, initialUsers, modules } from "./data";
import { Role, User } from "./types";
type Dialog =
  | { kind: "userForm" | "userDetails" | "userStatus"; user: User | null }
  | { kind: "roleForm"; role: Role | null; source: Role | null }
  | { kind: "roleDetails" | "roleStatus"; role: Role }
  | null;
export default function UsersRolesClient() {
  const [users, setUsers] = useState(initialUsers);
  const [roles, setRoles] = useState(initialRoles);
  const [tab, setTab] = useState(0);
  const [filter, setFilter] = useState("All Roles");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [notice, setNotice] = useState("");
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  function notify(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 5000);
  }
  function saveUser(u: User) {
    const exists = users.some((x) => x.id === u.id);
    setUsers(
      exists ? users.map((x) => (x.id === u.id ? u : x)) : [...users, u],
    );
    setDialog(null);
    notify(
      exists
        ? "User updated successfully."
        : "Demo invitation created. No email was sent.",
    );
  }
  function saveRole(r: Role) {
    const exists = roles.some((x) => x.id === r.id);
    setRoles(
      exists ? roles.map((x) => (x.id === r.id ? r : x)) : [...roles, r],
    );
    setDialog(null);
    notify(
      exists ? "Role updated successfully." : "Role created successfully.",
    );
  }
  const selectedUser = dialog && "user" in dialog ? dialog.user : null;
  const selectedRole = dialog && "role" in dialog ? dialog.role : null;
  const userRole = roles.find((r) => r.id === selectedUser?.roleId);
  const assigned = selectedRole
    ? users.filter((u) => u.roleId === selectedRole.id)
    : [];
  const lastAdmin =
    selectedUser?.roleId === "admin" &&
    selectedUser.status === "Active" &&
    users.filter((u) => u.roleId === "admin" && u.status === "Active").length <=
      1;
  return (
    <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold tracking-tight">Users & Roles</h1>
      <p className="mt-1 text-sm text-[#73718A]">
        Manage system users, roles, and access permissions.
      </p>
      {notice && (
        <div
          role="status"
          className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800"
        >
          {notice}
        </div>
      )}
      <div
        role="tablist"
        aria-label="Users and roles sections"
        className="mt-6 flex border-b border-[#E2DFED]"
        onKeyDown={(e) => {
          let next = tab;
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") next = 1 - tab;
          else if (e.key === "Home") next = 0;
          else if (e.key === "End") next = 1;
          else return;
          e.preventDefault();
          setTab(next);
          tabs.current[next]?.focus();
        }}
      >
        {["Users", "Roles & Permissions"].map((label, i) => (
          <button
            key={label}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            role="tab"
            id={`access-tab-${i}`}
            aria-controls={`access-panel-${i}`}
            aria-selected={tab === i}
            tabIndex={tab === i ? 0 : -1}
            onClick={() => setTab(i)}
            className={`rounded-t-lg border-b-2 px-4 py-3 text-sm ${tab === i ? "border-purple-600 bg-white font-semibold text-purple-700" : "border-transparent text-[#57556B] hover:bg-purple-50"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`access-panel-${tab}`}
        aria-labelledby={`access-tab-${tab}`}
        className="mt-5"
      >
        {tab === 0 ? (
          <UsersTable
            users={users}
            roles={roles}
            filter={filter}
            setFilter={setFilter}
            onInvite={() => setDialog({ kind: "userForm", user: null })}
            onView={(user) => setDialog({ kind: "userDetails", user })}
            onEdit={(user) => setDialog({ kind: "userForm", user })}
            onStatus={(user) => setDialog({ kind: "userStatus", user })}
          />
        ) : (
          <RolesPermissions
            roles={roles}
            users={users}
            onCreate={() =>
              setDialog({ kind: "roleForm", role: null, source: null })
            }
            onView={(role) => setDialog({ kind: "roleDetails", role })}
            onEdit={(role) =>
              setDialog({ kind: "roleForm", role, source: null })
            }
            onDuplicate={(source) =>
              setDialog({ kind: "roleForm", role: null, source })
            }
            onStatus={(role) => setDialog({ kind: "roleStatus", role })}
          />
        )}
      </div>
      {dialog?.kind === "userForm" && (
        <UserFormModal
          user={dialog.user}
          users={users}
          roles={roles}
          onClose={() => setDialog(null)}
          onSave={saveUser}
        />
      )}
      {dialog?.kind === "roleForm" && (
        <RoleFormModal
          role={dialog.role}
          source={dialog.source}
          roles={roles}
          users={users}
          onClose={() => setDialog(null)}
          onSave={saveRole}
        />
      )}
      {dialog?.kind === "userDetails" && selectedUser && (
        <Modal
          title="User Details"
          subtitle="View user account information."
          onClose={() => setDialog(null)}
        >
          <div className="flex items-center gap-3">
            <Avatar name={selectedUser.name} />
            <div>
              <h3 className="font-bold">{selectedUser.name}</h3>
              <p className="text-sm text-[#73718A]">{userRole?.name}</p>
            </div>
            <Badge>{selectedUser.status}</Badge>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
            {[
              ["User ID", selectedUser.id],
              ["Email", selectedUser.email],
              ["Department", selectedUser.department],
              ["Role", userRole?.name],
              ["Account status", selectedUser.status],
              ["Last login", selectedUser.lastLogin || "Never logged in"],
              ["Account created", selectedUser.createdAt],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-[#73718A]">{k}</dt>
                <dd className="mt-1 break-all font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 rounded-lg bg-[#F7F6FF] p-4">
            <h4 className="font-semibold">Permission summary</h4>
            <p className="mt-1 text-sm text-[#73718A]">
              Role: {userRole?.name}
            </p>
            <p className="mt-2 text-sm">
              {modules
                .filter((m) =>
                  userRole?.permissions.some((p) => p.startsWith(m.id + ":")),
                )
                .map((m) => m.name)
                .join(" · ") || "No modules selected"}
            </p>
          </div>
          <div className="mt-5 flex justify-end gap-3">
            <button className={secondary} onClick={() => setDialog(null)}>
              Close
            </button>
            <button
              className={primary}
              onClick={() =>
                setDialog({ kind: "userForm", user: selectedUser })
              }
            >
              Edit User
            </button>
          </div>
        </Modal>
      )}
      {dialog?.kind === "userStatus" && selectedUser && (
        <Modal
          title={
            selectedUser.status === "Inactive"
              ? "Reactivate User?"
              : "Deactivate User?"
          }
          onClose={() => setDialog(null)}
        >
          <p className="text-sm text-[#57556B]">
            {selectedUser.status === "Inactive"
              ? `Reactivate ${selectedUser.name} in this demo?`
              : "Are you sure you want to deactivate this account? The user will no longer be allowed to access the system once this change is enforced by the production authorization layer."}
          </p>
          {lastAdmin && (
            <p className="mt-3 text-sm font-semibold text-red-600">
              The last active Admin account cannot be deactivated.
            </p>
          )}
          <div className="mt-6 flex justify-end gap-3">
            <button className={secondary} onClick={() => setDialog(null)}>
              Cancel
            </button>
            <button
              disabled={!!lastAdmin}
              className={
                selectedUser.status === "Inactive"
                  ? primary
                  : "rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
              }
              onClick={() => {
                setUsers(
                  users.map((u) =>
                    u.id === selectedUser.id
                      ? {
                          ...u,
                          status:
                            u.status === "Inactive" ? "Active" : "Inactive",
                        }
                      : u,
                  ),
                );
                setDialog(null);
                notify("Account status updated in this demo.");
              }}
            >
              {selectedUser.status === "Inactive"
                ? "Reactivate User"
                : "Deactivate User"}
            </button>
          </div>
        </Modal>
      )}
      {dialog?.kind === "roleDetails" && selectedRole && (
        <Modal title="Role Details" onClose={() => setDialog(null)}>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-purple-100 p-3 text-purple-700">
              <LuShieldCheck size={22} />
            </span>
            <div>
              <h3 className="font-bold">{selectedRole.name}</h3>
              <p className="text-sm text-[#73718A]">
                {selectedRole.description}
              </p>
            </div>
            <Badge>{selectedRole.status}</Badge>
          </div>
          <div className="my-5 grid grid-cols-3 gap-2">
            {[
              ["Assigned Users", assigned.length],
              [
                "Modules",
                modules.filter((m) =>
                  selectedRole.permissions.some((p) =>
                    p.startsWith(m.id + ":"),
                  ),
                ).length,
              ],
              ["Permissions", selectedRole.permissions.length],
            ].map(([label, count]) => (
              <div
                key={label}
                className="rounded-lg border border-[#edeaf6] p-3 text-center"
              >
                <p className="text-lg font-bold">{count}</p>
                <p className="text-xs text-[#73718A]">{label}</p>
              </div>
            ))}
          </div>
          <h4 className="font-semibold">Permissions by Module</h4>
          <div className="mt-3 space-y-3">
            {modules
              .filter((m) =>
                selectedRole.permissions.some((p) => p.startsWith(m.id + ":")),
              )
              .map((m) => (
                <div key={m.id}>
                  <p className="text-sm font-semibold">{m.name}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {m.actions
                      .filter((a) =>
                        selectedRole.permissions.includes(`${m.id}:${a}`),
                      )
                      .map((a) => (
                        <span
                          key={a}
                          className="rounded-full bg-purple-100 px-2 py-1 text-xs text-purple-700"
                        >
                          {a}
                        </span>
                      ))}
                  </div>
                </div>
              ))}
          </div>
          <h4 className="mt-5 font-semibold">Assigned users</h4>
          <p className="mt-2 text-sm text-[#73718A]">
            {assigned.map((u) => u.name).join(", ") || "No users assigned."}
          </p>
          <div className="mt-5 flex justify-end gap-3">
            <button className={secondary} onClick={() => setDialog(null)}>
              Close
            </button>
            <button
              className={primary}
              onClick={() =>
                setDialog({
                  kind: "roleForm",
                  role: selectedRole,
                  source: null,
                })
              }
            >
              Edit Role
            </button>
          </div>
        </Modal>
      )}
      {dialog?.kind === "roleStatus" && selectedRole && (
        <Modal
          title={
            selectedRole.status === "Active"
              ? "Deactivate Role?"
              : "Reactivate Role?"
          }
          onClose={() => setDialog(null)}
        >
          {assigned.length > 0 && selectedRole.status === "Active" ? (
            <>
              <p className="text-sm">
                This role is assigned to {assigned.length} users. Reassign those
                users before deactivating the role.
              </p>
              <button
                className="mt-4 text-sm font-semibold text-purple-700 underline"
                onClick={() => {
                  setFilter(selectedRole.id);
                  setTab(0);
                  setDialog(null);
                }}
              >
                View assigned users
              </button>
            </>
          ) : (
            <p className="text-sm">
              Confirm this role status change in the demo.
            </p>
          )}
          <div className="mt-6 flex justify-end gap-3">
            <button className={secondary} onClick={() => setDialog(null)}>
              Cancel
            </button>
            <button
              className={primary}
              disabled={
                selectedRole.status === "Active" &&
                (assigned.length > 0 || !!selectedRole.system)
              }
              onClick={() => {
                setRoles(
                  roles.map((r) =>
                    r.id === selectedRole.id
                      ? {
                          ...r,
                          status: r.status === "Active" ? "Inactive" : "Active",
                        }
                      : r,
                  ),
                );
                setDialog(null);
                notify("Role status updated in this demo.");
              }}
            >
              Confirm
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
