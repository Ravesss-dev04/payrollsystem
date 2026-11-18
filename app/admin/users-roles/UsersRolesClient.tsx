"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  LuEye,
  LuPencil,
  LuPlus,
  LuSearch,
  LuShieldCheck,
  LuUserRoundCheck,
  LuUserX,
} from "react-icons/lu";
import type { Permission, Role } from "../../lib/auth/authorization";
import AttendancePolicies from "../components/AttendancePolicies";
import {
  Avatar,
  Badge,
  input,
  Modal,
  primary,
  secondary,
} from "../components/UsersTable";

type UserSummary = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  profileImageUrl: string | null;
  role: Role;
  status: "Active" | "Invited" | "Suspended" | "Inactive";
  lastLoginAt: string | null;
  createdAt: string;
  employee: {
    employeeId: string;
    employeeNumber: string;
    firstName: string;
    lastName: string;
    workEmail: string;
    department: { id: string; name: string };
    employmentStatus: { code: string; label: string };
    effectiveFrom: string;
  } | null;
  invitation: {
    id: string;
    status: string;
    expiresAt: string;
  } | null;
};

type UserPermission = {
  key: Permission;
  module: string;
  label: string;
  inherited: boolean;
  userDenied: boolean;
  effective: boolean;
  selectable: boolean;
  lockReason: string | null;
};

type UserDetail = UserSummary & {
  permissions: UserPermission[];
  invitation: (NonNullable<UserSummary["invitation"]> & {
    sentAt: string | null;
  }) | null;
  history: Array<{
    id: string;
    action: string;
    summary: string;
    createdAt: string;
    actor: { name: string; email: string } | null;
  }>;
};

type RoleRecord = {
  id: Role;
  label: string;
  userCount: number;
  permissions: Array<{
    key: Permission;
    module: string;
    label: string;
    granted: boolean;
    locked: boolean;
    selectable: boolean;
    lockReason: string | null;
  }>;
};

type InvitationCandidate = {
  id: string;
  employeeNumber: string;
  name: string;
  email: string;
  department: { id: string; name: string };
  employmentStatus: { code: string; label: string };
};

type ListResponse = {
  users: UserSummary[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

class RequestError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
  ) {
    super(code);
  }
}

function csrfToken(): string | null {
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

async function apiRequest<T>(
  url: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.method && init.method !== "GET") {
    const token = csrfToken();
    if (!token) throw new RequestError("session_validation_required", 403);
    headers.set("x-csrf-token", token);
  }
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const response = await fetch(url, {
    ...init,
    headers,
    cache: "no-store",
  });
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new RequestError(body.error ?? "request_failed", response.status);
  }
  return body;
}

function errorText(error: unknown): string {
  if (error instanceof RequestError) {
    switch (error.code) {
      case "forbidden":
        return "You are not authorized to perform this action.";
      case "user_conflict":
      case "user_status_conflict":
      case "concurrent_update":
        return "The account changed while you were working. Refresh and try again.";
      case "last_active_admin":
        return "The last active Admin account cannot be changed or deactivated.";
      case "email_delivery_failed":
      case "email_not_configured":
        return "The invitation could not be sent. Check the email service configuration and try again.";
      case "employee_not_invitable":
        return "This employee is not currently eligible for an account invitation.";
      case "permission_not_inherited":
        return "Only permissions inherited from the role can be restricted for an individual.";
      default:
        return "The request could not be completed. Refresh and try again.";
    }
  }
  return "The request could not be completed. Check your connection and try again.";
}

function ProfileAvatar({ user }: { user: Pick<UserSummary, "name" | "profileImageUrl"> }) {
  return user.profileImageUrl ? (
    <Image
      src={user.profileImageUrl}
      alt={`${user.name} profile`}
      width={36}
      height={36}
      unoptimized
      className="h-9 w-9 shrink-0 rounded-full object-cover"
    />
  ) : (
    <Avatar name={user.name} />
  );
}

