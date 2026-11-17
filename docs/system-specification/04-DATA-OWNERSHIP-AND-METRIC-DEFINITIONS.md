# Data Ownership and Metric Definitions

**Status:** Ownership and target definitions approved; organization sources implemented, workforce/payroll sources pending
**Assessment date:** 2026-11-15

**Approved runtime scope:** Exactly `admin`, `hr`, and `employee` are supported. Team Leader assignment and endorsement scenarios are deferred and are not part of the current role or workflow model.

## Authoritative record ownership

| Record / information | Authoritative owner | Allowed operational writers | Required history and controls |
|---|---|---|---|
| Company structure and policy | Admin | Explicitly authorized Admin | Version/effective dates; audit every change. |
| System roles and permissions | Admin | Explicitly authorized Admin/provisioning workflow | Immutable event history; revoke sessions or revalidate after security changes. |
| Employment records | HR | HR through employee lifecycle workflow | Effective-dated changes, actor, reason, and offboarding history. |
| Official attendance | HR | HR correction workflow; trusted clock event ingestion where applicable | Preserve original events/corrections and their approver, source, timestamp, and reason. |
| Attendance policy | Admin | Admin only | Versioned/effective-dated policy; no silent retroactive recalculation. |
| Official shift schedule | HR | HR schedule workflow | Published versions, effective dates, affected employee/team, audit. |
| Team supervision assignment | Admin controls structure and access policy; HR maintains official employee assignment within that structure | Admin-authorized assignment workflow; Team Leader scenarios deferred | Effective dates, assignment type/status, authorizer, retained history; prevent unauthorized overlap. |
| Compensation policy | Admin | Authorized HR/management may initiate; Admin authorizes | Effective-dated approved change, reason/evidence, separation of duties. |
| Payroll preparation | HR | HR payroll process | Calculation/version provenance, cutoff, source references, review evidence. |
| Payroll approval | Admin | Admin workflow only | Approval tied to immutable batch version and logged decision. |
| Payroll processing/payment | Authorized payroll process | Explicitly authorized processor after approval | External/bank result only if separately integrated and approved; reconcile status. |
| Leave balances and official leave | HR | HR decision workflow and documented accrual process | Transaction ledger; approved leave affects schedule/attendance only per policy. |
| OT eligibility and payroll treatment | HR | HR validation and payroll workflow | Requested, endorsed, approved, attended, validated, and payable hours remain distinct. |
| Asset/workstation inventory and assignment | HR within Admin company controls | HR asset workflow | Inventory and assignment history, request and approval record. |
| Employee requests | Requesting employee owns submission; assigned workflow role owns decision | Workflow service | Immutable actor/state/event history; request does not mutate official record by itself. |
| Audit records | System-generated and protected | Domain services only | Append-oriented, least privilege; redact secrets and sensitive details from feeds. |
| Compliance evidence | Assigned HR/Admin workflow owner | Authorized handler | Verified processing/reconciliation status and evidence; record presence alone is not compliance. |

## Metric contract

Every query implementation must define source model/fields, status inclusion/exclusion, timezone, date boundaries, scope filters, comparison window, null handling, and authoritative calculation service. A missing source is **Unavailable**, not zero.

