# Live Admin Dashboard and Business Data Design

**Status:** Approved by user on 2026-11-15  
**Date:** 2026-11-15

## Intent

Make the Admin dashboard build and render safely with Next.js Cache Components, remove all illustrative dashboard values and duplicate sections, and make every displayed metric traceable to persisted, authorized business records. Add the HR/Admin record-entry workflows needed to supply those records; do not rely on an external source system.

## Decisions confirmed by the user

- Preserve the current dashboard layout, but show an explicit unavailable state when an authoritative source or required policy is missing.
- Render Recent Activities and Pending Approvals once each.
- HR maintains structured operational records; users do not edit aggregate dashboard numbers.
- Admin owns policy configuration and final payroll authorization.
- HR records calculated payroll results; the application does not implement a payroll calculation engine in this project.
- Add HR data-entry and Admin policy/approval screens. Manage organizational units in Admin Settings while keeping `/admin/company` out of navigation and route discovery.
- Refresh dashboard data every 30 seconds, with a manual refresh.

## Goals

1. Defer the authenticated Admin layout to request time behind a Suspense boundary before session validation evaluates the current time. Preserve server-side session, account-status, and permission checks.
2. Remove hard-coded dashboard data and demo-only values. The dashboard reads current data from server-side APIs; unavailable, empty, loading, and failed states remain distinct.
3. Implement persisted, typed source records and audited HR/Admin workflows for the dashboard's workforce, organization, attendance, payroll results, approvals, overtime, and compliance-task views.
4. Configure business policies through Admin-only controls. Do not calculate or label a metric as authoritative until its required policy and source records are configured.
5. Keep the dashboard read-only. Expose only authorized aggregates and sanitized event summaries; never accept client roles or scopes as authority.
6. Preserve the existing Next.js, TypeScript, Prisma, MySQL/MariaDB, and three-role (`admin`, `hr`, `employee`) stack.

## Data and workflow boundaries

- Admin Settings owns organization records and versioned policy configuration. This is not a reactivation or alias of the disabled Company route.
- HR owns employee lifecycle, assignments within configured organization structure, schedules, official attendance, leave/overtime processing, and payroll preparation.
- HR enters the calculated, structured payroll results and supporting batch records; the dashboard never computes payroll. Admin alone approves payroll batches. Each decision applies to a specific immutable batch version and is auditable.
- The Admin dashboard remains Admin-only. HR entry APIs and pages require HR permissions; Admin policy/approval APIs require Admin permissions.
- Payroll totals and trends come from stored HR-calculated results. The dashboard does not invent a payroll formula or calculate compensation independently. Until a result is entered and the batch is approved, the corresponding actual-payroll metric is unavailable; projected values are separately labeled and sourced from a recorded HR projection.
- Attendance classification, shift windows, absence deadlines, and coverage calculations use Admin-configured rules. Missing rules or incomplete records produce unavailable/partial states, not guessed zeros.
- Pending-approval counts use persisted workflow states and reviewer assignment. Unsupported transitions or reviewers are not inferred from the UI.
- Compliance panels summarize explicitly configured tasks and verified statuses; record presence alone is not represented as legal compliance.
- Recent Activities combines sanitized security and domain audit records, with one feed and no sensitive payloads.
- New domain migrations and writes are additive, validated, transactional where state transitions require it, and recorded in a protected domain audit trail.
- Employee records remain separate from login accounts; an optional one-to-one account link is used for self-service, never for headcount. Effective-dated assignments support historical organization reports. Only the current `admin`, `hr`, and `employee` roles are implemented; Team Leader-dependent workflows remain unavailable.

## Dashboard/API behavior

- A protected, no-store dashboard summary endpoint returns typed data and availability for each widget from shared server-side query/calculation services. The existing security-activity endpoint is retained or consolidated without duplicating activity UI.
- HR APIs cover employee records, schedules/attendance, payroll preparation/results, and workflow submissions; Admin APIs cover organization and policy configuration plus payroll authorization. Each operation writes explicit fields and an audit event.
- Every endpoint revalidates the database-backed session, current account status, role, permission, and record scope. Mutations additionally validate same-origin/CSRF, input schemas, state transitions, and concurrency.
- The client requests an initial snapshot, polls every 30 seconds while the page is visible, and provides a manual refresh. Responses are validated; errors are visible and retryable; the UI reports the last successful update. No service worker, WebSocket, or external event bus is introduced.
- Only one summary card/list and one activity panel render for each metric category. No seeded demo records or static fallbacks are shown as live data.

## UI behavior

Keep the established Admin design system and existing panel layout. Remove the demo notice when demo data is removed. Reuse accessible loading, error, empty, and unavailable states; announce refresh state, retain a clear last-updated time, and avoid success-shaped zeroes. HR entry and Admin settings screens use the existing visual system and keep permissions visible through route/API enforcement rather than hiding controls alone.

## Non-goals and safeguards

- Do not restore or register `/admin/company`; retain its private source for possible future reactivation.
- Do not add a new role, including `team_leader`, or broaden the current three-role authorization model.
- Do not add external integrations, seed production data, or display sample values.
- Do not infer payroll, statutory compliance, attendance, employment-status, or staffing rules. Admin must explicitly configure required policies before those calculations are available.
- Do not expose employee-level compensation or sensitive audit details through dashboard aggregates.

## Validation expectations

- Regression tests prove the authenticated Admin route is request-time rendered and protected; production type generation and build no longer fail on the session clock read.
- Dashboard tests assert there are no seeded values or duplicate Recent Activities/Pending Approvals sections, and verify polling, refresh, loading/error/unavailable behavior.
- API tests cover role/status denial before queries, schema/range validation, no-store responses, database query shape, and aggregate field minimization.
- Domain tests cover policy configuration, effective dates, record ownership, approval versioning, invalid/stale transitions, audit events, and every metric's specified date/status/null handling.
- Migration and integration tests verify MySQL schema behavior, constraints, transactions, and representative authorized workflows.

## Calls for the implementation design

- Use the existing `Asia/Manila` reporting baseline until Admin configures an explicit company timezone.
- Use a single dashboard summary API to avoid a polling request per visual; keep specialized write/read APIs for each workflow.
- Treat incomplete or unconfigured metrics as unavailable, even after the underlying tables exist.
- Follow the existing metric contracts in `docs/system-specification/04-DATA-OWNERSHIP-AND-METRIC-DEFINITIONS.md`; use Admin-configured, versioned rules for unresolved values and do not enable a dependent metric until configuration is complete.
- Use the responsibility boundaries in `docs/system-specification/03-WORKFLOW-AND-APPROVAL-MATRIX.md`; constrain Pending Approvals on the Admin dashboard to items assigned for Admin action, including payroll approval.
- Preserve unrelated existing worktree changes and the already-disabled Company route.

## Risks and dependencies

The existing metric specification leaves payroll cutoff attribution, employee status rules, attendance/overnight/rest-day handling, and several workflow states unresolved. Admin configuration must define these before the corresponding metric becomes available. The project currently has no operational models, HR workspace, Admin Settings page, or migration history, so this is a multi-stage feature rather than a dashboard-only patch. The previous production build also encountered a separate `APP_ORIGIN` configuration error while prerendering `/account`; that configuration issue is outside this dashboard design.
