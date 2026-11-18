# CONSOLIDATED IMPLEMENTATION PROMPT
# PAYROLL VALIDATION, HR PAYROLL CONFIGURATION, ADMIN APPROVALS, AND FINANCIAL GOVERNANCE

## 1. IMPLEMENTATION CONTEXT

Continue the existing Payroll Approvals implementation from **Task 11 onward**.

The original Tasks 1–10 cover payroll list retrieval, payroll review, XLSX generation, financial summaries, payable breakdowns, employee deductions, employee payroll details, attendance details, and individual deduction calculations.

Do not unnecessarily recreate or rewrite completed functionality.

First inspect the current implementation of Tasks 1–10 and identify which features are completed, incomplete, or need modifications to support the extended requirements.

Preserve existing working implementations and integrate the new functionality into them.

The remaining implementation must cover:

1. Centralized payroll calculation and configuration.
2. Default Philippine payroll, deduction, and benefits calculation templates.
3. HR-controlled company payroll settings.
4. Secure and versioned calculation rules.
5. Administrative configuration approval and audit.
6. Payroll validation and exception detection.
7. Payroll adjustments and audit timeline.
8. Return, rejection, approval, and disbursement workflows.
9. Payroll history and reporting.
10. Security, scalability, and end-to-end verification.

## 2. MANDATORY DEVELOPMENT REQUIREMENTS

### Required skills

Use **Ponytail** and **security-audit** throughout the implementation.

Ponytail must guide code organization, maintainability, implementation discipline, and consistent architectural patterns.

The security-audit skill must be used when inspecting and implementing authentication, authorization, APIs, sensitive financial data, calculation configuration, report generation, audit logs, approval workflows, and database operations.

Invoke the actual installed skills and follow their instructions. Do not merely mention them in the final report.

### Codebase inspection

Before modifying existing files, inspect:

- Payroll calculation and submission services.
- Existing Prisma models and relationships.
- Employee salary and compensation records.
- Attendance and overtime calculations.
- Statutory contribution and tax configurations.
- Earnings, deductions, and benefits.
- Adjustment approval processes.
- Payroll versions and snapshots.
- Existing audit and notification services.
- Admin and HR role permissions.
- Existing report generation.
- Existing Payroll Approvals functionality.

Follow the existing technology stack and architecture.

Do not introduce a second payroll calculation engine, duplicate database structures, or unrelated dependencies.

### Non-negotiable rules

- Database records are the source of truth.
- All calculations must be performed or verified server-side.
- No frontend-only financial calculations.
- Do not hardcode statutory rates throughout the application.
- Do not invent missing business rules.
- Do not silently modify historical payroll values.
- Use decimal-safe monetary calculations.
- Validate all inputs and database relationships.
- Use transactions for related financial operations.
- Prevent duplicate processing and concurrent conflicting updates.
- Enforce authorization independently in every protected API.
- Never execute unrestricted user-defined code as a payroll formula.
- Do not expose sensitive employee information unnecessarily.
- Do not mark a feature complete without end-to-end verification.

---

# TASK 11 – CENTRALIZED PAYROLL RULES AND CALCULATION FOUNDATION

Before completing the existing Payroll Validation Engine, establish the necessary payroll calculation and configuration foundation.

Inspect the existing payroll calculation logic and identify the authoritative sources for:

- Basic salary.
- Daily and hourly rates.
- Overtime.
- Night differential.
- Holiday premiums.
- Rest-day premiums.
- Allowances.
- Bonuses.
- Other earnings.
- SSS.
- PhilHealth.
- Pag-IBIG.
- Withholding tax.
- Other authorized deductions.
- Employer contributions.
- Statutory leave benefits.
- Company-provided benefits.
- 13th-month pay.

Do not duplicate calculations that already exist.

If an authoritative calculation service is present, extend and reuse it. If it is incomplete, centralize the missing functionality.

## 11.1 Central Payroll Calculation Engine

Establish one reusable calculation engine used by:

- HR payroll processing.
- Employee payroll calculations.
- Payroll validation.
- Admin payroll review.
- Payroll reconciliation.
- XLSX report generation.

The HR Portal must not have a separate calculation implementation from the Admin Portal.

The engine must support:

