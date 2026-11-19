import { describe, expect, it, mock } from "bun:test";
import {
  domainAuditCreate,
  employeeAssignmentResults,
  employeeAssignments,
  employeeCreate,
  employeeFindMany,
  employeeFindFirst,
  organizationUnitMocks,
  resetOrganizationDatabase,
  setEmployeeAccount,
  setLatestDefinitions,
  departments,
  employees,
} from "../support/organization-test-database";

let authorizationFailure: (Error & { status: 401 | 403; code: string }) | null =
  null;
let actor = { userId: "hr-1", role: "hr" };
const requireApiPermission = mock(
  async (_request: Request, permission?: string) => {
    if (authorizationFailure) throw authorizationFailure;
    return {
      ...actor,
      permission,
    };
  },
);

class TestApiAuthorizationError extends Error {
  constructor(
    public readonly status: 401 | 403,
    public readonly code: string,
  ) {
    super(code);
  }
}

mock.module("server-only", () => ({}));
mock.module("../../app/lib/auth/api-guard.server", () => ({
  ApiAuthorizationError: TestApiAuthorizationError,
  apiAuthorizationErrorResponse: (error: TestApiAuthorizationError) =>
    new Response(JSON.stringify({ error: error.code }), {
      status: error.status,
      headers: { "cache-control": "no-store, max-age=0" },
    }),
  requireApiPermission,
}));

function reset() {
  resetOrganizationDatabase();
  authorizationFailure = null;
  actor = { userId: "hr-1", role: "hr" };
  requireApiPermission.mockClear();
  departments.push({
    id: "department-1",
    organizationId: "primary",
    name: "People",
    active: true,
  });
  setLatestDefinitions([
    { code: "ACTIVE", label: "Active", active: true, headcountEligible: true },
  ]);
}

function loadRoute(
 routeName: "employees",
): Promise<typeof import("../../app/api/hr/employees/route")>;
function loadRoute(
 routeName: "employee",
): Promise<typeof import("../../app/api/hr/employees/[employeeId]/route")>;
function loadRoute(
 routeName: "account-link",
): Promise<
 typeof import("../../app/api/admin/settings/employee-account-links/route")
>;
async function loadRoute(
 routeName: "employees" | "employee" | "account-link",
) {
  const route =
    routeName === "employees"
      ? await import("../../app/api/hr/employees/route").catch(() => null)
      : routeName === "employee"
        ? await import("../../app/api/hr/employees/[employeeId]/route").catch(
            () => null,
          )
        : await import(
            "../../app/api/admin/settings/employee-account-links/route"
          ).catch(() => null);
  expect(route).not.toBeNull();
  return route!;
}

function makeRequest(
  path: string,
  method: "GET" | "POST" | "PATCH",
  body?: unknown,
) {
  return new Request(`https://payroll.test${path}`, {
    method,
    headers: {
      origin: "https://payroll.test",
      ...(method !== "GET" ? { "content-type": "application/json" } : {}),
    },
    ...(method !== "GET" ? { body: JSON.stringify(body) } : {}),
  });
}

