"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import {
  branchInputSchema,
  branchUpdateSchema,
  departmentInputSchema,
  departmentUpdateSchema,
} from "../../lib/organization/policy";
import {
  branchResponseSchema,
  departmentResponseSchema,
  requestSettingsApi,
  type SettingsTeam,
  type SettingsUnit,
} from "./settings-api";

type Props = {
  initialBranches: SettingsUnit[];
  initialDepartments: SettingsUnit[];
  /** Kept for compatibility with existing tests/callers; Team UI is intentionally removed. */
  initialTeams?: SettingsTeam[];
  organizationConfigured?: boolean;
};

function SettingsMessage({
  error,
  message,
}: {
  error: string;
  message: string;
}) {
  return (
    <>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
          {message}
        </p>
      )}
    </>
  );
}

function UnitList<T extends SettingsUnit>({
  singular,
  title,
  items,
  busy,
  onNameChange,
  onSave,
  onToggle,
  context,
  renderExtra,
}: {
  singular: string;
  title: string;
  items: T[];
  busy: boolean;
  onNameChange: (id: string, name: string) => void;
  onSave: (id: string, name: string) => Promise<void>;
  onToggle: (item: T) => Promise<void>;
  context?: (item: T) => string;
  renderExtra?: (item: T) => ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="font-semibold">{title}</h3>
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[#D8D4E5] px-4 py-3 text-sm text-[#73718A]">
          No {title.toLowerCase()} have been added.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-3 rounded-lg border border-[#EDEAF6] p-3 sm:flex-row sm:items-end"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <label
                  htmlFor={`${title}-${item.id}`}
                  className="text-xs font-medium text-[#73718A]"
                >
                  {singular} name
                </label>
                <input
                  id={`${title}-${item.id}`}
                  aria-label={`${singular} name for ${item.name}`}
                  maxLength={120}
                  defaultValue={item.name}
                  onChange={(event) =>
                    onNameChange(item.id, event.target.value)
                  }
                  className="w-full rounded-lg border border-[#D8D4E5] px-3 py-2 text-sm outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20"
                />
                {context && (
                  <p className="text-xs text-[#73718A]">{context(item)}</p>
                )}
                {renderExtra?.(item)}
              </div>
              <span
                className={`text-xs font-medium ${item.active ? "text-green-700" : "text-[#73718A]"}`}
              >
                {item.active ? "Active" : "Inactive"}
              </span>
              <button
                type="button"
                disabled={busy || !item.name.trim()}
                onClick={() => void onSave(item.id, item.name)}
                className="rounded-lg border border-[#D8D4E5] px-3 py-2 text-sm font-medium hover:bg-purple-50 disabled:opacity-50"
              >
                Save
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void onToggle(item)}
                className="rounded-lg border border-[#D8D4E5] px-3 py-2 text-sm font-medium hover:bg-purple-50 disabled:opacity-50"
              >
                {item.active ? "Deactivate" : "Reactivate"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function OrganizationStructureForm({
  initialBranches,
  initialDepartments,
  organizationConfigured = true,
}: Props) {
  const [branches, setBranches] = useState(initialBranches);
  const [departments, setDepartments] = useState(initialDepartments);
  const [branchName, setBranchName] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [branchLocation, setBranchLocation] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [departmentBranchId, setDepartmentBranchId] = useState("");
  const [departmentBranchIds, setDepartmentBranchIds] = useState<Record<string, string>>(
    Object.fromEntries(initialDepartments.map((department) => [department.id, department.branchId ?? ""])),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function startRequest() {
    setBusy(true);
    setError("");
    setMessage("");
  }

  function failRequest(caught: unknown) {
    setError(
      caught instanceof Error
        ? caught.message
        : "Organization structure could not be updated.",
    );
  }

  async function createBranch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startRequest();
    try {
      const input = branchInputSchema.parse({ name: branchName, code: branchCode || null, location: branchLocation || null });
      const result = branchResponseSchema.parse(
        await requestSettingsApi("/api/admin/settings/branches", {
          method: "POST",
          body: input,
        }),
      );
      setBranches((current) => [...current, result.branch]);
      setBranchName("");
      setBranchCode("");
      setBranchLocation("");
      setMessage("Branch added.");
    } catch (caught) {
      failRequest(caught);
    } finally {
      setBusy(false);
    }
  }

  async function createDepartment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startRequest();
    try {
      const input = departmentInputSchema.parse({ name: departmentName, branchId: departmentBranchId });
      const result = departmentResponseSchema.parse(
        await requestSettingsApi("/api/admin/settings/departments", {
          method: "POST",
          body: input,
        }),
      );
      setDepartments((current) => [...current, result.department]);
      setDepartmentName("");
      setDepartmentBranchId("");
      setMessage("Department added.");
    } catch (caught) {
      failRequest(caught);
    } finally {
      setBusy(false);
    }
  }

  async function saveBranch(id: string, name: string) {
    startRequest();
    try {
      const input = branchUpdateSchema.parse({ name });
      const result = branchResponseSchema.parse(
        await requestSettingsApi(
          `/api/admin/settings/branches/${encodeURIComponent(id)}`,
          { method: "PATCH", body: input },
        ),
      );
      setBranches((current) =>
        current.map((item) =>
          item.id === id ? result.branch : item,
        ),
      );
      setMessage("Branch updated.");
    } catch (caught) {
      failRequest(caught);
    } finally {
      setBusy(false);
    }
  }

  async function saveDepartment(id: string, name: string) {
    startRequest();
    try {
      const input = departmentUpdateSchema.parse({ name, branchId: departmentBranchIds[id] || undefined });
      const result = departmentResponseSchema.parse(
        await requestSettingsApi(
          `/api/admin/settings/departments/${encodeURIComponent(id)}`,
          { method: "PATCH", body: input },
        ),
      );
      setDepartments((current) =>
        current.map((item) =>
          item.id === id ? result.department : item,
        ),
      );
      setMessage("Department updated.");
    } catch (caught) {
      failRequest(caught);
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(
    collection: "branches" | "departments",
    item: SettingsUnit,
  ) {
    startRequest();
    try {
      const path = `/api/admin/settings/${collection}/${encodeURIComponent(item.id)}`;
      const response = await requestSettingsApi(path, {
        method: item.active ? "DELETE" : "PATCH",
        ...(item.active ? {} : { body: { active: true } }),
      });
      if (collection === "branches") {
        const result = branchResponseSchema.parse(response);
        setBranches((current) =>
          current.map((row) => row.id === item.id ? result.branch : row),
        );
      } else if (collection === "departments") {
        const result = departmentResponseSchema.parse(response);
        setDepartments((current) =>
          current.map((row) => row.id === item.id ? result.department : row),
        );
      }
      setMessage(item.active ? "Item deactivated." : "Item reactivated.");
    } catch (caught) {
      failRequest(caught);
    } finally {
      setBusy(false);
    }
  }

  function changeBranchName(id: string, name: string) {
    setBranches((current) =>
      current.map((item) => (item.id === id ? { ...item, name } : item)),
    );
  }

  function changeDepartmentName(id: string, name: string) {
    setDepartments((current) =>
      current.map((item) => (item.id === id ? { ...item, name } : item)),
    );
  }

  return (
    <div className="space-y-6">
      {!organizationConfigured && (
        <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Save organization settings before adding branches or departments.
        </p>
      )}
      <SettingsMessage error={error} message={message} />
      <section className="space-y-5 rounded-xl border border-[#EDEAF6] bg-white p-5 shadow-sm sm:p-6">
        <div>
          <h2 className="text-lg font-semibold">Branches and sites</h2>
          <p className="mt-1 text-sm text-[#73718A]">
            Add and maintain organization locations. Deactivation preserves records.
          </p>
        </div>
        <form onSubmit={(event) => void createBranch(event)} className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor="new-branch" className="sr-only">Branch name</label>
          <input
            id="new-branch"
            aria-label="Branch name"
            required
            maxLength={120}
            value={branchName}
            onChange={(event) => setBranchName(event.target.value)}
            placeholder="Branch or site name"
            disabled={!organizationConfigured || busy}
            className="min-w-0 flex-1 rounded-lg border border-[#D8D4E5] px-3 py-2 text-sm focus:border-[#7C3AED] focus:outline-none"
          />
          <input aria-label="Branch code" maxLength={40} value={branchCode} onChange={(event) => setBranchCode(event.target.value.toUpperCase())} placeholder="Code (optional)" disabled={!organizationConfigured || busy} className="min-w-0 flex-1 rounded-lg border border-[#D8D4E5] px-3 py-2 text-sm" />
          <input aria-label="Branch location" maxLength={500} value={branchLocation} onChange={(event) => setBranchLocation(event.target.value)} placeholder="Location" disabled={!organizationConfigured || busy} className="min-w-0 flex-1 rounded-lg border border-[#D8D4E5] px-3 py-2 text-sm" />
          <button type="submit" disabled={!organizationConfigured || busy} className="rounded-lg bg-[#7C3AED] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            Add branch
          </button>
        </form>
        <UnitList
          singular="Branch"
          title="Branches"
          items={branches}
          busy={busy}
          onNameChange={changeBranchName}
          onSave={saveBranch}
          onToggle={(item) => toggleActive("branches", item)}
        />
      </section>

      <section className="space-y-5 rounded-xl border border-[#EDEAF6] bg-white p-5 shadow-sm sm:p-6">
        <div>
          <h2 className="text-lg font-semibold">Departments</h2>
          <p className="mt-1 text-sm text-[#73718A]">
            Departments belong to the configured organization.
          </p>
        </div>
        <form onSubmit={(event) => void createDepartment(event)} className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor="new-department" className="sr-only">Department name</label>
          <input
            id="new-department"
            aria-label="Department name"
            required
            maxLength={120}
            value={departmentName}
            onChange={(event) => setDepartmentName(event.target.value)}
            placeholder="Department name"
            disabled={!organizationConfigured || busy}
            className="min-w-0 flex-1 rounded-lg border border-[#D8D4E5] px-3 py-2 text-sm focus:border-[#7C3AED] focus:outline-none"
          />
          <select aria-label="Department branch" required value={departmentBranchId} onChange={(event) => setDepartmentBranchId(event.target.value)} disabled={!organizationConfigured || busy || !branches.some((branch) => branch.active)} className="min-w-0 flex-1 rounded-lg border border-[#D8D4E5] px-3 py-2 text-sm">
            <option value="">Select branch</option>
            {branches.filter((branch) => branch.active).map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
          <button type="submit" disabled={!organizationConfigured || busy} className="rounded-lg bg-[#7C3AED] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            Add department
          </button>
        </form>
        <UnitList
          singular="Department"
          title="Departments"
          items={departments}
          busy={busy}
          onNameChange={changeDepartmentName}
          onSave={saveDepartment}
          onToggle={(item) => toggleActive("departments", item)}
          context={(item) => item.branch?.name ? `Branch: ${item.branch.name}` : "Branch not assigned"}
          renderExtra={(item) => (
            <select aria-label={`Branch for ${item.name}`} value={departmentBranchIds[item.id] ?? item.branchId ?? ""} onChange={(event) => setDepartmentBranchIds((current) => ({ ...current, [item.id]: event.target.value }))} className="mt-2 w-full rounded-lg border border-[#D8D4E5] px-3 py-2 text-sm">
              <option value="">Select branch</option>
              {branches.filter((branch) => branch.active).map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          )}
        />
      </section>
    </div>
  );
}
