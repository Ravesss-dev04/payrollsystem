# Enterprise Admin Dashboard and Role Boundaries

> Historical design for the earlier Admin Dashboard safe slice. The current authoritative requirements are in [`docs/system-specification/`](../../system-specification/). This document's earlier decision to defer the `team_leader` role applied to that limited slice and is superseded by the current four-role target; the role remains unimplemented until its server-side assignment scope is built.

**Status:** Approved for the safe first slice; business-model work deferred
**Date:** 2026-11-15

## Intent

Replace the illustrative Admin Dashboard with a secure monitoring and decision-support
surface for an offshore call-center payroll system. It should help administrators
identify payroll, staffing, attendance, overtime, approval, and security issues
without changing financial or attendance records from dashboard widgets.

The central constraint is truthfulness: the dashboard must use established
business data and calculations. Where the current application has no source of
truth, the UI must show that data is unavailable rather than infer or fabricate
it.

## Goals

- Preserve the current Next.js App Router, TypeScript, Prisma, MySQL/MariaDB
  adapter, existing session recovery behavior, and visual direction.
- Define exactly four server-authoritative roles: `admin`, `hr`, `team_leader`,
  and `employee`, each with explicit least-privilege permissions.
- Restrict the Admin Dashboard and its data endpoints to active, authenticated
  admins, independent of navigation visibility.
- Keep dashboard financial data read-only. Route all approvals and changes to
  their designated business modules.
- Use shared, documented metric functions and source records across dashboards
  and business modules.
- Calculate attendance using configured company timezone, assigned shifts,
  overnight shift instances, rest days, approved leave, policy grace periods,
  and validated punches.
- Support responsive, accessible, filterable analytics only where supported by
  real data.
- Preserve existing MySQL records; use reviewed, non-destructive migrations
  only if a validated data model is approved.

## Non-goals and anti-goals

- Do not invent payroll totals, employee counts, attendance, approvals,
  compliance states, thresholds, or staffing targets.
- Do not independently calculate official payroll in dashboard code.
- Do not make dashboard cards approve payroll, change compensation, or edit
  attendance.
- Do not add AHT, CSAT, FCR, call volume, QA, or productivity metrics without a
  verified call-center integration.
- Do not reset the database or replace its schema.
- Do not grant `team_leader` global or salary access, or allow employees or team
  leaders to modify their own role/team assignments.
- Do not claim live network-recovery, operational, or responsive behavior was
  tested unless it was exercised.

## User-approved requirements

- Dashboard finance is read-only; sensitive actions go through existing
  authorized workflows.
- HR, Admin, and Team Leader views must share metric definitions.
- Attendance follows assigned shifts and company timezone, including overnight
  shifts, rather than a calendar-midnight shortcut.
- Admin navigation groups company management, user/role management, payroll
  approvals/compensation, and settings rather than adding duplicate top-level
  pages.
- HR owns employee records, schedules, attendance, OT, payroll processing,
  leave, assets/devices, floor plan, and announcements.
- Team Leaders are limited to explicitly assigned teams and their employees;
  they do not see salary, compensation, complete payroll, settings, or other
  teams' private records.
- Employees see only their own allowed records and self-service actions.
- Unsupported dashboard metrics remain unavailable until a genuine source is
  integrated.

## Codebase and database findings

### Application

- The application uses Next.js 16 App Router, React, TypeScript, Tailwind, and
  Recharts.
- Prisma 7 uses the MariaDB driver adapter. The configured database URL scheme
  and Prisma datasource both identify MySQL; the URL and credentials were not
  printed.
- Existing authentication is database-backed, with opaque sessions, MFA,
  account status checks, and session recovery UI.
- The Admin Dashboard is under `app/admin/dashboard`. Its data source is
  `app/admin/dashboard/data.ts`, which hardcodes the date, projected payroll,
  department names, payroll trend, attendance classifications, activities, and
  approvals. Several chart labels and currency glyphs are also illustrative.
- Payroll approvals and compensation use hardcoded sample arrays in their
  respective `data.ts` modules. Users/roles and company pages also contain
  demo data; these are not persisted business workflows.
- The only API routes found are authentication, MFA, session, and logout routes.
  There are no dashboard, payroll, attendance, workforce, export, or approval
  APIs.
- The current Admin layout checks that a session exists. The dashboard page
  checks `dashboard:read`, which is currently granted to both Admin and HR.
  Therefore this is not yet an Admin-only dashboard boundary.
- Current authorization and Prisma `UserRole` support only `admin`, `hr`, and
  `employee`. No team assignment or team-scoped authorization model exists.
- The current sidebar exposes Company, Users & Roles, Payroll Approvals,
  Compensation, and a Settings entry; some destinations are incomplete or
  unavailable. There are no HR, Team Leader, or Employee navigation shells
  matching the revised structure.

### MySQL schema

The configured MySQL database was inspected read-only through
`information_schema`; the live schema currently contains only these seven
authentication/security tables:

- `User`
- `Session`
- `MfaChallenge`
- `MfaRecoveryCode`
- `PasswordResetToken`
- `AuthRateLimitBucket`
- `SecurityAuditEvent`

