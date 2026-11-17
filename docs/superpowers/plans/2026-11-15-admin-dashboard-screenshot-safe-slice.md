# Admin Dashboard Screenshot-Aligned Safe Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current placeholder dashboard layout with the supplied screenshot’s five-panel layout, serving real security/account activity while clearly marking unsupported business metrics unavailable.

**Architecture:** Keep the existing Next.js App Router page guard and add one same-origin, Admin-only GET endpoint for persisted `SecurityAuditEvent` data. A small server query/serialization layer returns only sanitized activity fields; a responsive client component fetches that endpoint and renders loading, empty, retry, and error states. Workforce, overtime, approvals, and compliance remain explicitly unavailable because their source models do not exist.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind 4, Prisma 7 with the existing MySQL/MariaDB adapter, Zod, Bun tests.

**Spec:** `docs/superpowers/specs/2026-11-15-enterprise-admin-dashboard-design.md`, as narrowed by the user's latest approval; metric/source constraints in `docs/system-specification/04-DATA-OWNERSHIP-AND-METRIC-DEFINITIONS.md`.

## Global Constraints

- Use the existing MySQL database and Prisma/MariaDB adapter; add no schema changes or migrations in this safe slice.
- The only dashboard source available is `SecurityAuditEvent`; do not invent payroll, workforce, attendance, overtime, approval, or compliance records.
- Admin access must be revalidated server-side with the existing active-session and `dashboard:read` permission checks.
- Return no audit IP, user agent, request ID, resource ID, email, password, MFA data, or raw before/after values.
- Dashboard reads must not write synthetic audit events.
- Show unavailable data as unavailable, never as zero or an empty-but-valid chart.
- Use the supplied screenshot's panel order: Workforce & Shift Coverage; Overtime & Labor Costs; Recent Activities; Pending Approvals; Compliance & Security Alerts.
- Retain the existing `Asia/Manila` display baseline; do not claim it is company-configured.
- Preserve existing authentication, session-recovery, admin-shell, and non-dashboard behavior.
- Do not add exports, business filters, mutation controls, schema models, integrations, or dashboard endpoints that only return empty metrics.

## Review Focus

- Anonymous, suspended/revoked, HR, Employee, or malformed-role requests must not receive the Admin activity feed; test the route's 401/403 outcomes.
- Duplicate, non-integer, zero, negative, or over-limit `limit` query values must be rejected; test each boundary.
- A security event must not serialize IP, user agent, request ID, resource ID, or raw event data; test the response allowlist.
- Missing workforce/payroll/workflow data must render unavailable states rather than zero values; assert each unsupported panel's content.
- API failure or an empty activity list must leave the dashboard usable and distinguish error from no recorded events; test both states.

---

### Task 1: Add a Sanitized Admin Activity Read API

**Files:**
- Create: `app/admin/dashboard/activities.server.ts`
- Create: `app/api/admin/dashboard/activities/route.ts`
- Test: `tests/admin/dashboard-activities.test.ts`

**Interfaces:**
- Consumes: `requireApiPermission(request, "dashboard:read")`, the existing Prisma client, `consumeRateLimit`, and `databaseRateLimitStore`.
- Produces: `getRecentDashboardActivities(limit: number): Promise<AdminDashboardActivity[]>`.
- Produces: `GET /api/admin/dashboard/activities?limit=10`, with `limit` defaulting to 10 and restricted to 1–50.
- `AdminDashboardActivity` contains only `{ id, title, actorName, category, occurredAt }`; `category` is `"security"` or `"account"` and `occurredAt` is an ISO string.
- The response is `{ activities: AdminDashboardActivity[], lastUpdatedAt: string }`.

- [x] **Step 1: Add failing service tests** for event-label mapping, nullable actors, newest-first ordering, and the exact response-field allowlist.
- [x] **Step 2: Run** `bun test tests/admin/dashboard-activities.test.ts`; verify the tests fail before implementation.
- [x] **Step 3: Implement** the Prisma query with an explicit minimal `select`, newest-first ordering, and bounded `take`; map the known `SecurityEventType` values to neutral human-readable summaries. Never return raw event records.
- [x] **Step 4: Add failing route tests** in `tests/admin/dashboard-activities.test.ts` for Admin success, unauthenticated/suspended 401, non-Admin 403, invalid/duplicate limits, no-store headers, and rate-limit 429 with `Retry-After`.
- [x] **Step 5: Implement** the GET route. Authenticate and authorize before querying, use the existing same-origin API guard, enforce a per-admin limit of 60 requests per minute using the existing database-backed limiter, and return no-store JSON. Let unexpected database errors use the framework's safe server-error handling; do not return exception details.
- [x] **Step 6: Run** `bun test tests/admin/dashboard-activities.test.ts`; expected result is all service and route cases passing.

