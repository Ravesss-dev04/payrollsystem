# Organization and Employee Records Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add audited MySQL-backed organization and employee records, secure Admin/HR entry screens, and authoritative workforce/department dashboard metrics.

**Architecture:** Add additive Prisma/MySQL models and migration-backed domain services. Admin Settings owns company structure and employment-status policy; HR owns employee lifecycle records and assignments. All APIs derive identity and role from the session and revalidate database ownership; dashboard queries consume shared domain services and never count login accounts as employees.

**Tech Stack:** Next.js 16.4.6 App Router, React 19, TypeScript, Prisma 7.10/MySQL/MariaDB, Zod, Bun.

**Spec:** [`docs/superpowers/specs/2026-11-15-live-admin-dashboard-design.md`](../specs/2026-11-15-live-admin-dashboard-design.md); metric contract in [`docs/system-specification/04-DATA-OWNERSHIP-AND-METRIC-DEFINITIONS.md`](../../system-specification/04-DATA-OWNERSHIP-AND-METRIC-DEFINITIONS.md).

## Global Constraints

- Runtime roles remain exactly `admin`, `hr`, and `employee`; do not add `team_leader`.
- The existing `/admin/company` route remains disabled; organization editing belongs under `/admin/settings`.
- HR maintains employment records; Admin owns company structure and the status policy used by workforce counts.
- Employee records are separate from User accounts; optional account linking is one-to-one and is never the headcount source.
- Preserve effective-dated history; do not silently overwrite prior status or organization assignments.
- Missing policy or incomplete source records produce unavailable metrics, not invented zeroes.
- Every mutation validates input, writes explicit fields, checks role/scope on the server, and creates attributable domain audit evidence.

## Review Focus

- **Duplicate employee/account linkage:** prove unique account-to-employee association and ensure counts use employee IDs.
- **Backdated or overlapping status/department assignments:** reject invalid intervals and preserve closed history; test boundary dates and overlap.
- **Unknown employment statuses:** reject until Admin config defines the status; prove account `AccountStatus` is not reused as employment status.
- **HR attempts to edit organization policy or Admin directly mutates an employee-owned field:** deny at the API/service boundary and verify no write occurs.
- **Test and inactive accounts are present:** ensure employment metrics never aggregate User rows or include unlinked accounts.

## File Map

- `prisma/schema.prisma`, `prisma/migrations/<timestamp>_organization_foundation/`, `prisma/migrations/<timestamp>_employee_lifecycle/` — organization, branch/site, department, team, employee, effective-dated lifecycle/assignment, and audit models.
- `app/lib/organization/` — Admin-owned organization and employment-status policy service.
- `app/lib/employees/` — HR-owned validation and employee lifecycle service.
- `app/lib/audit/domain-audit.ts` — append-only domain audit writes shared by all follow-on plans.
- `app/lib/auth/authorization.ts` — keep employee record mutation HR-only while retaining only explicitly approved Admin read access.
- `app/api/admin/settings/` — Admin-only organization/site/department/team/status-policy endpoints.
- `app/api/admin/settings/branches/route.ts`, `departments/route.ts`, `teams/route.ts` — validated Admin organization CRUD.
- `app/api/admin/settings/employee-account-links/route.ts` — Admin-only account/employee linking; never accept an account ID in HR employee create/update payloads.
- `app/api/hr/employees/` — HR-only employee and assignment endpoints.
- `app/admin/settings/` — Admin Settings organization screens; no `/admin/company` route.
- `app/admin/settings/page.tsx` — guarded Settings entry page and links.
- `app/admin/components/AdminSidebar.tsx` — activate Settings navigation without restoring Company.
- `tests/admin/settings-navigation.test.tsx` — assert Settings is navigable and Company remains absent.
- `app/hr/` — HR employee lifecycle screens.
- `app/lib/analytics/workforce.ts` — shared headcount and organization distribution query contract.
- `app/api/admin/dashboard/summary/route.ts` and `app/admin/dashboard/summary.server.ts` — add workforce fields only after policy is complete.
- `tests/domain/organization.test.ts`, `tests/domain/employees.test.ts`, `tests/api/organization-policy.test.ts`, `tests/api/employees.test.ts`, `tests/admin/workforce-metrics.test.ts` — policy, scope, persistence, and metric tests.

