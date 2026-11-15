# Payroll and HR Domain Workflows Implementation Plan

> **SUPERSEDED — DO NOT EXECUTE.** The current approved design is [`2026-11-15-live-admin-dashboard-design.md`](../specs/2026-11-15-live-admin-dashboard-design.md), which keeps only the existing `admin`, `hr`, and `employee` roles and explicitly excludes an application payroll calculation engine. Use the dependency-ordered plans [`2026-11-15-live-admin-dashboard-foundation.md`](2026-11-15-live-admin-dashboard-foundation.md), [`2026-11-15-organization-and-employee-records.md`](2026-11-15-organization-and-employee-records.md), [`2026-11-15-workforce-operations.md`](2026-11-15-workforce-operations.md), and [`2026-11-15-payroll-and-compliance-workflows.md`](2026-11-15-payroll-and-compliance-workflows.md) instead.

> Current role, workflow, navigation, data-ownership, and acceptance requirements are governed by [`docs/system-specification/`](../../system-specification/). This plan is supporting implementation history and must be reconciled against that specification before work begins.

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Do not begin domain implementation until the decision gates in Task 1 are explicitly approved.

**Goal:** Build the MySQL-backed company, workforce, compensation, attendance, payroll, approval, and audit sources required for trustworthy administration and analytics.

**Architecture:** Keep Next.js App Router, Prisma 7, and the existing MySQL/MariaDB adapter. Introduce versioned domain services and explicit, audited state transitions; dashboard and exports consume those same authoritative services instead of implementing business calculations independently. Deliver the phases in dependency order, adding each domain only after its policies and authorization boundaries are approved.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma 7.10, MySQL/MariaDB, Bun tests.

**Spec:** `docs/superpowers/specs/2026-11-15-enterprise-admin-dashboard-design.md`

## Global Constraints

- The application database is MySQL, not PostgreSQL; preserve the Prisma MySQL datasource and existing MariaDB adapter.
- The live database currently contains only authentication and security models. Do not imply that business records or payroll calculations already exist.
- The target roles are exactly `admin`, `hr`, `team_leader`, and `employee`. A Team Leader is not an administrator and is limited to current authorized team assignments.
- Use `Asia/Manila` as the initial company timezone and persist timezone as company-owned configuration.
- A scheduled shift instance has an explicit local business `workDate`; attendance attaches to that instance. A shift crossing midnight remains one instance.
- Do not calculate rest-day treatment for overnight shifts or cutoff allocation across payroll periods until those policies are explicitly approved.
- Employee primary team assignments are effective-dated, authorized, auditable, and history-preserving. Team Leaders may cover multiple teams; employees have one primary team at a time. Secondary, temporary, or acting assignments do not silently change primary ownership.
- HR owns official employee assignments; Admin governs organization and access policy; Team Leaders can request or recommend changes, not self-assign.
- Company headcount deduplicates employees. Admin authorization is enforced server-side for every protected operation and rechecked against current account status and assignments.
- Do not invent account, payroll, attendance, leave, approval, or compliance status values. Define each state machine from approved business policy before implementation.
- The dashboard is read-only and never becomes a second payroll or attendance calculation engine. Do not add external integrations without separate approval.

## Review Focus

- **Overnight shifts cross a rest day:** attendance stays attached to its scheduled `workDate`; no rest-day or absence result is calculated until the policy gate is approved.
- **A shift, adjustment, or pay event crosses payroll cutoff boundaries:** preserve the source event and defer payroll attribution until the cutoff rule is approved.
- **An employee has secondary assignments or repeated user-account links:** enforce one primary team at a time, validate exceptions, and deduplicate company headcount.
- **A Team Leader requests another team's data or changes their own assignment:** deny server-side unless the current authorized assignment grants that exact scope; never rely on navigation hiding.
- **Payroll is recalculated, approved, exported, or retried:** use the established calculation service, immutable snapshots, concurrency protection, audit events, and idempotent operations; never convert requested or unapproved amounts into payable totals.

