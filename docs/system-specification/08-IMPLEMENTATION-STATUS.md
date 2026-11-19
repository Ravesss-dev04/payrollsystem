# Implementation Status

**As of:** 2026-11-17
**Current milestone:** Admin dashboard and organization/settings foundations implemented; employee lifecycle code implemented; workforce and payroll plans remain
**Checkout snapshot:** Branch `backend`, HEAD `b1f760b`; existing uncommitted auth/MySQL/dashboard work was preserved. No commit or merge was made.

## Status definitions

- **NOT STARTED** — no implementation begun.
- **IN PROGRESS** — partial implementation exists, with gaps.
- **IMPLEMENTED** — code exists but required verification is incomplete.
- **VERIFIED** — behavior and relevant tests have been checked.
- **BLOCKED** — unsafe or incomplete dependencies prevent implementation.
- **REQUIRES REVIEW** — implementation/policy needs an explicit owner decision or technical review.

## Current verified inventory

| Area | Status | Evidence and remaining gap |
|---|---|---|
| MySQL configuration | VERIFIED | `prisma7.config.ts` loads environment through dotenv; Prisma datasource and adapter enforce MySQL. Read-only inspection used the configured connection and printed only seven table names; no credential/URL was exposed. |
| Authentication lifecycle | IN PROGRESS | Password, MFA, rate-limit, CSRF, opaque session, status/session-version validation, session revocation, and security audit code/tests. Test-account MFA exemption is limited to development/test; production Admin/HR accounts use the database-backed 60-day reauthentication policy regardless of test marker. Same-origin GETs without `Origin` require `Sec-Fetch-Site: same-origin`. Password reset workflow is not implemented despite related schema tables. |
| Role model | VERIFIED | Runtime and schema recognize exactly `admin`, `hr`, and `employee`; the approved design explicitly defers Team Leader. |
| Centralized RBAC | IN PROGRESS | Shared helper and page/API guards exist; HR-only employee mutation and Admin-only account-link permissions are enforced. Scope-aware query helpers, workflow-state checks, and employee self-service entitlements remain. |
| Admin-only dashboard route | VERIFIED | The Admin layout waits for request-time rendering before validating the session; `dashboard:read` is not granted to HR. Role tests deny HR, Employee, and malformed role values. |
| Dashboard existing UI and appended snapshot | VERIFIED | Static fixtures and duplicate activity/approval sections are removed. Existing card/chart layout is retained with explicit unavailable states; persisted account aggregates and one sanitized activity panel display below. Snapshot UI supports manual refresh and visible-page 30-second polling. |
| Dashboard authentication and summary API | VERIFIED | Admin authentication is deferred with `connection()` inside Suspense. `GET /api/admin/dashboard/summary` returns test-account-excluded User role/status aggregates and a bounded, sanitized security/account feed with no-store caching and per-admin rate limiting. Live MySQL/auth integration and authenticated browser access were not exercised. |
| Company and org structure | IMPLEMENTED | Admin-only Settings pages and APIs manage the single organization, branches, departments, teams, and versioned employment-status policy. Prisma models, constraints, transactional domain audit writes, and an additive migration are present. Migration application and live MySQL integration remain unverified; the migration assumes the existing `User` table is already present. |
| Employment status policy | IMPLEMENTED | Admin configures versioned employment statuses with explicit headcount eligibility and effective dates. Login `AccountStatus` values are not reused. |
| Employee lifecycle and assignment | IMPLEMENTED | HR-owned employee records and effective-dated status/department assignments are backed by additive Prisma models, audited transactions, strict HR APIs, and an Admin-only one-to-one account link. Focused tests pass; migration is generated but not applied, and live MySQL integration remains unverified. Team Leader scope is deferred. |
| Schedule, attendance, leave, OT | BLOCKED | No records, policies, workflows, APIs, or shared calculations; overnight/rest-day and payroll attribution rules need approval. |
| Compensation and payroll | BLOCKED | UI sample records only; no authoritative calculation engine, payroll cutoff, persisted batch, or approval workflow. |
| Assets, floor plan, announcements, documents | NOT STARTED | No authoritative operational sources/workflows verified. |
| Audit and compliance | IN PROGRESS | Security events are persisted; organization-policy changes now write transactional `DomainAuditEvent` records. Audit-feed integration and compliance evidence remain missing. |
| Role-specific navigation | IN PROGRESS | Admin Settings navigation is active and Company remains hidden; a guarded HR workspace exists at `/hr/employees`. Broader HR navigation and Team Leader navigation remain deferred. |
| Employee self-service authorization | BLOCKED | Admin account linking now exists, but employee-facing own-record endpoints and explicit own-record permissions are not implemented; Team Leader is not a runtime role. |
| System specification | VERIFIED | Eight specification documents now distinguish the three-role runtime scope, implemented organization settings foundation, and unimplemented employee/workforce features. |

