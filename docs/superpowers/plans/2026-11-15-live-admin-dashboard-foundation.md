# Live Admin Dashboard Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix authenticated Admin prerendering and replace demo dashboard content with one responsive, API-fed view that shows only existing database facts and explicit unavailable states.

**Architecture:** Keep session and permission checks server-side, but run them at request time inside a Suspense boundary using Next.js `connection()`. Add one no-store dashboard snapshot API over the existing User and SecurityAuditEvent sources; the client polls it every 30 seconds while visible and supports manual refresh. Unsupported business metrics remain unavailable until the dependent domain plans deliver real sources.

**Tech Stack:** Next.js 16.4.6 App Router with Cache Components, React 19, TypeScript, Prisma 7.10/MySQL/MariaDB, Zod, Bun tests.

**Spec:** [`docs/superpowers/specs/2026-11-15-live-admin-dashboard-design.md`](../specs/2026-11-15-live-admin-dashboard-design.md)

## Global Constraints

- Only `admin`, `hr`, and `employee` are runtime roles; Admin dashboard and snapshot API are Admin-only.
- Revalidate active account, current database role, session, and permission on every protected request.
- Use only persisted User and SecurityAuditEvent data in this phase; no demo fallback, fixture values, or seeded production records.
- Never represent a missing source or unconfigured policy as zero.
- Return only role/status account aggregates and sanitized event summaries; never expose audit metadata or raw records.
- Preserve `/admin/company` exclusion, the current Admin visual design, and unrelated worktree changes.
- Poll every 30 seconds while visible, support manual refresh, and report last successful update.

## Review Focus

- **Static prerender reaches `new Date()` in session resolution:** prove the authenticated subtree is behind Suspense and deferred to the incoming request; verify with Next type generation and a production build.
- **Suspended/revoked or non-Admin account calls the summary API:** assert 401/403 before any Prisma query.
- **Test accounts distort account totals:** assert the User aggregate explicitly excludes `isTestAccount`.
- **API response contains sensitive audit columns:** assert the exact serialized allowlist and Prisma select.
- **Polling continues while hidden, overlaps a slow request, or survives unmount:** test visibility gating, serialized requests, and abort/cleanup.

## File Map

- `app/admin/layout.tsx` — provides the Suspense boundary around authenticated Admin rendering.
- `app/admin/AdminRequestLayout.tsx` — waits for `connection()`, then validates the session and renders `AdminShell`.
- `app/admin/components/AdminLayoutFallback.tsx` — accessible, non-sensitive loading shell.
- `app/admin/dashboard/summary.server.ts` — queries account aggregates and sanitized audit activities.
- `app/api/admin/dashboard/summary/route.ts` — Admin-only, rate-limited, no-store snapshot endpoint.
- `app/admin/dashboard/AdminDashboardClient.tsx` — consumes the validated response, polls only while visible, and handles refresh/failure.
- `app/admin/dashboard/summary-schema.ts` — shared Zod response contract.
- `app/admin/dashboard/data.ts`, `app/admin/dashboard/types.ts` — removed after all fixture consumers are gone.
- `app/admin/components/dashboard/*.tsx` — retain visual components where useful, remove fixture-only props and show explicit unavailable states.
- `tests/admin/admin-layout.test.tsx`, `tests/admin/dashboard-summary.test.ts`, `tests/admin/dashboard-layout.test.tsx`, `tests/admin/dashboard-activities-ui.test.tsx` — layout, API/service, uniqueness, polling, and UI-state regressions.
- `docs/system-specification/05-NAVIGATION-AND-UI-SPECIFICATION.md`, `06-IMPLEMENTATION-AND-TRACEABILITY-PLAN.md`, `07-ACCEPTANCE-AND-SECURITY-TEST-PLAN.md`, `08-IMPLEMENTATION-STATUS.md` — current behavior and phased domain dependencies.

---

### Task 1: Defer Admin Authentication to Request Rendering

**Files:**
- Modify: `app/admin/layout.tsx`
- Create: `app/admin/AdminRequestLayout.tsx`
- Create: `app/admin/components/AdminLayoutFallback.tsx`
- Test: `tests/admin/admin-layout.test.tsx`