There are no Company, Branch, Department, Team, Employee, Employment,
Compensation, PayrollBatch, PayrollItem, Cutoff, Attendance, Shift, Leave,
Overtime, Asset, Announcement, Approval, Compliance, or staffing-target tables.
`SecurityAuditEvent` exists, but no payroll or HR writes currently generate
domain audit events because those modules are illustrative.

The Prisma schema agrees with the live authentication-only schema. There is no
Prisma migrations directory in the project. No company timezone setting or
timezone configuration variable is present. No schema changes or database
writes were performed for this assessment.

## Risks and gaps

1. **No operational source data:** current KPI and chart values are fictional
   sample data. The live database cannot calculate employee headcount,
   departments, attendance, shifts, payroll, overtime, approvals, or compliance.
2. **No shared business engine:** there is no payroll calculation engine or
   attendance policy/schedule calculation source to reuse. Building dashboard
   calculations now would contradict the requirement not to create a competing
   source of truth.
3. **Role migration required:** adding `team_leader` changes the MySQL enum and
   role authorization. It needs a reviewed migration and an explicit assignment
   model; this must not be hidden behind UI-only access.
4. **Team scope is not representable:** there are no employee/team relations or
   effective-dated team assignments, so Team Leader data boundaries cannot yet
   be enforced in queries.
5. **Overnight attribution is not specified in existing code:** no shift
   instance, company workday, or payroll cutoff model exists to decide which
   reporting date owns a shift that crosses midnight.
6. **Timezone is unknown:** there is no configured company timezone. Guessing
   one would risk changing attendance and payroll reporting boundaries.
7. **Approval and audit feeds are not real:** current dashboard approval and
   activity items are static examples; no approval records or domain events
   exist.
8. **Reference screenshot is not available in the current workspace
   attachments:** only written visual direction can be verified here unless the
   image is supplied again.

## Proposed implementation architecture

### Phase 0: Resolve authoritative sources and reporting rules

Before introducing operational schema or claiming dashboard metrics, identify:

- The authoritative payroll source/calculation rules, including gross, net,
  projected, computed, approved, paid, OT, and employer-cost meanings.
- The employee, organization, schedule, attendance, leave, overtime, and
  approval records that are authoritative (or approve creating these business
  modules as a separate project).
- Company IANA timezone and the workday/payroll attribution rule for overnight
  shifts.
- Team membership and Team Leader assignment cardinality/effective-date rules.
- Which HR and Team Leader workflows already exist outside this project, if
  any, and whether their navigation should remain unavailable until integrated.

The current auth-only schema is not a basis for inventing a payroll engine.

### Phase 1: Enforce role boundaries and remove misleading demo analytics

- Extend role definitions, permission types, tests, and the Prisma enum to the
  four approved roles only after migration review.
- Define separate permissions for Admin analytics, HR reports, team-scoped
  operations, and employee-owned records. Team scope must be enforced in server
  queries using trusted database assignments.
- Restrict the Admin dashboard page and future API to active Admin sessions.
- Replace hardcoded dashboard amounts, counts, dates, and sample events with
  explicit unavailable states until their sources exist. Do not display
  “0” where the correct state is “no source data.”
- Consolidate navigation only for modules that actually exist. Unavailable
  modules must not appear as functional links.

### Phase 2: Establish shared source-of-truth services

When domain tables and workflows are provided or approved:

- Put payroll aggregation behind the existing/approved payroll calculation
  service; dashboard code can only read its defined results.
- Create one shift-aware attendance calculation used by Admin, HR, and
  Team Leader reporting. It must construct scheduled shift windows in the
  company timezone, handle cross-midnight shifts, and use current policy,
  approved leave, rest days, and validated punches before classifying absence.
- Define workforce, overtime, approval, and activity metrics with documented
  source, statuses, date bounds, timezone, filters, and comparison period.
- Use effective-dated team assignments and scope every Team Leader query to
  assigned teams; prevent salary and cross-team data from entering the
  response at all.
- Add indexes only after the actual model and query patterns are established.

### Phase 3: Read-only dashboard API and interface

- Add a server-side dashboard query service and authenticated GET endpoint(s).
  Every request revalidates the database session, current status, and Admin
  permission; validates dates and filter IDs; and returns typed availability,
  reporting period, filters, metrics, and `lastUpdatedAt`.
- Keep financial values out of URLs and logs. Apply no cross-user cache; begin
  uncached unless a measured need justifies scoped caching.
- Build reusable header/date filter, KPI, payroll trend, attendance, workforce
  and shift, overtime, activity, approval, and alert components.
- Add functional navigation to existing detailed modules; dashboard approvals
  only link to review screens. Never execute approval mutations from widgets.
- Provide loading, empty, unavailable, partial-error, and retry states. Do not
  treat connectivity errors as logout; preserve the existing session recovery
  behavior.
- Defer exports until real report sources and private-download/audit
  requirements are designed. No dummy export button.

### Phase 4: Verification and rollout

- Add table-driven permission tests for all four roles and deny cases, including
  team-scope and employee ownership.