## Requirement group status

| Requirement group | IDs | Status | Dependencies / evidence |
|---|---|---|---|
| Roles and permissions | ROLE-001–007 | IN PROGRESS / BLOCKED | Current three-role model verified; self-service linkage and domain scope remain unimplemented; Team Leader is deferred. |
| Navigation and feature mapping | NAV-001–005 | IN PROGRESS | Current Admin routes and prototypes inventoried; other role routes absent. |
| Employee lifecycle/team scope | EMP-001, TEAM-001 | IN PROGRESS / BLOCKED | HR-owned employee data, effective-dated employment/department assignments, guarded APIs, and Admin account linking are implemented. Team and Team Leader scope is deferred; live MySQL migration/integration remains unverified. |
| Attendance and schedules | ATT-001–002, SCH-001 | BLOCKED | Requires approved shift/date/rest-day policies and domain models. |
| Leave and overtime | LEAVE-001, OT-001 | BLOCKED | Requires balances, statuses, assignment scope, actual attendance, and payroll policy. |
| Payroll and compensation | PAY-001–002, COMP-001 | BLOCKED | Requires authoritative calculations, cutoffs, versions, approval and segregation rules. |
| Assets and concerns | ASSET-001, REQ-001 | NOT STARTED / BLOCKED | Requires inventory/request sources and confidentiality routing policy. |
| Dashboard | DASH-001–006 | VERIFIED foundation / BLOCKED operational metrics | Request-time Admin page guard, test-account-excluded account aggregates, one sanitized persisted security/account feed, manual refresh and 30-second visible polling; unsupported payroll, employee, organization, attendance, overtime, approvals, compliance, exports and filters remain unavailable pending linked plans. |
| Data integrity and metrics | DATA-001–002 | IN PROGRESS / BLOCKED | Organization/policy and employee/assignment models are present with unique links and audited transitions; shared workforce calculations remain absent. |
| Security, audit, exports | SEC-001–002, AUD-001, DASH-005 | IN PROGRESS / BLOCKED | Auth security and Admin Settings guards exist; domain audit writes cover organization settings; operational audit/feed and exports remain. |
| Quality acceptance | QA-001 | IN PROGRESS | Organization policy, API, and rendered-form tests pass. MySQL migration/integration and browser accessibility walkthroughs remain. |

## Verification record

