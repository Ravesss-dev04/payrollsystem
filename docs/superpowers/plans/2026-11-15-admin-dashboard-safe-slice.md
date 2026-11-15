# Admin Dashboard Safe Slice Implementation Plan

> Historical implementation plan for the completed dashboard safe slice. The current authoritative role, workflow, navigation, and traceability requirements are in [`docs/system-specification/`](../../system-specification/). The three-role constraint below applied only to this slice; it does not replace the approved four-role target.

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restrict the Admin Dashboard to authorized Admin sessions, remove fabricated dashboard data, and visibly identify the specified non-persistent demo modules.

**Architecture:** Reuse the current Next.js App Router, `requirePagePermission`, and server-validated session principal. Keep the existing dashboard shell and card layout, but show explicit unavailable states until authoritative business records exist. Add one shared notice to the three approved demo modules; make no database, session, or API changes.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Bun tests, existing Tailwind styles.

**Spec:** `docs/superpowers/specs/2026-11-15-enterprise-admin-dashboard-design.md`

## Global Constraints

- The application uses MySQL; do not add schema or migration changes in this slice.
- Recognize only the current `admin`, `hr`, and `employee` roles; defer `team_leader` until team assignments and server-side scope checks are implemented.
- Only an authenticated, active Admin may read the Admin Dashboard; frontend navigation visibility is not authorization.
- Do not show fabricated data or represent missing data as zero.
- Use `Asia/Manila` for the live snapshot date and greeting. The timezone should become company-configured in the future domain model.
- Do not infer overnight-shift workday or payroll-cutoff attribution.
- Clearly state that demo records and actions do not update the company database.
- Do not add external integrations or operational dashboard APIs.

## Review Focus

- **HR or employee directly requests `/admin/dashboard`:** denied by the existing server permission guard; pin role outcomes in the authorization test.
- **Unknown or future role requests the dashboard:** denied until explicitly introduced with scoped authorization; include `team_leader` and malformed role values in the same test.
- **A business metric has no source of truth:** show an accessible unavailable state, never a zero or an empty chart; test the shared state component.
- **UTC date crosses the Manila calendar boundary:** show the Manila date and corresponding greeting; test a fixed instant on that boundary.
- **A user triggers an action on a prototype module:** make clear that the record and action are illustrative and non-persistent; test the shared notice and manually inspect all three module routes.

## File Map

- `app/lib/auth/authorization.ts` — make `dashboard:read` Admin-only without changing other permissions.
- `tests/auth/authorization.test.ts` — assert the dashboard role boundary.
- `app/admin/dashboard/presentation.ts` — format the greeting and snapshot date from a supplied instant and authenticated name.
- `app/admin/components/dashboard/DashboardUnavailableState.tsx` — shared accessible unavailable state.
- `app/admin/components/dashboard/*.tsx` — retain dashboard card/panel styling while removing mock props and values.
- `app/admin/dashboard/page.tsx` — use the guarded session principal and render real snapshot presentation with unavailable metrics.
- `app/admin/dashboard/data.ts`, `app/admin/dashboard/types.ts` — remove unused fabricated dashboard records and their types.
- `tests/admin/dashboard-presentation.test.ts`, `tests/admin/dashboard-unavailable.test.tsx` — cover timezone presentation and empty-state semantics.
- `app/admin/components/DemoDataNotice.tsx` — shared notice for illustrative records and simulated actions.
- `app/admin/components/PayrollBatchDetails.tsx`, `app/admin/compensation/page.tsx`, `app/admin/users-roles/UsersRolesClient.tsx` — display the notice in Payroll Approvals, Compensation, and User & Role Management.
- `tests/admin/demo-data-notice.test.tsx` — assert the notice communicates demo-only behavior.
- `docs/superpowers/plans/2026-11-15-payroll-hr-domain-workflows.md` — deliver the separate, dependency-ordered plan for authoritative business models and workflows.

---

### Task 1: Restrict Dashboard Permission to Admin

**Files:**
- Modify: `app/lib/auth/authorization.ts`
- Test: `tests/auth/authorization.test.ts`