- Monthly-paid employees.
- Daily-paid employees.
- Hourly-paid employees.
- Partial payroll periods.
- Salary changes.
- Proration.
- Approved overtime.
- Night differential.
- Holiday premiums.
- Allowances.
- Bonuses.
- Statutory deductions.
- Company deductions.
- Benefits.
- Employer contributions.
- 13th-month pay.
- Applicable leave-related calculations.

Use the correct employee compensation basis and applicable company configuration.

Do not automatically assume a salary divisor of 22, 26, or 30 days. Use the effective company policy and applicable employment rules.

## 11.2 Default Philippine Reference Payroll Configuration

Provide a sample Philippine payroll ruleset for HR to review and use as a starting point.

The initial ruleset must include sample basic salary, overtime, night differential, holiday premiums, statutory deductions, company deductions, benefits, and employer contributions.

Every rule must have an effective date, calculation basis, applicability, and source reference.

Use this sample employee as an automated calculation fixture, not as an actual employee record.

**Sample employee assumptions:**

- Monthly basic salary: ₱30,000.
- Full monthly payroll period.
- Applicable SSS, PhilHealth, and Pag-IBIG coverage.
- No overtime.
- No holiday premium.
- No night differential.
- No allowance or bonus.
- No additional deductions.
- Simplified monthly withholding-tax example.
- No cumulative or year-end tax adjustment.

**Sample earnings:**

| Component | Amount |
|---|---:|
| Basic salary | ₱30,000.00 |
| Overtime | ₱0.00 |
| Night differential | ₱0.00 |
| Holiday premium | ₱0.00 |
| Allowances | ₱0.00 |
| Bonuses | ₱0.00 |
| Gross earnings | ₱30,000.00 |

**Illustrative employee deductions:**

| Component | Amount |
|---|---:|
| SSS | ₱1,500.00 |
| PhilHealth | ₱750.00 |
| Pag-IBIG | ₱200.00 |
| Mandatory contributions | ₱2,450.00 |
| Withholding tax | ₱1,007.55 |
| Total deductions | ₱3,457.55 |
| Net pay | ₱26,542.45 |

The withholding-tax example uses:

`Taxable regular compensation = ₱30,000 - ₱2,450 = ₱27,550`

`Withholding tax = 15% × (₱27,550 - ₱20,833) = ₱1,007.55`

**Illustrative employer contributions:**

| Component | Amount |
|---|---:|
| SSS, including illustrative EC | ₱3,030.00 |
| PhilHealth | ₱750.00 |
| Pag-IBIG | ₱200.00 |
| Total employer contributions | ₱3,980.00 |

**Illustrative 13th-month benefit:**

For an eligible employee with ₱360,000 qualifying annual basic salary:

`13th-Month Pay = ₱360,000 / 12 = ₱30,000`

Equivalent monthly accrual: ₱2,500.

This benefit accrual must be separate from the employee's monthly net pay. It must not be deducted from monthly take-home compensation.

These figures are an illustrative reference fixture, not permanent statutory constants. The system must verify the correct government contribution and tax tables for the relevant effective payroll period before activating a production ruleset.

## 11.3 Statutory Rules

Implement effective-dated and versioned reference configurations for:

- SSS contribution schedules, including applicable MPF and EC.
- PhilHealth contributions.
- Pag-IBIG contributions.
- BIR withholding tax tables.
- Applicable de minimis benefits.
- Statutory overtime and holiday premiums.
- Night shift differential.
- 13th-month pay.
- Applicable statutory leave entitlements.

Keep employee contributions separate from employer contributions.

For example, do not deduct the employer's SSS, PhilHealth, or Pag-IBIG share from employee net pay.

Use official government issuances as the source of statutory rule values.

Do not hardcode values in the UI or scatter formulas across API routes.

Do not permit ordinary HR users to silently modify statutory government values. HR may review them and propose an update with supporting references, but activation must follow the protected approval process.

## 11.4 Calculation Traceability

Every calculation must be reproducible and traceable.

Retain appropriate references to:

- Employee record.
- Attendance records.
- Approved overtime.
- Compensation configuration.
- Earnings configuration.
- Deduction configuration.
- Benefits configuration.
- Applicable statutory tables.
- Calculation formula.
- Formula inputs.
- Applied rates or multipliers.
- Effective dates.
- Rounding operations.
- Intermediate results.
- Final amount.
- Calculation engine version.

