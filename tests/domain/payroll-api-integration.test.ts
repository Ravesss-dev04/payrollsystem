/**
 * Integration tests for new payroll API routes (Tasks 11-20 extensions).
 *
 * Tests:
 *  - POST /api/hr/payroll/calculate  — W1 schema validation
 *  - GET/PATCH /api/admin/payroll/[batchId]/disbursement  — W4
 *  - GET /api/admin/payroll/config/audit  — W5 scoped filtering
 *  - GET /api/admin/payroll/history  — W6
 *  - GET /api/admin/payroll/[batchId]/timeline  — W8 authorization
 *  - GET /api/hr/payroll/config  — W9 pagination validation
 */

import { describe, expect, it, mock, beforeEach } from "bun:test";

// ─── Shared test infrastructure ──────────────────────────────────────────────

class TestApiAuthorizationError extends Error {
  constructor(
    public readonly status: 401 | 403,
    public readonly code: string,
  ) {
    super(code);
  }
}

let authorizationFailure: TestApiAuthorizationError | null = null;
let actor: { userId: string; role: string; name?: string; isTestAccount?: boolean } = {
  userId: "hr-1",
  role: "hr",
  name: "HR User",
};

const requireApiPermission = mock(async (_request: Request, _permission?: string) => {
  if (authorizationFailure) throw authorizationFailure;
  return { ...actor };
});

// ─── Module mocks (must be hoisted before any imports of the modules they affect)
mock.module("server-only", () => ({}));

mock.module("../../app/lib/auth/api-guard.server", () => ({
  ApiAuthorizationError: TestApiAuthorizationError,
  apiAuthorizationErrorResponse: (error: TestApiAuthorizationError) =>
    new Response(JSON.stringify({ error: error.code }), {
      status: error.status,
      headers: { "content-type": "application/json" },
    }),
  requireApiPermission,
}));

// Prisma mock — returns controlled data
const prismaMock = {
  domainAuditEvent: {
    count: mock(async () => 0),
    findMany: mock(async () => []),
  },
  payrollBatch: {
    findUnique: mock(async () => null),
  },
  payrollBatchVersion: {
    findFirst: mock(async () => null),
  },
  payrollDisbursementRecord: {
    findUnique: mock(async () => null),
    update: mock(async () => ({ id: "disb-1", status: "Paid" })),
  },
  payrollBatchTimelineEvent: {
    findMany: mock(async () => [
      { id: "evt-1", eventType: "BatchCreated", description: "created", createdAt: new Date() },
    ]),
  },
};

mock.module("../../app/lib/db", () => ({ prisma: prismaMock }));

// Config service mock
mock.module("../../app/lib/payroll/config-service.server", () => ({
  getActiveConfiguration: mock(async () => ({
    version: 1,
    category: "GeneralSettings",
    status: "Active",
    configuration: {
      schemaVersion: 2,
      settings: {
        frequency: "Monthly",
        monthlyToDailyDivisor: "261",
        dailyToHourlyDivisor: "8",
        workingDaysPerWeek: 5,
        standardHoursPerDay: 8,
        restDays: ["Saturday", "Sunday"],
        timeZone: "Asia/Manila",
        cutoffFirstHalf: "1st to 15th",
        payDateFirstHalf: "20th",
        cutoffSecondHalf: "16th to end of month",
        payDateSecondHalf: "5th of following month",
        prorationMethod: "WorkingDays",
        roundingPolicy: "HalfUp",
        roundingDecimals: 2,
      },
      earnings: [],
      deductions: [],
      benefits: [],
      applicability: { scope: "All", departmentIds: [], employmentTypes: [], positionIds: [], employeeIds: [] },
    },
    effectiveFrom: "2026-01-01",
  })),
  listConfigurationVersions: mock(async () => ({
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
  })),
  createConfigurationDraft: mock(async () => ({ id: "cfg-1", version: 1 })),
  PayrollConfigServiceError: class PayrollConfigServiceError extends Error {
    constructor(public code: string, public status: number, msg?: string) { super(msg ?? code); }
  },
}));

