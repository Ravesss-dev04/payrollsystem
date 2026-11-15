# Workforce Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give HR auditable schedule, attendance, leave, and overtime record workflows and give Admin explicit control of the rules required before workforce metrics can be classified.

**Architecture:** Build on organization/employee records from the prerequisite plan. Store scheduled shift instances with explicit business work dates, raw attendance evidence, and separate request/approval/recorded states. A shared server-side classifier produces metrics only when the required Admin policy is configured; unresolved overnight/rest-day rules keep affected classifications unavailable.

**Tech Stack:** Next.js 16.4.6 App Router, React 19, TypeScript, Prisma 7.10/MySQL/MariaDB, Zod, Bun.

**Spec:** [`docs/superpowers/specs/2026-11-15-live-admin-dashboard-design.md`](../specs/2026-11-15-live-admin-dashboard-design.md); ownership and calculation rules in [`docs/system-specification/03-WORKFLOW-AND-APPROVAL-MATRIX.md`](../../system-specification/03-WORKFLOW-AND-APPROVAL-MATRIX.md) and [`04-DATA-OWNERSHIP-AND-METRIC-DEFINITIONS.md`](../../system-specification/04-DATA-OWNERSHIP-AND-METRIC-DEFINITIONS.md).

## Global Constraints

- Requires organization and employee records from `2026-11-15-organization-and-employee-records.md`.
- HR owns published schedules and official attendance/leave/overtime administration; Admin owns the versioned policy.
- Keep runtime roles `admin`, `hr`, and `employee`; Team Leader endorsements remain unavailable because there is no such role or assignment scope.
- Every schedule instance stores an explicit local business `workDate`; do not split an overnight instance across calendar dates.
- Do not infer overnight/rest-day treatment, grace periods, absence deadlines, attendance denominators, or payable overtime.
- Distinguish requested, approved, actually recorded, and payroll-eligible overtime; the dashboard never computes overtime money.
- Mutations require server-side authorization, validated schemas, conditional transitions, and atomic audit history.

## Review Focus

- **No attendance policy or incomplete config:** metric is unavailable; test each missing required policy field.
- **Shift crosses midnight or a rest day:** preserve one explicit `workDate`; do not classify disputed outcomes; test both boundaries.
- **Duplicate/malformed punches or duplicate status records:** preserve raw evidence and surface an exception; never silently count twice.
- **HR or employee changes another employee's official record without permission:** deny before writes and test ownership predicates.
- **Requested overtime appears as approved/payable:** keep request, approval, attendance, and payroll eligibility distinct in domain and summary tests.

## File Map

- `prisma/schema.prisma`, `prisma/migrations/<timestamp>_workforce_policy/`, `prisma/migrations/<timestamp>_attendance/`, `prisma/migrations/<timestamp>_leave_overtime/` — Admin policy versions, shift patterns/instances, attendance evidence, leave, overtime, and domain audit references.
- `app/lib/workforce/policy.ts` — validates readiness and version/effective dates.
- `app/lib/audit/domain-audit.ts` — records schedule, attendance, leave, and overtime changes atomically.
- `app/lib/auth/authorization.ts` — keeps official attendance, leave, and overtime writes HR-only; Admin policy writes remain separate.
- `app/lib/workforce/schedules.ts` — publishes explicit shift instances.
- `app/lib/workforce/attendance.ts` — records evidence and classifies only under complete policy.
- `app/lib/workforce/leave.ts` — stores HR-owned leave decisions and effective ranges.
- `app/lib/workforce/overtime.ts` — separates requested, approved, recorded, and eligible amounts/hours.
- `app/api/admin/settings/workforce-policy/`, `app/api/hr/schedules/`, `app/api/hr/attendance/`, `app/api/employee/leave/`, `app/api/employee/overtime/`, `app/api/hr/leave/`, `app/api/hr/overtime/` — secured endpoints.
- `app/hr/layout.tsx` — authenticated HR workspace guard; each HR page also guards its required permission.
- `app/account/leave/`, `app/account/overtime/` — employee-owned request forms scoped to the signed-in employee record.
- `app/admin/settings/workforce/`, `app/hr/schedules/`, `app/hr/attendance/`, `app/hr/leave/`, `app/hr/overtime/` — accessible entry/review flows.
- `app/lib/analytics/attendance.ts`, `app/lib/analytics/overtime.ts` — shared dashboard queries.
- `app/admin/dashboard/summary.server.ts`, `summary-schema.ts`, `AdminDashboardClient.tsx` — add ready metrics and unavailable states.
- `tests/domain/workforce-policy.test.ts`, `attendance-classification.test.ts`, `leave.test.ts`, `overtime.test.ts`, `tests/api/workforce-routes.test.ts`, `tests/admin/workforce-dashboard.test.ts`.

