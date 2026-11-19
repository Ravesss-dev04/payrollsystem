# Role and Feature Specification

**Status:** Approved target; implementation is partial
**Authority:** Current system requirements in `docs/system-specification/`, subject to the four-role runtime scope.
**Assessment date:** 2026-11-15

**Approved runtime scope:** Exactly `admin`, `hr`, `tl`, and `employee` are recognized. `tl` currently has no permission grants or team-scoped routes; Team Leader workflows remain deferred.

## Status vocabulary

- **Verified existing** — behavior was found in the current source, schema, or read-only database inspection.
- **Approved target** — required behavior from the current business specification; not a claim that it exists.
- **Missing** — no actual implementation or data source was found in the inspected checkout.
- **Blocked** — implementation depends on a policy, data model, migration, or authorization boundary that must be resolved first.

## Product intent

One integrated workforce and payroll system for an offshore call-center company. It must keep employment, attendance, scheduling, leave, overtime, compensation, and payroll records under one authoritative owner each. Role hierarchy does not imply access to another person's or team's data.

## Verified architecture and current state

| Area | Verified current state |
|---|---|
| Web application | Next.js App Router 16.4.6, React 19.3.0, TypeScript, Tailwind CSS 4. |
| Data access | Prisma 7.10 with `@prisma/adapter-mariadb`; the app reads `DATABASE_URL` and uses the MariaDB driver. |
| Database | The configured URL uses the MySQL scheme; read-only `information_schema` inspection found `User`, `Session`, `MfaChallenge`, `MfaRecoveryCode`, `PasswordResetToken`, `AuthRateLimitBucket`, and `SecurityAuditEvent` only. Credentials and URL were not emitted. |
| Schema deployment | `prisma/schema.prisma` is MySQL; additive migrations exist but the users/roles/attendance migration has not been applied. |
| Authentication | Database-backed users and opaque server-side sessions; password verification, role/status validation, rate limiting, MFA challenge/enrollment, CSRF, session expiry/revocation, and security-event recording are implemented. |
| Current role enum | `admin`, `hr`, `tl`, and `employee`; TL has no role grants by default. |
| Business records | Organization, employee lifecycle, user/role permissions, invitations, attendance policies, assignments, and audit records have Prisma models. Other payroll and operational models remain absent. |
| APIs | Authentication, user/role/invitation, employee lifecycle, and attendance-policy APIs exist. SMTP and Cloudflare R2 are configured externally; profile images remain private behind authenticated routes. |
| UI | Admin user/role management and attendance policies use persisted APIs; HR can access attendance policies without the user/role tabs. |
| Audit | Security and domain audit events cover authentication, account/role/invitation, employee, and attendance-policy operations. |

## Authorized role model

Exactly four runtime role values are approved: `admin`, `hr`, `tl`, and `employee`. Unknown, malformed, missing, or unsupported values are denied. A role is not a permission shortcut; all actions also require a valid data scope and workflow state. TL is recognized but currently receives no grants; team supervision workflows remain deferred.

### Admin — company governance and financial authorization

**Approved responsibilities**

- Company structure, branches/sites, departments, teams, and organizational oversight.
- User accounts, role assignment, permissions, account access status, and attendance policies.
- Executive analytics, security settings, and audit-log oversight.
- Final payroll-batch approval and authorization of compensation changes.

**Boundaries**

- Dashboard is a read-only monitoring surface.
- Admin does not prepare payroll or make ordinary HR record changes merely by virtue of the role.
- Payroll approvals and compensation modifications occur through their designated server-authorized workflows.
- If an Admin also has an employee record, explicitly grant only their own eligible self-service permissions.

**Current state:** Role and some page guards exist; the dashboard is Admin-only and its business metrics are unavailable. Company, user/role, payroll approval, and compensation surfaces are prototypes, not persisted workflows.

### HR — workforce and payroll administration

**Approved responsibilities**

- Employee lifecycle and official employment information.
- Employee department/team assignments inside authorized company structure.
- Official schedules, attendance correction, leave, overtime eligibility, and payroll preparation/processing.
- Workstation/assets, employee documentation, company-wide HR announcements, and HR analytics.