Do not store only the employee's final net pay without retaining sufficient calculation evidence.

---

# TASK 12 – HR PAYROLL CONFIGURATION PORTAL

Create a dedicated Payroll Setup or Payroll Configuration section in the HR Portal.

HR must be able to configure company payroll calculations without directly modifying source code or database records.

Organize the interface into the following sections.

## 12.1 Company Payroll Settings

Allow authorized HR users to configure:

- Payroll frequency.
- Payroll cutoff and pay dates.
- Payroll groups.
- Working days and hours.
- Rest days.
- Company timezone.
- Salary conversion method.
- Monthly-to-daily divisor.
- Daily-to-hourly divisor.
- Payroll proration rules.
- Rounding policy.

## 12.2 Earnings Configuration

Support configuration of:

- Basic salary calculation.
- Overtime.
- Night differential.
- Holiday premiums.
- Rest-day premiums.
- Allowances.
- Bonuses.
- Commissions.
- Other approved earnings.

## 12.3 Deductions Configuration

Support:

- SSS.
- PhilHealth.
- Pag-IBIG.
- Withholding tax.
- Employee loans.
- Cash advances.
- HMO dependent contributions.
- Authorized insurance contributions.
- Late and undertime deductions, where legally and contractually permitted.
- Other authorized company deductions.

## 12.4 Benefits Configuration

Support:

- 13th-month pay.
- Service incentive leave.
- Other applicable statutory leave benefits.
- HMO.
- Dependent HMO.
- Medical assistance.
- Rice allowance.
- Meal allowance.
- Transportation allowance.
- Clothing allowance.
- Communication allowance.
- Life insurance.
- Accident insurance.
- Performance bonuses.
- Attendance incentives.
- Other company-provided benefits.

Each benefit must have a clear classification:

- Statutory or company-provided.
- Cash or non-cash.
- Employer-paid or employee-funded.
- Reimbursable or accrued.
- Taxable or non-taxable.
- Contribution treatment.
- 13th-month basic salary treatment.
- Eligibility requirements.

Do not automatically classify all allowances as tax-exempt or include every benefit in 13th-month computation.

Do not deduct employer-paid benefits from employee net pay.

## 12.5 Employee Applicability

Allow HR to define applicability by:

- All eligible employees.
- Department.
- Employee category.
- Employment type.
- Position.
- Pay group.
- Specific employee.

Prevent conflicting configurations.

Each employee must have one coherent applicable set of compensation, deduction, and benefit rules.

## 12.6 Configuration Preview and Simulation

Before submitting a configuration change, HR must be able to run a calculation simulation.

Show:

- Current calculation.
- Proposed calculation.
- Difference in gross earnings.
- Difference in deductions.
- Difference in net pay.
- Employer contribution difference.
- Benefit accrual difference.
- Number of affected employees.
- Estimated aggregate payroll impact.

Use synthetic or appropriately authorized anonymized employee data.

A preview must never activate a configuration or modify actual payroll records.

---

# TASK 13 – CONTROLLED FORMULA ENGINE

Implement a controlled calculation and formula configuration system.

HR must be able to select approved calculation methods and configure parameters such as:

- Fixed amount.
- Percentage.
- Hourly calculation.
- Daily calculation.
- Per-unit calculation.
- Tiered contribution table.
- Statutory table lookup.
- Prorated salary.
- Benefit accrual.
- Employer-paid contribution.
- Employee/employer shared contribution.
- Capped or minimum/maximum calculation.
- Eligibility-based calculation.

Allow approved combinations of formula components.

Never allow unrestricted JavaScript, TypeScript, SQL, Python, `eval`, `Function`, or arbitrary executable code as payroll formulas.

Use a restricted formula representation or expression tree with:

- Approved variables.
- Allowed mathematical operators.
- Approved functions.
- Defined calculation inputs.
- Explicit calculation limits.
- Dependency validation.

Reject unknown variables, invalid formulas, unsafe expressions, unsupported functions, circular dependencies, and invalid calculation parameters.

The formula engine must be deterministic, decimal-safe, reusable, scalable, and independently testable.

Every execution must record the applied formula and configuration version.

---