### Task 2: Implement the Screenshot-Aligned Dashboard UI

**Files:**
- Modify: `app/admin/dashboard/page.tsx`
- Create: `app/admin/dashboard/AdminDashboardClient.tsx`
- Create: `app/admin/components/dashboard/DashboardPanel.tsx`
- Modify: `app/admin/components/dashboard/DashboardUnavailableState.tsx`
- Test: `tests/admin/dashboard-layout.test.tsx`
- Test: `tests/admin/dashboard-activities-ui.test.tsx`

**Interfaces:**
- Consumes: the guarded Admin display name, existing `getDashboardPresentation()`, `DashboardUnavailableState`, and `GET /api/admin/dashboard/activities`.
- Produces: a responsive five-panel layout matching the supplied screenshot, with security/account activity rendered from the API.

- [x] **Step 1: Add failing layout tests** asserting the five screenshot panel titles, their order, and the full-width compliance/security panel.
- [x] **Step 2: Run** `bun test tests/admin/dashboard-layout.test.tsx`; verify it fails against the current layout.
- [x] **Step 3: Replace** the existing KPI/chart grid with two-column Workforce & Shift Coverage and Overtime & Labor Costs panels; a second row for Recent Activities and Pending Approvals; and a full-width Compliance & Security Alerts panel. Keep the existing personalized greeting and Manila snapshot date.
- [x] **Step 4: Render** unavailable states with source-specific explanations for workforce, overtime, approvals, and compliance; do not add decorative controls or sample counts.
- [x] **Step 5: Add failing activity UI tests** for loading, successful activity results, no events, and retryable errors.
- [x] **Step 6: Implement** the client fetch and refresh action with `cache: "no-store"`. Show only sanitized security/account activities, actor display names where available, Manila-local timestamps, and the response's last-updated time. Identify the feed as security/account activity, not payroll or workforce activity; expose an accessible status/error message for each state.
- [x] **Step 7: Run** `bun test tests/admin/dashboard-layout.test.tsx tests/admin/dashboard-activities-ui.test.tsx`; expected result is all layout and activity-state assertions passing.

### Task 3: Reconcile Documentation and Verify the Slice

**Files:**
- Modify: `docs/superpowers/specs/2026-11-15-enterprise-admin-dashboard-design.md`
- Modify: `docs/system-specification/05-NAVIGATION-AND-UI-SPECIFICATION.md`
- Modify: `docs/system-specification/06-IMPLEMENTATION-AND-TRACEABILITY-PLAN.md`
- Modify: `docs/system-specification/07-ACCEPTANCE-AND-SECURITY-TEST-PLAN.md`
- Modify: `docs/system-specification/08-IMPLEMENTATION-STATUS.md`

- [ ] **Step 1: Update** the approved-scope note to permit the real `SecurityAuditEvent` activity endpoint while retaining the prohibition on empty-metric APIs, schema changes, and fabricated operational data.
- [ ] **Step 2: Update** `05-NAVIGATION-AND-UI-SPECIFICATION.md` with the screenshot panel grouping, and add requirement `DASH-006` to the traceability table for the Admin-only, sanitized security activity feed. Keep `DASH-003` and the domain portions of `DASH-004` blocked.
- [ ] **Step 3: Update** `07-ACCEPTANCE-AND-SECURITY-TEST-PLAN.md` with direct API denial, bounded pagination, and response-field redaction cases; update `08-IMPLEMENTATION-STATUS.md` with verified activity-feed evidence and blocked operational metrics.
- [ ] **Step 4: Run focused tests:** `bun test tests/auth/authorization.test.ts tests/admin/dashboard-activities.test.ts tests/admin/dashboard-layout.test.tsx tests/admin/dashboard-activities-ui.test.tsx`.
- [ ] **Step 5: Run** `bun run lint -- app/admin/dashboard app/admin/components/dashboard app/api/admin/dashboard tests/admin` and `bunx tsc --noEmit`; expected result is no lint or type errors.
- [ ] **Step 6: Run** `bun test`; report the actual totals and preserve any unrelated existing test failures.
- [ ] **Step 7: Visually verify** desktop, tablet, and mobile layouts, keyboard focus, and the refresh/error/empty states in the browser; report any environment-limited checks.
- [ ] **Step 8: Run** `graphify . --update` after the source and documentation changes; verify the graph/report/HTML reflect the new API and UI.
- [ ] **Step 9: Review** the final diff to confirm there are no Prisma schema changes, no fabricated metrics, no unauthorized fields in responses, and no unrelated files modified.

## Explicitly Deferred

Payroll, headcount, departments, teams, shift coverage, attendance, overtime, approvals, compliance, exports, date filters, and alerts remain blocked until authoritative source models, shared business calculations, and approved policies exist. This slice does not complete the broader Admin Dashboard acceptance criteria.