**Interfaces:**
- Consumes: `hasPermission({ role, permission, actorId })` and the existing `dashboard:read` permission.
- Produces: `dashboard:read` returns `true` only for `admin` among current and unrecognized roles.

- [ ] **Step 1: Add a failing Admin-only dashboard permission test**

Add `it("allows only Admin to read the admin dashboard", ...)` asserting `admin` is allowed and `hr`, `employee`, `team_leader`, and `"ADMIN"` are denied for `dashboard:read`.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `bun test tests/auth/authorization.test.ts`

Expected: FAIL because HR currently has `dashboard:read`.

- [ ] **Step 3: Remove `dashboard:read` from the HR permission set**

Keep all other role permissions and the role enum unchanged. The dashboard page already calls `requirePagePermission("dashboard:read")`; this change makes its existing server-side guard Admin-only.

- [ ] **Step 4: Run authorization tests**

Run: `bun test tests/auth/authorization.test.ts`

Expected: PASS, including the new role matrix and existing authorization assertions.

### Task 2: Replace Mock Dashboard Values with Unavailable States

**Files:**
- Create: `app/admin/dashboard/presentation.ts`
- Create: `app/admin/components/dashboard/DashboardUnavailableState.tsx`
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
- Test: `tests/admin/dashboard-presentation.test.ts`
- Test: `tests/admin/dashboard-unavailable.test.tsx`

**Interfaces:**
- Consumes: `requirePagePermission("dashboard:read")`, which returns a validated session principal with `name`.
- Produces: `getDashboardPresentation(now: Date, displayName: string): { greeting: string; snapshotDate: string }`.
- Produces: `DashboardUnavailableState({ title, message }: { title: string; message: string })`, with `role="status"` for assistive technology.

- [ ] **Step 1: Add failing presentation tests**

Add `it("uses the Manila-local date and morning greeting", ...)` asserting `getDashboardPresentation(new Date("2026-11-14T16:30:00Z"), "Casey")` returns `{ greeting: "Good morning, Casey!", snapshotDate: "November 15, 2026" }`. Add `it("uses the Manila-local evening greeting", ...)` asserting the same name with `new Date("2026-11-15T12:30:00Z")` returns `"Good evening, Casey!"`.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `bun test tests/admin/dashboard-presentation.test.ts`

Expected: FAIL because the presentation helper does not yet exist.

- [ ] **Step 3: Add the unavailable-state test**

Add `it("renders an accessible unavailable state", ...)`; server-render `DashboardUnavailableState` and assert its markup has `role="status"` and displays both the supplied title and explanation.

- [ ] **Step 4: Run the focused test and verify it fails**

Run: `bun test tests/admin/dashboard-unavailable.test.tsx`

Expected: FAIL because the shared component does not yet exist.

- [ ] **Step 5: Implement snapshot presentation and the shared state**

Use `Intl.DateTimeFormat` with `Asia/Manila`; derive greeting hour in that same timezone. Render the shared component with semantic status markup and no implicit numeric fallback.

- [ ] **Step 6: Remove dashboard fixture inputs and render unavailable content**

Update the page to use the returned session's `name` and the presentation helper. Keep the existing light-lavender/white/purple card and panel layout, replace the fixed date picker and snapshot label with the current Manila snapshot, and render explicit unavailable messages for payroll, headcount, departments, approvals, trends, attendance, activities, and pending approvals. Remove mock chart series, sample approval dialogs, and fixture imports; delete the now-unused dashboard data and type files. Do not add inactive filters, a new API, or pretend-empty metrics.

- [ ] **Step 7: Run dashboard tests**

Run: `bun test tests/admin/dashboard-presentation.test.ts tests/admin/dashboard-unavailable.test.tsx`

Expected: PASS; the Manila boundary, personalized greeting, and accessible unavailable state are covered.

### Task 3: Label the Three Demo Modules