# TASK 14 – CONFIGURATION VERSIONING AND ADMIN APPROVAL

Every payroll configuration must have immutable versions.

Do not overwrite an active configuration that has already been used in payroll processing.

Each version must contain:

- Configuration ID.
- Version number.
- Category.
- Configuration values.
- Formula definition.
- Applicability.
- Effective start and end dates.
- Status.
- Created by.
- Reason for change.
- Supporting reference.
- Approval details.
- Activation timestamp.

Use appropriate lifecycle states such as Draft, Pending Approval, Approved, Scheduled, Active, Superseded, Rejected, and Retired.

Use the following maker-checker workflow:

1. HR creates or modifies a draft.
2. HR validates the proposed configuration.
3. HR runs a simulation.
4. HR submits the configuration for approval.
5. An authorized Admin reviews the proposed changes.
6. Admin approves or rejects the configuration.
7. Approved configuration becomes active according to its effective date.
8. The previous configuration remains available as historical data.

Require a rejection reason.

Prevent a user from approving their own change where separation of duties applies.

### Admin configuration review

Display:

- Configuration name.
- Category.
- Previous values.
- Proposed values.
- Field-level differences.
- Reason for modification.
- Supporting documents or references.
- Effective date.
- Affected departments and employee groups.
- Estimated affected employee count.
- Financial impact.
- Simulation result.
- Requesting HR user.

Do not allow an unapproved configuration to affect production payroll.

A new configuration must never silently modify a submitted, approved, or paid payroll.

For retroactive corrections, require a separate authorized recalculation or adjustment workflow.

---

# TASK 15 – ADMIN PAYROLL CONFIGURATION AUDIT

Create a centralized append-only audit log for every payroll configuration change.

Capture changes to:

- Salary rules.
- Proration and conversion factors.
- Overtime.
- Night differential.
- Holiday premiums.
- Allowances and bonuses.
- Deductions.
- Tax configurations.
- SSS, PhilHealth, and Pag-IBIG settings.
- Benefit rules.
- Leave calculations.
- Employee applicability.
- Formula definitions.
- Rounding rules.
- Effective dates.
- Configuration activation, rejection, and retirement.

Every event must record:

- Audit event ID.
- Configuration ID and version.
- Action type.
- Category.
- Acting user ID and role.
- Timestamp.
- Previous and new configuration references.
- Field-level changes.
- Previous and new values.
- Reason.
- Supporting reference.
- Effective date.
- Approval status.
- Approving administrator.
- Approval timestamp.
- Affected employee or department scope.
- Estimated financial impact.
- Request correlation ID.
- Additional permitted security metadata.

### Audit protection

- Audit records must be append-only.
- Normal APIs must not permit editing or deleting historical audit events.
- Record rejected or failed configuration attempts when appropriate.
- Protect sensitive information.
- Use transactions so configuration changes and corresponding audit events cannot become inconsistent.
- Apply suitable retention policies.
- Consider tamper-evident integrity mechanisms where appropriate.

Never log passwords, authentication tokens, MFA secrets, or unnecessary personal information.

## Admin Audit Interface

Create an Admin configuration history interface.

Display:

- Configuration.
- Category.
- Changed by.
- Date modified.
- Previous version.
- New version.
- Status.
- Effective date.
- View Details action.

Provide filters for category, user, status, date range, effective date, and affected department.

The detail view must show the complete before-and-after comparison, change reason, supporting reference, financial impact, approval information, and affected payroll scope.

Historical values must come from persisted audit/version records, not from the current configuration.

---

# TASK 16 – UPDATE EXISTING PAYROLL REVIEW AND XLSX INTEGRATION

Integrate the new calculation configuration into the existing Tasks 1–10.

Do not recreate completed UI or API functionality.

Modify the appropriate components and services to display:

### Payroll Overview

- Earnings configuration version.
- Deduction configuration version.
- Benefits configuration version.
- Applicable statutory rule versions.
- Calculation engine version.
- Calculation timestamp.
- Payroll submission timestamp.

### Payroll Summary

Continue displaying:

- Gross payable.
- Employee deductions.
- Net payable.
- Included employee count.

Additionally display employer contributions and employer-paid benefits separately where appropriate.

Do not combine employer contributions with employee deductions.

### Payable Breakdown

