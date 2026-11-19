# Implementation and Traceability Plan

**Status:** Admin dashboard and organization-settings foundations implemented; employee, workforce, payroll, and compliance plans remain
**Assessment date:** 2026-11-15
**Checkout snapshot:** `backend` based on `b1f760b`; existing uncommitted changes were retained. No schema migration was applied and no database write was performed.

**Approved role scope:** Runtime recognizes exactly `admin`, `hr`, `tl`, and `employee`. TL has no grants until team assignment scope and workflows are implemented.

## Verified discovery summary

- **Stack:** Next.js App Router 16.4.6, React 19.3.0, TypeScript, Tailwind CSS 4, Prisma 7.10, MariaDB adapter, MySQL, Bun.
- **Environment:** `prisma7.config.ts` loads `dotenv/config` and reads `DATABASE_URL`; adapter code validates the MySQL URL. The configured scheme was checked without printing the URL or credentials.
- **Live database:** read-only `information_schema` inspection returned only `AuthRateLimitBucket`, `MfaChallenge`, `MfaRecoveryCode`, `PasswordResetToken`, `SecurityAuditEvent`, `Session`, and `User`.
- **Schema/deployment:** Prisma schema now includes organization settings, structure, versioned employment-status policy, and domain audit models. The additive organization migration was generated but not applied; it assumes the existing `User` table is present.
- **Authentication and authorization:** database role/status, sessions, MFA, rate limiting, CSRF, and security audit exist. Four roles are recognized; TL has no grants. Dashboard permission is Admin-only. Authorization is not team-scoped.
- **API routes:** authentication, Admin dashboard, organization, employee lifecycle, user/role/invitation, and attendance-policy APIs exist. Payroll, approval, export, and compliance APIs remain absent.
- **UI:** Admin user/role management and attendance policies are database-backed; HR can access attendance policies without user/role tabs. Unsupported operational metrics remain unavailable.
- **Domain sources and calculations:** organization settings, employee lifecycle, user/role permissions, invitations, attendance policies, and domain audits have schema and service support. Payroll, leave, overtime, assets, announcements, approvals, and compliance sources remain absent.

## Implementation sequence and gates

### Stage 1 — discovery and documentation

**Completed:** current source/schema/database inspection; eight specification files; initial traceability matrix; actual-vs-target status. The initial discovery assessment made no business/schema/API/UI changes; the later safe dashboard slice is tracked below.

### Stage 2 — role and permission foundation

**In progress.** Four roles are recognized; TL remains grantless. Admin-owned organization and policy services are implemented. Before team-scoped functionality:

1. Specify precise permissions for the four recognized roles and own-record entitlements.
2. Design trusted user-to-employee and team assignment scope before granting TL access.
3. Define company/HR/own data scopes and query-level policies.
4. Review safe MySQL migration/rollback and test-account implications.
5. Preserve exactly `admin`, `hr`, `tl`, and `employee` and ensure every protected page/API fails closed.
6. Add direct-request, cross-employee IDOR, self-service, mass-assignment, and revocation tests.

**Gate:** TL has no permissions until team-scoped server authorization exists. Do not expand business module access with UI-only checks.

### Stage 3 — workflow and data integrity

**Not started; policy blocked.** Define statuses, transitions, record ownership, effective dating, versioning, concurrency/duplicate prevention, audit and notifications. Implement shared domain services only after business source models and unresolved policies are approved. Use reviewed additive/non-destructive MySQL migrations; preserve existing auth rows.

### Stage 4 — navigation and module alignment

**In progress.** Admin Settings pages exist but the navigation link and HR workspace remain. Map current demo capabilities to approved destinations; keep placeholder modules unavailable until backed by server services.

### Stage 5 — Admin Dashboard

**Foundation verified.** The Admin layout waits for the incoming request inside Suspense before session resolution. The dashboard reads test-account-excluded role/status account aggregates and a sanitized persisted audit feed from one no-store summary API. Demo fixtures and duplicate activity/approval panels are removed. A manual refresh and visible-page 30-second polling are available. Employee, organization, workforce, attendance, overtime, payroll, approvals, and compliance remain explicitly unavailable pending the approved follow-on plans; the dashboard is read-only.

### Stage 6 — verification

**In progress for the safe dashboard slice;** run the focused/full suites, lint, type-check, browser checks, and graph update below. Four-role/domain verification remains unstarted or blocked. Use the acceptance/security plan for broader authorization, scope, workflow, calculation, API, database, responsive, accessibility, and regression testing.