**Interfaces:**
- `AdminLayout({ children }: { children: ReactNode })` returns a Suspense boundary without resolving a session.
- `AdminRequestLayout({ children }: { children: ReactNode })` calls `await connection()` before `requirePagePermission()` and passes the verified principal to `AdminShell`.

- [ ] **Step 1: Add a failing layout regression test** that mocks `next/server`'s `connection()` and `requirePagePermission()` to assert call order, and verifies the fallback exposes a loading status without account data.
- [ ] **Step 2: Run** `bun test tests/admin/admin-layout.test.tsx`; expected: fail because the request-time layout/fallback is not implemented.
- [ ] **Step 3: Implement** the outer Suspense boundary, minimal accessible fallback, and request-time authenticated child. Preserve the existing permission checks and `AdminShell` user fields.
- [ ] **Step 4: Run** `bun test tests/admin/admin-layout.test.tsx`; expected: pass.
- [ ] **Step 5: Run** `bun x next typegen` and `bun run build` with process-local valid security environment values. For a production build, use an HTTPS non-loopback test hostname for `APP_ORIGIN` and ephemeral canonical base64 32-byte keys; never print or persist them. Expected: no `blocking-prerender-current-time` error on `/admin/dashboard`; investigate and report any independent build failure.

### Task 2: Add a Live, Minimized Dashboard Snapshot API

**Files:**
- Create: `app/admin/dashboard/summary.server.ts`
- Create: `app/admin/dashboard/summary-schema.ts`
- Create: `app/api/admin/dashboard/summary/route.ts`
- Reuse: `app/admin/dashboard/activity-presentation.ts`, `app/lib/auth/api-guard.server.ts`, `app/lib/auth/rate-limit.ts`
- Test: `tests/admin/dashboard-summary.test.ts`

**Interfaces:**
- `getAdminDashboardSnapshot(): Promise<DashboardSnapshot>` returns `{ accountCounts: { byRole: Record<Role, number>; byStatus: Record<AccountStatus, number> }; activities: AdminDashboardActivity[]; lastUpdatedAt: string }`.
- `GET /api/admin/dashboard/summary` returns that Zod-validated object with no-store headers.
- `DashboardSnapshot` is inferred from `summary-schema.ts`; counts include only `isTestAccount: false`; activity items retain the existing safe fields.

- [ ] **Step 1: Add failing service tests** for role/status aggregation excluding test accounts, activity ordering/allowlist, legitimate zero counts after a successful query versus a propagated query failure, and the exact Prisma `groupBy`/`findMany` selections.
- [ ] **Step 2: Run** `bun test tests/admin/dashboard-summary.test.ts`; expected: fail because the summary service/schema do not exist.
- [ ] **Step 3: Implement** the Prisma summary using `User.groupBy` and the existing activity mapper with bounded `take: 10`; do not select employee or compensation data.
- [ ] **Step 4: Add failing route tests** for authentication/role denial before queries, no-store response, method handling, database-backed limiter 429, and no secret-bearing properties.
- [ ] **Step 5: Implement** the GET handler with `requireApiPermission(request, "dashboard:read")`, a per-admin database rate limit, explicit safe JSON response, and propagated unexpected errors for framework handling. The endpoint accepts no query parameters.
- [ ] **Step 6: Run** `bun test tests/admin/dashboard-summary.test.ts`; expected: all service and route cases pass.

### Task 3: Replace Demo Widgets and Consolidate the Dashboard

**Files:**
- Modify: `app/admin/dashboard/AdminDashboardClient.tsx`
- Modify: `app/admin/dashboard/page.tsx`
- Modify: `app/admin/components/dashboard/ProjectedPayrollCard.tsx`
- Modify: `app/admin/components/dashboard/TotalEmployeesCard.tsx`
- Modify: `app/admin/components/dashboard/DepartmentsCard.tsx`
- Modify: `app/admin/components/dashboard/PendingApprovalsCard.tsx`
- Modify: `app/admin/components/dashboard/PayrollExpenseChart.tsx`
- Modify: `app/admin/components/dashboard/AttendanceSummaryChart.tsx`
- Modify: `app/admin/components/dashboard/RecentActivities.tsx`
- Modify: `app/admin/components/dashboard/PendingApprovalsList.tsx`
- Delete: `app/admin/dashboard/data.ts`
- Delete: `app/admin/dashboard/types.ts`
- Test: `tests/admin/dashboard-layout.test.tsx`
- Test: `tests/admin/dashboard-activities-ui.test.tsx`