Preserve the existing earnings categories and ensure that allowances, bonuses, and adjustments are not counted twice.

### Employee Deductions

Use the exact deduction records generated by the authoritative calculation engine.

### Employee Salary Breakdown

Display the applied configuration versions and calculation trace so Admin can identify:

- Applicable salary rate.
- Compensation basis.
- Overtime rule.
- Night differential rule.
- Holiday configuration.
- Deduction table.
- Benefit eligibility.
- Tax treatment.
- Source attendance and payroll records.

### XLSX Report

Extend the existing workbook with:

**Employer Contributions**
- Employee ID.
- Employee name.
- Employer SSS.
- EC.
- Employer PhilHealth.
- Employer Pag-IBIG.
- Other employer contributions.
- Total employer contributions.

**Benefits and Accruals**
- Employee ID.
- Employee name.
- Benefit.
- Amount.
- Employer-paid portion.
- Employee-funded portion.
- Accrued amount.
- Eligibility.
- Applied configuration version.
- Tax treatment.

**Calculation Rules and Assumptions**
- Payroll batch and version.
- Calculation engine version.
- Earnings configuration version.
- Deduction configuration version.
- Benefits configuration version.
- Statutory rule versions.
- Effective dates.
- Rounding policy.

**Reconciliation**
- Gross earnings.
- Employee deductions.
- Net payable.
- Employer contributions.
- Employer-paid benefits.
- Employee-level and batch-level totals.

The exported report must match the exact payroll snapshot being reviewed.

Use secure report delivery, proper access control, formula injection protection, appropriate formatting, and memory-efficient processing.

Never export a report using newer configuration values to reinterpret an older payroll.

---

# TASK 17 – PAYROLL VALIDATION AND EXCEPTIONS ENGINE

Continue the original Payroll Validation Engine implementation.

Centralize validation so the same rules are used by HR payroll submission, Admin review, and approval APIs.

Detect the following issues.

### Employee validation

- Missing employee records.
- Invalid employee IDs.
- Inactive or ineligible employees included unexpectedly.
- Missing compensation information.
- Missing payroll records.
- Duplicate employee inclusion.

### Attendance validation

- Missing attendance.
- Incomplete time-in or time-out records.
- Duplicate attendance.
- Attendance outside the payroll period.
- Attendance inconsistencies.
- Unapproved overtime.
- Invalid holiday or rest-day classifications.

### Compensation validation

- Unusual salary changes.
- Incorrect compensation rates.
- Missing salary configurations.
- Incorrect working-day or payable-day calculations.
- Unexpected basic pay.
- Unauthorized earnings.
- Duplicate earnings.
- Incorrect premiums.

### Deduction and benefit validation

- Missing or outdated statutory configurations.
- Incorrect contribution tables.
- Missing eligible deductions.
- Duplicate deductions.
- Unauthorized deductions.
- Incorrect tax treatment.
- Invalid benefit eligibility.
- Incorrect benefit accruals.
- Employer contribution incorrectly included as employee deduction.

### Configuration validation

- Missing configuration.
- Unapproved configuration version.
- Expired configuration.
- Conflicting employee applicability.
- Overlapping effective dates.
- Invalid formulas.
- Circular dependencies.
- Invalid rounding settings.
- Superseded rules used unexpectedly.
- Calculation using a stale configuration.

### Financial validation

- Incorrect gross pay.
- Incorrect total deductions.
- Incorrect net pay.
- Negative net pay.
- Unexpected zero-pay records.
- Duplicate employee payments.
- Inconsistent batch totals.
- Incorrect employee-to-batch reconciliation.
- Differences between calculated values and submitted values.
- Differences between exported and stored values.

### Exception records

Every exception must record:

- Exception ID.
- Batch and payroll version.
- Employee ID, where applicable.
- Exception category.
- Severity.
- Issue description.
- Affected field.
- Actual value.
- Expected value, where determinable.
- Source record references.
- Detection timestamp.
- Resolution status.
- Resolution details.
- Resolver and timestamp.

Support four severity levels:

1. Critical.
2. High.
3. Warning.
4. Info.

Display exceptions in that severity order.

For batch-level exceptions, use a batch reference instead of inventing an employee ID.

