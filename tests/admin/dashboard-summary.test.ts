import { describe, expect, it, mock } from "bun:test";
import { SecurityEventType } from "../../app/generated/prisma/client";

type AuthorizationFailure = Error & { status: 401 | 403; code: string };

let roleRows: Array<{ role: string; _count: { _all: number } }> = [];
let statusRows: Array<{ status: string; _count: { _all: number } }> = [];
let activityRows: Array<{
  id: string;
  eventType: SecurityEventType;
  createdAt: Date;
  user: { name: string } | null;
}> = [];
let authorizationFailure: AuthorizationFailure | null = null;
let rateLimited = false;
let queryCount = 0;
const groupBy = mock(async (query: unknown) => {
  queryCount++;
  if ((query as { by: string[] }).by[0] === "role") return roleRows;
  return statusRows;
});
const findMany = mock(async (query: unknown) => {
  queryCount++;
  expect(query).toEqual({
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      eventType: true,
      createdAt: true,
      user: { select: { name: true } },
    },
  });
  return activityRows;
});
const rateLimitUpsert = mock(async () => ({
  count: rateLimited ? 61 : 1,
  blockedUntil: null,
}));
const rateLimitUpdate = mock(async () => ({ id: "bucket" }));

class TestApiAuthorizationError extends Error {
  constructor(
    public readonly status: 401 | 403,
    public readonly code: string,
  ) {
    super(code);
  }
}

mock.module("server-only", () => ({}));
mock.module("../../app/lib/db", () => ({
  prisma: {
    user: { groupBy },
    securityAuditEvent: { findMany },
    authRateLimitBucket: { upsert: rateLimitUpsert, update: rateLimitUpdate },
  },
}));
mock.module("../../app/lib/auth/api-guard.server", () => ({
  ApiAuthorizationError: TestApiAuthorizationError,
  apiAuthorizationErrorResponse: (error: TestApiAuthorizationError) =>
    new Response(JSON.stringify({ error: error.code }), {
      status: error.status,
      headers: { "cache-control": "no-store, max-age=0" },
    }),
  requireApiPermission: async () => {
    if (authorizationFailure) throw authorizationFailure;
    return { userId: "admin-1", role: "admin" };
  },
}));

function reset() {
  roleRows = [{ role: "admin", _count: { _all: 1 } }];
  statusRows = [{ status: "Active", _count: { _all: 1 } }];
  activityRows = [
    {
      id: "event-1",
      eventType: SecurityEventType.AccessDenied,
      createdAt: new Date("2026-11-15T07:02:00.000Z"),
      user: { name: "Riley" },
    },
  ];
  authorizationFailure = null;
  rateLimited = false;
  queryCount = 0;
  groupBy.mockClear();
  findMany.mockClear();
  rateLimitUpsert.mockClear();
}

async function getSnapshot() {
  const { getAdminDashboardSnapshot } = await import(
    "../../app/admin/dashboard/summary.server"
  );
  return getAdminDashboardSnapshot();
}

async function getRoute(query = "") {
  const { GET } = await import(
    "../../app/api/admin/dashboard/summary/route"
  );
  const priorEnvironment = [
    ["APP_ORIGIN", process.env.APP_ORIGIN],
    ["AUTH_ENCRYPTION_KEY", process.env.AUTH_ENCRYPTION_KEY],
    ["RATE_LIMIT_SECRET", process.env.RATE_LIMIT_SECRET],
  ] as const;
  process.env.APP_ORIGIN = "https://payroll.test";
  process.env.AUTH_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString("base64");
  process.env.RATE_LIMIT_SECRET = Buffer.alloc(32, 2).toString("base64");

  try {
    return await GET(
      new Request(`https://payroll.test/api/admin/dashboard/summary${query}`, {
        headers: { origin: "https://payroll.test" },
      }),
    );
  } finally {
    for (const [key, value] of priorEnvironment) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

describe("Admin dashboard snapshot service", () => {
  it("counts only non-test accounts by role and status with safe activity fields", async () => {
    reset();
    roleRows = [
      { role: "admin", _count: { _all: 2 } },
      { role: "hr", _count: { _all: 3 } },
    ];
    statusRows = [
      { status: "Active", _count: { _all: 4 } },
      { status: "Suspended", _count: { _all: 1 } },
    ];

    const snapshot = await getSnapshot();

    expect(groupBy).toHaveBeenNthCalledWith(1, {
      by: ["role"],
      where: { isTestAccount: false },
      _count: { _all: true },
    });
    expect(groupBy).toHaveBeenNthCalledWith(2, {
      by: ["status"],
      where: { isTestAccount: false },
      _count: { _all: true },
    });
    expect(snapshot.accountCounts).toEqual({
      byRole: { admin: 2, hr: 3, employee: 0 },
      byStatus: { Active: 4, Invited: 0, Suspended: 1, Inactive: 0 },
    });
    expect(snapshot.activities[0]).toEqual({
      id: "event-1",
      title: "Access denied",
      actorName: "Riley",
      category: "security",
      occurredAt: "2026-11-15T07:02:00.000Z",
    });
    expect(Object.keys(snapshot)).toEqual([
      "accountCounts",
      "activities",
      "lastUpdatedAt",
    ]);
  });

  it("returns zero counts for empty results but propagates query failures", async () => {
    reset();
    roleRows = [];
    statusRows = [];
    expect((await getSnapshot()).accountCounts.byRole).toEqual({
      admin: 0,
      hr: 0,
      employee: 0,
    });

    groupBy.mockRejectedValueOnce(new Error("database unavailable"));
    await expect(getSnapshot()).rejects.toThrow("database unavailable");
  });
});

describe("Admin dashboard snapshot API", () => {
  it("returns a no-store response without secret-bearing properties", async () => {
    reset();
    const response = await getRoute();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
    expect(Object.keys(body)).toEqual([
      "accountCounts",
      "activities",
      "lastUpdatedAt",
    ]);
    expect(JSON.stringify(body)).not.toMatch(
      /password|token|metadata|sourceIp|userAgent/i,
    );
  });

  it("denies unauthorized callers before database queries", async () => {
    reset();
    authorizationFailure = new TestApiAuthorizationError(403, "forbidden");

    const response = await getRoute();

    expect(response.status).toBe(403);
    expect(queryCount).toBe(0);
  });

  it("rejects query parameters and applies the database-backed limit", async () => {
    reset();
    expect((await getRoute("?limit=1")).status).toBe(400);

    reset();
    rateLimited = true;
    expect((await getRoute()).status).toBe(429);
    expect(queryCount).toBe(0);
  });
});