- **Baseline before employee lifecycle:** `bun test` — 115 passed, 0 failed, 368 assertions across 33 files.
- **Organization focus:** 22 passed, 0 failed, 68 assertions across 3 files (`tests/domain/organization.test.ts`, `tests/api/organization-policy.test.ts`, and `tests/admin/settings-forms.test.tsx`).
- **Employee lifecycle focus:** 33 passed, 0 failed, 143 assertions across 6 files, including schema/service/API, HR workspace, HR layout, Admin Settings navigation, and role authorization.
- **Current full suite:** `bun test` — 144 passed, 0 failed, 494 assertions across 38 files.
- **Security review regressions:** Persisted MFA-policy and request-origin tests passed in the full suite. An isolated production login-route test also passed, verifying a test-marked Admin receives an MFA challenge instead of a session; its global module mocks were not retained because they contaminated unrelated tests.
- **Focused run:** dashboard layout, activity UI, polling, and snapshot fetch — 10 passed, 0 failed, 52 assertions across 4 files.
- **Static checks:** `bunx --bun tsc --noEmit --pretty false` passed; scoped ESLint over employee lifecycle sources/tests and the security review fixes passed with no warnings. The broader employee/sidebar lint completed with 0 errors and 5 existing unused-icon warnings in `AdminSidebar.tsx`. `git diff --check` passed with only line-ending notices.
- **Graphify:** Code-only refresh added the dashboard API/UI source nodes; `graph.json` now has 1,404 nodes and 2,424 links, and the report/HTML were regenerated. The semantic refresh for seven changed documents was deferred because the local extraction omitted 50 existing concepts and Graphify's shrink guard rejected replacing them. Those documents remain queued for a complete semantic refresh; no external API key was used.
- **Browser:** `/admin/dashboard` redirected to `/login` without an authenticated Admin session. No credentials were used or created; the new HR workspace was validated with rendered component tests, not an authenticated browser walkthrough.
- **Database inspection:** read-only `information_schema` query using existing configured environment; MySQL confirmed, seven auth/security tables listed. No URL or credential output and no database writes.
- **Build:** After the security review fixes, `bun run build` passed with process-local ephemeral security keys and an unreachable test-only database URL; no database was contacted. The manifest lists `/admin/dashboard` as Partial Prerendered and `/hr/employees` as Partial Prerendered, and does not list `/admin/company`. Settings and HR route types have generated successfully.
- **Migration:** `20261116000000_organization_foundation` was generated by schema-to-schema diff and inspected; it creates seven domain tables and foreign keys to the existing `User` table. It was not applied because no explicitly allowlisted disposable DB was provided.
- **Employee migration:** `20261117000000_employee_lifecycle` was generated from the Prisma schema diff and inspected. It creates only `Employee` and `EmployeeAssignment`, enforces unique employee number/email/optional account linkage and effective-start dates, and adds restrictive history foreign keys. It was not applied because no explicitly allowlisted disposable DB was provided.
- **Not performed:** authenticated dashboard/settings browser walkthrough; live MySQL/API integration; either migration application; operational workflow/API and workforce calculation tests.

## Stage tracking

| Stage | Status | Exit condition |
|---|---|---|
| 1. Discovery and documentation | VERIFIED | Eight specification documents and initial traceability exist; current implementation is distinguished from target. |
| 2. Role and permission foundation | IN PROGRESS | Exactly three runtime roles; Admin organization policy and HR employee lifecycle/account linking are implemented and covered by focused tests. Broader self-service authorization and live MySQL verification remain. |
| 3. Workflow and data integrity | BLOCKED | Policy gates resolved; source models, workflow states, shared services, migration/audit/test strategy approved. |
| 4. Navigation and module alignment | IN PROGRESS | Admin Settings navigation is active, Company remains absent, and the HR employee workspace is guarded; broader HR navigation remains. |
| 5. Admin Dashboard | VERIFIED foundation | The request-time Admin page, database account snapshot, single sanitized feed, refresh/polling behavior, fixture removal, browser-safe schema boundary, and unsupported states are verified; operational metrics wait for authoritative sources. |
| 6. Verification and regression | IN PROGRESS | Full automated suite, scoped lint, TypeScript, Next type generation, and production build pass; authenticated browser, live database, and domain acceptance remain. |
| 7. Final reconciliation | IN PROGRESS | Safe-slice evidence recorded; operational requirements remain blocked or unverified. |

## Required next decisions before Stage 3 calculations

### 2026-11-19 Employee Details update

An HR-only Employee Details page and guarded single-employee GET endpoint are implemented. The profile shows persisted identity, work email, current status, and department. Four primary tabs render; schedule, assets, attendance, leave, and unsupported profile fields explicitly show unavailable states rather than fixture values. Existing edit and lifecycle services are reused. There were no database or migration changes. Verification: 146 tests passed across 38 files, TypeScript passed, scoped ESLint passed, and the production build passed. Live database integration, authenticated visual review, and responsive viewport checks remain unverified.

1. Authoritative payroll engine, pay periods/cutoffs, earning-date attribution, rounding and recalculation.
2. Overnight shift work-date/rest-day/holiday/absence handling and crossing-cutoff allocation.
3. Employee-account linking, HR scope, and status definitions for headcount and offboarding.
4. Effective-dated team assignment cardinality, overlaps, acting coverage, and assignment authorizer.
5. Attendance grace, punch correction, leave denominator, and absence-finalization rules.
6. Compensation initiator eligibility and segregation-of-duties rules.

These are documented blockers, not permission to invent default business behavior.