When View Details is clicked, show the actual source records, affected field, underlying inconsistency, and required corrective action.

Do not show vague exception descriptions.

## Strict approval blocking

No unresolved exception may be ignored when approving payroll.

All unresolved Critical, High, Warning, and Info exceptions must block approval under this strict approval policy.

Enforce this in both the interface and backend.

An exception is not resolved merely because someone viewed or dismissed it.

Only resolve exceptions through the appropriate correction and validation process.

After correction:

1. Correct the underlying source record.
2. Re-run relevant validation.
3. Confirm that the issue no longer exists.
4. Record the resolution.
5. Preserve the original exception history.

Never permit a manual deletion or general override to bypass the approval restriction.

---

# TASK 18 – PAYROLL ADJUSTMENTS AND AUDIT TIMELINE

## 18.1 Adjustments

Retrieve existing TL and HR adjustment requests and approvals.

Display:

- Adjustment ID.
- Employee.
- Type.
- Amount.
- Reason.
- Requested by (TL).
- Approved by (HR).
- Status.

Support adjustment categories for valid delayed or missed compensation requests, allowances, overtime, leave benefits, and other applicable items.

Verify the actual request, approval, employee, amount, and payroll period.

Only authorized adjustments may affect payroll.

Detect:

- Unapproved adjustments.
- Missing requests.
- Missing reasons.
- Duplicate adjustments.
- Incorrect employee relationships.
- Invalid amounts.
- Missing approval records.

Preserve the original request and approval history.

## 18.2 Audit Timeline

Implement a centralized payroll batch timeline.

Display actual recorded events, including:

- Batch creation.
- Calculation completion.
- HR submission.
- Payroll version creation.
- Adjustments requested and approved.
- Validation execution.
- Exception detection.
- Return for correction.
- HR corrections.
- Resubmission.
- Rejection.
- Approval.
- Disbursement handoff.
- Actual payment status updates, where supported.

Each event must include:

- Event ID.
- Batch and version.
- Event type.
- Description.
- Acting user.
- Role.
- Timestamp.
- Related record references.

Preserve all historical events across resubmissions.

Never fabricate history from the current payroll status.

---

# TASK 19 – RETURN, REJECTION, APPROVAL, AND DISBURSEMENT

## 19.1 Return for Correction

Require an administrator correction note.

When returned:

- Change the batch status to Returned.
- Preserve the submitted payroll version.
- Record administrator and timestamp.
- Identify unresolved exceptions.
- Notify HR.
- Display the correction notes and highlighted employee records in the HR Portal.

When HR corrects and resubmits:

- Create a new payroll version.
- Preserve previous versions.
- Recalculate using the intended approved configuration.
- Rerun validation.
- Record the resubmission.
- Return the new version to Pending approval.

Do not allow approval of a stale or previously returned version.

## 19.2 Reject Batch

Rejection must be distinct from returning for correction.

Require a mandatory rejection reason.

Record:

- Reason.
- Administrator.
- Timestamp.
- Payroll version.
- Audit event.

Notify HR.

A rejected submission must not remain eligible for approval.

Any replacement submission must follow the defined batch lifecycle and preserve the rejected history.

## 19.3 Approve Payroll

Before approval, the backend must revalidate:

- User authorization.
- Current batch status.
- Exact payroll version.
- Version immutability.
- Employee inclusion.
- Financial reconciliation.
- Deduction validity.
- Adjustment approvals.
- Configuration approval and effective date.
- No duplicate payments.
- No unresolved validation exceptions.

The approval operation must be transactional.

Protect against:

- Double submissions.
- Duplicate approval records.
- Concurrent approval attempts.
- Stale payroll versions.
- Approval of returned or rejected payroll.

After successful approval:

- Record the administrator.
- Record the timestamp.
- Change the status.
- Preserve the approved snapshot.
- Create the audit event.
- Create the disbursement authorization or handoff record where supported.

## 19.4 HR Notification

Notify the responsible HR account after successful approval.

Include:

- Batch identifier.
- Payroll period.
- Approved version.
- Net payable.
- Approving administrator.
- Approval timestamp.
- Next action.

Use the existing notification infrastructure.

A notification failure must not produce a second approval.

Use existing retry/outbox mechanisms where available.

## 19.5 Disbursement

Keep approval separate from actual payment.