---

### Task 1: Define Workforce Policy Readiness and Admin Settings

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_workforce_policy/`
- Create: `app/lib/workforce/policy.ts`
- Create: `app/api/admin/settings/workforce-policy/route.ts`
- Create: `app/admin/settings/workforce/WorkforcePolicyClient.tsx`
- Test: `tests/domain/workforce-policy.test.ts`
- Test: `tests/auth/authorization.test.ts`

**Interfaces:**
- `getWorkforcePolicy(asOf: Date): Promise<WorkforcePolicyState>` returns `unconfigured` with missing keys or a validated effective policy version.
- `saveWorkforcePolicy(actor: SessionPrincipal, input: WorkforcePolicyInput): Promise<WorkforcePolicyVersion>` rejects non-Admin roles, creates a new version, and never rewrites policy used by prior records.

- [ ] **Step 1: Add failing tests** proving only Admin can change policy, only HR can mutate official attendance/leave/overtime, incomplete policy is unavailable, effective versions do not overlap, and validation rejects unsupported ranges/timezones.
- [ ] **Step 2: Run** `bun test tests/domain/workforce-policy.test.ts`; expected: fail because the policy service/model is absent.
- [ ] **Step 3: Add** versioned policy fields needed by existing metric contracts (company timezone, shift boundaries, grace/absence thresholds, leave denominator treatment, and optional staffing targets); store explicit configuration completeness and do not assume unspecified business values.
- [ ] **Step 4: Implement** Admin-only API and settings form with server validation, version history, and audit event.
- [ ] **Step 5: Restrict** `attendance:manage` and `leave:manage` to HR; Admin's attendance policy writes use the separate `company:manage` permission.
- [ ] **Step 6: Run** `bun test tests/domain/workforce-policy.test.ts tests/auth/authorization.test.ts` and MySQL migration integration; expected: missing configuration is unavailable and prior versions remain unchanged.

### Task 2: Add HR Schedule and Attendance Workflows

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_attendance/`
- Create: `app/lib/workforce/schedules.ts`
- Create: `app/lib/workforce/attendance.ts`
- Create: `app/api/hr/schedules/route.ts`
- Create: `app/api/hr/attendance/route.ts`
- Create: `app/hr/schedules/ScheduleClient.tsx`
- Create: `app/hr/attendance/AttendanceClient.tsx`
- Test: `tests/domain/attendance-classification.test.ts`
- Test: `tests/api/workforce-routes.test.ts`
- Test: `tests/auth/authorization.test.ts`

**Interfaces:**
- `publishShiftInstances(actor: SessionPrincipal, input: PublishShiftInput): Promise<ShiftInstance[]>` rejects non-HR roles; each instance includes explicit `workDate`, start/end, employee, and policy-version reference.
- `recordAttendance(actor: SessionPrincipal, input: AttendanceEvidenceInput): Promise<AttendanceRecord>` rejects non-HR roles and preserves the original evidence and actor.
- `classifyAttendance(instanceId: string, policyVersionId: string): Promise<AttendanceClassification | UnavailableReason>` returns present/late/absent/on-leave only when rules and source evidence are sufficient.

- [ ] **Step 1: Add failing tests** for work-date-preserved overnight instances, late/grace boundaries, absence finalization, duplicate punches, policy absence, and HR-only official-record writes.
- [ ] **Step 2: Run** the focused test files; expected: fail before schemas and service exist.
- [ ] **Step 3: Add** schedule-instance and attendance-evidence models with unique constraints preventing duplicate classifications and immutable evidence history.
- [ ] **Step 4: Implement** schedule publishing and attendance services; return unavailable for unresolved rest-day/overnight outcomes rather than guessing.
- [ ] **Step 5: Add** HR entry screens with accessible validation/errors and visible schedule work dates; do not enable employee self-editing of official records.
- [ ] **Step 6: Run** focused domain/API/UI tests and MySQL transaction tests; expected: evidence/history survives corrections and unsupported cases are not misclassified.

