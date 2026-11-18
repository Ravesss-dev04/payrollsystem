# Payroll Approvals Implementation Status

**Status: Implemented source slice; not production-ready or fully verified.**

## Scope and financial authority

Payroll snapshots contain results submitted by HR. This application does not
calculate salaries, infer payroll policy, or verify external compensation,
attendance, statutory deduction, or adjustment records. Reconciliation checks
exact decimal relationships among the submitted totals and records missing or
inconsistent evidence. Admin decisions apply to one immutable submitted
version and do not initiate employee disbursement.

The Admin-only payroll-rule editor remains draft-only. No rates or formulas are
prefilled or used by the approval workflow.

## Implemented

- Added versioned payroll batch, employee result, earning, deduction,
  attendance-evidence, adjustment-evidence, validation-exception, and decision
  models with a MySQL migration.
- Added HR batch creation, draft updates, returned-batch correction versions,
  submission, Admin decision, paginated list, exact-version detail, and
  authorized report-download APIs.
- Added exact fixed-scale decimal reconciliation; duplicate employee and
  adjustment references are rejected at the input/database boundary. Identical
  repeated earning or deduction lines and duplicate attendance source
  references are retained as critical exceptions that block approval.
  Employee numbers are checked against linked employee records.
- The shared backend validator runs while drafts are saved, at HR submission,
  and again before Admin approval. It checks submitted attendance dates,
  approval/exception state, punch pairing and ordering, required hour totals
  for punched records, and employee regular/overtime totals against complete
  attendance evidence. Findings are stored against the exact payroll version;
  unresolved findings block approval.
- Added separate HR preparation and Admin review pages, status, batch-number,
  and payroll-period filters with server-side pagination, employee-level
  result and evidence detail, category-level earnings and deduction summaries,
  exception display, decision history, audit history, and version-specific
  approve/return/reject actions. Admins with payroll read access can view the
  list and exact submitted-version reviews; decision controls remain limited
  to accounts with payroll approval permission.
- The Pending list requires both a submission timestamp and submitter and
  selects only the latest submitted version per batch. HR submission is
  restricted to the latest draft version, and corrections can only follow a
  returned latest version.
- Added a seven-sheet XLSX report generated from the selected persisted
  snapshot, formula-safe inline text, filters, frozen headers, summary totals,
  exact review-API earnings/deduction aggregates, preflight size checks, and
  export audit events. The generator uses Node built-ins and adds no
  dependency.
- The Admin review overview reads each requested field from the selected
  submitted version, distinguishes the coverage dates from the cutoff
  reference, shows both preparer and submitter, formats the persisted
  submission time in the payroll-version's frozen organization time zone, and
  links report download to that exact version. Displayed employee count comes
  from the included result rows; a mismatch against the stored count is flagged
  and blocks approval.
- The versioned review API supplies the financial summary directly from the
  persisted snapshot; exact fixed-scale submission validation reconciles
  employee net pay with gross less employee deductions and checks batch totals
  against the employee rows. Employer contributions and labor cost remain
  separate from employee deductions and net payable.
- The versioned review API aggregates submitted earning lines from the selected
  snapshot, groups bonuses and adjustments for display, retains other earning
  categories, and reports whether the exact total reconciles to gross payable.
  The UI labels this as submitted data, not independently verified or approved.
- Added versioned company deduction-category configuration: HR creates drafts
  and Admin activates the latest draft. The migration seeds the legacy category
  names as an inactive draft; an Admin must activate a category set before a
  new submission can pass the required category-configuration validation.
  Submission captures the active configuration version, and approval checks
  deduction categories against that exact version.
- The review API aggregates deduction lines from the submitted version by
  configured category and reports exact reconciliation to total deductions.
  UI and XLSX explicitly identify these as submitted lines, not independently
  verified for eligibility or approval. Configuration is labels only: it does
  not calculate statutory or voluntary deductions.
