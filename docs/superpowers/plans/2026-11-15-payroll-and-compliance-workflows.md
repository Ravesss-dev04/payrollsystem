# Payroll and Compliance Workflows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace payroll/compliance demos with HR-entered structured results, version-specific Admin approval, auditable processing records, and dashboard summaries that never calculate or imply unsupported legal compliance.

**Architecture:** HR prepares and records calculated payroll batches/results from an approved calculation source; this app does not calculate payroll. Admin approves or returns a specific immutable batch version. Compliance panels display explicitly configured work items and their reported processing state only. Domain services own transitions and audit; the dashboard reads bounded aggregates.

**Tech Stack:** Next.js 16.4.6 App Router, React 19, TypeScript, Prisma 7.10/MySQL/MariaDB, Zod, Bun.

**Spec:** [`docs/superpowers/specs/2026-11-15-live-admin-dashboard-design.md`](../specs/2026-11-15-live-admin-dashboard-design.md); responsibilities in [`docs/system-specification/03-WORKFLOW-AND-APPROVAL-MATRIX.md`](../../system-specification/03-WORKFLOW-AND-APPROVAL-MATRIX.md) and metric definitions in [`docs/system-specification/04-DATA-OWNERSHIP-AND-METRIC-DEFINITIONS.md`](../../system-specification/04-DATA-OWNERSHIP-AND-METRIC-DEFINITIONS.md).

## Global Constraints

- Requires employee and organization data from `2026-11-15-organization-and-employee-records.md`; overtime summaries may consume the workforce plan.
- HR records calculated payroll results; no payroll formula/calculation engine is introduced.
- Admin alone authorizes payroll; the decision binds to the exact immutable batch version.
- Keep projected, computed, approved, and paid states distinct; keep gross, net, employer contributions, and labor cost distinct.
- Do not infer cutoff attribution, payment status, tax/statutory correctness, or legal compliance.
- No Team Leader role or approvals; HR and Admin permissions are independently checked server-side.
- All mutations are schema-validated, transactional, replay/stale-safe, and auditable; dashboard remains read-only.

## Review Focus

- **HR edits a submitted/approved batch or Admin approves a newer version than reviewed:** reject by immutable version predicate; test both concurrent paths.
- **A batch contains unapproved results or mixed gross/net measures:** exclude it from approved metrics and reject mixed-measure aggregation.
- **HR or employee attempts final approval:** deny before reads/writes; test permission and service boundary.
- **Compliance task exists but is not verified:** display its reported state, never assert legal compliance from record presence.
- **Repeated submission/approval or failed audit write:** enforce idempotency and transaction rollback; prove no success-shaped response is returned.

## File Map

- `prisma/schema.prisma`, `prisma/migrations/<timestamp>_payroll_results/`, `prisma/migrations/<timestamp>_payroll_approval/`, `prisma/migrations/<timestamp>_compliance_tasks/` — HR-entered result/projection versions, Admin decisions, processing evidence, compliance task records.
- `app/lib/payroll-results/` — input schemas, HR preparation service, result versioning.
- HR-entered projections are separate versioned source records from actual payroll batches; neither is calculated by this application.
- `app/lib/payroll-approvals/` — Admin transition/authorization service.
- `app/lib/audit/domain-audit.ts` — append-only domain audit writes shared with employee/workforce plans.
- `app/api/admin/settings/payroll-policy/route.ts`, `app/admin/settings/payroll/PayrollPolicyClient.tsx` — versioned Admin selection of the reported measure and cutoff policy.
- `app/lib/auth/authorization.ts` — add HR-only payroll preparation and read permissions; keep final approval Admin-only.
- `app/lib/compliance/` — task configuration and reported state; no legal interpretation.
- `app/api/hr/payroll/`, `app/api/admin/payroll/`, `app/api/admin/settings/compliance/`, `app/api/hr/compliance/` — scoped APIs.
- `app/hr/payroll/`, `app/admin/payapprove/`, `app/admin/settings/compliance/`, `app/hr/compliance/` — workflow UI; replace current demo payroll data/actions.
- `app/lib/analytics/payroll.ts`, `app/lib/analytics/compliance.ts` — shared data-backed metrics.
- `app/admin/dashboard/summary.server.ts`, `summary-schema.ts`, `AdminDashboardClient.tsx` — add payroll, approval, overtime-cost-from-stored-results, and compliance fields.
- `app/admin/dashboard/activities.server.ts`, `activity-presentation.ts` — merge sanitized domain audit events into the existing single feed.
- `tests/domain/payroll-results.test.ts`, `payroll-approval.test.ts`, `compliance.test.ts`, `tests/api/payroll-workflows.test.ts`, `tests/admin/payroll-metrics.test.ts`, `tests/admin/dashboard-summary.test.ts`.