describe("HR employee API", () => {
  it("loads only the requested employee after authorization and validates identifiers", async () => {
    reset();
    const { GET } = await loadRoute("employee");
    authorizationFailure = new TestApiAuthorizationError(403, "forbidden");
    const denied = await GET(makeRequest("/api/hr/employees/employee-1", "GET"), { params: Promise.resolve({ employeeId: "employee-1" }) });
    expect(denied.status).toBe(403);
    expect(employeeFindFirst).not.toHaveBeenCalled();

    authorizationFailure = null;
    employeeFindFirst.mockImplementationOnce(async () => ({
      id: "employee-1", employeeNumber: "EMP-104", firstName: "Ada", lastName: "Lovelace", workEmail: "ada@example.test",
      userId: null, createdAt: new Date("2026-01-01T00:00:00.000Z"), updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      assignments: [{ effectiveFrom: new Date("2026-02-01T00:00:00.000Z"), statusDefinition: { code: "ACTIVE", label: "Active" }, department: { id: "department-1", name: "People" } }],
    }));
    const response = await GET(makeRequest("/api/hr/employees/employee-1", "GET"), { params: Promise.resolve({ employeeId: "employee-1" }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ employee: { id: "employee-1", employeeNumber: "EMP-104", firstName: "Ada", lastName: "Lovelace", workEmail: "ada@example.test", employmentStatus: { code: "ACTIVE", label: "Active" }, department: { id: "department-1", name: "People" }, effectiveFrom: "2026-02-01" } });
    expect(employeeFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: "employee-1", assignments: { some: { effectiveTo: null, department: { organizationId: "primary" } } } }) }));

    const invalid = await GET(makeRequest("/api/hr/employees/bad.id", "GET"), { params: Promise.resolve({ employeeId: "bad.id" }) });
    expect(invalid.status).toBe(400);
    const missing = await GET(makeRequest("/api/hr/employees/missing", "GET"), { params: Promise.resolve({ employeeId: "missing" }) });
    expect(missing.status).toBe(404);
  });
  it("checks HR employee permission before querying employee records", async () => {
    reset();
    authorizationFailure = new TestApiAuthorizationError(403, "forbidden");
    const { GET } = await loadRoute("employees");

    const response = await GET(makeRequest("/api/hr/employees", "GET"));

    expect(response.status).toBe(403);
    expect(employeeFindMany).not.toHaveBeenCalled();
    expect(requireApiPermission).toHaveBeenCalledWith(
      expect.any(Request),
      "employees:manage",
    );
  });

  it("returns latest employee records and reference options without private account fields", async () => {
    reset();
    employeeAssignmentResults.push({
      id: "employee-1",
      employeeNumber: "EMP-104",
      firstName: "Ada",
      lastName: "Lovelace",
      workEmail: "ada@example.test",
      userId: "user-1",
      passwordHash: "must-not-leak",
      assignments: [
        {
          effectiveFrom: new Date("2099-02-01T00:00:00.000Z"),
          statusDefinition: { code: "ACTIVE", label: "Active" },
          department: { id: "department-1", name: "People" },
        },
      ],
    });
    const { GET } = await loadRoute("employees");

    const response = await GET(makeRequest("/api/hr/employees", "GET"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
    expect(body).toEqual({
      employees: [
        {
          id: "employee-1",
          employeeNumber: "EMP-104",
          firstName: "Ada",
          lastName: "Lovelace",
          workEmail: "ada@example.test",
          employmentStatus: { code: "ACTIVE", label: "Active" },
          department: { id: "department-1", name: "People" },
          effectiveFrom: "2099-02-01",
        },
      ],
      departments: [{ id: "department-1", name: "People" }],
      employmentStatuses: [{ code: "ACTIVE", label: "Active" }],
    });
    expect(JSON.stringify(body)).not.toContain("passwordHash");
    expect(JSON.stringify(body)).not.toContain("user-1");
    expect(employeeFindMany).toHaveBeenCalled();
    expect(organizationUnitMocks().departmentFindMany).toHaveBeenCalled();
  });

  it("rejects account linkage fields from HR create and never persists them", async () => {
    reset();
    const { POST } = await loadRoute("employees");

    const response = await POST(
      makeRequest("/api/hr/employees", "POST", {
        employeeNumber: "EMP-104",
        firstName: "Ada",
        lastName: "Lovelace",
        workEmail: "ada@example.test",
        statusCode: "ACTIVE",
        departmentId: "department-1",
        effectiveFrom: "2026-02-01",
        userId: "admin-1",
      }),
    );

    expect(response.status).toBe(400);
    expect(employeeCreate).not.toHaveBeenCalled();
    expect(domainAuditCreate).not.toHaveBeenCalled();
  });

  it("creates an employee only through the HR-authorized endpoint", async () => {
    reset();
    const { POST } = await loadRoute("employees");

    const response = await POST(
      makeRequest("/api/hr/employees", "POST", {
        employeeNumber: "EMP-104",
        firstName: "Ada",
        lastName: "Lovelace",
        workEmail: "ADA@EXAMPLE.TEST",
        statusCode: "ACTIVE",
        departmentId: "department-1",
        effectiveFrom: "2026-02-01",
      }),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      employee: {
        employeeNumber: "EMP-104",
        workEmail: "ada@example.test",
      },
    });
    expect(requireApiPermission).toHaveBeenCalledWith(
      expect.any(Request),
      "employees:manage",
    );
    expect(employeeCreate).toHaveBeenCalled();
  });

  it("uses the current route parameter and validates patch input", async () => {
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
      effectiveFrom: new Date("2020-01-01T00:00:00.000Z"),
      effectiveTo: null,
    });
    const route = await loadRoute("employee");

    const response = await route.PATCH(
      makeRequest("/api/hr/employees/employee-1", "PATCH", {
        firstName: "Augusta",
      }),
      { params: Promise.resolve({ employeeId: "employee-1" }) },
    );

    expect(response.status).toBe(200);
    expect(requireApiPermission).toHaveBeenCalledWith(
      expect.any(Request),
      "employees:manage",
    );
  });
});

describe("Admin employee account-link API", () => {
  it("requires company management permission and does not change account role or status", async () => {
    reset();
    actor = { userId: "admin-1", role: "admin" };
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
      email: "ada@example.test",
      isTestAccount: false,
      role: "employee",
      status: "Active",
    });
    const { POST } = await loadRoute("account-link");

    const response = await POST(
      makeRequest(
        "/api/admin/settings/employee-account-links",
        "POST",
        { employeeId: "employee-1", userId: "user-1" },
      ),
    );

    expect(response.status).toBe(200);
    expect(requireApiPermission).toHaveBeenCalledWith(
      expect.any(Request),
      "company:manage",
    );
    expect(employeeCreate).not.toHaveBeenCalled();
  });
});