- Added exact-version employee-list and employee-detail APIs. The list supports
  server-side search, compensation-basis filtering, and bounded pagination,
  returning one payroll inclusion per employee with the snapshot's single
  compensation basis/rate, days worked, additional earnings, deductions, and
  net amount. The detail endpoint returns the employee's submitted earning and
  deduction lines, attendance, adjustments, and validation exceptions from
  that same version, plus the payroll version's frozen organization/time-zone
  snapshots and exact-decimal employee reconciliation status. Profile-image
  URLs are included only for linked users when the reviewer has `users:read`;
  the private image endpoint continues to enforce that permission. Days worked
  and position remain snapshot values; neither is recalculated from external or
  current employee data.
- Connected the Admin employee list to the paginated API with server-side
  search and compensation-basis filtering. Selecting an employee opens an
  exact-version detail page with snapshot attendance, category-level earnings
  and deductions, persisted gross/deductions/net amounts, adjustments, and
  exceptions. Missing punches remain explicitly missing, and reconciliation
  indicators are supplied by the server rather than calculated in the UI.
- Kept role checks server-side; HR can prepare and submit, Admin can decide and
  export, and API mutations use the existing same-origin/CSRF guards.

## Remaining blockers and limits

- **Task 10 deduction calculation/verification remains blocked on official
  tables.** The user approved Philippine private-sector coverage for full-month,
  monthly-paid payroll after source verification; HR-maintained, effective-dated
  statutory/tax eligibility with Admin approval; and fixed monthly company
  deduction authorizations with Admin approval. Tax treatment must be supplied
  for earning lines, and missing eligibility/configuration must block
  calculation. No statutory/tax tables have yet been verified and loaded.
  Public search results inspected during this task did not reliably identify
  the current primary-source schedules, so the illustrative figures supplied
  by the user have not been treated as production configuration.
- The application has no authoritative deduction calculator or effective-dated
  statutory contribution/tax tables. `PayrollRuleSet` stores an Admin-authored
  generic JSON draft but has no activation/effective-rule selection and is not
  captured by payroll versions. `PayrollDeductionCategorySet` contains only
  category labels, not calculation rates or eligibility rules. Existing
  validation detects duplicate submitted lines, reconciles submitted employee
  and batch totals, and checks categories against the captured category set; it
  does not independently verify deduction amounts. No submitted value is
  recalculated or replaced.
- Completing Task 10 requires verified, effective-dated official SSS
  contribution schedules (including MSC/MPF/EC), PhilHealth and Pag-IBIG
  schedules, BIR monthly withholding tables and taxable-compensation rules,
  and the approved statutory-profile/company-authorization contracts tied to
  each payroll version. Until the source versions are verified and loaded, an
  independent expected amount and discrepancy exception cannot be determined
  safely.
- The payroll migration has not been applied and Prisma Client has not been
  regenerated. Database migration integrity and generated types remain
  unverified.
- Cross-batch duplicate-payment detection is not available: the application
  has no authoritative payment/disbursement records or approved duplicate-run
  policy. Batch numbers, repeated submissions, and repeated decisions are
  protected, but this is not equivalent to payment deduplication.
- Independent payroll validation is blocked on the named calculation engine
  and configuration version, effective-dated compensation/eligibility,
  approved attendance/leave/overtime records, statutory/tax tables, and
  authoritative deduction/adjustment records. HR-provided evidence is
  displayed and checked only to the extent explicitly stated in the UI.
- Task 11 is only partially implementable with current sources. There is no
  payroll eligibility contract or effective-dated salary configuration linked
  to employees, no authoritative attendance transaction/schedule relation to
  compare with submitted evidence, no approved earnings/deduction transaction
  source, and no disbursement ledger. Therefore inclusion eligibility,
  compensation-rate changes, schedule conformance, deduction calculations or
  authorization, adjustment-request existence, and duplicate payments across
  batches cannot be independently established. No thresholds for "unusual"
  compensation changes or zero-pay records are defined, so those are not
  classified using invented heuristics.
