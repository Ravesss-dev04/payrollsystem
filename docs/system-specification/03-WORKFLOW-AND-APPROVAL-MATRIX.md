# Workflow and Approval Matrix

**Status:** Approved responsibility paths; workflows and states are not implemented
**Assessment date:** 2026-11-15

**Approved runtime scope:** Only `admin`, `hr`, and `employee` roles are supported. Team Leader review/endorsement steps below are deferred legacy targets, not authorization to add a fourth role or workflow.

## State and audit rules

The paths below are approved responsibility boundaries. Organization/settings records and their domain-audit writes exist, but operational workflow records, persisted workflow statuses, and transition services do not. Exact state labels, return/rework behavior, delegation, notification timing, and retention must be normalized before workflow schema/API work; the arrows below express allowed responsibility order, not existing database states.

For every workflow:

- The server checks authenticated identity, role, record scope, current state, and any required separation of duties.
- Mutations use conditional updates/transactions to prevent stale or duplicate processing.
- Each submission, endorsement, decision, official-record change, denial, and relevant notification is auditable.
- The submitting user does not gain authority to modify the official source record.
- Notifications are sent only to the workflow participants and authorized handlers.

## Workflow matrix

| Workflow | Initiator | Reviewer / endorser | Final decision / record owner | Authorized modifier | Allowed transition intent | Notifications and required audit |
|---|---|---|---|---|---|---|
| Attendance correction | Employee submits own correction | Assigned Team Leader reviews and endorses | HR validates and decides | HR updates official attendance only after validation | Request → team review → HR validation → accepted correction or denied/returned request; no direct employee update | Employee, assigned Team Leader, HR; audit submit, endorsement, return/deny, official change with actor and reason |
| Leave | Employee submits own request | Team Leader reviews operational coverage | HR verifies balance/eligibility and makes final decision | HR maintains official leave and balance records | Request → team review → HR verification/decision → approved or declined; cancellation/withdrawal policy to be finalized | Employee, assigned Team Leader, HR; audit request, endorsement, balance/eligibility decision, official leave update |
| Overtime | Employee submits request | Team Leader reviews operational need | HR validates eligibility and authorized hours; actual attendance is checked; HR processes payable OT in payroll | HR owns eligibility/approved hours and payroll treatment | Request → team endorsement → HR validation → actual attendance validation → payroll inclusion or rejection; request is not payable evidence | Employee, Team Leader, HR; audit requested/endorsed/validated hours, actual record link, payroll inclusion/exclusion |
| Schedule change | Employee or Team Leader proposes | Team Leader reviews operational impact when applicable | HR maintains and publishes official schedule | HR only | Proposal → operational review → HR approves/declines and publishes effective schedule; proposed changes never directly edit published schedule | Requester, affected Team Leader, HR, affected employee; audit proposal, endorsement, publication/version |
| Payroll | HR prepares batch | HR performs internal verification | Admin reviews and approves batch | HR prepares and processes; authorized payroll processing follows Admin approval | Draft/preparation → HR verification → submitted for Admin approval → approved or rejected/returned → authorized processing; exact states to be finalized | HR preparers/reviewers, Admin approver, authorized payroll recipients; audit each version, verification, decision, processing result |
| Compensation change | Authorized HR or management user initiates documented change | HR validates source/effectivity as assigned | Admin authorizes | Authorized payroll/HR maintainer updates official compensation after approval | Request → documented HR validation → Admin authorization → effective-dated official update or rejection | Initiator, HR handler, Admin approver; audit old/new values in protected audit storage, reason, evidence reference, effective date |
| Employee lifecycle and account | HR creates/maintains employment record | HR workflow review as defined | HR owns employment status; Admin owns system role and permission | HR changes employment data; authorized provisioning creates account; Admin manages role | Employment → provision/assign authorized role → status changes; offboarding revokes access and preserves records | HR, Admin/provisioner, affected employee; audit provisioning, role assignment, status/offboarding, session revocation |
| Workstation/asset reassignment | Employee or Team Leader requests | Assigned Team Leader reviews operational requirements | HR decides and owns official inventory/assignment | HR only | Request → Team Leader review → HR assignment/decline; requester cannot mutate inventory | Requester, assigned Team Leader, HR; audit request, review, inventory/assignment change |
| Employee concern | Employee submits confidential concern | Route by category/confidentiality | HR or authorized independent handler; bypass reported Team Leader | Authorized independent handler only | Submitted → restricted routing → investigation/response under a separately defined policy; no automatic access for the reported person | Submitter and designated handlers only; access and routing events audited; sensitive case contents excluded from general activity feeds |
| Team schedule coordination / notice | Team Leader proposes/publishes team-specific operational item | HR reviews if it changes official schedule/policy | HR owns official schedule; Team Leader owns only permitted team notice | Team Leader may publish scoped notice; HR publishes official schedule | Proposal → scoped team notice or HR schedule workflow; no team action changes official policy | Assigned team and HR if needed; audit publication, scope, edit/withdrawal |

## Workflow security requirements

- A Team Leader can endorse only requests for an employee within a current authorized team assignment and only at the relevant review state.
- Confidential complaints involving a Team Leader route to HR or an independent handler; the reported person receives no access by default.
- Admin approval must be a distinct operation from HR preparation and must be tied to the exact payroll batch version approved.
- Duplicate approval, stale approval, or replayed request must be rejected using conditional state transitions and concurrency control.
- Comments/justifications and evidence requirements are part of the audited transaction contract, not optional client text.
- Rejection, return, withdrawal, cancellation, and completion must be distinct statuses where business behavior differs; pending counts must exclude all terminal or inactive statuses.
- Domain audit records are system-generated and protected from ordinary user mutation.

## Current-state assessment

- Existing UI contains sample payroll batches, compensation changes, and sample events. Those are demo data/actions and do not persist business records.
- No payroll batch API, compensation API, workflow state store, employee request API, official record mutation service, or domain audit table is present.
- Current `SecurityAuditEvent` covers authentication/security events only.
- All workflow implementation is **NOT STARTED**; the schema, status catalog, authorization scope, and tests are dependencies.