**Interfaces:**
- `AdminDashboardClient` receives only server-verified display presentation; its snapshot state is loading, loaded `DashboardSnapshot`, or error.
- The UI displays database-backed account-by-role/status data, one sanitized Recent Activities panel, and one Pending Approvals panel.
- Payroll, employee headcount, department, attendance, overtime, and compliance widgets show source-specific unavailable states until their own plan delivers an authorized source.

- [ ] **Step 1: Add failing layout assertions** that each Recent Activities and Pending Approvals heading appears exactly once, no demo notice/sample amount/fixed date is rendered, and each unsupported widget says unavailable rather than showing zero.
- [ ] **Step 2: Run** `bun test tests/admin/dashboard-layout.test.tsx`; expected: fail against the duplicated/fixture-based dashboard.
- [ ] **Step 3: Add failing fetch-state tests** for initial loading, valid response, invalid response, retryable API failure, manual refresh, 30-second visible polling, hidden-tab pause, and cleanup on unmount.
- [ ] **Step 4: Run** `bun test tests/admin/dashboard-activities-ui.test.tsx`; expected: fail for the new summary contract/polling behavior.
- [ ] **Step 5: Implement** one summary fetch loop with `cache: "no-store"`, response schema validation, abort cleanup, visibility handling, a serialized 30-second interval, and a manual refresh button. Keep last successful snapshot visible during refresh; mark stale/error state explicitly.
- [ ] **Step 6: Remove** all static dashboard fixtures, fake trend/approval/activity content, and the dashboard demo-data notice; consolidate the activity and approval display to one panel each and add the real account summary panel.
- [ ] **Step 7: Run** `bun test tests/admin/dashboard-layout.test.tsx tests/admin/dashboard-activities-ui.test.tsx`; expected: pass with no duplicate or fabricated values.

### Task 4: Reconcile Documentation and Verify Foundation

**Files:**
- Modify: `docs/system-specification/05-NAVIGATION-AND-UI-SPECIFICATION.md`
- Modify: `docs/system-specification/06-IMPLEMENTATION-AND-TRACEABILITY-PLAN.md`
- Modify: `docs/system-specification/07-ACCEPTANCE-AND-SECURITY-TEST-PLAN.md`
- Modify: `docs/system-specification/08-IMPLEMENTATION-STATUS.md`

- [ ] **Step 1: Update** the Admin dashboard route and API descriptions with existing-schema account counts, the single sanitized event feed, 30-second visible polling, and unsupported metric states.
- [ ] **Step 2: Record** that employee/org, attendance, payroll, overtime, and compliance metrics depend on the linked follow-on plans; do not mark those workflows implemented.
- [ ] **Step 3: Run** focused tests, `bun test`, scoped ESLint, `bun x tsc --noEmit`, Next type generation, production build with safe process-local config, and `git diff --check`.
- [ ] **Step 4: Review** the generated route manifest and dashboard response to confirm `/admin/company` remains absent and no fixture or sensitive field is returned.

## Independent Follow-On Plans

- [`2026-11-15-organization-and-employee-records.md`](2026-11-15-organization-and-employee-records.md) supplies persisted departments and employee headcount/organization metrics.
- [`2026-11-15-workforce-operations.md`](2026-11-15-workforce-operations.md) supplies schedules, attendance, leave, overtime records, and Admin-configured calculation prerequisites.
- [`2026-11-15-payroll-and-compliance-workflows.md`](2026-11-15-payroll-and-compliance-workflows.md) supplies HR-entered payroll results, Admin approvals, and explicitly reported compliance processing states.