- Deduction-category activation does not supply or verify statutory rates,
  eligibility, effective dates, calculation inputs, or authorization of
  individual deductions. Those still require an authoritative, maintained
  payroll/deduction source and business rules.
- Employee payroll list values are the submitted HR snapshot. This application
  has no authoritative approved-attendance/payroll-rules source to independently
  validate days worked, position, or salary rate; API responses explicitly
  mark the source as submitted and unverified.
- Earning lines have no approval state or authoritative transaction relation,
  and there is no defined cross-category earning identity for de-duplication.
  Exact duplicate lines are flagged by submission validation, but the
  breakdown cannot certify approval or detect overlapping bonus/adjustment
  records without those source contracts.
- The batch workflow has no distinct HR verification record or verifier policy;
  submission performs server validation and submits the same version to Admin.
  Whether a second HR actor is required must be decided before changing this
  workflow.
- Payroll approval email notifications are not implemented. Existing SMTP
  code is invitation-only, and no transactional outbox/retry worker or
  approved recipient/retry policy exists.
- There is no disbursement workflow or payment integration. Approval records
  authorization only.
- XLSX monetary amounts are stored as exact decimal text with a separate
  currency column to avoid Excel's 15-digit numeric precision loss; they are
  not spreadsheet-summable currency cells. Timestamps are exported as
  ISO-8601 text with an offset and time-zone label. The preparer name is frozen
  when the version is created; organization name, time zone, and submitter name
  are frozen on submission. Historical versions created before these snapshots
  show an explicit uncaptured-context fallback and use UTC rather than current
  settings. Attendance data supports one time-in/time-out pair per evidence
  record. The workbook is capped at 32 MiB uncompressed.
- The custom OOXML/ZIP workbook has focused source tests but has not been
  opened in Excel or LibreOffice. Treat format compatibility and large-report
  behavior as unverified.

## API surface

| Endpoint | Methods | Purpose |
|---|---|---|
| `/api/hr/payroll` | `GET`, `POST` | HR batch list and draft creation |
| `/api/hr/payroll/[batchId]` | `GET` | Read one exact version |
| `/api/hr/payroll/[batchId]/versions` | `POST` | Create a correction version after return |
| `/api/hr/payroll/[batchId]/versions/[version]` | `PATCH` | Update the latest draft |
| `/api/hr/payroll/[batchId]/versions/[version]/submit` | `POST` | Submit a draft version to Admin |
| `/api/admin/payroll` | `GET` | Admin approval list |
| `/api/admin/payroll/[batchId]` | `GET` | Admin exact-version review |
| `/api/admin/payroll/[batchId]/decision` | `POST` | Approve, return, or reject the pending version |
| `/api/admin/payroll/[batchId]/report` | `GET` | Download and audit an XLSX export |
| `/api/admin/payroll/rules` | `GET`, `POST` | Read or save Admin-only rule drafts |
| `/api/hr/payroll/deduction-categories` | `GET`, `POST` | Read active/latest category sets or save an HR draft |
| `/api/admin/payroll/deduction-categories` | `GET`, `POST` | Read category sets or activate the latest HR draft |
| `/api/admin/payroll/[batchId]/employees` | `GET` | Paginated, filterable employee payroll list for one submitted version |
| `/api/admin/payroll/[batchId]/employees/[employeeId]` | `GET` | Exact-version employee payroll and evidence details |

## Verification

- `git diff --check` passed.
- Focused payroll-results tests, including the new attendance-validation cases,
  and authorization tests were added but not executed.
- Prisma validation/generation, migrations, tests, lint, type-check, build, and
  browser verification were not run. The available environment does not provide
  the OS-enforced isolation required to execute repository-controlled code.
- The employee detail page and paginated Admin list have not been browser- or
  accessibility-tested in this environment.
- The worktree contains unrelated pre-existing changes; they were preserved.

**Do not enable production payroll approval or disbursement until schema
generation/migration, isolated tests, XLSX compatibility checks, and the missing
authoritative data and notification/payment workflows are addressed.**