### Task 3: Add HR Leave and Overtime Workflows

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_leave_overtime/`
- Create: `app/lib/workforce/leave.ts`
- Create: `app/lib/workforce/overtime.ts`
- Create: `app/api/employee/leave/route.ts`
- Create: `app/api/employee/overtime/route.ts`
- Create: `app/api/hr/leave/route.ts`
- Create: `app/api/hr/overtime/route.ts`
- Create: `app/account/leave/page.tsx`
- Create: `app/account/overtime/page.tsx`
- Create: `app/hr/leave/LeaveClient.tsx`
- Create: `app/hr/overtime/OvertimeClient.tsx`
- Test: `tests/domain/leave.test.ts`
- Test: `tests/domain/overtime.test.ts`

**Interfaces:**
- `submitLeaveRequest(actor: SessionPrincipal, input: EmployeeRequestInput): Promise<LeaveRequest>` derives the linked employee from the session; it does not accept a client employee ID.
- `withdrawLeaveRequest(actor: SessionPrincipal, requestId: string): Promise<LeaveRequest>` allows only the owning employee to withdraw a still-pending request.
- `decideLeaveRequest(actor: SessionPrincipal, requestId: string, input: LeaveDecisionInput): Promise<LeaveRequest>` rejects non-HR roles and creates official leave only after approval.
- `submitOvertimeRequest(actor: SessionPrincipal, input: EmployeeRequestInput): Promise<OvertimeRequest>` derives the linked employee from the session.
- `withdrawOvertimeRequest(actor: SessionPrincipal, requestId: string): Promise<OvertimeRequest>` allows only the owning employee to withdraw a still-pending request.
- `transitionOvertime(actor: SessionPrincipal, requestId: string, transition: OvertimeTransitionInput): Promise<OvertimeRequest>` permits only HR decisions/validation while keeping requested, approved, recorded, and payroll-eligible values separate.

- [ ] **Step 1: Add failing tests** for session-derived employee ownership, non-overlapping leave intervals, status/eligibility validation, overtime requested-vs-approved-vs-recorded separation, invalid transitions, duplicate/stale writes, and atomic audit events.
- [ ] **Step 2: Run** `bun test tests/domain/leave.test.ts tests/domain/overtime.test.ts tests/api/workforce-routes.test.ts tests/auth/authorization.test.ts`; expected: fail before workflow implementation.
- [ ] **Step 3: Define** leave transitions `Submitted -> PendingHRReview -> Approved | Declined | Returned`, with requester-only withdrawal before decision and `Returned` resubmitted as a new version; define overtime transitions `Submitted -> PendingHRReview -> Approved | Declined | Returned`, followed only by HR-recorded `AttendanceValidated -> PayrollIncluded | PayrollExcluded`. `Withdrawn`, `Declined`, `PayrollIncluded`, and `PayrollExcluded` are terminal. Do not add a Team Leader endorsement state; unconfigured eligibility/calculation remains unavailable.
- [ ] **Step 4: Implement** transactional employee submission/withdrawal endpoints scoped to the current linked employee, plus HR decision/validation endpoints and audited forms; employee submissions remain requests and cannot mutate official records.
- [ ] **Step 5: Add** `leave:request` and `overtime:request` permissions for the employee role, and `overtime:manage` for HR; keep official attendance/leave/overtime management HR-only.
- [ ] **Step 6: Run** focused service/API/UI/authorization and MySQL concurrency tests; expected: unauthorized cross-employee reads/writes and stale/replayed transitions are rejected without duplicate audit or state writes.

### Task 4: Publish Configured Attendance and Overtime Metrics

**Files:**
- Create: `app/lib/analytics/attendance.ts`
- Create: `app/lib/analytics/overtime.ts`
- Modify: `app/admin/dashboard/summary.server.ts`
- Modify: `app/admin/dashboard/summary-schema.ts`
- Modify: `app/admin/dashboard/AdminDashboardClient.tsx`
- Test: `tests/admin/workforce-dashboard.test.ts`

**Interfaces:**
- `getAttendanceSummary(workDate: string): Promise<MetricState<AttendanceSummary>>` includes expected population, each configured classification, exception counts, and attendance ratio only when the denominator policy is complete.
- `getOvertimeSummary(period: ReportingPeriod): Promise<MetricState<OvertimeSummary>>`.
- Each metric returns unavailable/partial/ready with explicit date range, status breakdown, denominator or hours where defined, and `lastUpdatedAt`.

- [ ] **Step 1: Add failing metric tests** for no policy, no expected schedule, excluded statuses, duplicate instances, explicit work date, missing punches, leave denominator behavior, requested hours excluded from approved/recorded totals, and no coverage ratio without a configured staffing target.
- [ ] **Step 2: Run** `bun test tests/admin/workforce-dashboard.test.ts`; expected: fail because summary fields are absent.
- [ ] **Step 3: Implement** shared server-only metric queries consuming policy/workflow services; no independent classification in the route or client.
- [ ] **Step 4: Render** charts/cards only for ready data; show partial/unavailable reasons without treating missing values as zero or payable expenses.
- [ ] **Step 5: Run** focused tests, full suite, scoped lint/typecheck, and disposable-MySQL integration suite; expected: correct authorization and policy gating.

## Dependency

Requires [`2026-11-15-organization-and-employee-records.md`](2026-11-15-organization-and-employee-records.md). Payroll monetization of overtime is explicitly outside this plan and remains sourced from HR-entered payroll results.