Distinguish applicable statuses such as:

- Pending Approval.
- Approved.
- Ready for Disbursement.
- Processing.
- Partially Paid.
- Paid.
- Payment Failed.

Reuse the existing payment workflow and introduce only compatible statuses.

Do not mark a payroll Paid merely because it was approved.

Never claim that employees were paid without an actual payment or verified disbursement record.

---

# TASK 20 – APPROVED AND REJECTED/RETURNED PAYROLL HISTORY

Preserve the original Approved and Rejected/Returned tabs and verify their integration.

### Approved tab

Display:

- Payroll batch.
- Date period.
- Approved net payable.
- Employee count.
- Status.
- View button.

View must retrieve the correct immutable approved version and preserve its original financial values.

Disable modification and approval actions.

Allow authorized historical report downloads.

Distinguish approved from actually disbursed payroll.

### Rejected/Returned tab

Display:

- Payroll batch.
- Date period.
- Original submission date.
- Latest return or rejection date.
- Number of returns.
- Status.
- View button.

Do not populate Date Approved unless an actual approval occurred.

The detail view must display:

- Previous payroll versions.
- Return and rejection reasons.
- All validation exceptions.
- Administrator notes.
- HR corrections.
- Resubmission timestamps.
- Complete audit timeline.

Preserve the entire history. Do not show only the latest exception list.

Use database-backed search, filtering, and pagination.

---

# TASK 21 – DATABASE, API, AND SOURCE-OF-TRUTH INTEGRITY

Inspect existing database models before adding or modifying structures.

Implement only the necessary entities and relationships for:

- Payroll configuration.
- Configuration versions.
- Statutory reference rules.
- Earnings, deductions, and benefit configurations.
- Employee applicability.
- Formula definitions.
- Configuration approvals.
- Configuration audit events.
- Calculation traces.
- Payroll snapshots.
- Validation exceptions.
- Return/rejection/approval history.
- Report records.
- Disbursement references.

These are logical requirements, not instructions to duplicate existing models.

Provide appropriately secured and validated APIs for:

- Payroll configuration retrieval and updates.
- Configuration draft creation.
- Configuration validation and simulation.
- Configuration submission and approval.
- Configuration history and comparison.
- Statutory table retrieval.
- Payroll calculation.
- Calculation trace retrieval.
- Payroll reconciliation.
- Validation and exception management.
- Return and resubmission.
- Rejection and approval.
- Audit timeline.
- XLSX export and download.

Follow the existing application API conventions.

Keep controllers/routes, services, validation schemas, and database access logically separated.

Every API must use consistent response handling and independently verify authorization.

---

# TASK 22 – SECURITY, SCALABILITY, AND PERFORMANCE

Apply the security-audit skill to the complete implementation.

Enforce:

- Server-side authorization.
- Protected statutory configuration.
- Restricted formula execution.
- Maker-checker approval.
- Immutable configuration versions.
- Immutable approved payroll.
- Append-only audit logs.
- Secure report generation.
- Sensitive employee data protection.
- Input validation and sanitization.
- SQL injection prevention.
- Secure file handling.
- Transactional operations.
- Idempotency.
- Concurrency protection.
- Appropriate rate limiting.
- Secure session and account checks.

Do not let unauthorized HR, TL, or Employee accounts access Admin approval operations.

Do not expose unnecessary salary, deduction, tax, or personal information.

For scalability, use:

- Efficient indexed database queries.
- Server-side pagination.
- Batch processing.
- Avoidance of N+1 queries.
- Memory-efficient report generation.
- Reusable calculation services.
- Deterministic calculation results.
- Controlled parallel processing.
- Appropriate background jobs for large operations where supported.
- Calculation fingerprints or equivalent mechanisms to avoid unnecessary repeated work.

Never allow performance optimizations to bypass validation, audit logging, or calculation traceability.

---

# TASK 23 – TESTING AND VERIFICATION

Create and execute comprehensive tests.

### Payroll calculation tests

Verify:

- Monthly, daily, and hourly pay.
- Partial payroll periods.
- Salary proration.
- Overtime.
- Night differential.
- Holiday and rest-day premiums.
- Allowances and bonuses.
- Statutory contributions.
- Withholding tax.
- Company deductions.
- Benefits.
- 13th-month calculations.
- Employer contributions.
- Decimal precision and rounding.

