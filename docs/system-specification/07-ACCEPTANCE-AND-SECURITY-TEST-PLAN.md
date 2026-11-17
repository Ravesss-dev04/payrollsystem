# Acceptance and Security Test Plan

**Status:** Authentication and Admin dashboard foundation tests are implemented; operational-domain acceptance remains planned or blocked
**Assessment date:** 2026-11-15

**Approved role scope:** The implementation accepts exactly `admin`, `hr`, and `employee`. Team Leader scenarios in this legacy target plan are deferred; no fourth role or Team Leader workflow may be introduced by the approved dashboard/domain plans.

## Verification standard

A requirement is **VERIFIED** only when server behavior, data scope, workflow state, user-visible result, and relevant automated tests are supported by evidence. A route, component, navigation label, mock record, or passing build alone is insufficient.

## Current test evidence

- Current full `bun test`: **93 passed, 0 failed, 300 assertions across 30 files**.
- Tests cover authentication policy, role denial, login schemas, session checks/revocation, MFA primitives, rate limits, CSRF/origin, MySQL adapter configuration, test-account policy, request-time Admin layout, dashboard snapshot query/route contracts, test-account exclusion, snapshot response validation, visible polling lifecycle, single-panel dashboard layout, and unavailable states.
- No operational domain model/API exists, therefore no payroll, attendance, scheduling, leave, overtime, workflow transition, report export, or domain audit behavior can be accepted yet.
- Current dashboard-foundation verification: focused dashboard tests pass; scoped ESLint, `bun x tsc --noEmit`, `bun x next typegen`, and a production build with ephemeral process-local security configuration pass. The build reports `/admin/dashboard` as partially prerendered and `/admin/company` is absent from the route manifest.
- Browser verification reached `/admin/dashboard` but the server redirected to `/login` because no authenticated Admin session was available. No credentials were used or created; panel-specific responsive, keyboard, refresh, empty, and error states were therefore not visually checked in a browser.

## Stage 2 — role and authorization acceptance

### Role and account

- Assert the schema, runtime validator, login principal, session revalidation, UI role map, and tests accept exactly `admin`, `hr`, `employee`.
- Deny unknown, malformed, missing, case-variant, stale, and unsupported roles at login and every protected request.
- Verify inactive/suspended/offboarded users cannot create or retain sessions; role/status changes are revalidated and revoke or invalidate existing sessions.
- Verify role input is rejected from profile, user, login, and request payloads unless using the separate authorized role-administration workflow.

### Permission and data scope

- Table-test each role/action pair in `02-RBAC-AND-PERMISSION-MATRIX.md`.
- Directly request protected pages and APIs as each role; navigation visibility must not change the result.
- Test employee own-record IDOR with a different employee ID; assert the database query is identity-scoped.
- Do not add a Team Leader role, team assignment scope, Team Leader page, or Team Leader API in this approved phase.
- Verify HR can perform only HR-owned actions and cannot approve payroll or change roles/company policy.
- Verify Admin governance access does not imply employee-record mutation; exercise explicit employee self-service overlay for Admin/HR accounts with linked employee records.
- Test query predicates and response schemas for salary, token, MFA, audit before/after, and unrelated employee fields.

### Input/mutation safety

- Reject mass assignment of role, status, employee linkage, team assignment, approved hours, payroll status, compensation values, and audit fields in ordinary forms.
- Validate identifiers against authorized company/branch/team/employee scope before mutation.
- Verify safe explicit update field allowlists and server-side schemas; no raw client object passed to Prisma update.
- Test concurrency conflicts, stale writes, duplicate submission, replay, and revocation between validation and mutation.

## Stage 3 — workflow acceptance

- Test every row of `03-WORKFLOW-AND-APPROVAL-MATRIX.md` at all allowed and denied transition edges.
- Leave and overtime: employee submissions remain requests; HR is the authorized decision/record owner, and employee identity is derived from the current linked account.
- Overtime requested/approved/recorded/payroll-eligible amounts remain distinct; actual attendance is required before payroll inclusion.
- Schedule: proposal and endorsement cannot change published schedule; HR publication creates auditable effective version.
- Payroll: HR prepare/verify, Admin final approval tied to immutable batch version, then authorized processing; deny self-approval if segregation policy requires.
- Compensation: require evidence/reason/effective date, Admin authorization, conditional official update, and full audit.
- Offboarding revokes sessions and prevents new access while preserving required employment/payroll history.
- Confidential concerns remain out of scope for the approved dashboard/domain plans.
- Verify notifications have permitted recipients only and do not include secret/sensitive fields.

