import { describe, expect, it, mock } from "bun:test";
import { SecurityEventType } from "../../app/generated/prisma/client";
import { toAdminDashboardActivity } from "../../app/admin/dashboard/activity-presentation";

let lastQuery: unknown;
let authorizationFailure: TestApiAuthorizationError | null = null;
let bucketCount = 0;
let rateLimitCountOffset = 0;
let blockedUntil: Date | null = null;
let lastBucketId: string | null = null;

class TestApiAuthorizationError extends Error {
  constructor(
    public readonly status: 401 | 403,
    public readonly code: "authentication_required" | "forbidden",
  ) {
    super(code);
  }
}

const queryRows = [
  {
    id: "newest",
    eventType: SecurityEventType.AccessDenied,
    createdAt: new Date("2026-11-15T07:02:00.000Z"),
    user: { name: "Riley" },
  },
  {
    id: "older",
    eventType: SecurityEventType.PasswordChanged,
    createdAt: new Date("2026-11-15T07:01:00.000Z"),
    user: { name: "Casey" },
  },
];
const findMany = mock(async (query: unknown) => {
  lastQuery = query;
  return queryRows;
});
const rateLimitUpsert = mock(
  async (query: {
    where: { id: string };
    create: { count: number };
    update: { count: { increment: number } };
  }) => {
    lastBucketId = query.where.id;
    bucketCount += 1;
    return {
      count: rateLimitCountOffset + bucketCount,
      blockedUntil,
    };
  },
);
const rateLimitUpdate = mock(
  async (query: {
    where: { id: string };
    data: { blockedUntil: Date };
  }) => {
    blockedUntil = query.data.blockedUntil;
    return { id: query.where.id };
  },
);
const requireApiPermission = mock(
  async (_request: Request, permission: string) => {
    if (permission !== "dashboard:read") {
      throw new Error("unexpected permission");
    }
    if (authorizationFailure) throw authorizationFailure;
    return { userId: "admin-1", role: "admin" };
  },
);
const apiAuthorizationErrorResponse = (error: TestApiAuthorizationError) =>
  new Response(JSON.stringify({ error: error.code }), {
    status: error.status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, max-age=0",
      "x-content-type-options": "nosniff",
    },
  });
mock.module("server-only", () => ({}));
mock.module("../../app/lib/db", () => ({
  prisma: {
    securityAuditEvent: { findMany },
    authRateLimitBucket: {
      upsert: rateLimitUpsert,
      update: rateLimitUpdate,
    },
  },
}));
mock.module("../../app/lib/auth/api-guard.server", () => ({
  ApiAuthorizationError: TestApiAuthorizationError,
  apiAuthorizationErrorResponse,
  requireApiPermission,
}));

