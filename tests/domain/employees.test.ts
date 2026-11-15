import { describe, expect, it } from "bun:test";
import type { SessionPrincipal } from "../../app/lib/auth/session-policy";
import {
  departments,
  domainAuditCreate,
  employeeAccount,
  employeeAssignmentCreate,
  employeeAssignments,
  employeeAssignmentUpdateMany,
  employeeCreate,
  employeeUpdate,
  employeeUpdateMany,
  employees,
  resetOrganizationDatabase,
  setEmployeeAccount,
  setEmployeeUpdateCounts,
  setLatestDefinitions,
} from "../support/organization-test-database";

const hr = { userId: "hr-1", role: "hr" } as SessionPrincipal;
const admin = { userId: "admin-1", role: "admin" } as SessionPrincipal;

const createInput = {
  employeeNumber: " emp-104 ",
  firstName: "  Ada  ",
  lastName: " Lovelace ",
  workEmail: " ADA@EXAMPLE.TEST ",
  statusCode: "ACTIVE",
  departmentId: "department-1",
  effectiveFrom: "2026-02-01",
};

function reset() {
  resetOrganizationDatabase();
  departments.push({
    id: "department-1",
    organizationId: "primary",
    name: "People",
    active: true,
  });
  setLatestDefinitions([
    { code: "ACTIVE", label: "Active", active: true, headcountEligible: true },
    { code: "INACTIVE", label: "Inactive", active: true, headcountEligible: false },
  ]);
}

async function loadSchemas() {
  const schemas = await import("../../app/lib/employees/schemas").catch(
    () => null,
  );
  expect(schemas).not.toBeNull();
  return schemas!;
}

async function loadService() {
  const service = await import("../../app/lib/employees/service").catch(
    () => null,
  );
  expect(service).not.toBeNull();
  return service!;
}

describe("employee input schemas", () => {
  it("normalizes employee identity without accepting account or authorization fields", async () => {
    const { createEmployeeSchema } = await loadSchemas();

    expect(createEmployeeSchema.parse(createInput)).toEqual({
      employeeNumber: "EMP-104",
      firstName: "Ada",
      lastName: "Lovelace",
      workEmail: "ada@example.test",
      statusCode: "ACTIVE",
      departmentId: "department-1",
      effectiveFrom: "2026-02-01",
    });
    expect(
      createEmployeeSchema.safeParse({
        ...createInput,
        userId: "admin-1",
        role: "admin",
        accountStatus: "Active",
      }).success,
    ).toBe(false);
  });

  it("requires a configured status, department, and effective date", async () => {
    const { createEmployeeSchema } = await loadSchemas();

    for (const field of ["statusCode", "departmentId", "effectiveFrom"]) {
      const invalid = { ...createInput };
      delete invalid[field as keyof typeof invalid];
      expect(createEmployeeSchema.safeParse(invalid).success).toBe(false);
    }
  });

  it("requires an effective date for employment or department changes", async () => {
    const { updateEmployeeSchema } = await loadSchemas();

    expect(
      updateEmployeeSchema.safeParse({ statusCode: "INACTIVE" }).success,
    ).toBe(false);
    expect(
      updateEmployeeSchema.safeParse({
        departmentId: "department-1",
        effectiveFrom: "2026-02-01",
      }).success,
    ).toBe(true);
    expect(
      updateEmployeeSchema.safeParse({
        firstName: "Ada",
        userId: "employee-1",
      }).success,
    ).toBe(false);
  });
});