**Boundaries**

- No automatic inheritance of Admin governance, account-role management, policy ownership, or payroll-final-approval permissions.
- HR processes payroll; Admin approves the payroll batch.
- HR owns official attendance, leave, schedule, employment, and payroll-preparation records, with audit history.
- HR users who have an employee record retain only explicit own-record self-service access in addition to HR permissions.

**Current state:** The role exists in authentication and coarse permissions, but no HR business records or HR module workflows exist.

### Team Leader — assigned-team supervision

**Approved responsibilities**

- Supervise explicitly assigned team(s); view scoped attendance, adherence, exceptions, schedules, coverage, overtime, and relevant workstation assignments.
- Endorse or return appropriate employee requests and coordinate team schedules.
- Publish team-specific operational notices and raise team concerns.

**Boundaries**

- No official employee-record, attendance, payroll, compensation, company-policy, role, or permission mutation.
- No private salary/compensation, payroll batch, or other-team access.
- Cannot select or change their own authorized team scope.
- Every read and write-intent is server-scoped by current, effective-dated Admin-controlled assignments; endorsements also require an allowed workflow state.
- If also an employee, explicitly grant own self-service independently of team-scoped permissions.

**Current state:** Approved target only. The role, teams, assignments, scope queries, and routes do not exist. Implementing this role before those controls would be unsafe.

### Employee — personal self-service

**Approved responsibilities**

- Read personal attendance, schedule, workstation assignment, payslips, benefits, contributions, announcements, and permitted documents.
- Clock in/out and submit leave, overtime, attendance-correction, schedule-change, workstation, and concern requests.
- Manage only permitted personal profile, security, and notification settings.

**Boundaries**

- Own-record access is keyed to the authenticated identity and trusted employee linkage.
- Employees cannot directly update official attendance, payroll, employment, compensation, team assignment, or account authorization records.
- Requests are created as workflow records; submission does not change the official source record.

**Current state:** A guarded account/payslip page and authentication UI exist, but no employee/payroll/attendance data model or request workflow exists.

## Cross-role employee self-service

Admin, HR, and Team Leader accounts may also belong to an employee. This is a separate, explicit own-record entitlement linked to a trusted employee identity, not a fifth role, role inheritance, or client-supplied employee ID. Current schema has no employee link; this is missing.

## Feature inventory

| Feature | Approved owner | Current implementation |
|---|---|---|
| Authentication, MFA, sessions, security events | System | Verified for account/session lifecycle; current role enum has four values, with TL grantless. |
| Company structure and attendance policies | Admin | Prototype UI only; no persisted domain tables/API. |
| Employment and employee lifecycle | HR | Missing. |
| Official schedules and attendance | HR | Missing. |
| Assigned-team supervision and endorsements | Team Leader | Missing; no team assignment source. |
| Leave and overtime workflows | HR final administration; Team Leader endorsement; Employee initiation | Missing. |
| Payroll preparation and processing | HR | Demo data only; no calculation engine or persisted payroll. |
| Payroll final approval | Admin | Demo data only; no approval records or API. |
| Compensation authorization | Admin, with authorized initiator and HR administration | Demo data only; no persisted compensation history. |
| Assets/workstations, floor plan, announcements, documents | HR; Team Leader team notices | Missing or prototype-only; no domain API/data source. |
| Analytics and reports | Admin company-wide; HR operational; Team Leader assigned-team; Employee own | Dashboard unavailable states; other reports and authoritative measures missing. |
| Compliance | Authorized HR/Admin workflow | Missing; no evidence or reconciliation source. |

## Policy and data gates

- No operational integrations are identified or approved. MySQL is the intended future source of truth.
- `Asia/Manila` is the current reporting-timezone baseline from the earlier approved dashboard design; future configuration must be company-owned, not host-local.
- Overnight shift work-date/rest-day attribution and payroll cutoff attribution remain unresolved; do not infer them.
- No official payroll engine, pay cutoff source, attendance policy, staffing target, or domain status catalog exists.
- Effective dates/history are required for team assignments and relevant official records before Team Leader authorization is enabled.