## Target File Map

- `prisma/schema.prisma` and `prisma/migrations/<timestamp>_<domain>/` — MySQL domain models and reviewed migrations.
- `app/lib/auth/authorization.ts` and `app/lib/auth/*` — four-role permissions, account checks, and server-side team-scope policy.
- `app/lib/company/`, `app/lib/employees/`, `app/lib/teams/` — company structure, employee records, assignment history, and domain validation.
- `app/lib/workforce/` — policy, schedules, attendance, leave, and overtime services.
- `app/lib/compensation/` and `app/lib/payroll/` — effective-dated compensation, authoritative payroll calculation, cutoff, batch, and item workflows.
- `app/lib/approvals/`, `app/lib/audit/`, and `app/lib/compliance/` — state transitions, attributable events, and verified compliance processing state.
- `app/api/admin/` — authenticated and permission-checked administrative endpoints following existing App Router conventions.
- `app/admin/` — workflow screens that use the domain APIs; no page-local sample arrays as business truth.
- `app/lib/analytics/` and `app/api/admin/dashboard/` — shared metric definitions and bounded, database-backed dashboard queries.
- `tests/domain/`, `tests/api/admin/`, and `tests/admin/` — domain, MySQL integration, API authorization, and rendered behavior tests.

---

### Task 1: Approve Business Policies and Domain Boundaries

**Files:**
- Modify: this plan only, after receiving explicit answers
- No schema or application code before approval

**Interfaces:**
- Produces: an approved decision record for the policy gates that determine database constraints and payroll/attendance calculations.

- [ ] **Step 1: Confirm company and employment boundaries**

Resolve whether the database models one company or multiple companies, required branch/site boundaries, employee identity and account-link rules, employment lifecycle, archive/deletion behavior, and owner of each status transition.

- [ ] **Step 2: Approve timekeeping and cutoff policies**

Define schedule publication and exceptions; attendance grace periods and absence finalization; overnight shift rest-day treatment; recorded and approved overtime rules; leave overlap and approval behavior; cutoff boundaries, earning-date attribution, corrections, and late adjustments. Explicitly approve or reject the proposed scheduled-shift `workDate` behavior.

- [ ] **Step 3: Approve compensation and statutory calculation ownership**

Define effective dating, allowance/bonus eligibility, adjustment approval, overtime pay rules, deductions/contributions/tax sources, rounding, recalculation, and historical snapshot policy. Identify which computations require an external legal/accounting specification; do not invent values or declare compliance.

- [ ] **Step 4: Approve assignment and workflow authority**

Confirm the Team Leader multi-team scope, employee secondary/temporary assignment rules, overlapping assignment exceptions, HR/Admin/Team Leader duties, approval thresholds, required justifications, escalation paths, and audit retention.

- [ ] **Step 5: Record approval gates before schema work**

Write approved decisions and unresolved items into the design document. If an unresolved choice changes status semantics, payroll totals, attendance classifications, or authorization scope, stop that dependent phase rather than choose a default.