---

### Task 1: Define Admin Organization and Status Policy Records

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_organization_foundation/`
- Create: `app/lib/organization/policy.ts`
- Create: `app/lib/organization/service.ts`
- Create: `app/api/admin/settings/organization/route.ts`
- Create: `app/api/admin/settings/branches/route.ts`
- Create: `app/api/admin/settings/departments/route.ts`
- Create: `app/api/admin/settings/teams/route.ts`
- Create: `app/api/admin/settings/employment-statuses/route.ts`
- Create: `app/lib/audit/domain-audit.ts`
- Test: `tests/domain/organization.test.ts`
- Test: `tests/api/organization-policy.test.ts`

**Interfaces:**
- `getOrganizationSettings(): Promise<OrganizationSettings | null>` returns configured timezone and organization state.
- `saveOrganizationSettings(actor: SessionPrincipal, input: OrganizationSettingsInput): Promise<OrganizationSettings>` checks `actor.role === "admin"` and persists only validated Admin-owned fields with an audit event.
- `getEmploymentStatusPolicy(): Promise<EmploymentStatusDefinition[]>` returns active definitions and explicit `headcountEligible` flags.
- `saveEmploymentStatusPolicy(actor: SessionPrincipal, input: EmploymentStatusPolicyInput): Promise<EmploymentStatusDefinition[]>` checks Admin role, versions the policy, and cannot rewrite historical employee records.

- [x] **Step 1: Add failing policy tests** for Admin-only mutations, strict input schemas, unique status codes, explicit eligibility, audit creation, and no cross-tenant assumptions.
- [x] **Step 2: Run** `bun test tests/domain/organization.test.ts tests/api/organization-policy.test.ts`; expected: fail because the services/models are absent.
- [x] **Step 3: Define additive Prisma models** for the single configured organization, branch/sites, departments, teams, company timezone, a versioned employment-status catalog, and append-only `DomainAuditEvent`. Enforce parent relationships and unique organization-scoped names. Use the existing `Asia/Manila` baseline until Admin changes it; do not use `AccountStatus` for employment.
- [x] **Step 4: Implement** Admin-only settings services and APIs with Zod validation, explicit field writes, same-origin/CSRF checks for mutations, and domain audit events.
- [x] **Step 5: Add** Admin Settings forms for organization timezone and CRUD of branch/site, department, and team records; do not restore `/admin/company`.
- [x] **Step 6: Add** a server-guarded `/admin/settings` entry page and nested settings pages using `requirePagePermission("company:manage")`.
- [x] **Step 7: Generate and inspect** the MySQL migration; apply only to an explicitly allowlisted disposable development/test database.
- [x] **Step 8: Run** the focused tests and Prisma schema validation; expected: pass with no change to the authentication role enum.

### Task 2: Add HR Employee Lifecycle Records

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_employee_lifecycle/`
- Create: `app/lib/employees/schemas.ts`
- Create: `app/lib/employees/service.ts`
- Create: `app/api/hr/employees/route.ts`
- Create: `app/api/hr/employees/[employeeId]/route.ts`
- Create: `app/hr/employees/page.tsx`
- Create: `app/hr/employees/EmployeesClient.tsx`
- Create: `app/hr/layout.tsx`
- Create: `app/api/admin/settings/employee-account-links/route.ts`
- Test: `tests/domain/employees.test.ts`
- Test: `tests/api/employees.test.ts`
- Test: `tests/auth/authorization.test.ts`