async function requestActivities(query = "") {
  const { GET } = await import(
    "../../app/api/admin/dashboard/activities/route"
  );
  const previousEnvironment = [
    ["APP_ORIGIN", process.env.APP_ORIGIN],
    ["AUTH_ENCRYPTION_KEY", process.env.AUTH_ENCRYPTION_KEY],
    ["RATE_LIMIT_SECRET", process.env.RATE_LIMIT_SECRET],
  ] as const;
  process.env.APP_ORIGIN = "https://payroll.test";
  process.env.AUTH_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString("base64");
  process.env.RATE_LIMIT_SECRET = Buffer.alloc(32, 2).toString("base64");

  try {
    return await GET(
      new Request(
        `https://payroll.test/api/admin/dashboard/activities${query}`,
        { headers: { origin: "https://payroll.test" } },
      ),
    );
  } finally {
    for (const [key, value] of previousEnvironment) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

function resetRouteState() {
  authorizationFailure = null;
  bucketCount = 0;
  rateLimitCountOffset = 0;
  blockedUntil = null;
  lastBucketId = null;
  lastQuery = undefined;
}

describe("admin dashboard activity presentation", () => {
  it("maps account changes to a sanitized activity", () => {
    const activity = toAdminDashboardActivity({
      id: "event-1",
      eventType: SecurityEventType.RoleChanged,
      createdAt: new Date("2026-11-15T07:00:00.000Z"),
      user: { name: "Casey" },
    });

    expect(activity).toEqual({
      id: "event-1",
      title: "Account role changed",
      actorName: "Casey",
      category: "account",
      occurredAt: "2026-11-15T07:00:00.000Z",
    });
  });

  it("does not invent an actor for failed sign-ins with no matching account", () => {
    const activity = toAdminDashboardActivity({
      id: "event-2",
      eventType: SecurityEventType.LoginFailure,
      createdAt: new Date("2026-11-15T07:01:00.000Z"),
      user: null,
    });

    expect(activity).toEqual({
      id: "event-2",
      title: "Failed sign-in attempt",
      actorName: null,
      category: "security",
      occurredAt: "2026-11-15T07:01:00.000Z",
    });
  });

  it("requests only safe activity fields in newest-first order with a bounded take", async () => {
    lastQuery = undefined;
    const { getRecentDashboardActivities } = await import(
      "../../app/admin/dashboard/activities.server"
    );

    const activities = await getRecentDashboardActivities(2);

    expect(lastQuery).toEqual({
      orderBy: { createdAt: "desc" },
      take: 2,
      select: {
        id: true,
        eventType: true,
        createdAt: true,
        user: { select: { name: true } },
      },
    });
    expect(activities).toEqual([
      {
        id: "newest",
        title: "Access denied",
        actorName: "Riley",
        category: "security",
        occurredAt: "2026-11-15T07:02:00.000Z",
      },
      {
        id: "older",
        title: "Password changed",
        actorName: "Casey",
        category: "account",
        occurredAt: "2026-11-15T07:01:00.000Z",
      },
    ]);
  });
});

describe("admin dashboard activity API", () => {
  it("returns recent sanitized events with no-store caching", async () => {
    resetRouteState();
    const response = await requestActivities("?limit=5");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
    expect(body.activities).toEqual([
      {
        id: "newest",
        title: "Access denied",
        actorName: "Riley",
        category: "security",
        occurredAt: "2026-11-15T07:02:00.000Z",
      },
      {
        id: "older",
        title: "Password changed",
        actorName: "Casey",
        category: "account",
        occurredAt: "2026-11-15T07:01:00.000Z",
      },
    ]);
    expect(Date.parse(body.lastUpdatedAt)).not.toBeNaN();
    expect(lastQuery).toMatchObject({ take: 5 });
    expect(lastBucketId).not.toContain("admin-1");
  });

  it("uses the default limit when none is provided", async () => {
    resetRouteState();

    const response = await requestActivities();

    expect(response.status).toBe(200);
    expect(lastQuery).toMatchObject({ take: 10 });
  });

  it("returns 401 when authentication is unavailable", async () => {
    resetRouteState();
    authorizationFailure = new TestApiAuthorizationError(
      401,
      "authentication_required",
    );

    const response = await requestActivities();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "authentication_required",
    });
    expect(bucketCount).toBe(0);
    expect(lastQuery).toBeUndefined();
  });

  it("returns 403 when the server guard denies the role", async () => {
    resetRouteState();
    authorizationFailure = new TestApiAuthorizationError(403, "forbidden");

    const response = await requestActivities();

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "forbidden" });
    expect(bucketCount).toBe(0);
    expect(lastQuery).toBeUndefined();
  });

  it("rejects duplicated and out-of-range limits", async () => {
    resetRouteState();

    for (const query of [
      "?limit=1&limit=2",
      "?limit=0",
      "?limit=-1",
      "?limit=1.5",
      "?limit=nope",
      "?limit=51",
      "?unexpected=1",
    ]) {
      const response = await requestActivities(query);
      expect(response.status).toBe(400);
    }
    expect(bucketCount).toBe(0);
    expect(lastQuery).toBeUndefined();
  });

  it("returns 429 and retry-after without querying activity data", async () => {
    resetRouteState();
    rateLimitCountOffset = 60;

    const response = await requestActivities();

    expect(response.status).toBe(429);
    expect(Number(response.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(bucketCount).toBe(1);
    expect(lastQuery).toBeUndefined();
  });
});