### Task 2: Establish Company, Organization, Employee, and Assignment Sources

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_company_workforce_foundation/`
- Create: `app/lib/company/`, `app/lib/employees/`, `app/lib/teams/`
- Modify: `app/lib/auth/authorization.ts`
- Test: `tests/domain/company-workforce.test.ts`
- Test: `tests/domain/team-assignment.test.ts`
- Test: `tests/api/admin/team-scope.test.ts`

**Interfaces:**
- Produces: canonical company/timezone, organization hierarchy, employee lifecycle, user-to-employee link, effective-dated team assignments, and authorization scope checks.

- [ ] **Step 1: Add failing domain and MySQL integration tests**

Test company-scoped department/team relationships; optional unique user-to-employee linkage; rejection of overlapping primary assignments; preservation of historical assignments; authorized secondary/temporary/acting assignments; and unique company headcount when an employee has multiple assignments.

- [ ] **Step 2: Design and review MySQL Prisma models**

Add company configuration, branch/site, department, team, employee, and assignment models according to Task 1 decisions. Persist `Asia/Manila` as the initial company setting. Store assignment type, effective start/end, status, authorizer, and audit reference without overwriting history. Do not infer fields/statuses from frontend fixtures.

- [ ] **Step 3: Add role and server-side scope policy**

Introduce the four roles only with the assignment model and policy. Admin governs company/role structure; HR manages official employee assignments; Team Leaders can only read or act on their current authorized team scope; employees access only their own permitted resources. Validate scope from database assignments on every protected request.

- [ ] **Step 4: Add reviewed MySQL migration and migrate a disposable test database**

Use the existing Prisma MySQL datasource/adapter, inspect generated SQL, and verify migration application against an explicitly allowlisted non-production database. No PostgreSQL adapter or production data migration.

- [ ] **Step 5: Run domain, integration, and authorization tests**

Expected: overlapping primary assignments and unauthorized scope are rejected; history remains queryable; headcount is deduplicated.

### Task 3: Model Workforce Policy, Schedules, Attendance, Leave, and Overtime

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_workforce_timekeeping/`
- Create: `app/lib/workforce/policies.ts`
- Create: `app/lib/workforce/schedules.ts`
- Create: `app/lib/workforce/attendance.ts`
- Create: `app/lib/workforce/leave.ts`
- Create: `app/lib/workforce/overtime.ts`
- Test: `tests/domain/workforce-timekeeping.test.ts`
- Test: `tests/domain/attendance-classification.test.ts`

**Interfaces:**
- Consumes: Task 1 approved policies and Task 2 employee, company timezone, and team scope.
- Produces: persisted schedule instances, attendance, corrections, leave, and requested/approved/recorded overtime with auditable transitions.

- [ ] **Step 1: Write failing tests from approved policy examples**

Cover schedule applicability, company-local work dates, late classification and grace period, absence finalization, duplicate punches, corrections, leave overlap, overtime request versus approval versus recorded hours, and Team Leader scope. Add overnight/rest-day/cutoff cases only after their policy gates have approved expected outcomes.

- [ ] **Step 2: Add policy and schedule models with explicit shift instances**

Persist schedule rules and generated shift instances separately. Each instance has one company-local `workDate`, start/end instants, assigned employee/team, and policy reference. Crossing midnight does not split the attendance instance.

- [ ] **Step 3: Implement attendance and correction services**

Attach punch/attendance records to the assigned shift instance, classify against approved policy, prevent category double-counting, and preserve correction history with actor and reason. Do not classify a worker absent before shift and finalization rules establish it.

- [ ] **Step 4: Implement HR leave and overtime workflows**

Keep leave approval with HR unless an approved escalation assigns it elsewhere. Distinguish requested, approved, rejected, withdrawn, and recorded overtime according to approved transitions; only approved/recorded values may be consumed by later calculations.

- [ ] **Step 5: Migrate and test against MySQL**

Expected: local timezone boundaries and approved edge cases match policy; all writes are authorized and history-preserving.