function formatDate(value: string | null) {
  if (!value) return "Never logged in";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unavailable"
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function permissionGroups<T extends { module: string }>(permissions: T[]) {
  return permissions.reduce<Record<string, T[]>>((groups, permission) => {
    (groups[permission.module] ??= []).push(permission);
    return groups;
  }, {});
}

export default function UsersRolesClient({
  canManageUsers = true,
  canManageAttendance = true,
}: {
  canManageUsers?: boolean;
  canManageAttendance?: boolean;
}) {
  const [tab, setTab] = useState(canManageUsers ? 0 : 2);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [list, setList] = useState<ListResponse | null>(null);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [listBusy, setListBusy] = useState(true);
  const [reloadCounter, setReloadCounter] = useState(0);
  const [rolesBusy, setRolesBusy] = useState(true);
  const [listError, setListError] = useState("");
  const [rolesError, setRolesError] = useState("");
  const [notice, setNotice] = useState("");
  const [dialog, setDialog] = useState<
    | { kind: "invite" }
    | { kind: "detail"; userId: string }
    | { kind: "edit"; user: UserSummary }
    | { kind: "role"; roleId: Role; viewOnly: boolean }
    | null
  >(null);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [candidates, setCandidates] = useState<InvitationCandidate[]>([]);
  const [candidateError, setCandidateError] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("employee");
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [roleData, setRoleData] = useState<RoleRecord | null>(null);
  const [roleBusy, setRoleBusy] = useState(false);
  const [roleError, setRoleError] = useState("");
  const [roleSaving, setRoleSaving] = useState(false);
  const [rolePermissions, setRolePermissions] = useState<Permission[]>([]);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState<Role>("employee");
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState("");
  const [savingDenials, setSavingDenials] = useState(false);
  const [denialError, setDenialError] = useState("");
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!canManageUsers) {
      return;
    }
    let active = true;
    const controller = new AbortController();
    void Promise.resolve().then(() => {
      if (!active) return;
      setListBusy(true);
      setListError("");
    });
    const params = new URLSearchParams({
      q: query,
      role: roleFilter,
      page: String(page),
    });
    fetch(`/api/admin/users?${params}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = (await response.json()) as ListResponse & {
          error?: string;
        };
        if (!response.ok) throw new RequestError(body.error ?? "request_failed", response.status);
        return body;
      })
      .then((body) => {
        if (active) {
          setList(body);
          setPage(body.page);
        }
      })
      .catch((error: unknown) => {
        if (active && !(error instanceof DOMException && error.name === "AbortError")) {
          setListError(errorText(error));
        }
      })
      .finally(() => {
        if (active) setListBusy(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [query, roleFilter, page, reloadCounter, canManageUsers]);

  useEffect(() => {
    if (!canManageUsers) {
      return;
    }
    let active = true;
    apiRequest<{ roles: RoleRecord[] }>("/api/admin/roles")
      .then(({ roles: loadedRoles }) => {
        if (active) setRoles(loadedRoles);
      })
      .catch((error: unknown) => {
        if (active) setRolesError(errorText(error));
      })
      .finally(() => {
        if (active) setRolesBusy(false);
      });
    return () => {
      active = false;
    };
  }, [canManageUsers]);

  useEffect(() => {
    if (!dialog || dialog.kind !== "detail") return;
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      setDetailBusy(true);
      setDetailError("");
    });
    apiRequest<UserDetail>(`/api/admin/users/${encodeURIComponent(dialog.userId)}`)
      .then((user) => {
        if (active) setDetail(user);
      })
      .catch((error: unknown) => {
        if (active) setDetailError(errorText(error));
      })
      .finally(() => {
        if (active) setDetailBusy(false);
      });
    return () => {
      active = false;
    };
  }, [dialog]);

  useEffect(() => {
    if (!dialog || dialog.kind !== "invite") return;
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      setCandidates([]);
      setCandidateError("");
    });
    apiRequest<{ employees: InvitationCandidate[] }>(
      "/api/admin/users/invitation-candidates",
    )
      .then(({ employees }) => {
        if (!active) return;
        setCandidates(employees);
        setSelectedEmployee(employees[0]?.id ?? "");
      })
      .catch((error: unknown) => {
        if (active) setCandidateError(errorText(error));
      });
    return () => {
      active = false;
    };
  }, [dialog]);

  useEffect(() => {
    if (!dialog || dialog.kind !== "role") return;
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      setRoleBusy(true);
      setRoleError("");
    });
    apiRequest<{ roles: RoleRecord[] }>("/api/admin/roles")
      .then(({ roles: loaded }) => {
        if (!active) return;
        const role = loaded.find((item) => item.id === dialog.roleId);
        if (!role) throw new RequestError("role_not_found", 404);
        setRoleData(role);
        setRolePermissions(
          role.permissions.filter((permission) => permission.granted).map((p) => p.key),
        );
      })
      .catch((error: unknown) => {
        if (active) setRoleError(errorText(error));
      })
      .finally(() => {
        if (active) setRoleBusy(false);
      });
    return () => {
      active = false;
    };
  }, [dialog]);

  const selectedCandidate = candidates.find(
    (candidate) => candidate.id === selectedEmployee,
  );
  const roleOptions: Array<{ id: Role; label: string }> = [
    { id: "admin", label: "Admin" },
    { id: "hr", label: "HR" },
    { id: "tl", label: "TL" },
    { id: "employee", label: "Employee" },
  ];
  const userRows = list?.users ?? [];
  const currentRole = dialog?.kind === "role"
    ? roles.find(({ id }) => id === dialog.roleId)
    : null;
  const canEditRole = dialog?.kind === "role" && !dialog.viewOnly;
  const permissionModules = useMemo(
    () => (detail ? permissionGroups(detail.permissions) : {}),
    [detail],
  );
  const roleModules = useMemo(
    () => (roleData ? permissionGroups(roleData.permissions) : {}),
    [roleData],
  );

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 5000);
  }

  function reloadUsers() {
    setReloadCounter((current) => current + 1);
  }

  async function submitInvitation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedEmployee) {
      setCandidateError("There are no eligible employee records to invite.");
      return;
    }
    setInviteBusy(true);
    setCandidateError("");
    try {
      await apiRequest("/api/admin/invitations", {
        method: "POST",
        body: JSON.stringify({
          employeeId: selectedEmployee,
          role: inviteRole,
          message: inviteMessage.trim() || undefined,
        }),
      });
      setDialog(null);
      setInviteMessage("");
      showNotice("Invitation email sent. The link expires in 48 hours.");
      reloadUsers();
    } catch (error) {
      setCandidateError(errorText(error));
    } finally {
      setInviteBusy(false);
    }
  }

  function beginEdit(user: UserSummary) {
    setEditName(user.name);
    setEditEmail(user.email);
    setEditPhone(user.phoneNumber ?? "");
    setEditRole(user.role);
    setEditError("");
    setDialog({ kind: "edit", user });
  }

  async function submitUserEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dialog || dialog.kind !== "edit") return;
    setEditBusy(true);
    setEditError("");
    try {
      await apiRequest(`/api/admin/users/${encodeURIComponent(dialog.user.id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          phoneNumber: editPhone || null,
          role: editRole,
        }),
      });
      setDialog(null);
      showNotice("User account updated.");
      reloadUsers();
    } catch (error) {
      setEditError(errorText(error));
    } finally {
      setEditBusy(false);
    }
  }

  async function updateStatus(user: UserSummary) {
    const action = user.status === "Inactive" ? "reactivate" : "deactivate";
    if (
      action === "deactivate" &&
      !window.confirm(`Deactivate ${user.name}'s account? Their active sessions will be revoked.`)
    ) {
      return;
    }
    setActionBusy(true);
    setActionError("");
    try {
      await apiRequest(`/api/admin/users/${encodeURIComponent(user.id)}/status`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      setDialog(null);
      showNotice(`Account ${action}d.`);
      reloadUsers();
    } catch (error) {
      setActionError(errorText(error));
    } finally {
      setActionBusy(false);
    }
  }

  async function saveUserDenials() {
    if (!detail) return;
    setSavingDenials(true);
    setDenialError("");
    try {
      await apiRequest(`/api/admin/users/${encodeURIComponent(detail.id)}/permissions`, {
        method: "PATCH",
        body: JSON.stringify({
          deniedPermissions: detail.permissions
            .filter((permission) => permission.userDenied)
            .map((permission) => permission.key),
        }),
      });
      const updated = await apiRequest<UserDetail>(
        `/api/admin/users/${encodeURIComponent(detail.id)}`,
      );
      setDetail(updated);
      showNotice("User-specific permission restrictions updated.");
    } catch (error) {
      setDenialError(errorText(error));
    } finally {
      setSavingDenials(false);
    }
  }

  async function uploadProfileImage(file: File | null) {
    if (!detail || !file) return;
    setImageBusy(true);
    setImageError("");
    try {
      const result = await apiRequest<{ cleanupPending: boolean }>(
        `/api/admin/users/${encodeURIComponent(detail.id)}/profile-image`,
        {
          method: "PUT",
          headers: { "content-type": file.type },
          body: file,
        },
      );
      const updated = await apiRequest<UserDetail>(
        `/api/admin/users/${encodeURIComponent(detail.id)}`,
      );
      setDetail(updated);
      setReloadCounter((current) => current + 1);
      showNotice(
        result.cleanupPending
          ? "Profile picture updated; old image cleanup is pending."
          : "Profile picture updated.",
      );
    } catch (error) {
      setImageError(errorText(error));
    } finally {
      setImageBusy(false);
    }
  }

  async function removeProfileImage() {
    if (!detail) return;
    setImageBusy(true);
    setImageError("");
    try {
      const result = await apiRequest<{ cleanupPending: boolean }>(
        `/api/admin/users/${encodeURIComponent(detail.id)}/profile-image`,
        { method: "DELETE" },
      );
      const updated = await apiRequest<UserDetail>(
        `/api/admin/users/${encodeURIComponent(detail.id)}`,
      );
      setDetail(updated);
      setReloadCounter((current) => current + 1);
      showNotice(
        result.cleanupPending
          ? "Profile picture removed; old image cleanup is pending."
          : "Profile picture removed.",
      );
    } catch (error) {
      setImageError(errorText(error));
    } finally {
      setImageBusy(false);
    }
  }

  async function saveRolePermissions() {
    if (!roleData) return;
    setRoleSaving(true);
    setRoleError("");
    try {
      await apiRequest(`/api/admin/roles/${encodeURIComponent(roleData.id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          permissions: roleData.permissions
            .filter((permission) => permission.locked || rolePermissions.includes(permission.key))
            .map((permission) => permission.key),
        }),
      });
      const { roles: loaded } = await apiRequest<{ roles: RoleRecord[] }>(
        "/api/admin/roles",
      );
      setRoles(loaded);
      setRoleData(loaded.find(({ id }) => id === roleData.id) ?? null);
      showNotice(`${roleData.label} permissions updated.`);
      if (dialog?.kind === "role" && !dialog.viewOnly) setDialog(null);
    } catch (error) {
      setRoleError(errorText(error));
    } finally {
      setRoleSaving(false);
    }
  }

  async function resendOrRevoke(invitationId: string, action: "resend" | "revoke") {
    if (!detail) return;
    setActionBusy(true);
    setActionError("");
    try {
      if (action === "resend") {
        await apiRequest(`/api/admin/invitations/${encodeURIComponent(invitationId)}`, {
          method: "POST",
        });
        showNotice("A new invitation email was sent. It expires in 48 hours.");
      } else {
        await apiRequest(`/api/admin/invitations/${encodeURIComponent(invitationId)}`, {
          method: "DELETE",
        });
        showNotice("Invitation revoked.");
      }
      setDialog({ kind: "detail", userId: detail.id });
      reloadUsers();
    } catch (error) {
      setActionError(errorText(error));
    } finally {
      setActionBusy(false);
    }
  }

  function selectTab(index: number) {
    if (!canManageUsers && index !== 2) return;
    setTab(index);
    const url = new URL(window.location.href);
    if (index === 0) url.searchParams.delete("tab");
    else url.searchParams.set("tab", index === 1 ? "roles" : "attendance-policies");
    window.history.pushState(null, "", url);
  }

  useEffect(() => {
    const sync = () => {
      const selectedTab = new URLSearchParams(window.location.search).get("tab");
      setTab(
        !canManageUsers
          ? 2
          : selectedTab === "attendance-policies"
            ? 2
            : selectedTab === "roles"
              ? 1
              : 0,
      );
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [canManageUsers]);

  return (
    <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold tracking-tight">Users &amp; Roles</h1>
      <p className="mt-1 text-sm text-[#73718A]">
        Manage system users, role permissions, and attendance policies.
      </p>
      {notice ? (
        <div
          role="status"
          className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800"
        >
          {notice}
        </div>
      ) : null}
      <div
        role="tablist"
        aria-label="Users and roles sections"
        className="mt-6 flex overflow-x-auto border-b border-[#E2DFED]"
        onKeyDown={(event) => {
          if (!canManageUsers) return;
          let next = tab;
          if (event.key === "ArrowRight") next = (tab + 1) % 3;
          else if (event.key === "ArrowLeft") next = (tab + 2) % 3;
          else if (event.key === "Home") next = 0;
          else if (event.key === "End") next = 2;
          else return;
          event.preventDefault();
          selectTab(next);
          tabs.current[next]?.focus();
        }}
      >
        {(canManageUsers
          ? ["Users", "Roles & Permissions", "Attendance Policies"]
          : ["Attendance Policies"]
        ).map((label, visibleIndex) => {
          const index = canManageUsers ? visibleIndex : 2;
          return (
          <button
            key={label}
            ref={(element) => {
              tabs.current[index] = element;
            }}
            role="tab"
            id={`access-tab-${index}`}
            aria-controls={`access-panel-${index}`}
            aria-selected={tab === index}
            tabIndex={tab === index ? 0 : -1}
            onClick={() => selectTab(index)}
            className={`shrink-0 whitespace-nowrap rounded-t-lg border-b-2 px-4 py-3 text-sm ${tab === index ? "border-purple-600 bg-white font-semibold text-purple-700" : "border-transparent text-[#57556B] hover:bg-purple-50"}`}
          >
            {label}
          </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`access-panel-${tab}`}
        aria-labelledby={`access-tab-${tab}`}
        className="mt-5"
      >
        {tab === 0 ? (
          <section className="rounded-xl border border-[#EDEAF6] bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <LuSearch className="absolute top-3.5 left-3 text-[#73718A]" aria-hidden="true" />
                <input
                  aria-label="Search users by name, email, or role"
                  placeholder="Search name, email, or role..."
                  className={`${input} pl-9`}
                  value={search}
                  onChange={(event) => {
                    setSearch(event.currentTarget.value);
                    setPage(1);
                  }}
                />
              </div>
              <select
                aria-label="Filter users by role"
                className={`${input} sm:w-48`}
                value={roleFilter}
                onChange={(event) => {
                  setRoleFilter(event.currentTarget.value);
                  setPage(1);
                }}
              >
                <option value="all">All roles</option>
                {roleOptions.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.label}
                  </option>
                ))}
              </select>
              <button
                className={primary}
                onClick={() => setDialog({ kind: "invite" })}
              >
                <LuPlus aria-hidden="true" /> Invite employee
              </button>
            </div>
            {listError ? (
              <div role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
                <p>{listError}</p>
                <button className="mt-2 font-semibold underline" onClick={reloadUsers}>
                  Retry
                </button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px] text-left text-sm">
                    <thead className="bg-[#F7F6FF] text-xs text-[#57556B]">
                      <tr>
                        {["User", "Email", "Role", "Status", "Last login", "Actions"].map((heading) => (
                          <th key={heading} scope="col" className="px-3 py-3 font-semibold">
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody aria-busy={listBusy}>
                      {userRows.map((user) => (
                        <tr key={user.id} className="border-b border-[#f0eef6]">
                          <td className="px-3 py-3">
                            <button
                              onClick={() => {
                                setDetail(null);
                                setDialog({ kind: "detail", userId: user.id });
                              }}
                              className="flex items-center gap-3 text-left font-semibold hover:text-purple-700"
                            >
                              <ProfileAvatar user={user} />
                              {user.name}
                            </button>
                          </td>
                          <td className="max-w-[230px] truncate px-3 py-3" title={user.email}>
                            {user.email}
                          </td>
                          <td className="px-3 py-3">
                            {roleOptions.find(({ id }) => id === user.role)?.label ?? user.role}
                          </td>
                          <td className="px-3 py-3"><Badge>{user.status}</Badge></td>
                          <td className="whitespace-nowrap px-3 py-3 text-[#73718A]">
                            {formatDate(user.lastLoginAt)}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex gap-1">
                              <button
                                title="View user"
                                aria-label={`View ${user.name}`}
                                className="rounded-lg p-2 text-[#73718A] hover:bg-purple-50 hover:text-purple-700"
                                onClick={() => {
                                  setDetail(null);
                                  setDialog({ kind: "detail", userId: user.id });
                                }}
                              >
                                <LuEye size={17} aria-hidden="true" />
                              </button>
                              <button
                                title="Edit user"
                                aria-label={`Edit ${user.name}`}
                                className="rounded-lg p-2 text-[#73718A] hover:bg-purple-50 hover:text-purple-700"
                                onClick={() => beginEdit(user)}
                              >
                                <LuPencil size={17} aria-hidden="true" />
                              </button>
                              {user.status === "Active" || user.status === "Inactive" ? (
                                <button
                                  title={user.status === "Active" ? "Deactivate user" : "Reactivate user"}
                                  aria-label={`${user.status === "Active" ? "Deactivate" : "Reactivate"} ${user.name}`}
                                  className="rounded-lg p-2 text-[#73718A] hover:bg-purple-50 hover:text-purple-700"
                                  onClick={() => {
                                    setActionError("");
                                    setDialog({ kind: "detail", userId: user.id });
                                    setDetail({ ...user, permissions: [], invitation: null, history: [] });
                                  }}
                                >
                                  {user.status === "Active" ? (
                                    <LuUserX size={17} aria-hidden="true" />
                                  ) : (
                                    <LuUserRoundCheck size={17} aria-hidden="true" />
                                  )}
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {listBusy ? (
                  <p className="py-8 text-center text-sm text-[#73718A]">Loading users…</p>
                ) : userRows.length === 0 ? (
                  <p className="py-12 text-center text-sm text-[#73718A]">
                    No users match the current search and role filter.
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-[#73718A]">
                  <span>
                    Showing {list?.totalItems ? (list.page - 1) * list.pageSize + 1 : 0}
                    –{list ? Math.min(list.page * list.pageSize, list.totalItems) : 0}
                    {" "}of {list?.totalItems ?? 0}
                  </span>
                  <div className="flex items-center gap-3">
                    <span>Page {list?.page ?? 1} of {list?.totalPages ?? 0}</span>
                    <button
                      className={secondary}
                      disabled={listBusy || !list || list.page <= 1}
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                    >
                      Previous
                    </button>
                    <button
                      className={secondary}
                      disabled={listBusy || !list || list.page >= list.totalPages}
                      onClick={() => setPage((current) => current + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        ) : tab === 1 ? (
          <section>
            <h2 className="text-xl font-bold">Roles &amp; Permissions</h2>
            <p className="mt-1 text-sm text-[#73718A]">
              Manage permissions for the four supported system roles.
            </p>
            {rolesError ? (
              <p role="alert" className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
                {rolesError}
              </p>
            ) : (
              <div className="mt-5 overflow-x-auto rounded-xl border border-[#EDEAF6] bg-white p-4 shadow-sm">
                <table className="w-full min-w-[650px] text-left text-sm">
                  <thead className="bg-[#F7F6FF] text-xs text-[#57556B]">
                    <tr>
                      {["Role", "Assigned users", "Permission summary", "Actions"].map((heading) => (
                        <th key={heading} scope="col" className="px-3 py-3 font-semibold">{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {roles.map((role) => (
                      <tr key={role.id} className="border-b border-[#f0eef6]">
                        <td className="px-3 py-3">
                          <span className="flex items-center gap-2 font-semibold">
                            <LuShieldCheck className="text-purple-700" aria-hidden="true" />
                            {role.label}
                          </span>
                        </td>
                        <td className="px-3 py-3">{role.userCount}</td>
                        <td className="px-3 py-3">
                          {new Set(role.permissions.filter((p) => p.granted).map((p) => p.module)).size}
                          {" "}modules · {role.permissions.filter((p) => p.granted).length} permissions
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-1">
                            <button
                              className="rounded-lg p-2 text-[#73718A] hover:bg-purple-50 hover:text-purple-700"
                              aria-label={`View ${role.label} permissions`}
                              onClick={() => setDialog({ kind: "role", roleId: role.id, viewOnly: true })}
                            >
                              <LuEye aria-hidden="true" />
                            </button>
                            <button
                              className="rounded-lg p-2 text-[#73718A] hover:bg-purple-50 hover:text-purple-700"
                              aria-label={`Edit ${role.label} permissions`}
                              onClick={() => setDialog({ kind: "role", roleId: role.id, viewOnly: false })}
                            >
                              <LuPencil aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rolesBusy ? <p className="py-6 text-center text-sm text-[#73718A]">Loading roles…</p> : null}
              </div>
            )}
          </section>
        ) : (
          <AttendancePolicies canManage={canManageAttendance} />
        )}
      </div>

      {dialog?.kind === "invite" ? (
        <Modal
          title="Invite employee"
          subtitle="Only existing HR employee records can be invited."
          onClose={() => setDialog(null)}
          dirty={!!inviteMessage || !!selectedEmployee}
        >
          <form onSubmit={submitInvitation} className="space-y-4">
            {candidateError && !candidates.length ? (
              <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {candidateError}
              </p>
            ) : null}
            <label className="block text-sm font-semibold">
              Employee record
              <select
                className={`${input} mt-1.5`}
                value={selectedEmployee}
                onChange={(event) => setSelectedEmployee(event.currentTarget.value)}
                required
                disabled={!candidates.length}
              >
                {candidates.length ? null : <option value="">No eligible employees</option>}
                {candidates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name} · {candidate.email}
                  </option>
                ))}
              </select>
            </label>
            {selectedCandidate ? (
              <dl className="grid gap-1 rounded-lg bg-[#F7F6FF] p-3 text-sm">
                <div><dt className="inline text-[#73718A]">Department: </dt><dd className="inline">{selectedCandidate.department.name}</dd></div>
                <div><dt className="inline text-[#73718A]">Employment status: </dt><dd className="inline">{selectedCandidate.employmentStatus.label}</dd></div>
              </dl>
            ) : null}
            <label className="block text-sm font-semibold">
              System role
              <select
                className={`${input} mt-1.5`}
                value={inviteRole}
                onChange={(event) => setInviteRole(event.currentTarget.value as Role)}
              >
                {roleOptions.map((role) => <option key={role.id} value={role.id}>{role.label}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Personal invitation message <span className="font-normal text-[#73718A]">(optional)</span>
              <textarea
                className={`${input} mt-1.5`}
                rows={3}
                maxLength={1000}
                value={inviteMessage}
                onChange={(event) => setInviteMessage(event.currentTarget.value)}
              />
            </label>
            {candidateError && candidates.length ? <p role="alert" className="text-sm text-red-700">{candidateError}</p> : null}
            <p className="text-xs text-[#73718A]">The secure invitation link expires exactly 48 hours after it is sent.</p>
            <div className="flex justify-end gap-3 border-t border-[#edeaf6] pt-4">
              <button type="button" className={secondary} onClick={() => setDialog(null)}>Cancel</button>
              <button className={primary} disabled={inviteBusy || !candidates.length}>
                {inviteBusy ? "Sending…" : "Send invitation"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {dialog?.kind === "edit" ? (
        <Modal
          title="Edit user account"
          subtitle="Department and employment details are maintained by HR."
          onClose={() => setDialog(null)}
          dirty
        >
          <form onSubmit={submitUserEdit} className="space-y-4">
            {[
              ["Full name", editName, setEditName, "text"],
              ["Email address", editEmail, setEditEmail, "email"],
              ["Phone number", editPhone, setEditPhone, "tel"],
            ].map(([label, value, setter, type]) => (
              <label key={label as string} className="block text-sm font-semibold">
                {label as string}
                <input
                  className={`${input} mt-1.5`}
                  type={type as string}
                  value={value as string}
                  onChange={(event) => (setter as (value: string) => void)(event.currentTarget.value)}
                  maxLength={type === "tel" ? 32 : 320}
                  required={type !== "tel"}
                />
              </label>
            ))}
            <label className="block text-sm font-semibold">
              System role
              <select className={`${input} mt-1.5`} value={editRole} onChange={(event) => setEditRole(event.currentTarget.value as Role)}>
                {roleOptions.map((role) => <option key={role.id} value={role.id}>{role.label}</option>)}
              </select>
            </label>
            {dialog.user.employee ? (
              <p className="rounded-lg bg-[#F7F6FF] p-3 text-sm text-[#57556B]">
                HR-managed: {dialog.user.employee.department.name} · {dialog.user.employee.employmentStatus.label}
              </p>
            ) : null}
            {dialog.user.status === "Invited" ? (
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                Role, name, and email are fixed while an invitation is pending. Revoke the invitation before changing these fields.
              </p>
            ) : null}
            {editError ? <p role="alert" className="text-sm text-red-700">{editError}</p> : null}
            <div className="flex justify-end gap-3 border-t border-[#edeaf6] pt-4">
              <button type="button" className={secondary} onClick={() => setDialog(null)}>Cancel</button>
              <button className={primary} disabled={editBusy || dialog.user.status === "Invited"}>
                {editBusy ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {dialog?.kind === "detail" ? (
        <Modal
          title="User details"
          subtitle="Account, employment, and effective permission information."
          onClose={() => setDialog(null)}
          wide
        >
          {detailBusy && !detail ? <p className="py-8 text-center text-sm">Loading user…</p> : null}
          {detailError ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{detailError}</p> : null}
          {detail ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <ProfileAvatar user={detail} />
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold">{detail.name}</h3>
                  <p className="text-sm text-[#73718A]">{detail.email}</p>
                </div>
                <span className="text-sm">{roleOptions.find(({ id }) => id === detail.role)?.label}</span>
                <Badge>{detail.status}</Badge>
              </div>
              <section className="flex flex-wrap items-center gap-3 rounded-xl border border-[#EDEAF6] p-4">
                <div>
                  <h3 className="text-sm font-semibold">Profile picture</h3>
                  <p className="mt-1 text-xs text-[#73718A]">
                    JPEG, PNG, or WebP up to 5 MB.
                  </p>
                </div>
                <label className={`${secondary} cursor-pointer`}>
                  {imageBusy ? "Uploading…" : "Upload image"}
                  <input
                    className="sr-only"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={imageBusy}
                    onChange={(event) => {
                      void uploadProfileImage(event.currentTarget.files?.[0] ?? null);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
                {detail.profileImageUrl ? (
                  <button
                    className={secondary}
                    disabled={imageBusy}
                    onClick={() => void removeProfileImage()}
                  >
                    Remove image
                  </button>
                ) : null}
                {imageError ? <p role="alert" className="w-full text-sm text-red-700">{imageError}</p> : null}
              </section>
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div><dt className="text-[#73718A]">Phone</dt><dd>{detail.phoneNumber || "Not provided"}</dd></div>
                <div><dt className="text-[#73718A]">Last successful login</dt><dd>{formatDate(detail.lastLoginAt)}</dd></div>
                <div><dt className="text-[#73718A]">Employee number</dt><dd>{detail.employee?.employeeNumber ?? "Not linked to an employee record"}</dd></div>
                <div><dt className="text-[#73718A]">Department</dt><dd>{detail.employee?.department.name ?? "Not assigned"}</dd></div>
                <div><dt className="text-[#73718A]">Employment status</dt><dd>{detail.employee?.employmentStatus.label ?? "Not applicable"}</dd></div>
                <div><dt className="text-[#73718A]">Account created</dt><dd>{formatDate(detail.createdAt)}</dd></div>
              </dl>
              {detail.invitation ? (
                <section className="rounded-xl border border-[#EDEAF6] p-4">
                  <h3 className="font-semibold">Invitation</h3>
                  <p className="mt-1 text-sm text-[#73718A]">
                    {detail.invitation.status} · expires {formatDate(detail.invitation.expiresAt)}
                  </p>
                  {detail.status === "Invited" ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button className={secondary} disabled={actionBusy} onClick={() => void resendOrRevoke(detail.invitation!.id, "resend")}>Resend invitation</button>
                      <button className={secondary} disabled={actionBusy} onClick={() => void resendOrRevoke(detail.invitation!.id, "revoke")}>Revoke invitation</button>
                    </div>
                  ) : null}
                </section>
              ) : null}
              <section>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">Effective permissions</h3>
                    <p className="mt-1 text-xs text-[#73718A]">
                      Checked permissions are effective. Uncheck an inherited permission to restrict this user only.
                    </p>
                  </div>
                  <button className={primary} disabled={savingDenials} onClick={() => void saveUserDenials()}>
                    {savingDenials ? "Saving…" : "Save permission restrictions"}
                  </button>
                </div>
                {denialError ? <p role="alert" className="mt-2 text-sm text-red-700">{denialError}</p> : null}
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {Object.entries(permissionModules).map(([module, permissions]) => (
                    <fieldset key={module} className="rounded-xl border border-[#EDEAF6] p-4">
                      <legend className="px-1 text-sm font-semibold">{module}</legend>
                      <div className="space-y-3">
                        {permissions.map((permission) => (
                          <label key={permission.key} className="flex items-start gap-2 text-sm">
                            <input
                              type="checkbox"
                              className="mt-1 accent-purple-700"
                              checked={permission.effective}
                              disabled={!permission.selectable || savingDenials}
                              onChange={(event) => {
                                const checked = event.currentTarget.checked;
                                setDetail((current) => current ? {
                                  ...current,
                                  permissions: current.permissions.map((item) => item.key === permission.key ? {
                                    ...item,
                                    userDenied: !checked,
                                    effective: checked,
                                  } : item),
                                } : current);
                              }}
                            />
                            <span>
                              <span className="block">{permission.label}</span>
                              <span className="text-xs text-[#73718A]">
                                {permission.lockReason ?? (permission.userDenied ? "Restricted for this user" : "Inherited from role")}
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  ))}
                </div>
              </section>
              <section>
                <h3 className="font-semibold">Recent activity</h3>
                {detail.history.length ? (
                  <ul className="mt-2 space-y-2 text-sm">
                    {detail.history.map((event) => (
                      <li key={event.id} className="rounded-lg bg-[#F7F6FF] p-3">
                        <p>{event.summary}</p>
                        <p className="mt-1 text-xs text-[#73718A]">
                          {event.actor?.name ?? "System"} · {formatDate(event.createdAt)}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : <p className="mt-2 text-sm text-[#73718A]">No account activity recorded.</p>}
              </section>
              {actionError ? <p role="alert" className="text-sm text-red-700">{actionError}</p> : null}
              <div className="flex flex-wrap justify-end gap-3 border-t border-[#edeaf6] pt-4">
                {detail.status === "Active" || detail.status === "Inactive" ? (
                  <button className={secondary} disabled={actionBusy} onClick={() => void updateStatus(detail)}>
                    {detail.status === "Active" ? "Deactivate account" : "Reactivate account"}
                  </button>
                ) : null}
                <button className={secondary} onClick={() => beginEdit(detail)}>Edit account</button>
                <button className={primary} onClick={() => setDialog(null)}>Close</button>
              </div>
            </div>
          ) : null}
        </Modal>
      ) : null}

      {dialog?.kind === "role" ? (
        <Modal
          title={`${dialog.viewOnly ? "View" : "Edit"} ${currentRole?.label ?? "role"} permissions`}
          subtitle="Role permissions are centrally applied to every assigned user."
          onClose={() => setDialog(null)}
          wide
        >
          {roleBusy ? <p className="py-8 text-center text-sm">Loading permissions…</p> : null}
          {roleError ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{roleError}</p> : null}
          {roleData ? (
            <div className="space-y-5">
              <p className="text-sm text-[#73718A]">
                {roleData.userCount} assigned users · {roleData.label === "TL" ? "Team Lead permissions remain disabled until team-scoped access is defined." : "Changes take effect on subsequent authorization checks."}
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {Object.entries(roleModules).map(([module, permissions]) => (
                  <fieldset key={module} className="rounded-xl border border-[#EDEAF6] p-4">
                    <legend className="px-1 text-sm font-semibold">{module}</legend>
                    <div className="space-y-3">
                      {permissions.map((permission) => (
                        <label key={permission.key} className="flex items-start gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="mt-1 accent-purple-700"
                            checked={permission.locked || rolePermissions.includes(permission.key)}
                            disabled={!permission.selectable || !!dialog.viewOnly || roleSaving}
                            onChange={(event) => {
                              const checked = event.currentTarget.checked;
                              setRolePermissions((current) =>
                                checked
                                  ? [...current, permission.key]
                                  : current.filter((key) => key !== permission.key),
                              );
                            }}
                          />
                          <span>
                            <span className="block">{permission.label}</span>
                            {permission.lockReason ? <span className="text-xs text-[#73718A]">{permission.lockReason}</span> : null}
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}
              </div>
              <div className="flex justify-end gap-3 border-t border-[#edeaf6] pt-4">
                <button className={secondary} onClick={() => setDialog(null)}>Close</button>
                {canEditRole ? (
                  <button className={primary} disabled={roleSaving} onClick={() => void saveRolePermissions()}>
                    {roleSaving ? "Saving…" : "Save changes"}
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </Modal>
      ) : null}
    </div>
  );
}
