# RBAC and Permission Matrix

**Status:** Approved target; runtime implementation is partial
**Assessment date:** 2026-11-15

**Approved runtime scope:** Exactly `admin`, `hr`, `tl`, and `employee` are recognized. TL currently has no permission grants; the Team Leader column below is a future target matrix, not active access.

## Authorization contract

An action is allowed only when all three checks succeed:

1. **Role:** authenticated database-backed role explicitly grants the action.
2. **Data scope:** the target row is within the user's own, assigned-team, HR-authorized, or company scope.
3. **Workflow state:** the record is at a state where this action is valid.

Enforce these checks in server code and in the database query/mutation predicate. Client navigation, hidden controls, user-submitted role/team/employee IDs, or a token claim alone are not authorization.

Unknown roles, inactive accounts, missing identity links, out-of-scope records, and invalid states fail closed. Do not infer permissions from role seniority.

## Permission vocabulary

Names below describe the approved target contract and may be adapted to the repository's existing colon-delimited convention, while preserving the distinct action and scope. The current `Permission` union is coarse and does not yet encode this matrix.

| Permission family | Representative actions |
|---|---|
| Identity and governance | `user.account.read`, `user.account.manage`, `user.role.manage`, `permission.manage`, `account.status.manage`, `attendance_policy.manage`, `company_structure.manage` |
| Employee data | `employee.read.company`, `employee.manage.hr`, `employee.read.assigned_team`, `employee.read.own`, `employee.profile.update.own` |
| Attendance | `attendance.read.company`, `attendance.read.hr_scope`, `attendance.read.assigned_team`, `attendance.read.own`, `attendance.clock.own`, `attendance.correction.submit`, `attendance.correction.endorse`, `attendance.correction.process` |
| Schedule and team | `schedule.read.own`, `schedule.read.assigned_team`, `schedule.manage.hr`, `schedule.change.propose`, `schedule.change.endorse`, `team.assignment.manage.authorized` |
| Leave and overtime | `leave.request.submit`, `leave.request.endorse`, `leave.request.verify`, `leave.request.decide.hr`, `overtime.request.submit`, `overtime.request.endorse`, `overtime.validate.hr`, `overtime.process_payroll.hr` |
| Payroll and compensation | `payroll.read.authorized`, `payroll.prepare.hr`, `payroll.verify.hr`, `payroll.approve.admin`, `payroll.process.authorized`, `payslip.read.own`, `compensation.propose.authorized`, `compensation.authorize.admin`, `compensation.update.authorized` |
| Assets, requests, communications | `asset.read.assigned_team`, `asset.manage.hr`, `asset.assignment.request.own`, `announcement.read.authorized`, `announcement.publish.hr`, `announcement.publish.team`, `concern.submit.own`, `request.endorse.assigned_team` |
| Analytics, audit, exports | `dashboard.read.admin`, `reports.read.hr`, `reports.read.assigned_team`, `reports.read.own`, `audit.read.authorized`, `report.export.authorized` |

Grant permissions per role explicitly. A permission to read an aggregate does not imply permission to read its employee-level rows. The current TL grant set is empty until team assignment scope and authorization rules are implemented. Salary and compensation fields must not enter Team Leader or general workforce responses.

## Role/action matrix

Legend: **C** company scope; **H** authorized HR scope; **T** currently assigned teams only; **O** own linked employee record; **—** denied. “Endorse” is not a final decision unless explicitly stated.

| Action | Admin | HR | Team Leader | Employee |
|---|---:|---:|---:|---:|
| Company structure, roles, permissions, account authorization, attendance policy | C | — | — | — |
| Admin executive dashboard and company-wide analytics | C | — | — | — |
| HR employee lifecycle, official schedules, attendance, leave and assets | — | H | — | — |
| Prepare and internally verify payroll | — | H | — | — |
| Final payroll batch approval | C | — | — | — |
| Authorized compensation initiation / official administration | As separately authorized | As separately authorized | — | — |
| Final compensation authorization | C | — | — | — |
| Team attendance, adherence, exceptions, schedules, coverage and permitted assets | — | H | T | — |
| Team request review/endorsement | — | H final handling as assigned | T, endorsement only | — |
| Official attendance/employee/schedule/leave/payroll record modification | — | H by workflow | — | — |
| Own attendance, schedule, workstation, payslip and permitted benefits | O overlay | O overlay | O overlay | O |
| Submit own leave, OT, correction, schedule, workstation, concern requests | O overlay | O overlay | O overlay | O |
| Directly modify official employment, attendance, compensation, payroll, role or team assignment | — | only authorized owned workflow | — | — |
| Other-team employee data or private compensation | — | H only | — | — |

The “As separately authorized” compensation initiation/administration permissions must be specified by named action and segregation-of-duties rule before implementation; they are not blanket rights.

## Data-scope requirements

- **Own:** resolve employee identity through a trusted, unique account-to-employee relationship on the server. Do not accept client ownership IDs as proof.
- **Assigned team:** derive active assignment(s) from persisted, effective-dated records. Restrict the query itself using those assignment IDs, dates, status, and record ownership. Support multiple authorized teams/acting coverage only through an auditable assignment.
- **HR scope:** use authorized company/branch data boundaries if the business configures them. Do not assume all HR users are company-wide if delegated scope is later introduced.
- **Company:** Admin company governance scope, with explicit per-action permissions and audit events for sensitive mutations/exports.
- **Cross-role self-service:** evaluate the employee entitlement independently from the user's primary role; it grants only own-record operations.

## Current implementation mapping and gaps

| Current code | Verified behavior | Gap to target |
|---|---|---|
| `app/lib/auth/authorization.ts` | Runtime recognizes `admin`, `hr`, `tl`, `employee`; current role grants are explicit and TL has none; malformed role denied. | No team/branch query scopes; coarse actions combine distinct workflows; self-service is tied to `role === "employee"` rather than a separate entitlement. |
| `app/lib/auth/page-guard.server.ts` | Protected pages require current session and permission; denied page requests are audited and return not-found. | Page helper does not accept a resource scope; per-record checks must be implemented in domain services. |
| `app/lib/auth/api-guard.server.ts` | API guard checks same origin, session, CSRF for unsafe requests, optional permission, and records denials. | Only auth/logout route currently uses the guard; no domain APIs/scoped query policies exist. |
| `prisma/schema.prisma` | MySQL enum has four roles; `User.status` is an explicit account status. | Additive role/permission and domain migration is generated but not applied; team assignment model absent. |
| Admin page guards | Admin, Company, Users & Roles, and Payroll pages use coarse permission checks. | Navigation is not role-filtered; server checks remain the actual boundary. |

## Required tests before enabling linked-employee self-service

- Table-driven allow/deny test for each role × action, including malformed/unknown role values.
- Cross-scope tests that assert unauthorized rows are not queried/returned, not merely hidden in UI.
- Own-record identity tests for employee accounts and explicitly linked Admin/HR accounts.
- Workflow-state, stale assignment, effective-date boundary, and concurrent revocation tests.
- Mass-assignment tests for role/status/team/employee linkage and official-record fields.
- API/page direct-request tests and response-field leakage tests.