### Task 4: Establish Effective-Dated Compensation and Official Payroll Calculation

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_compensation_payroll/`
- Create: `app/lib/compensation/`
- Create: `app/lib/payroll/cutoffs.ts`
- Create: `app/lib/payroll/calculation.ts`
- Create: `app/lib/payroll/reconciliation.ts`
- Test: `tests/domain/compensation.test.ts`
- Test: `tests/domain/payroll-calculation.test.ts`
- Test: `tests/domain/payroll-reconciliation.test.ts`

**Interfaces:**
- Consumes: approved calculation rules, Task 2 employees, and Task 3 attendance/leave/overtime records.
- Produces: the single official payroll calculation result used by approval, reports, and dashboard summaries.

- [ ] **Step 1: Add failing calculation tests from approved payroll fixtures**

Test cutoff membership, effective-dated salary changes, approved adjustments only, leave and overtime inclusion, deductions/contributions, rounding, duplicate prevention, corrections, reconciliation, and historical reproducibility. Use independently calculated expected values signed off by the domain owner.

- [ ] **Step 2: Add compensation and cutoff models**

Persist salary/compensation history, approved adjustments, and cutoff definitions without overwriting past values. Require authorized changes with effective dates, justification, and audit identity. Do not pick a cutoff convention without approval.

- [ ] **Step 3: Implement the authoritative calculation service**

Calculate from approved source records only; persist batch input version/snapshot and itemized results; distinguish projected, computed, approved, and paid states. Enforce transactions, idempotency, concurrency protection, deterministic rounding, and reconciliation. The dashboard must call/read this service rather than recompute payroll.

- [ ] **Step 4: Migrate and test reproducibility**

Expected: rerunning a batch cannot duplicate payment items; historical outputs remain explainable using the saved input snapshot and calculation version.

### Task 5: Add Approval, Audit, and Compliance Workflows

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_approvals_audit_compliance/`
- Create: `app/lib/approvals/`
- Create: `app/lib/audit/`
- Create: `app/lib/compliance/`
- Test: `tests/domain/approval-workflow.test.ts`
- Test: `tests/domain/audit-events.test.ts`
- Test: `tests/api/admin/approval-authorization.test.ts`

**Interfaces:**
- Consumes: Task 2 authorization, Task 4 immutable payroll batches, and approved role/workflow transitions.
- Produces: auditable approval state transitions, verified compliance processing state, and trusted activity/alert source records.

- [ ] **Step 1: Test authorized state transitions and conflict behavior**

Cover invalid state transitions, missing justifications, wrong approver, concurrent approval, duplicate submission, already-completed approval, and audit creation in the same transaction.

- [ ] **Step 2: Implement approval workflow services**

Allow only current authorized approvers to approve/reject/return payroll batches and compensation changes in the proper state. Require configured comments/justification, concurrency checks, and idempotency keys where appropriate. Dashboard items link to these services; no dashboard quick-action bypass.

- [ ] **Step 3: Persist safe, attributable audit events**

Record actor, target, category, timestamp, outcome, and minimal metadata. Never store passwords, tokens, MFA secrets, or unnecessary before/after salary contents. The dashboard feed is read-only.

- [ ] **Step 4: Model compliance processing and reconciliation**

Represent only the verified processing/reconciliation states supplied by approved compliance workflows. Do not infer statutory compliance, amounts, or deadlines from record existence.