- Add unit/integration tests for metric definitions, overnight shifts,
  timezone boundaries, payroll status separation, OT status separation,
  approval counts, unavailable sources, API validation, and no sensitive field
  leakage.
- Test browser layouts at desktop/tablet/mobile sizes and keyboard/screen-reader
  behavior.
- Review every schema migration against the live MySQL schema; preserve all
  existing authentication/test-account rows. Never reset the database.
- Report exactly which tests ran and which real workflows remain unavailable.

## Metric contract (current state)

No operational metric below is currently computable from the live schema.
“Unavailable” is the required current display state, not numeric zero.

| Metric | Required source and definition | Current state |
|---|---|---|
| Projected/computed/approved/paid payroll | Authoritative payroll engine and cutoff-specific statuses; separate gross, net, and employer costs | Unavailable |
| Active employees / employee movement | Employee employment records and established active/archived definitions | Unavailable |
| Departments, teams, branches | Company organization records and active status | Unavailable |
| Expected/present/late/absent/on leave | Shift instances, timezone, rest days, leave approvals, attendance policy/grace, validated punches; unique employee per shift | Unavailable |
| Shift coverage | Scheduled and present headcount; coverage ratio only if a real target exists | Unavailable |
| Requested/approved/recorded OT and cost | Overtime workflow plus payroll engine; keep each state distinct | Unavailable |
| Pending approvals | Real workflow statuses; exclude completed, rejected, withdrawn, and cancelled | Unavailable |
| Recent activities | Trusted audit events, newest first, sensitive details redacted | Admin-only security/account feed reads `SecurityAuditEvent`; no domain activities exist |
| Compliance alerts | Verified integration/reconciliation statuses and configured deadlines | Unavailable |
| Call-center KPIs | Explicit future platform integration | Out of scope until integrated |

## Decisions left to the implementation owner

The design intentionally does not choose a company timezone, overnight
attendance attribution rule, payroll calculation source, or operational
database model because none is present in the repository or live schema. These
are correctness and data-integrity decisions, not safe defaults. Resolve them
before implementing those metrics or any migration.

## Acceptance boundary for the first implementation

The first safe implementation hardens Admin-only access, eliminates misleading
dashboard fixtures, preserves the current visual shell, and presents the
five-panel screenshot layout with explicit unavailable states. Its only live
dashboard data is a sanitized, read-only feed of persisted security/account
audit events. Real payroll, workforce, attendance, shift, OT, approval,
compliance, and cross-role analytics require the missing business records and
shared workflows described above. The system must not claim those features
complete until those sources exist and their metric tests pass.
## User decision update

This update supersedes any broader or unresolved scope above where it conflicts.

- The application’s MySQL database is the intended future source of truth.
  There is no identified external payroll, HR, or call-center platform; do not
  add integrations without separate approval and specifications.
- The user approved the safe first deliverable: enforce Admin-only dashboard
  access, remove dashboard fixtures, label non-persistent demo data in Payroll
  Approvals, Compensation, and User & Role Management, preserve the visual
  shell/session architecture, and present the screenshot-aligned panels with
  explicit unavailable states.
- The safe slice also permits one Admin-only, read-only endpoint backed by
  persisted `SecurityAuditEvent` records. It returns sanitized security/account
  activity only. Do not add empty-metric APIs, schema/migration changes, or
  fabricated operational data.
- Do not expand the current role enum in this slice. `team_leader` belongs to
  the later role/team-assignment phase, where all four roles will be
  implemented together with server-side scope checks.
- Use `Asia/Manila` as the company timezone baseline. Make it a company-owned
  setting in the future domain schema; do not use host-local time.
- No overnight workday/payroll attribution rule exists. The proposed future
  model assigns each scheduled shift instance an explicit business `workDate`
  in the configured timezone and attaches attendance to that instance. Payroll
  allocation remains a separate approved earning-date/cutoff rule. A shift
  crossing a date remains one attendance instance; it must not automatically
  change rest-day, absence, or payroll classification. The policy for rest-day
  interaction and shifts crossing payroll cutoffs must be explicitly approved
  before implementing either calculation.
- Team assignment design baseline: Team Leaders may have multiple teams, one
  primary plus explicitly authorized secondary/temporary/acting coverage.
  Employees have one primary team at a time; approved secondary/temporary
  assignments do not change primary organizational or compensation ownership.
  Assignments are effective-dated with start/end, type, status, and authorizer;
  history is retained. Prevent overlapping employee primary assignments and
  conflicting primary team leads unless a documented exception is authorized.
  HR owns official employee assignments; Admin owns structure and access
  policy; Team Leaders can only request/recommend changes. Server queries
  enforce current assignment scope, and company headcount deduplicates
  employees.
- After the safe slice, prepare a separate phased plan for the missing company,
  employee, team, compensation, attendance, schedule, leave, overtime, payroll,
  approval, asset, request, audit, and compliance models/workflows. Include
  dependencies, shared metric definitions, validation, history, authorization,
  migrations, and test strategy. No operational analytics are complete until
  their actual sources and shared calculations exist.