**Files:**
- Create: `app/admin/components/DemoDataNotice.tsx`
- Modify: `app/admin/components/PayrollBatchDetails.tsx`
- Modify: `app/admin/compensation/page.tsx`
- Modify: `app/admin/users-roles/UsersRolesClient.tsx`
- Test: `tests/admin/demo-data-notice.test.tsx`

**Interfaces:**
- Produces: a shared `DemoDataNotice` component that visibly identifies illustrative records and simulated actions as non-persistent.

- [ ] **Step 1: Add a failing notice rendering test**

Add `it("identifies demo records and actions as non-persistent", ...)`; server-render `DemoDataNotice` and assert it has an accessible notice role and explicitly states that records/actions are demo-only and do not update the company database.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `bun test tests/admin/demo-data-notice.test.tsx`

Expected: FAIL because the notice component does not yet exist.

- [ ] **Step 3: Implement and place the shared notice**

Create one concise notice component. Add it to the shared payroll page wrapper so both batch list and detail pages show it, and add it near the page introduction on Compensation and User & Role Management. Preserve existing prototype interactions, but do not describe them as actual payroll approval, database persistence, account administration, or audit activity.

- [ ] **Step 4: Run the notice test and inspect all three routes**

Run: `bun test tests/admin/demo-data-notice.test.tsx`

Expected: PASS. Manually verify the notice is visible on `/admin/payapprove`, a payroll batch detail, `/admin/compensation`, and `/admin/users-roles`.

### Task 4: Prepare the Business-Model and Workflow Plan

**Files:**
- Create: `docs/superpowers/plans/2026-11-15-payroll-hr-domain-workflows.md`

- [ ] **Step 1: Write a separate dependency-ordered implementation plan**

Cover MySQL migrations and tests; company/site/department/team and employee records; effective-dated team assignments and authorization scope; schedules, attendance, leave, and overtime; compensation and the official payroll calculation source; payroll approvals; audit/compliance; and dashboard analytics only after authoritative sources exist. State that the four-role model includes `admin`, `hr`, `team_leader`, and `employee`, with Team Leaders limited to authorized team scope.

- [ ] **Step 2: Record policy gates and shared metric definitions**

Use `Asia/Manila`; make timezone company-owned in the future model. Treat each scheduled shift as an explicit work-date instance. Mark cross-midnight rest-day treatment and payroll cutoff attribution as unresolved approval gates—do not design calculations that assume either. Define source, included/excluded statuses, date boundaries, filters, and comparison period for each future dashboard metric.

- [ ] **Step 3: Self-review the roadmap against the approved design**

Confirm model dependencies, authorization boundaries, history/audit requirements, and validation strategy are present, and that no future work is represented as implemented in the safe slice.

### Task 5: Verify the Safe Slice

**Files:**
- No additional source files.

- [ ] **Step 1: Run the focused and full Bun test suites**

Run: `bun test tests/auth/authorization.test.ts tests/admin/dashboard-presentation.test.ts tests/admin/dashboard-unavailable.test.tsx tests/admin/demo-data-notice.test.tsx`, then `bun test`.

Expected: Both commands exit successfully.

- [ ] **Step 2: Run lint and type checking**

Run: `bun run lint -- app/lib/auth/authorization.ts app/admin/dashboard app/admin/components/dashboard app/admin/components/DemoDataNotice.tsx app/admin/components/PayrollBatchDetails.tsx app/admin/compensation/page.tsx app/admin/users-roles/UsersRolesClient.tsx tests/auth/authorization.test.ts tests/admin`.

Run: `bunx tsc --noEmit`.

Expected: Both commands exit successfully.

- [ ] **Step 3: Run the production build**

Run in PowerShell: `$env:APP_ORIGIN='https://localhost:3000'; bun run build`. This process-local override is needed only if the existing local origin is HTTP; do not print `.env` values.

Expected: Build exits successfully without schema or migration changes.

- [ ] **Step 4: Review the final diff**

Confirm the dashboard no longer imports fixture data or emits fabricated amounts, counts, dates, chart values, activities, or approvals; HR and employees are denied by the server permission guard; the three demo modules visibly identify their simulated data; and no unrelated files or prior worktree changes were reverted.