### Task 6: Implement Company Operations and Employee Requests

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_company_operations/`
- Create: `app/lib/assets/`
- Create: `app/lib/employee-requests/`
- Create or modify: the corresponding `app/admin/` and employee workflow pages
- Test: `tests/domain/company-operations.test.ts`

**Interfaces:**
- Consumes: Task 2 company/employee identities and Task 5 audit and permission services.
- Produces: persisted workstation/asset assignments, employee requests, and attributable operational events.

- [ ] **Step 1: Confirm asset and request categories, ownership, retention, and visibility**

Do not treat existing UI arrays as authoritative enumerations or invent request states.

- [ ] **Step 2: Add models and authorized lifecycle services**

Track asset assignment/reassignment and request submission/review with current server authorization, explicit transitions, and audit events.

- [ ] **Step 3: Add focused MySQL integration and permission tests**

Expected: assignments and request state persist, history is retained, and unauthorized users cannot access other employees' records.

### Task 7: Expose Shared Metric Definitions and Admin APIs

**Files:**
- Create: `app/lib/analytics/metric-definitions.ts`
- Create: `app/lib/analytics/dashboard.ts`
- Create: `app/api/admin/dashboard/summary/route.ts`
- Create: `app/api/admin/dashboard/analytics/route.ts`
- Test: `tests/domain/dashboard-metrics.test.ts`
- Test: `tests/api/admin/dashboard-authorization.test.ts`

**Interfaces:**
- Consumes: authoritative services from Tasks 2-6 and approved metric definitions.
- Produces: bounded, validated, Admin-only dashboard responses with period, filters, summary, series, breakdowns, and update time.

- [ ] **Step 1: Define each metric before writing queries**

For projected/computed/approved/paid payroll; employee headcount and movement; departments/teams; pending admin approvals; attendance categories and denominator; staffing coverage; overtime hours/cost; activities; alerts; and compliance, document source, formula, timezone/date boundaries, included/excluded statuses, comparison period, permissions, and empty/unavailable behavior. If no required staffing target is configured, report scheduled and present headcount only, not a coverage percentage. Do not include an unsupported metric.

- [ ] **Step 2: Add failing API and aggregate tests**

Test valid date/filter combinations, unknown or unauthorized IDs, empty source data, duplicate employee assignments, status exclusion, date boundaries, response schema, Admin-only access, and Team Leader denial from Admin endpoints.

- [ ] **Step 3: Implement shared database-side aggregates**

Use Prisma aggregation or parameterized MySQL queries. Validate filters against current database records and permissions; avoid N+1 queries and whole-roster fetches. Keep net payroll, gross payroll, employer contributions, and labor cost separate.

- [ ] **Step 4: Add API routes using shared services**

Authenticate and authorize every route, rate limit as appropriate, validate response/request schemas, return stable availability states, and avoid internal error details.

### Task 8: Replace Prototype Screens and Deliver Dashboard, Filters, and Exports

**Files:**
- Modify: `app/admin/dashboard/page.tsx` and `app/admin/components/dashboard/`
- Modify: `app/admin/payapprove/`, `app/admin/compensation/`, `app/admin/users-roles/`, and approved company/workforce screens
- Create: `app/lib/analytics/export.ts`
- Create: `app/api/admin/reports/route.ts`
- Test: `tests/admin/dashboard-data.test.tsx`
- Test: `tests/api/admin/report-export-authorization.test.ts`

**Interfaces:**
- Consumes: Task 7 response schemas and metric definitions.
- Produces: database-backed admin dashboards and persisted workflow pages; validated filters and authorized reports.

- [ ] **Step 1: Replace sample arrays with domain APIs**

Remove demo arrays only when the corresponding domain workflow is available. Preserve visible unavailable states for later phases not yet delivered. Do not turn missing data into zero.

- [ ] **Step 2: Add globally consistent filters and navigation**

Apply reporting period, payroll cutoff, branch/site, department, team, and shift filters to every applicable summary and chart. Validate on the backend, preserve valid filter parameters in detail links, and provide reset/current-filter controls.

- [ ] **Step 3: Add dashboard visualizations and activity/alert summaries**

Render only supported metrics using accessible charts, explicit denominators, clear empty states, and permission-checked detail navigation. Keep recent activities read-only and sensitive event summaries minimal.

- [ ] **Step 4: Add authorized report exports**

Export the same shared metric results and filters as the UI. Enforce employee-level and salary permissions, audit sensitive exports, use protected short-lived download access, and use asynchronous generation only if supported by existing infrastructure.

- [ ] **Step 5: Validate responsive behavior and operational status**

Test empty, large, filtered, malformed, unauthorized, stale, and concurrent states. Verify the app's business screens no longer present unsourced fixtures as actual company records.

## Release Gates

- Do not start Tasks 2-5 until Task 1 has approved the underlying company, assignment, shift, cutoff, compensation, and workflow policies needed by those tasks.
- Do not start dashboard aggregation until the corresponding authoritative domain source and shared calculation service exist.
- Before applying production migrations, review generated MySQL SQL, back up according to the existing operational procedure, and verify the migration on a non-production MySQL database.
- Do not claim payroll correctness or statutory compliance without domain-owner reconciliation against approved calculations and records.