// Payroll service mock
mock.module("../../app/lib/payroll-results/service", () => ({
  PayrollServiceError: class PayrollServiceError extends Error {
    constructor(public code: string, public status: number) { super(code); }
  },
  listPayrollBatches: mock(async () => ({
    organization: { name: "Test Co", timeZone: "Asia/Manila" },
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
  })),
  decidePayrollBatch: mock(async (actor: { role: string }) => {
    if (actor.role !== "admin") {
      throw new (class PayrollServiceError extends Error {
        constructor() { super("forbidden"); }
        status = 403;
      })();
    }
    return {
      batchId: "batch-1",
      version: 1,
      decision: "Approved",
      status: "Approved",
    };
  }),
}));

// Disbursement service mock
mock.module("../../app/lib/payroll-results/disbursement-service.server", () => ({
  getDisbursementRecord: mock(async () => null),
  updateDisbursementRecord: mock(async () => ({ id: "disb-1", status: "Paid" })),
  updateDisbursementInputSchema: { parse: (x: unknown) => x },
}));

// Rules service mock
mock.module("../../app/lib/payroll/rules-service.server", () => ({
  getLatestPayrollRuleSet: mock(async () => ({
    version: 1,
    effectiveFrom: "2026-01-01",
    configuration: {
      schemaVersion: 1,
      currencyCode: "PHP",
    },
  })),
  PayrollRuleSetServiceError: class PayrollRuleSetServiceError extends Error {
    constructor(public code: string, public status: number) { super(code); }
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function reset() {
  authorizationFailure = null;
  actor = { userId: "hr-1", role: "hr", name: "HR User" };
  requireApiPermission.mockClear();
}

function makeRequest(
  path: string,
  method: "GET" | "POST" | "PATCH",
  body?: unknown,
  headers?: Record<string, string>,
) {
  return new Request(`https://payroll.test${path}`, {
    method,
    headers: {
      origin: "https://payroll.test",
      "content-type": "application/json",
      ...headers,
    },
    ...(method !== "GET" && body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("POST /api/hr/payroll/calculate — input validation (W1)", () => {
  beforeEach(reset);

  it("rejects unauthenticated requests with 401", async () => {
    authorizationFailure = new TestApiAuthorizationError(401, "authentication_required");
    const { POST } = await import("../../app/api/hr/payroll/calculate/route");
    const res = await POST(makeRequest("/api/hr/payroll/calculate", "POST", { employees: [] }));
    expect(res.status).toBe(401);
  });

  it("rejects empty employees array with 400", async () => {
    actor = { userId: "hr-1", role: "hr", name: "HR User" };
    const { POST } = await import("../../app/api/hr/payroll/calculate/route");
    const res = await POST(makeRequest("/api/hr/payroll/calculate", "POST", { employees: [] }));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("invalid_request");
  });

  it("rejects employees with invalid monetary string", async () => {
    actor = { userId: "hr-1", role: "hr", name: "HR User" };
    const { POST } = await import("../../app/api/hr/payroll/calculate/route");
    const res = await POST(
      makeRequest("/api/hr/payroll/calculate", "POST", {
        employees: [
          {
            employeeId: "emp-1",
            employeeNumber: "EMP001",
            employeeName: "Juan dela Cruz",
            department: "Engineering",
            compensationBasis: "Monthly",
            applicableRate: "NOT_A_NUMBER", // invalid
          },
        ],
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("invalid_request");
  });

  it("rejects query string parameters (unexpected search params)", async () => {
    actor = { userId: "hr-1", role: "hr", name: "HR User" };
    const { POST } = await import("../../app/api/hr/payroll/calculate/route");
    const res = await POST(
      makeRequest("/api/hr/payroll/calculate?inject=true", "POST", { employees: [] }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects more than 500 employees", async () => {
    actor = { userId: "hr-1", role: "hr", name: "HR User" };
    const { POST } = await import("../../app/api/hr/payroll/calculate/route");
    const employees = Array.from({ length: 501 }, (_, i) => ({
      employeeId: `emp-${i}`,
      employeeNumber: `EMP${String(i).padStart(4, "0")}`,
      employeeName: `Employee ${i}`,
      department: "Engineering",
      compensationBasis: "Monthly",
      applicableRate: "30000.00",
    }));
    const res = await POST(makeRequest("/api/hr/payroll/calculate", "POST", { employees }));
    expect(res.status).toBe(400);
  });

  it("accepts a valid employee and returns results", async () => {
    actor = { userId: "hr-1", role: "hr", name: "HR User" };
    const { POST } = await import("../../app/api/hr/payroll/calculate/route");
    const res = await POST(
      makeRequest("/api/hr/payroll/calculate", "POST", {
        employees: [
          {
            employeeId: "emp-1",
            employeeNumber: "EMP001",
            employeeName: "Juan dela Cruz",
            department: "Engineering",
            compensationBasis: "Monthly",
            applicableRate: "30000.00",
            daysWorked: "22.00",
          },
        ],
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { configurationVersion: number; results: unknown[] };
    expect(body.results).toHaveLength(1);
    expect(body.configurationVersion).toBeDefined();
  });
});

describe("GET /api/hr/payroll/config — pagination validation (W9)", () => {
  beforeEach(reset);

  it("rejects unknown query parameters", async () => {
    actor = { userId: "hr-1", role: "hr", name: "HR User" };
    const { GET } = await import("../../app/api/hr/payroll/config/route");
    const res = await GET(makeRequest("/api/hr/payroll/config?unknown=1", "GET"));
    expect(res.status).toBe(400);
  });

  it("rejects out-of-range pageSize", async () => {
    actor = { userId: "hr-1", role: "hr", name: "HR User" };
    const { GET } = await import("../../app/api/hr/payroll/config/route");
    const res = await GET(makeRequest("/api/hr/payroll/config?pageSize=99999", "GET"));
    expect(res.status).toBe(400);
  });

  it("returns active config and history for valid request", async () => {
    actor = { userId: "hr-1", role: "hr", name: "HR User" };
    const { GET } = await import("../../app/api/hr/payroll/config/route");
    const res = await GET(makeRequest("/api/hr/payroll/config?category=GeneralSettings&page=1", "GET"));
    expect(res.status).toBe(200);
    const body = await res.json() as { active: unknown; history: unknown };
    expect(body.active).toBeDefined();
    expect(body.history).toBeDefined();
  });
});

describe("GET /api/admin/payroll/config/audit — scoped filtering (W5)", () => {
  beforeEach(() => {
    reset();
    actor = { userId: "admin-1", role: "admin", name: "Admin User" };
  });

  it("requires payroll:approve permission (enforced by requireApiPermission mock)", async () => {
    authorizationFailure = new TestApiAuthorizationError(403, "forbidden");
    const { GET } = await import("../../app/api/admin/payroll/config/audit/route");
    const res = await GET(makeRequest("/api/admin/payroll/config/audit", "GET"));
    expect(res.status).toBe(403);
  });

  it("rejects unknown query parameters", async () => {
    const { GET } = await import("../../app/api/admin/payroll/config/audit/route");
    const res = await GET(makeRequest("/api/admin/payroll/config/audit?hack=1", "GET"));
    expect(res.status).toBe(400);
  });

  it("rejects out-of-range pageSize", async () => {
    const { GET } = await import("../../app/api/admin/payroll/config/audit/route");
    const res = await GET(makeRequest("/api/admin/payroll/config/audit?pageSize=500", "GET"));
    expect(res.status).toBe(400);
  });

  it("returns paged audit events (unfiltered)", async () => {
    prismaMock.domainAuditEvent.count.mockResolvedValue(0 as never);
    prismaMock.domainAuditEvent.findMany.mockResolvedValue([] as never);

    const { GET } = await import("../../app/api/admin/payroll/config/audit/route");
    const res = await GET(makeRequest("/api/admin/payroll/config/audit", "GET"));
    expect(res.status).toBe(200);
    const body = await res.json() as { items: unknown[]; total: number };
    expect(Array.isArray(body.items)).toBe(true);
    expect(typeof body.total).toBe("number");
  });

  it("filters by configVersionId when provided", async () => {
    prismaMock.domainAuditEvent.count.mockResolvedValue(0 as never);
    prismaMock.domainAuditEvent.findMany.mockResolvedValue([] as never);

    const { GET } = await import("../../app/api/admin/payroll/config/audit/route");
    const res = await GET(
      makeRequest("/api/admin/payroll/config/audit?configVersionId=cfg-1", "GET"),
    );
    expect(res.status).toBe(200);
    expect(prismaMock.domainAuditEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ entityId: "cfg-1" }),
      }),
    );
  });

  it("Task 15: accepts category, userId, action, and date range filters", async () => {
    prismaMock.domainAuditEvent.count.mockResolvedValue(1 as never);
    prismaMock.domainAuditEvent.findMany.mockResolvedValue([
      {
        id: "evt-1",
        action: "payroll.config.approved",
        entityType: "payroll_config_version",
        entityId: "cfg-1",
        createdAt: new Date("2026-11-18T10:00:00.000Z"),
        actorUserId: "admin-1",
        actorRole: "admin",
        summary: "v2 approved",
        details: {
          category: "GeneralSettings",
          version: 2,
          status: "Active",
          effectiveFrom: "2026-12-01",
          applicability: { departmentIds: ["dept-it"] },
        },
        actor: { id: "admin-1", name: "Admin User", email: "admin@company.ph" },
      },
    ] as never);

    const { GET } = await import("../../app/api/admin/payroll/config/audit/route");
    const res = await GET(
      makeRequest(
        "/api/admin/payroll/config/audit?category=GeneralSettings&action=payroll.config.approved&userId=admin-1&dateFrom=2026-11-01&dateTo=2026-11-30&departmentId=dept-it",
        "GET",
      ),
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { items: unknown[]; total: number };
    expect(body.items.length).toBe(1);
    expect(prismaMock.domainAuditEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          action: "payroll.config.approved",
          actorUserId: "admin-1",
          createdAt: {
            gte: new Date("2026-11-01T00:00:00.000Z"),
            lte: new Date("2026-11-30T23:59:59.999Z"),
          },
        }),
      }),
    );
  });
});

describe("GET /api/admin/payroll/history — history list (W6)", () => {
  beforeEach(() => {
    reset();
    actor = { userId: "admin-1", role: "admin", name: "Admin User" };
  });

  it("forbids non-admin roles", async () => {
    actor = { userId: "hr-1", role: "hr", name: "HR User" };
    const { GET } = await import("../../app/api/admin/payroll/history/route");
    const res = await GET(makeRequest("/api/admin/payroll/history", "GET"));
    expect(res.status).toBe(403);
  });

  it("rejects unknown query parameters", async () => {
    const { GET } = await import("../../app/api/admin/payroll/history/route");
    const res = await GET(makeRequest("/api/admin/payroll/history?hack=1", "GET"));
    expect(res.status).toBe(400);
  });

  it("rejects invalid status values", async () => {
    const { GET } = await import("../../app/api/admin/payroll/history/route");
    const res = await GET(makeRequest("/api/admin/payroll/history?status=Draft", "GET"));
    expect(res.status).toBe(400);
  });

  it("returns all-status history by default", async () => {
    const { GET } = await import("../../app/api/admin/payroll/history/route");
    const res = await GET(makeRequest("/api/admin/payroll/history", "GET"));
    expect(res.status).toBe(200);
    const body = await res.json() as { items: unknown[]; total: number };
    expect(Array.isArray(body.items)).toBe(true);
  });

  it("returns approved history with period filters", async () => {
    const { GET } = await import("../../app/api/admin/payroll/history/route");
    const res = await GET(
      makeRequest(
        "/api/admin/payroll/history?status=Approved&periodFrom=2026-01-01&periodTo=2026-12-31",
        "GET",
      ),
    );
    expect(res.status).toBe(200);
  });
});

describe("GET /api/admin/payroll/[batchId]/timeline — authorization (W8)", () => {
  beforeEach(() => {
    reset();
    actor = { userId: "admin-1", role: "admin", name: "Admin User" };
  });

  it("requires payroll:read permission", async () => {
    authorizationFailure = new TestApiAuthorizationError(401, "authentication_required");
    const { GET } = await import("../../app/api/admin/payroll/[batchId]/timeline/route");
    const res = await GET(makeRequest("/api/admin/payroll/batch-1/timeline", "GET"), {
      params: Promise.resolve({ batchId: "batch-1" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns empty array for non-existent batch (safe, no info leak)", async () => {
    prismaMock.payrollBatch.findUnique.mockResolvedValue(null as never);
    const { GET } = await import("../../app/api/admin/payroll/[batchId]/timeline/route");
    const res = await GET(makeRequest("/api/admin/payroll/nonexistent/timeline", "GET"), {
      params: Promise.resolve({ batchId: "nonexistent" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { timeline: unknown[] };
    expect(body.timeline).toHaveLength(0);
  });
});

describe("PATCH /api/admin/payroll/[batchId]/disbursement — disbursement update (W4)", () => {
  beforeEach(() => {
    reset();
    actor = { userId: "admin-1", role: "admin", name: "Admin User" };
  });

  it("requires admin role", async () => {
    actor = { userId: "hr-1", role: "hr", name: "HR User" };
    const { PATCH } = await import("../../app/api/admin/payroll/[batchId]/disbursement/route");
    const res = await PATCH(
      makeRequest("/api/admin/payroll/batch-1/disbursement", "PATCH", {
        status: "Paid",
        paymentMethod: "BankTransfer",
      }),
      { params: Promise.resolve({ batchId: "batch-1" }) },
    );
    expect(res.status).toBe(403);
  });

  it("returns 404 when no approved version exists for batch", async () => {
    prismaMock.payrollBatchVersion.findFirst.mockResolvedValue(null as never);
    const { PATCH } = await import("../../app/api/admin/payroll/[batchId]/disbursement/route");
    const res = await PATCH(
      makeRequest("/api/admin/payroll/batch-1/disbursement", "PATCH", {
        status: "Paid",
        paymentMethod: "BankTransfer",
      }),
      { params: Promise.resolve({ batchId: "batch-1" }) },
    );
    expect(res.status).toBe(404);
  });

  it("rejects query string parameters", async () => {
    const { PATCH } = await import("../../app/api/admin/payroll/[batchId]/disbursement/route");
    const res = await PATCH(
      makeRequest("/api/admin/payroll/batch-1/disbursement?hack=1", "PATCH", { status: "Paid" }),
      { params: Promise.resolve({ batchId: "batch-1" }) },
    );
    expect(res.status).toBe(400);
  });
});

describe("GET /api/hr/payroll/rules — statutory table retrieval (Task 21)", () => {
  beforeEach(reset);

  it("retrieves the active statutory reference rule set for HR", async () => {
    actor = { userId: "hr-1", role: "hr", name: "HR User" };
    const { GET } = await import("../../app/api/hr/payroll/rules/route");
    const res = await GET(makeRequest("/api/hr/payroll/rules", "GET"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ruleSet: { version: number; configuration: { currencyCode: string } } };
    expect(body.ruleSet).toBeDefined();
    expect(body.ruleSet.version).toBe(1);
    expect(body.ruleSet.configuration.currencyCode).toBe("PHP");
  });

  it("rejects unauthenticated requests with 401", async () => {
    authorizationFailure = new TestApiAuthorizationError(401, "authentication_required");
    const { GET } = await import("../../app/api/hr/payroll/rules/route");
    const res = await GET(makeRequest("/api/hr/payroll/rules", "GET"));
    expect(res.status).toBe(401);
  });

  it("rejects query string parameters with 400", async () => {
    actor = { userId: "hr-1", role: "hr", name: "HR User" };
    const { GET } = await import("../../app/api/hr/payroll/rules/route");
    const res = await GET(makeRequest("/api/hr/payroll/rules?hack=true", "GET"));
    expect(res.status).toBe(400);
  });
});

describe("Task 22: Security, Scalability, and Performance Controls", () => {
  beforeEach(reset);

  it("strictly denies HR and non-admin users from Admin payroll approval operations", async () => {
    actor = { userId: "hr-1", role: "hr", name: "HR Specialist" };
    authorizationFailure = new TestApiAuthorizationError(403, "forbidden");
    const { POST } = await import("../../app/api/admin/payroll/[batchId]/decision/route");
    const res = await POST(
      makeRequest("/api/admin/payroll/batch-1/decision", "POST", {
        version: 1,
        decision: "Approved",
      }),
      { params: Promise.resolve({ batchId: "batch-1" }) },
    );
    expect(res.status).toBe(403);
  });

  it("prevents denial-of-service by enforcing pagination limits on batch queries", async () => {
    actor = { userId: "admin-1", role: "admin", name: "Admin User" };
    const { GET } = await import("../../app/api/admin/payroll/config/audit/route");
    const res = await GET(
      makeRequest("/api/admin/payroll/config/audit?pageSize=50000", "GET"),
    );
    expect(res.status).toBe(400);
  });

  it("rejects query parameter pollution on decision APIs to prevent bypass attempts", async () => {
    actor = { userId: "admin-1", role: "admin", name: "Admin User" };
    const { POST } = await import("../../app/api/admin/payroll/[batchId]/decision/route");
    const res = await POST(
      makeRequest("/api/admin/payroll/batch-1/decision?override=true", "POST", {
        version: 1,
        decision: "Approved",
      }),
      { params: Promise.resolve({ batchId: "batch-1" }) },
    );
    expect(res.status).toBe(400);
  });
});