---

### Task 1: Persist HR Payroll Result Batches and Versions

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_payroll_results/`
- Create: `prisma/migrations/<timestamp>_payroll_approval/`
- Create: `prisma/migrations/<timestamp>_compliance_tasks/`
- Create: `app/lib/payroll-results/schemas.ts`
- Create: `app/lib/payroll-results/service.ts`
- Create: `app/lib/payroll-results/projections.ts`
- Create: `app/api/admin/settings/payroll-policy/route.ts`
- Create: `app/admin/settings/payroll/PayrollPolicyClient.tsx`
- Create: `app/api/hr/payroll/route.ts`
- Create: `app/api/hr/payroll/projections/route.ts`
- Create: `app/api/hr/payroll/[batchId]/route.ts`
- Create: `app/hr/payroll/PayrollPreparationClient.tsx`
- Test: `tests/domain/payroll-results.test.ts`
- Test: `tests/api/payroll-workflows.test.ts`
- Test: `tests/auth/authorization.test.ts`
- Test: `tests/admin/payroll-metrics.test.ts`

**Interfaces:**
- `createPayrollBatch(actor: SessionPrincipal, input: PayrollBatchInput): Promise<PayrollBatchVersion>` rejects non-HR roles.
- `submitPayrollBatch(actor: SessionPrincipal, batchId: string, version: number): Promise<PayrollBatchVersion>` rejects non-HR roles.
- `recordPayrollProjection(actor: SessionPrincipal, input: PayrollProjectionInput): Promise<PayrollProjection>` rejects non-HR roles.
- Batch results and separate projections persist explicit cutoff/date range, distinct gross/net/employer-contribution/labor-cost/overtime-cost fields, source/provenance reference, entry actor/time, and immutable version; no amount is derived by this service.

- [ ] **Step 1: Add failing tests** for validated cutoff ranges, distinct gross/net/employer-contribution/labor-cost/overtime-cost fields, separate projection vs. actual records, immutable submitted snapshots, explicit input allowlist, HR-only preparation, HR payroll read access, Admin denial for HR-owned preparation, and absence of calculated fallback amounts.
- [ ] **Step 2: Run** `bun test tests/domain/payroll-results.test.ts tests/api/payroll-workflows.test.ts`; expected: fail because no persisted payroll source exists.
- [ ] **Step 3: Add** versioned payroll batch/result models, separate HR-entered projection records, and an Admin-owned versioned reporting policy selecting one payroll measure and valid reporting/cutoff attribution. Use typed amount fields with currency precision; do not add a calculation engine or a generic untyped JSON amount blob.
- [ ] **Step 4: Implement** HR-only create/update/submit services; permit edits only to draft versions, require provenance, and append audit records transactionally.
- [ ] **Step 5: Grant** `payroll:read` and `payroll:manage` to HR and keep `payroll:approve` Admin-only; prove both route and service boundaries.
- [ ] **Step 6: Add** the Admin payroll policy API/form under `company:manage`; missing or incomplete reporting policy keeps dependent metrics unavailable.
- [ ] **Step 7: Replace** sample batch arrays and simulated UI actions with an HR form/list/detail flow using the APIs; missing values stay unavailable.
- [ ] **Step 8: Run** domain/API/UI/authorization and disposable-MySQL migration tests; expected: submitted versions cannot be silently changed.

### Task 2: Add Admin Approval Bound to Exact Batch Version

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_payroll_approval/`
- Modify: `app/lib/auth/authorization.ts`
- Create: `app/lib/payroll-approvals/service.ts`
- Create: `app/api/admin/payroll/[batchId]/decision/route.ts`
- Modify: `app/admin/payapprove/page.tsx`
- Modify: `app/admin/payapprove/[batchId]/page.tsx`
- Modify: `app/admin/components/PayrollBatchDetails.tsx`
- Test: `tests/domain/payroll-approval.test.ts`
- Test: `tests/api/payroll-workflows.test.ts`
- Test: `tests/auth/authorization.test.ts`