Include the ₱30,000 sample fixture from Task 11.

### Boundary tests

Test applicable minimum and maximum contribution values, tax brackets, benefit ceilings, effective dates, overtime classifications, employee eligibility, and partial-period calculations.

### Configuration tests

Verify:

- HR can create and modify drafts.
- Invalid formulas are rejected.
- Simulations are accurate.
- Changes are audited.
- Previous versions remain accessible.
- Admin can approve or reject changes.
- Unauthorized users cannot activate configurations.
- Maker-checker restrictions work.
- Effective dates are respected.
- Historical payroll remains unchanged.
- Concurrent updates do not overwrite one another.

### Validation tests

Verify every validation category, severity classification, exception detail, resolution workflow, and approval-blocking restriction.

Test direct API attempts to bypass restrictions.

### Payroll lifecycle tests

Test:

1. HR configures payroll rules.
2. HR runs a sample calculation.
3. HR submits a configuration for approval.
4. Admin reviews and approves it.
5. Configuration activates on its effective date.
6. HR calculates payroll.
7. The payroll snapshot captures the applied configurations.
8. HR submits payroll.
9. Admin reviews the exact version.
10. Admin exports the XLSX.
11. Admin resolves or returns exceptions.
12. HR corrects and resubmits.
13. Admin approves the valid version.
14. HR receives the notification.
15. Payroll proceeds to the disbursement workflow.

Also test configuration changes after payroll submission. The existing submitted snapshot must remain unchanged.

### XLSX and security tests

Verify:

- Exact version export.
- Correct worksheets and totals.
- Formula injection prevention.
- Secure report access.
- Large-report processing.
- Financial reconciliation.
- Authorization.
- Audit preservation.

Run TypeScript checks, linting, unit tests, integration tests, API tests, database tests, end-to-end tests, security checks, and production build checks.

Do not suppress meaningful errors or weaken validation to make tests pass.

---

# TASK 24 – IMPLEMENTATION TRACKING AND REPORTING

Continue the existing implementation status document. Do not create unnecessary duplicate progress files.

Use clear statuses:

- Not Started.
- In Progress.
- Completed.
- Blocked.
- Needs Verification.

For each task record:

- Task ID.
- Status.
- Files modified.
- APIs modified or created.
- Database changes.
- Business rules implemented.
- Configuration versions involved.
- Audit behavior.
- Tests executed.
- Results.
- Dependencies.
- Outstanding issues.

Update the implementation status after each task or coherent task group, before moving to dependent work.

Do not mark a task Completed when only its frontend or API is implemented.

The final report must include:

1. Existing functionality reused.
2. Database and migration changes.
3. Payroll calculation engine.
4. Default payroll and deduction templates.
5. Benefits and employer contribution calculations.
6. HR configuration features.
7. Configuration versioning and approvals.
8. Admin configuration audit.
9. Payroll validation and exceptions.
10. Return, rejection, approval, and disbursement workflows.
11. XLSX reporting.
12. Security-audit findings.
13. Performance considerations.
14. Test results.
15. Incomplete or blocked functionality.

Do not claim successful completion without actual verification.

---

# FINAL ARCHITECTURAL REQUIREMENT

Implement and preserve this centralized architecture:

HR Portal → Payroll Configuration Drafts → Validation and Simulation → Admin Configuration Approval → Versioned Active Configuration → Central Payroll Calculation Engine → Immutable Payroll Snapshot → Admin Payroll Review and Approval.

Maintain a separate, append-only audit repository for configuration changes, calculations, and administrative actions.

The calculation engine must be the only authoritative implementation of payroll formulas.

The HR Portal controls approved company configuration.

The Admin Portal reviews configuration changes and payroll outcomes.

The database preserves historical versions and calculation evidence.

Every payroll amount must be traceable to its employee source records, applied formula, configuration version, and applicable statutory rule.

Never allow an unapproved configuration, stale calculation, unresolved validation exception, or unauthorized modification to silently affect employee compensation.

**Continue from Task 11. Preserve completed work from Tasks 1–10. Implement systematically, use Ponytail and security-audit throughout, validate every task, and prioritize financial integrity, security, and scalability over speed.**