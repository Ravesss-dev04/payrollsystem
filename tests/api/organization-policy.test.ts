import { describe, expect, it, mock } from "bun:test";
import {
  organizationUnitMocks,
  domainAuditCreate,
  organizationFindUnique,
  organizationUpsert,
  policyCreate,
  resetOrganizationDatabase,
} from "../support/organization-test-database";

let authorizationFailure: (Error & { status: 401 | 403; code: string }) | null = null;
const requireApiPermission = mock(
  async (_request: Request, permission: string) => {
    if (permission !== "company:manage") {
      throw new Error("unexpected permission");
    }
    if (authorizationFailure) throw authorizationFailure;
    return { userId: "admin-1", role: "admin" };
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
  requireApiPermission.mockClear();
}

async function request(method: "GET" | "POST", body?: unknown) {
  const { GET, POST } = await import(
    "../../app/api/admin/settings/organization/route"
  );
  const request = new Request(
    "https://payroll.test/api/admin/settings/organization",
    {
      method,
      headers: {
        origin: "https://payroll.test",
        ...(method === "POST" ? { "content-type": "application/json" } : {}),
      },
      ...(method === "POST" ? { body: JSON.stringify(body) } : {}),
    },
  );
  return method === "GET" ? GET(request) : POST(request);
}

async function requestBranches(method: "GET" | "POST", body?: unknown) {
  const { GET, POST } = await import(
    "../../app/api/admin/settings/branches/route"
  );
  const request = new Request("https://payroll.test/api/admin/settings/branches", {
    method,
    headers: {
      origin: "https://payroll.test",
      ...(method === "POST" ? { "content-type": "application/json" } : {}),
    },
    ...(method === "POST" ? { body: JSON.stringify(body) } : {}),
  });
  return method === "GET" ? GET(request) : POST(request);
}

async function requestEmploymentStatuses(
  method: "GET" | "POST",
  body?: unknown,
) {
  const { GET, POST } = await import(
    "../../app/api/admin/settings/employment-statuses/route"
  );
  const request = new Request(
    "https://payroll.test/api/admin/settings/employment-statuses",
    {
      method,
      headers: {
        origin: "https://payroll.test",
        ...(method === "POST" ? { "content-type": "application/json" } : {}),
      },
      ...(method === "POST" ? { body: JSON.stringify(body) } : {}),
    },
  );
  return method === "GET" ? GET(request) : POST(request);
}

describe("Admin organization settings API", () => {
  it("requires company management permission before reading settings", async () => {
    reset();
    authorizationFailure = new TestApiAuthorizationError(403, "forbidden");

    const response = await request("GET");

    expect(response.status).toBe(403);
    expect(organizationFindUnique).not.toHaveBeenCalled();
  });

  it("returns persisted settings without caching", async () => {
    reset();

    const response = await request("GET");

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
    expect(await response.json()).toEqual({
      organization: {
        id: "primary",
        name: "Example Payroll",
        timeZone: "Asia/Manila",
      },
    });
    expect(requireApiPermission).toHaveBeenCalledWith(
      expect.any(Request),
      "company:manage",
    );
  });

  it("rejects mass-assigned fields and does not persist invalid settings", async () => {
    reset();

    const response = await request("POST", {
      name: "Example Payroll",
      timeZone: "Asia/Manila",
      organizationId: "attacker-controlled",
    });

    expect(response.status).toBe(400);
    expect(organizationUpsert).not.toHaveBeenCalled();
  });

  it("persists only validated Admin-owned settings", async () => {
    reset();

    const response = await request("POST", {
      name: "Example Payroll",
      timeZone: "Asia/Manila",
    });

    expect(response.status).toBe(200);
    expect(organizationUpsert).toHaveBeenCalledWith({
      where: { id: "primary" },
      create: {
        id: "primary",
        name: "Example Payroll",
        timeZone: "Asia/Manila",
      },
      update: {
        name: "Example Payroll",
        timeZone: "Asia/Manila",
      },
      select: {
        id: true,
        name: true,
        timeZone: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    expect(domainAuditCreate).toHaveBeenCalled();
  });

  it("creates organization units only from validated fields and never accepts tenant IDs", async () => {
    reset();
    const { branchCreate } = organizationUnitMocks();

    const rejected = await requestBranches("POST", {
      name: "North",
      organizationId: "attacker-controlled",
    });
    expect(rejected.status).toBe(400);
    expect(branchCreate).not.toHaveBeenCalled();

    const response = await requestBranches("POST", { name: "North" });
    expect(response.status).toBe(201);
    expect(branchCreate).toHaveBeenCalledWith({
      data: { organizationId: "primary", name: "North" },
      select: { id: true, name: true, active: true },
    });
  });

  it("requires explicit Admin authorization before listing organization units", async () => {
    reset();
    authorizationFailure = new TestApiAuthorizationError(403, "forbidden");
    const { branchFindMany } = organizationUnitMocks();

    const response = await requestBranches("GET");

    expect(response.status).toBe(403);
    expect(branchFindMany).not.toHaveBeenCalled();
  });

  it("rejects employment status policy input without explicit eligibility", async () => {
    reset();

    const response = await requestEmploymentStatuses("POST", {
      effectiveFrom: "2026-02-01",
      definitions: [{ code: "ACTIVE", label: "Active", active: true }],
    });

    expect(response.status).toBe(400);
    expect(policyCreate).not.toHaveBeenCalled();
  });

  it("reports concurrent policy-version conflicts without mislabeling them as duplicate names", async () => {
    reset();
    policyCreate.mockRejectedValueOnce({ code: "P2002" });

    const response = await requestEmploymentStatuses("POST", {
      effectiveFrom: "2026-02-01",
      definitions: [
        {
          code: "ACTIVE",
          label: "Active",
          active: true,
          headcountEligible: true,
        },
      ],
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "conflict" });
  });
});