## Stage 3/5 — calculation and data integrity acceptance

- Payroll: compare each shared service result with approved calculation fixtures; test cutoff boundaries, rounding, null/missing source, state separation, adjustment approval, versioning, and duplicate employee avoidance.
- Attendance: test company-timezone date boundaries, assigned shift windows, overnight shifts, daylight/timezone handling where relevant, rest days, holidays, approved leave, grace periods, late, incomplete/missing punches, corrected punches, and absence deadline.
- Assert no employee is double-counted across attendance classes; denominator and numerator are returned/documented.
- Overtime: test requested vs authorized vs actual hours and only use payroll engine for payable expense.
- Headcount: count unique employment records, not user links; test effective-dated joins, inactive/archived policy, additions/departures, and filters.
- Coverage: show target ratio only with a configured workforce-planning target; otherwise show scheduled/present counts without inferred percentage.
- Test aggregation against MySQL and ensure results stay database-side for large sets; check indexes only after measured query patterns.

## API, export, and audit acceptance

- Every domain endpoint: authentication, explicit permission, query-level scope, current workflow state, schema validation, bounded request body, safe error response, appropriate rate limit, and no secret detail.
- Admin dashboard summary API contract: deny unauthenticated and non-Admin callers before dashboard queries; reject query parameters; enforce the per-admin database-backed rate limit and `Retry-After`; return no-store JSON; verify test-account-excluded User aggregates, newest-first bounded activity query, minimal selected fields, fixed event summaries, response allowlist, and absence of raw audit payloads.
- Activity UI: verify loading, sanitized event display, Manila-local timestamps, empty state, retryable failure, refresh action, and accessible status/error announcement. The feed is explicitly security/account activity, not payroll or workforce activity.
- Dashboard-foundation automated evidence: `dashboard-summary.test.ts` exercises aggregate/query shape, API authorization/rate limit, no-store and response allowlist; `dashboard-summary-schema.test.ts` prevents importing the Prisma server client into shared browser code; `dashboard-snapshot-client.test.ts` exercises fetch and response validation; polling and UI tests cover visible-page scheduling and unavailable/stale states. These do not replace live MySQL/authentication integration or authenticated browser/accessibility verification.
- Fuzz malformed dates, status values, IDs, filter combinations, oversized arrays, duplicate identifiers, and URL/header injection.
- Verify error responses do not leak SQL, Prisma, connection, schema, user existence, or sensitive account details.
- Verify each domain mutation writes the matching audit event atomically with the update.
- Exports use the same metric service and filters, prevent unauthorized row-level disclosure, produce private time-limited downloads, and audit sensitive export requests/downloads.

## UI, accessibility, and regression acceptance

- Verify each role sees only its approved navigation while direct-route access remains independently denied.
- Verify inaccessible/prototype routes do not imply persisted actions; unavailable, empty, loading, error, and zero are distinct.
- Test responsive layouts at supported desktop/tablet/mobile widths; ensure no clipping of labels, filters, tables, dialogs, or notices.
- Keyboard-only navigation, focus visibility/order, semantic headings, form labels/errors, status announcements, chart alternatives, and screen-reader access.
- Exercise session timeout, revoked session, database/network error, and recovery behavior without mislabeling a transient request failure as logout.
- Run focused tests, full Bun suite, lint, TypeScript check, production build, and any MySQL migration/integration tests required by the changed stage.

## Release evidence checklist

- Requirement IDs and evidence updated in `06-IMPLEMENTATION-AND-TRACEABILITY-PLAN.md` and `08-IMPLEMENTATION-STATUS.md`.
- Migration review and rollback plan; database backup/restore assumptions verified; no destructive schema commands.
- Security review covers cross-role and cross-team boundaries.
- Test outputs and environment-safe database inspection documented without secrets.
- Manual browser and accessibility results recorded separately from automated tests.
- Blocked and untested behavior clearly identified; never report planned tests as passed.