### Stage 7 — final reconciliation

**Not started.** Update each requirement's status and evidence only after behavior, permissions, data handling, and required tests are verified.

## Requirement traceability matrix

Status values use the required vocabulary: **NOT STARTED**, **IN PROGRESS**, **IMPLEMENTED**, **VERIFIED**, **BLOCKED**, **REQUIRES REVIEW**. “UI reference” identifies existing or target UI, not proof of implementation. “API/source” is `—` when none exists.

| Requirement ID | Business requirement | Responsible role | Data scope | Database source | API/service | UI component | Validation | Security | Test / evidence | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| ROLE-001 | Recognize exactly four roles: admin, hr, tl, employee. | All | Account | `User.role` enum | Auth/session policy | Login and role workspaces | Enum/schema/input parity | Unknown role denies; TL has no grants | `authorization.ts`, role tests | VERIFIED |
| ROLE-002 | Admin governance, permission, policy, audit and executive oversight. | Admin | Company | Organization settings, structure and policy models; no employee/payroll tables | Organization settings APIs and services | Admin Settings forms | Per-action schemas | Server-only permission; transactional audit for organization changes | Organization tests; migration generated, not applied | IN PROGRESS |
| ROLE-003 | HR owns employment, schedules, attendance, payroll prep, leave, OT, assets, HR reports. | HR | Authorized HR scope | No HR tables | Absent | HR routes absent | Business schemas/statuses | No Admin permission inheritance | Route/schema inventory | NOT STARTED |
| ROLE-004 | TL may supervise only assigned teams; cannot access salary, other teams, or official mutations. (Deferred workflow.) | Deferred | Not applicable | No team assignment model | No TL permissions/API | No Team Leader routes | Not applicable | Role exists but has no grants | Team scope and authorization remain undefined | BLOCKED |
| ROLE-005 | Employee self-service is own-record only; official business records remain workflow-owned. | Employee | Own linked employee | No employee link/payroll records | `/account` only; no domain API | Account page | Server-derived owner | IDOR prevention | Existing page guard; no source rows | BLOCKED |
| ROLE-006 | Admin/HR/TL/Employee with an employee record retain explicit own self-service. | Four runtime roles, if linked | Own linked employee | No account-to-employee link | Entitlement resolver absent | Each role shell + self-service | Trusted identity link | Separate entitlement, no broad role grant | Tests planned | BLOCKED |
| ROLE-007 | Enforce role, scope, and workflow state independently on server. | All | Action-specific | Domain sources absent | Shared authorization service absent | All protected routes | Deny unknown/missing | DB predicates and fail-closed behavior | Current page/API guards; scope gaps documented | IN PROGRESS |
| NAV-001 | Consolidated Admin navigation and functional destinations. | Admin | Company | Organization settings and structure | Settings APIs; other domains absent | `AdminSidebar`, guarded Settings routes | Only working links active | Server authorization per destination | Settings forms/routes implemented; navigation activation pending | IN PROGRESS |
| NAV-002 | Consolidated HR navigation without Admin capability inheritance. | HR | HR scope | No HR models | Absent | HR shell absent | Route-to-permission map | Explicit least privilege | No HR routes found | NOT STARTED |
| NAV-003 | Team Leader navigation is assigned-team only. | Team Leader | Assigned team | No assignments | Absent | Team Leader shell absent | Team scope validation | Never trust client team IDs | No routes/assignment records | BLOCKED |
| NAV-004 | Employee navigation exposes own self-service requests and records. | Employee | Own | No operational data | Absent | `/account` only | Owner derivation | Own-record query enforcement | Current route inventory | NOT STARTED |
| NAV-005 | Preserve existing capabilities while consolidating; do not expose prototypes as persistence. | Admin/HR | Role scope | Current demo arrays | No persistence APIs | Company, users, payroll, compensation | Demo state communicated | No implied persistence | DemoDataNotice and route inventory | IN PROGRESS |
| EMP-001 | HR owns effective-dated employee lifecycle; offboarding revokes account access. | HR/Admin | Company/own affected record | No Employee model | Absent | Employee Management absent | Lifecycle/status rules | Session revoke on access change | Integration tests planned | NOT STARTED |
| TEAM-001 | Persist authorized effective-dated multi-team supervision and employee assignment history. | Admin/HR; Team Leader request only (deferred) | Assigned teams | No employee assignment models | Absent | Assignment management absent | Date overlap/conflict rules | Admin-controlled authorization source | Assignment tests planned | BLOCKED |
| ATT-001 | Employee submits correction; Team Leader endorses; HR validates and updates official attendance. | Employee/TL/HR | Own → assigned team → HR | No attendance/correction model | Absent | Attendance Management absent | Workflow state and evidence | Official write only by HR workflow | Transition tests planned | BLOCKED |
| ATT-002 | Shift-aware attendance uses shared policy and configured timezone. | HR | Shift/team/company | AttendancePolicy records exist; punch and schedule assignment models absent | Policy resolution exists; punch calculation absent | Policy management exists; attendance analytics absent | Grace, leave, incomplete punch | One scoped authoritative calculation | Policy resolution/schema tests pass; calculation tests planned | IN PROGRESS / BLOCKED |
| SCH-001 | HR publishes official schedule; TL/employee only propose or endorse changes. | HR/TL/Employee | Own/assigned teams | No schedule model | Absent | Shift & Schedule absent | Version/effective dates | Proposal cannot mutate published record | Transition tests planned | BLOCKED |
| LEAVE-001 | Employee submits; TL reviews coverage; HR verifies eligibility/balance and decides. | Employee/TL/HR | Own → assigned team → HR | No leave/balance model | Absent | Leave Management absent | Balance/status checks | HR-only final decision | Workflow tests planned | BLOCKED |
| OT-001 | Employee submits; TL endorses; HR validates hours, attendance, and payroll eligibility. | Employee/TL/HR | Own/team/HR | No OT/attendance/payroll model | Absent | OT Management absent | Distinct requested/approved/recorded hours | No request-as-payable shortcut | Calculation/transition tests planned | BLOCKED |
| PAY-001 | HR prepares and verifies; Admin approves a specific payroll batch version. | HR/Admin | Authorized company payroll | No payroll/cutoff model | Absent | Payroll pages are demo-only | Calculation/version/status | Separate duties, atomic approval | Version/concurrency tests planned | BLOCKED |
| PAY-002 | Distinguish projected/computed/approved/paid and gross/net/employer cost. | HR/Admin | Authorized aggregate | No payroll engine/data | Absent | Dashboard unavailable | Shared calculation contract | No sensitive row leakage | Metric tests planned | BLOCKED |
| COMP-001 | Authorized initiator documents change; Admin authorizes; official record updates through workflow. | HR/Admin | Authorized employee record | No compensation model | Absent | Compensation prototype | Reason/evidence/effective date | Approval and audit separation | Mass-assignment/transition tests planned | BLOCKED |
| ASSET-001 | HR owns asset inventory; employee/TL may request; TL reviews; HR assigns. | HR/TL/Employee | Own/assigned team/HR | No assets/assignments | Absent | Floor plan not implemented | Inventory/state checks | HR-only official assignment | Workflow tests planned | NOT STARTED |
| REQ-001 | Route concerns by category/confidentiality; complaints about TL bypass reported TL. | Employee/HR | Restricted case scope | No concern/case model | Absent | Requests absent | Category/handler policy | Need-to-know access; audit reads | Confidential-routing tests planned | BLOCKED |
| DASH-001 | Admin dashboard page and snapshot API require an active authenticated Admin. | Admin | Account aggregates/security events | User/session and `SecurityAuditEvent` | Page guard and `GET /api/admin/dashboard/summary` | `/admin/dashboard` | Current role/status session check; strict response schema; request has no query parameters | Server permission check, no navigation reliance, no-store, per-admin rate limit | `admin-layout.test.tsx`, `dashboard-summary.test.ts` | VERIFIED |
| DASH-002 | No fabricated Admin metrics; unavailable is distinct from zero. | Admin | System accounts and unavailable operational metrics | User and `SecurityAuditEvent`; no operational domain source | `/api/admin/dashboard/summary` | `/admin/dashboard` | Zero only after successful aggregate; exclude `isTestAccount`; explicit unavailable states | Safe role/status aggregates, allowlisted activity fields | Layout, summary, snapshot-fetch, and unavailable-state tests | VERIFIED |
| DASH-003 | Admin dashboard consumes shared real payroll/workforce calculations read-only. | Admin | Company + authorized filters | No operational tables | No domain/dashboard API | Dashboard | Metric contract | No mutation from dashboard | No source/service exists | BLOCKED |
| DASH-004 | Dashboard approvals, activities and alerts come from persisted workflow/audit sources. | Admin | Admin-actionable/company events | Security and organization domain audit; no operational workflow | Summary API serves sanitized security/account events; workflow sources absent | One Recent Activities and one Pending Approvals panel | Safe event projection; approval panel unavailable until workflow source exists | Redacted trusted events | `dashboard-summary.test.ts`, UI state tests; approvals/alerts/operational activities remain unavailable | BLOCKED |
| DATA-001 | Establish one authoritative owner/source per business record with effective history. | Admin/HR/System | By record ownership | Auth-only schema | Domain services absent | Domain modules absent | Uniqueness/version rules | Protected fields and scoped updates | Schema inventory | BLOCKED |
| DATA-002 | Shared metric definitions include timezone, statuses, boundaries, filters and comparison. | Domain owners | Same as source | No operational source | Calculation services absent | Reports/dashboard | Definition and test fixture | Server-calculated values | Definitions in `04`; metric tests planned | IN PROGRESS |
| SEC-001 | Prevent role, status, team, and protected-field mass assignment. | Admin/HR/System | Record-specific | User only | Auth schemas exist; domain schemas absent | Forms absent/prototype | Allowlisted input schema | Explicit update fields | Existing auth schema tests; domain tests planned | IN PROGRESS |
| SEC-002 | Every API authenticates, authorizes role/scope/state, validates, and returns safe responses. | All | Endpoint-specific | Domain sources absent | Auth APIs only | Auth UI | Schema and boundary validation | Rate limit, CSRF/origin, no internal detail | Auth tests; domain tests planned | IN PROGRESS |
| AUD-001 | Domain actions and sensitive exports are auditable; feeds redact sensitive content. | System/Admin | Role-authorized event visibility | SecurityAuditEvent and DomainAuditEvent | Security and organization domain writers | Audit Logs route absent | Event schema/redaction | Create-only service; DB-level append-only enforcement is not configured | Organization writes are transactionally audited; feed/export gaps remain | IN PROGRESS |
| DASH-005 | Analytics/exports respect filters and authorization; no public/private data leakage. | Admin/HR/TL | Company/HR/team | No report source | No export API | Export UI absent | Validated filters | Authorized short-lived downloads, audit | Export security tests planned | BLOCKED |
| DASH-006 | Admin sees a bounded, sanitized security/account activity feed from persisted audit events. | Admin | Security/account summaries | `SecurityAuditEvent` | `GET /api/admin/dashboard/summary` returns 10 newest safe events | Recent Activities panel | Fixed event mapping and bounded selection | Admin permission, rate limit, no-store, minimal selected/returned fields | `dashboard-summary.test.ts`, dashboard activity UI tests | VERIFIED |
| QA-001 | Role, scope, workflow, calculation, API, DB, UI, accessibility and regression tests pass. | All | Test-specific | Auth and organization schema; migration not applied | Auth, dashboard, and organization APIs | Current dashboard, Settings, and prototype routes | Acceptance plan | Security regression suite | `bun test`: 115 pass, 0 fail, 368 assertions across 33 files; scoped ESLint, TypeScript, Prisma validation/generation, Next typegen and diff checks pass; organization migration/live DB and authenticated browser verification remain unperformed | IN PROGRESS |

## Change-control gates

### 2026-11-19 employee detail slice

`EMP-001` now has an HR-only detail route at `/hr/employees/[employeeId]` and a guarded `GET /api/hr/employees/[employeeId]`. Both use the existing employee primary key and current assignment; the detail query requires the assignment department to belong to the configured organization. The directory View action links to the route, while Edit returns to the existing employee form. Profile identity, email, status, and department come from the employee service. Four tabs are present; schedule, attendance, assets, workstation, leave, and derived metrics remain **BLOCKED** because authoritative sources and policies are absent. No schema migration or official workflow was added. Focused employee tests and full suite (146/146), TypeScript, scoped ESLint, and a production build passed. Authenticated browser, live MySQL, and responsive visual verification remain unperformed.

- No production business model or policy is inferred from sample UI.
- Review every MySQL migration against the live schema and preserve current authentication/security records. No reset or destructive migration.
- Resolve each blocker in `04-DATA-OWNERSHIP-AND-METRIC-DEFINITIONS.md` before implementing calculations.
- Update this matrix and `08-IMPLEMENTATION-STATUS.md` in the same milestone as implementation evidence.
- Refresh `graphify-out` only after the documentation milestone is complete; graph output is an index, not a substitute for source review.