**Interfaces:**
- `decidePayrollBatch(actor: SessionPrincipal, input: PayrollDecisionInput): Promise<PayrollApprovalResult>` rejects non-Admin roles, requires `batchId`, exact `version`, decision, and required reason; it returns a conflict if the batch version/state has changed.
- HR cannot call the final-decision service; Admin cannot mutate HR-entered source results through the decision endpoint.

- [ ] **Step 1: Add failing tests** for Admin-only approval, HR/employee denial, exact version binding, stale/concurrent decisions, invalid transition, required reason, duplicate replay, and atomic audit.
- [ ] **Step 2: Run** `bun test tests/domain/payroll-approval.test.ts`; expected: fail because the transition service is absent.
- [ ] **Step 3: Define** the persisted batch states as `Draft`, `HRVerified`, `PendingAdminApproval`, `Approved`, `Rejected`, `Returned`, `Processing`, and `Processed`, matching the workflow matrix's preparation, verification, Admin decision, and processing stages. Allow `Draft -> HRVerified -> PendingAdminApproval`; Admin may change only `PendingAdminApproval` to `Approved`, `Rejected`, or `Returned`; HR may create a new version from `Returned` and submit it through verification again. Only HR may report `Approved -> Processing -> Processed`; require provenance and label those as reported processing states, not proof of bank payment.
- [ ] **Step 4: Add failing permission tests** proving only HR may prepare/submit payroll and only Admin may decide it; then update `Permission` and `permissionsByRole` to add HR `payroll:manage`/`payroll:read` while preserving Admin-only `payroll:approve`.
- [ ] **Step 5: Implement** a conditional transactional state change and immutable decision record with Admin permission check; fail closed if the batch changed or audit persistence fails.
- [ ] **Step 6: Add** an Admin-only `payroll:approve` page guard; do not rely on the shared Admin layout's authentication-only guard.
- [ ] **Step 7: Replace** the Admin demo approval list/detail/actions with persisted Admin-actionable decisions; leave unrelated demo modules unchanged and labeled.
- [ ] **Step 8: Run** focused tests plus MySQL concurrent-approval tests; expected: only one decision succeeds for a given submitted version.