**Interfaces:**
- `createEmployee(actor: SessionPrincipal, input: CreateEmployeeInput): Promise<EmployeeSummary>` rejects every role except `hr`.
- `updateEmployee(actor: SessionPrincipal, employeeId: string, input: UpdateEmployeeInput): Promise<EmployeeSummary>` rejects every role except `hr`, updates only editable fields, and appends effective-dated status/organization changes.
- Employee summary omits salary, credentials, MFA data, and unrelated security metadata.

- [x] **Step 1: Add failing tests** for normalized employee identity, required configured status/department, optional unique account link, explicit-field updates, effective-date ordering, audit history, HR write access, and Admin denial for HR-owned writes.
- [x] **Step 2: Run** `bun test tests/domain/employees.test.ts tests/api/employees.test.ts tests/auth/authorization.test.ts`; expected: fail before implementation.
- [x] **Step 3: Add** Employee and effective-dated employment/organization assignment models, with an optional unique User relation. HR create/update schemas cannot set `userId`; an Admin-only explicit link operation writes the relation and audit event. Do not use account rows to derive workforce count.
- [x] **Step 4: Implement** service and HR endpoints; use conditional writes/transactions so status transitions and corresponding audit events are atomic.
- [x] **Step 5: Restrict** `employees:manage` to HR in the permission matrix; keep organization/status-policy writes under Admin's `company:manage` permission.
- [x] **Step 6: Activate** the Settings sidebar link to `/admin/settings`; test that the Company link remains absent and its private route remains undiscovered.
- [x] **Step 7: Add** a server-guarded HR workspace and accessible employee list/create/edit flow with explicit loading, empty, validation, success, and retryable error states; do not expose Admin policy controls to HR.
- [x] **Step 8: Add** the Admin-only employee/account link endpoint; require a matching normalized work email, reject pre-existing links, and never change account role or status.
- [ ] **Step 9: Run** focused domain/API/UI/authorization/navigation tests and MySQL integration tests; expected: only authorized records persist and historical assignments remain intact.

**Task 2 verification gate:** Local domain/API/UI/authorization tests, the full Bun suite, TypeScript, scoped ESLint, Prisma validation/generation, and the production build pass. Live MySQL integration and migration application remain blocked because no explicitly allowlisted disposable database was provided; do not connect to or migrate an unknown/shared database.

### Task 3: Serve Workforce and Department Dashboard Metrics

**Files:**
- Create: `app/lib/analytics/workforce.ts`
- Modify: `app/admin/dashboard/summary.server.ts`
- Modify: `app/admin/dashboard/summary-schema.ts`
- Modify: `app/admin/dashboard/AdminDashboardClient.tsx`
- Test: `tests/admin/workforce-metrics.test.ts`

**Interfaces:**
- `getWorkforceSummary(asOf: Date): Promise<WorkforceMetricState>` returns either unavailable with a reason or configured employee/department aggregates and effective-dated movement with the as-of date.
- The query uses employee records, effective status policy, and historical department assignment; it never counts User records.

- [ ] **Step 1: Add failing metric tests** for no policy (unavailable, not zero), effective-date boundaries, eligible status inclusion, department distribution, distinct-employee counting, and movement against a comparable configured period.
- [ ] **Step 2: Run** `bun test tests/admin/workforce-metrics.test.ts`; expected: fail because no source query exists.
- [ ] **Step 3: Implement** the shared aggregate using only employee/assignment/status records and an Admin-authorized summary endpoint.
- [ ] **Step 4: Render** the existing employee and department visuals from validated API data; keep incomplete or unconfigured metrics explicitly unavailable.
- [ ] **Step 5: Run** focused tests, full tests, scoped lint, TypeScript, and a disposable-MySQL migration/integration test; expected: pass and no active `/admin/company` route.

## Dependency

This plan follows the dashboard foundation plan. Workforce APIs may be implemented independently of payroll, attendance, and approval plans; later metric fields compose through the shared dashboard summary schema.