describe("employee lifecycle services", () => {
  it("denies Admin writes before querying employee data", async () => {
    reset();
    const { createEmployee } = await loadService();

    await expect(createEmployee(admin, createInput)).rejects.toThrow("forbidden");
    expect(employeeCreate).not.toHaveBeenCalled();
    expect(domainAuditCreate).not.toHaveBeenCalled();
  });

  it("creates an HR-owned employee with a configured status, active department, and audit event", async () => {
    reset();
    const { createEmployee } = await loadService();

    const result = await createEmployee(hr, createInput);

    expect(result).toMatchObject({
      id: "employee-1",
      employeeNumber: "EMP-104",
      firstName: "Ada",
      lastName: "Lovelace",
      workEmail: "ada@example.test",
      employmentStatus: { code: "ACTIVE", label: "Active" },
      department: { id: "department-1", name: "People" },
    });
    expect(employeeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          employeeNumber: "EMP-104",
          firstName: "Ada",
          lastName: "Lovelace",
          workEmail: "ada@example.test",
        },
      }),
    );
    expect(employeeAssignmentCreate.mock.calls[0]?.[0]).toMatchObject({
      data: {
        employeeId: "employee-1",
        statusDefinitionId: "status-active",
        departmentId: "department-1",
        effectiveFrom: new Date("2026-02-01T00:00:00.000Z"),
        effectiveTo: null,
      },
    });
    expect(domainAuditCreate.mock.calls[0]?.[0]).toMatchObject({
      data: {
        actorUserId: "hr-1",
        actorRole: "hr",
        action: "employee.created",
        entityType: "employee",
        entityId: "employee-1",
      },
    });
  });

  it("rejects unconfigured statuses and departments without creating records", async () => {
    reset();
    const { createEmployee } = await loadService();

    await expect(
      createEmployee(hr, { ...createInput, statusCode: "UNKNOWN" }),
    ).rejects.toThrow("employment_status_not_configured");
    await expect(
      createEmployee(hr, { ...createInput, departmentId: "foreign-department" }),
    ).rejects.toThrow("department_not_found");

    expect(employeeCreate).not.toHaveBeenCalled();
    expect(employeeAssignmentCreate).not.toHaveBeenCalled();
  });

  it("updates only submitted profile fields without rewriting account or assignment data", async () => {
    reset();
    employees.push({
      id: "employee-1",
      employeeNumber: "EMP-104",
      firstName: "Ada",
      lastName: "Lovelace",
      workEmail: "ada@example.test",
      userId: "user-1",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    employeeAssignments.push({
      id: "assignment-1",
      employeeId: "employee-1",
      statusDefinitionId: "status-active",
      departmentId: "department-1",
      effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
      effectiveTo: null,
    });
    const { updateEmployee } = await loadService();

    await updateEmployee(hr, "employee-1", { firstName: "Augusta" });

    expect(employeeUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "employee-1" },
        data: { firstName: "Augusta" },
      }),
    );
    expect(employeeAssignmentCreate).not.toHaveBeenCalled();
    expect(employeeUpdateMany).not.toHaveBeenCalled();
    expect(employees[0]?.userId).toBe("user-1");
  });

  it("closes prior assignment and appends an effective-dated status change atomically", async () => {
    reset();
    employees.push({
      id: "employee-1",
      employeeNumber: "EMP-104",
      firstName: "Ada",
      lastName: "Lovelace",
      workEmail: "ada@example.test",
      userId: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    const priorStart = new Date("2026-01-01T00:00:00.000Z");
    employeeAssignments.push({
      id: "assignment-1",
      employeeId: "employee-1",
      statusDefinitionId: "status-active",
      departmentId: "department-1",
      effectiveFrom: priorStart,
      effectiveTo: null,
    });
    const { updateEmployee } = await loadService();

    await updateEmployee(hr, "employee-1", {
      statusCode: "INACTIVE",
      effectiveFrom: "2026-03-01",
    });

    expect(employeeAssignmentUpdateMany).toHaveBeenCalledWith({
      where: {
        id: "assignment-1",
        employeeId: "employee-1",
        effectiveTo: null,
      },
      data: { effectiveTo: new Date("2026-03-01T00:00:00.000Z") },
    });
    expect(employeeAssignmentCreate.mock.calls[0]?.[0]).toMatchObject({
      data: {
        employeeId: "employee-1",
        statusDefinitionId: "status-inactive",
        departmentId: "department-1",
        effectiveFrom: new Date("2026-03-01T00:00:00.000Z"),
      },
    });
    expect(domainAuditCreate).toHaveBeenCalled();
  });

  it("rejects backdated assignments and reports a stale concurrent update", async () => {
    reset();
    employees.push({
      id: "employee-1",
      employeeNumber: "EMP-104",
      firstName: "Ada",
      lastName: "Lovelace",
      workEmail: "ada@example.test",
      userId: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    employeeAssignments.push({
      id: "assignment-1",
      employeeId: "employee-1",
      statusDefinitionId: "status-active",
      departmentId: "department-1",
      effectiveFrom: new Date("2026-02-01T00:00:00.000Z"),
      effectiveTo: null,
    });
    setEmployeeUpdateCounts({ assignment: 0 });
    const { updateEmployee } = await loadService();

    await expect(
      updateEmployee(hr, "employee-1", {
        statusCode: "INACTIVE",
        effectiveFrom: "2026-01-15",
      }),
    ).rejects.toThrow("effective_date_must_increase");
    expect(employeeAssignmentCreate).not.toHaveBeenCalled();
    expect(domainAuditCreate).not.toHaveBeenCalled();

    await expect(
      updateEmployee(hr, "employee-1", {
        statusCode: "INACTIVE",
        effectiveFrom: "2026-03-01",
      }),
    ).rejects.toThrow("assignment_conflict");
    expect(domainAuditCreate).not.toHaveBeenCalled();
  });

  it("rejects multiple open assignments instead of extending overlapping history", async () => {
    reset();
    employees.push({
      id: "employee-1",
      employeeNumber: "EMP-104",
      firstName: "Ada",
      lastName: "Lovelace",
      workEmail: "ada@example.test",
      userId: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    employeeAssignments.push(
      {
        id: "assignment-1",
        employeeId: "employee-1",
        statusDefinitionId: "status-active",
        departmentId: "department-1",
        effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
        effectiveTo: null,
      },
      {
        id: "assignment-2",
        employeeId: "employee-1",
        statusDefinitionId: "status-inactive",
        departmentId: "department-1",
        effectiveFrom: new Date("2026-02-01T00:00:00.000Z"),
        effectiveTo: null,
      },
    );
    const { updateEmployee } = await loadService();

    await expect(
      updateEmployee(hr, "employee-1", {
        statusCode: "ACTIVE",
        effectiveFrom: "2026-03-01",
      }),
    ).rejects.toThrow("assignment_conflict");
    expect(employeeAssignmentUpdateMany).not.toHaveBeenCalled();
    expect(employeeAssignmentCreate).not.toHaveBeenCalled();
    expect(domainAuditCreate).not.toHaveBeenCalled();
  });

  it("allows only Admin to link an account with the same normalized work email", async () => {
    reset();
    employees.push({
      id: "employee-1",
      employeeNumber: "EMP-104",
      firstName: "Ada",
      lastName: "Lovelace",
      workEmail: "ada@example.test",
      userId: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    setEmployeeAccount({
      id: "user-1",
      email: " ADA@EXAMPLE.TEST ",
      isTestAccount: false,
      role: "employee",
      status: "Inactive",
    });
    const { linkEmployeeAccount } = await loadService();

    await linkEmployeeAccount(admin, "employee-1", "user-1");

    expect(employeeUpdateMany).toHaveBeenCalledWith({
      where: {
        id: "employee-1",
        userId: null,
        workEmail: "ada@example.test",
      },
      data: { userId: "user-1" },
    });
    expect(domainAuditCreate.mock.calls[0]?.[0]).toMatchObject({
      data: {
        actorUserId: "admin-1",
        action: "employee.account_linked",
        entityType: "employee",
        entityId: "employee-1",
      },
    });
    expect(employeeAccount).toMatchObject({
      id: "user-1",
      email: " ADA@EXAMPLE.TEST ",
      role: "employee",
      status: "Inactive",
    });
  });

  it("rejects a mismatched account email without linking or changing the account", async () => {
    reset();
    employees.push({
      id: "employee-1",
      employeeNumber: "EMP-104",
      firstName: "Ada",
      lastName: "Lovelace",
      workEmail: "ada@example.test",
      userId: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    setEmployeeAccount({
      id: "user-1",
      email: "other@example.test",
      isTestAccount: false,
      role: "employee",
      status: "Active",
    });
    const { linkEmployeeAccount } = await loadService();

    await expect(
      linkEmployeeAccount(admin, "employee-1", "user-1"),
    ).rejects.toThrow("linked_account_email_mismatch");
    expect(employeeUpdateMany).not.toHaveBeenCalled();
    expect(domainAuditCreate).not.toHaveBeenCalled();
  });

  it("denies HR account linking before looking up an account", async () => {
    reset();
    const { linkEmployeeAccount } = await loadService();

    await expect(
      linkEmployeeAccount(hr, "employee-1", "user-1"),
    ).rejects.toThrow("forbidden");
    expect(employeeAccount).toBeNull();
    expect(employeeUpdateMany).not.toHaveBeenCalled();
  });

  it("does not let HR change the email of an already linked account", async () => {
    reset();
    employees.push({
      id: "employee-1",
      employeeNumber: "EMP-104",
      firstName: "Ada",
      lastName: "Lovelace",
      workEmail: "ada@example.test",
      userId: "user-1",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    setEmployeeAccount({
      id: "user-1",
      email: "ada@example.test",
      isTestAccount: false,
      role: "employee",
      status: "Active",
    });
    const { updateEmployee } = await loadService();

    await expect(
      updateEmployee(hr, "employee-1", { workEmail: "ada.new@example.test" }),
    ).rejects.toThrow("linked_account_email_mismatch");
    expect(employeeUpdate).not.toHaveBeenCalled();
  });
});