### Task 3: Add Compliance Work Items Without Legal Claims

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_compliance_tasks/`
- Modify: `app/lib/auth/authorization.ts`
- Create: `app/lib/compliance/schemas.ts`
- Create: `app/lib/compliance/service.ts`
- Create: `app/api/admin/settings/compliance/route.ts`
- Create: `app/api/hr/compliance/route.ts`
- Create: `app/admin/settings/compliance/ComplianceSettingsClient.tsx`
- Create: `app/hr/compliance/ComplianceClient.tsx`
- Test: `tests/domain/compliance.test.ts`

**Interfaces:**
- `getComplianceOverview(asOf: Date): Promise<ComplianceMetricState>` returns only configured tasks with explicit reported status/deadline and source timestamp.
- Admin configures task definitions and deadlines; authorized HR records processing/reconciliation status and evidence reference. The API never derives legal compliance.
- Permission contract: `company:manage` for Admin task configuration; `compliance:manage` for HR-reported processing updates.

- [ ] **Step 1: Add failing tests** for Admin-only task configuration, HR-only authorized updates, unknown status rejection, missing evidence/configuration, and the rule that task existence alone never serializes `compliant: true`.
- [ ] **Step 2: Run** `bun test tests/domain/compliance.test.ts`; expected: fail because task and processing records do not exist.
- [ ] **Step 3: Add** versionable task definitions and auditable processing-state records with the fixed reported states `NotStarted`, `InProgress`, `Submitted`, `Verified`, and `NeedsReconciliation`; these describe reported processing only, not legal conclusions. Reject unsupported state transitions and never serialize a legal-compliance boolean.
- [ ] **Step 4: Implement** separate Admin configuration and HR update APIs/screens with protected minimal fields and domain audit.
- [ ] **Step 5: Add** `compliance:manage` for HR, then guard the Admin configuration page with `company:manage` and the HR update page/API with `compliance:manage`; neither relies on layout visibility alone.
- [ ] **Step 6: Run** focused domain/API/UI and migration tests; expected: absent or unverified evidence remains visibly unavailable/pending, never compliant by inference.

### Task 4: Read Payroll, Approval, and Compliance Metrics

**Files:**
- Create: `app/lib/analytics/payroll.ts`
- Create: `app/lib/analytics/compliance.ts`
- Modify: `app/admin/dashboard/summary.server.ts`
- Modify: `app/admin/dashboard/summary-schema.ts`
- Modify: `app/admin/dashboard/AdminDashboardClient.tsx`
- Modify: `app/admin/dashboard/activities.server.ts`
- Modify: `app/admin/dashboard/activity-presentation.ts`
- Test: `tests/admin/payroll-metrics.test.ts`
- Test: `tests/admin/dashboard-summary.test.ts`

**Interfaces:**
- `getPayrollSummary(period: ReportingPeriod, measure: PayrollMeasure): Promise<MetricState<PayrollSummary>>` aggregates one stored measure and one approved state over comparable periods.
- `getAdminPendingApprovals(): Promise<PendingApprovalSummary>` returns current Admin-role-actionable submitted batch versions; individual reviewer assignment is not added in this phase.
- The compliance summary reports configured task processing states, not legal compliance.

- [ ] **Step 1: Add failing tests** for missing cutoff/measure policy, unapproved and returned batches, mixed-measure rejection, date boundaries, Admin-role pending queue visibility, and non-verified compliance states.
- [ ] **Step 2: Run** `bun test tests/admin/payroll-metrics.test.ts`; expected: fail because summary metrics are unavailable.
- [ ] **Step 3: Implement** server-only aggregates over stored payroll results, separate projections, and task records; do not compute payroll or overtime expense independently.
- [ ] **Step 4: Render** payroll charts/cards only when a configured measure, approved source results, and date window exist; otherwise show a precise unavailable state. Render the one Pending Approvals panel from batches awaiting Admin-role action.
- [ ] **Step 5: Extend** the single Recent Activities panel with sanitized domain audit events from organization, workforce, payroll, and compliance sources; test event redaction and ensure the panel remains unique.
- [ ] **Step 6: Run** focused/full tests, scoped lint/typecheck, MySQL migration/concurrency suite, production build, and `git diff --check`; verify no demo payroll routes/actions remain.

## Dependencies and Limits

Requires organization/employee records. Attendance-derived payroll eligibility or overtime metrics additionally require [`2026-11-15-workforce-operations.md`](2026-11-15-workforce-operations.md). This plan intentionally does not implement payroll calculations, banking/payment integration, tax/statutory logic, or legal compliance determinations.