| Metric | Source and calculation contract | Date/time and filters | State distinctions / exclusions | Current status |
|---|---|---|---|---|
| Projected payroll | Authoritative payroll calculation engine output for a selected payroll cutoff; dashboard must not calculate payroll independently. | Actual cutoff boundaries, company timezone, optional authorized branch/department/team filters. | Keep projected, computed, approved, and paid separate. Separate gross, net, employer contributions, and labor cost. Include only explicitly eligible/approved adjustments according to engine. | Unavailable: no payroll model or engine. |
| Payroll trend | Aggregated authoritative payroll results using the same chosen measure across comparable periods. | Monthly, cutoff, quarterly, yearly; exact calendar/cutoff boundaries and company timezone. | Compare like states and like measures; do not combine gross/net/employer cost. | Unavailable. |
| Active headcount | Count distinct eligible employee records; do not count user-account links. | Effective employment status as of reporting date; authorized organization filters. | Exclude inactive/archived according to HR policy, which must be defined in source status policy. Report employee additions/departures only from effective-dated events. | Unavailable: no employee model. |
| Organization distribution | Active branch/site, department, team and employee assignment records. | Effective assignments on reporting date; filters must match the grouping. | Deduplicate employees; include only active authorized organizational records. | Unavailable. |
| Attendance expected population | Unique scheduled shift instances whose explicit business `workDate` is the report date and whose employee is eligible. | Company timezone baseline `Asia/Manila`; assigned shift instance, branch, team, date. | Do not use calendar-midnight guesses; overnight/rest-day and payroll allocation policies remain gates. | Unavailable: no shifts/attendance. |
| Present / late / absent / on leave | Shared attendance-classification service using scheduled instances, validated punches, applicable policy/grace period, and approved leave. Each expected employee-shift is classified once. | Shift-local boundaries resolved in company timezone; filters by branch, department, team, shift. | Do not call absent before applicable shift and validation rules; late per policy; approved leave counted once; exclude ineligible/rest-day instances per approved policy. | Unavailable. |
| Missing punches / exceptions | Attendance validation over expected shift instances and actual punch pairs. | Shift window and policy; report date and scoped organization. | Missing time-in, time-out, duplicate, or invalid records remain explicit exceptions, not silently mapped to absence. | Unavailable. |
| Attendance percentage | Eligible present shift instances divided by the explicitly defined expected population for that measure; publish numerator and denominator. | Same population/date/scope as attendance classifications. | State handling for leave, rest day, incomplete shift, and partial data must be defined consistently before calculation. | Unavailable. |
| Shift coverage | Scheduled headcount and actual present headcount; coverage ratio only when an authoritative required staffing target exists. | Same shift instance, date, and scope. | Never invent target headcount; without target, show scheduled and present counts only. | Unavailable. |
| Overtime hours | Separate requested, endorsed, HR-approved, actually recorded, and payroll-eligible hours from the OT workflow and attendance. | Relevant OT request/shift/work date and payroll cutoff as defined by policy. | Requested hours are not approved or payable; reject/cancel/withdraw statuses excluded from approved/payable totals. | Unavailable. |
| Overtime expense | Existing payroll calculation engine applied only to validated, payroll-eligible OT. | Payroll cutoff and same filters as payroll. | Never derive money independently in dashboard or treat request as expense. | Unavailable. |
| Pending approvals | Active workflow records in specific review states assigned to the authenticated reviewer. | As-of timestamp; reviewer scope and selected organization. | Exclude completed, rejected, withdrawn, cancelled, and unassigned requests; HR leave is not Admin work unless explicitly escalated. | Unavailable. |
| Recent activities | `SecurityAuditEvent`; select event ID/type/time and actor display name, then map known event types to fixed summaries. | Newest first; Admin-only endpoint; bounded limit of 1–50, default 10. | Return only ID, sanitized title/category, optional actor name, and ISO timestamp; never expose event payloads, tokens, passwords, MFA secrets, or before/after details. | Implemented for persisted security/account events; domain activities unavailable. |
| Compliance overview | Verified processing/reconciliation records and assigned compliance tasks. | Configured deadline and reporting period; source-specific status. | Do not infer compliance from a record's existence or fabricate amounts/deadlines. | Unavailable. |
| Employee movement | Effective-dated HR employment events. | Compare equivalent periods and use same active definition. | Do not infer reasons or performance. | Unavailable. |

## Shared calculation services

Attendance classification, shift windows, overnight handling, leave balance, OT eligibility, payroll results, headcount, and workforce availability must be implemented once in server-side domain services and reused by operational modules and analytics. Dashboard code is read-only and consumes their results.

## Unresolved policy gates

1. Define the authoritative payroll engine, cutoff boundaries, approved earning-date attribution, corrections/recalculation policy, and gross/net/employer-cost contracts.
2. Define overnight shift relation to rest days, holidays, work date, attendance absence deadline, and cutoff. A shift that crosses a date must not be automatically split or reclassified.
3. Define account-to-employee cardinality and effective-dated team assignment rules, including primary/acting/temporary coverage conflict handling.
4. Define HR scope boundaries and the employee statuses that count in active headcount.
5. Define approved attendance status transitions, grace, incomplete punch handling, and leave/attendance denominator treatment.

