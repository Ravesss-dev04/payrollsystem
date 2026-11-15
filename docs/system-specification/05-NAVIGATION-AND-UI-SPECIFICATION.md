# Navigation and UI Specification

**Status:** Approved target; current navigation is incomplete and prototype-oriented
**Assessment date:** 2026-11-15

## Navigation rules

- Navigation is role-appropriate discovery only; it is never an authorization boundary.
- Each destination independently checks the current session, permission, scope, and workflow state on the server.
- Keep approved feature groups consolidated; do not add duplicate top-level items.
- Do not present an unavailable prototype as a working module. Do not hide existing capability without mapping it to an approved destination.
- Never present sample data as authoritative. Any retained illustrative records must be visibly labeled and kept separate from live data; unavailable metrics must say why they are unavailable rather than showing success-shaped zeros.
- A user with an employee record receives self-service as an explicit entitlement in addition to the role workspace.

## Approved role navigation

### Admin

1. **Dashboard** — Executive Overview, Payroll Analytics, Workforce Analytics, Attendance Analytics, Overtime Analytics, Recent Activities, Pending Approvals, Alerts and Exceptions.
2. **Company Management** — temporarily hidden from the active navigation and route tree; retain its source for future reactivation. When enabled, this destination covers Company Profile, Branches and Office Sites, Departments, Teams, and Organizational Structure.
3. **User & Role Management** — User Accounts, Employee Account Assignments, Role Management, Account Status, Permission Management, Attendance Policies.
4. **Payroll Approvals** — Payroll Batches, Payroll Approval Workflow, Salary and Compensation, Compensation Adjustments, Approved Cutoff Management.
5. **Settings** — Administrator Profile, Security Settings, Audit Logs.

Dashboard is read-only; review links route to the designated workflow.

### HR

1. **Dashboard** — HR Reports and Analytics.
2. **Employee Management** — Employee records, Shift & Schedule, Assets & Devices, employee documents.
3. **Interactive Floor Plan**.
4. **Attendance Management** — Attendance corrections and OT Management.
5. **Payroll Management**.
6. **Leave Management**.
7. **Announcements** — company-wide HR announcements.

### Team Leader (Deferred; not a runtime role)

This legacy target section is not part of the approved implementation. Only `admin`, `hr`, and `employee` are recognized; do not expose Team Leader navigation or APIs.

1. **Dashboard** — assigned-team operational summary.
2. **Team Management**.
3. **Attendance & Adherence**.
4. **Schedule & Shift Management** — proposal/review only; no official schedule publication.
5. **Leave & Overtime** — assigned-team review/endorsement.
6. **Team Requests & Announcements**.
7. **Settings** — only permitted own profile/security/preferences.

Every result and action is restricted to current assigned team scope; salary/compensation fields are excluded.

### Employee

1. **Dashboard** — own information.
2. **My Work** — Attendance, Schedule, Workstation.
3. **Pay & Benefits** — personal Payslip, Benefits.
4. **Requests** — Leave, OT, Attendance Corrections, Concerns, schedule/workstation requests.
5. **Company Updates** — authorized Announcements, Documents.
6. **Settings** — permitted Profile, Security, Notifications.

## Current route and capability map

| Existing route/component | Current verified state | Approved destination |
|---|---|---|
| `/admin/dashboard` | Server-guarded dashboard. Payroll, employee, department, payroll-trend, and attendance widgets show explicit unavailable states until authoritative domain sources exist. One Admin-only no-store summary API supplies test-account-excluded User role/status counts and a single sanitized security/account activity feed. Snapshot refresh is manual or every 30 seconds while the page is visible; unsupported workforce, payroll, attendance, overtime, approvals, and compliance metrics remain unavailable. | Admin Dashboard. |
| `/admin/company` and Company components | Temporarily disabled: the sidebar entry is removed, and the page source is retained under the Next.js private folder `app/admin/_company`, so it is excluded from active routes. Supporting components remain in place; there is no persistence API. | Company Management; reactivate by moving the page back to `app/admin/company/page.tsx` and restoring the sidebar entry. |
| `/admin/users-roles` | Server permission guard; sample users/roles and simulated controls; no persistence API. | User & Role Management. |
| `/admin/payapprove` and `/admin/payapprove/[batchId]` | Server permission guard; generated sample batches, employee amounts, events and actions; no workflow API. | Payroll Approvals. |
| `/admin/compensation` | Sample compensation policies/adjustments and simulated UI; no persisted workflow. | Payroll Approvals > Salary & Compensation. |
| `/admin/settings` | Sidebar label exists but is marked unavailable; no route found. | Settings; implement only after security/profile/audit ownership is defined. |
| `/account` | Page permission guard for payslip access; no payroll/payslip source data exists. | Employee Pay & Benefits > Payslip. |
| `/login` and `/api/auth/*` | Authentication UI and auth-only API routes exist. | Shared authentication, not role navigation. |
| HR workspace | No routes found. | Create only after approved HR authorization boundaries and workflows. |

The current admin sidebar is static and is not filtered by role. The app's server page guards are the security boundary. Current pages must continue to be treated as prototypes unless their backing storage and server mutations are added.

## UI behavior and accessibility

- Keep the existing Next.js/Tailwind design system and established shell unless a requirement needs a targeted change.
- Provide loading, unavailable, empty, partial-error, and permission-denied states with distinct meaning.
- Forms use validated schemas and show server-confirmed outcomes. No optimistic UI may imply persistence before a successful authorized mutation.
- Display reporting period/timezone and last successful refresh for metrics; respect date/cutoff policy, not calendar assumptions.
- The database-backed dashboard snapshot remains below the original card/chart layout; unsupported metrics use source-specific unavailable states. There is exactly one Recent Activities panel and one Pending Approvals panel.
- The account overview is derived from persisted User role/status aggregates and excludes test accounts. Recent Activities is a read-only sanitized security/account event summary, not a payroll/workforce activity feed. The no-store Admin-only snapshot refreshes manually or every 30 seconds while visible; loading, empty, stale/error, and last-updated states are distinct.
- All controls work by keyboard, include accessible names/status announcements, and maintain visible focus.
- Responsive layouts must preserve semantic grouping and avoid hiding important permission or unavailable notices on small screens.
- Detail links carry safe filter context only; IDs are revalidated on the backend.

