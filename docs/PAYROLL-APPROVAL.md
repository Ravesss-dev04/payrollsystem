# MASTER IMPLEMENTATION SPECIFICATION
# ADMIN PORTAL – PAYROLL APPROVALS MODULE

## PROJECT OBJECTIVE

Implement the complete **Payroll Approvals** module in the Admin Portal, including its APIs, backend services, database operations, payroll validation mechanisms, approval workflows, Excel report generation, audit history, and corresponding UI/UX.

This module is responsible for reviewing payroll batches submitted by HR before they are authorized for employee disbursement.

The system must provide administrators with a comprehensive and accurate view of every submitted payroll batch, including its financial summaries, employee-level salary calculations, attendance records, deductions, adjustments, validation exceptions, and activity history.

This is a financially sensitive module. Incorrect calculations, missing records, duplicate payments, inaccurate deductions, unauthorized adjustments, or inconsistent totals could directly affect employee compensation.

Therefore, prioritize:

1. Financial accuracy and data integrity.
2. Database consistency and a single source of truth.
3. Strict validation and exception detection.
4. Secure role-based access and approval workflows.
5. Accurate payroll report generation.
6. Auditability and traceability.
7. Scalability and maintainability.
8. Consistent frontend and backend behavior.

Do not treat this as a frontend-only task. Every displayed value, button, filter, action, calculation, and report must be connected to the appropriate backend functionality and persisted data.

---

# PART 0 – MANDATORY DEVELOPMENT INSTRUCTIONS

## 0.1 Required Agent Skills

Use the following skills throughout the entire implementation:

### Ponytail Skill

Use Ponytail to guide code quality, implementation discipline, codebase consistency, maintainability, and efficient development practices.

Apply it when:

- Inspecting the existing architecture.
- Designing and organizing services.
- Implementing API routes.
- Creating reusable functions.
- Modifying frontend components.
- Refactoring existing code.
- Reviewing implementation consistency.
- Identifying unnecessary complexity or duplicated logic.

### Security Audit Skill

Use the security-audit skill throughout the implementation, not only after the code has been completed.

Apply it when:

- Reviewing authentication and authorization.
- Inspecting API endpoints.
- Implementing payroll data retrieval.
- Implementing financial calculations and validation.
- Handling sensitive employee information.
- Generating and downloading payroll reports.
- Implementing approval and rejection operations.
- Managing payroll records and audit logs.
- Reviewing database transactions.
- Conducting final security verification.

Conduct security reviews before implementation, during relevant development tasks, and after integration.

Do not assume that merely mentioning these skills satisfies the requirement. Invoke and follow their actual instructions.

If either skill is unavailable in the active development environment, inspect the installed skill configuration and report the limitation instead of pretending the skill was used.

## 0.2 Codebase Inspection Before Modification

Before changing anything, thoroughly inspect the existing application.

Identify:

- Existing payroll-related database models.
- Payroll batches and payroll period structures.
- Payroll calculation services.
- Employee compensation and salary structures.
- Employee attendance records.
- Attendance approvals and exceptions.
- Overtime requests and approvals.
- Holiday and night differential configurations.
- Allowances and bonuses.
- Employee deductions.
- SSS, PhilHealth, Pag-IBIG, and withholding tax configurations.
- Adjustment request and approval workflows.
- HR and Team Leader responsibilities.
- Payroll submission mechanisms.
- Existing notifications and email services.
- Existing audit logs.
- Existing authentication and authorization mechanisms.
- Existing admin dashboard and payroll UI components.
- Existing report-generation utilities.
- Existing XLSX or spreadsheet-generation libraries.

Trace how a payroll record is currently produced, calculated, submitted, modified, and stored.

Determine which components already exist and which are missing.

Do not create a second payroll calculation engine if the application already has an authoritative one.

Do not duplicate existing financial data into new unrelated tables unless the architecture requires a separate payroll snapshot or audit representation.

## 0.3 Non-Negotiable Implementation Rules

- Follow the existing technology stack, architecture, and coding conventions.
- Preserve existing working payroll functionality.
- Do not make unrelated changes.
- Avoid mock data and frontend-only calculations.
- Do not hardcode payroll values, employee records, statutory contribution rates, or deduction formulas.
- Do not invent missing business rules.
- Validate all incoming data on the server.
- Use database transactions for related financial operations.
- Use appropriate database constraints and indexes.
- Prevent duplicate processing and repeated submissions.
- Protect sensitive employee and financial information.
- Do not expose internal database details in API responses.
- Do not silently discard invalid or incomplete payroll records.
- Do not declare a feature complete unless it works end to end.

When existing requirements conflict with this specification, identify the conflict and explain the possible impact before changing existing business behavior.

If critical business rules cannot be determined from the codebase, identify the exact missing dependency rather than inventing a formula or workflow.

---

# PART 1 – PAYROLL APPROVALS PAGE STRUCTURE

Implement the Payroll Approvals page in the Admin Portal with the following primary tabs:

1. Pending
2. Approved
3. Rejected / Returned

Each tab must retrieve its records from the database using the correct payroll status and submission history.

The page must support:

- Database-backed retrieval.
- Search and filtering, following existing dashboard conventions.
- Server-side pagination.
- Accurate financial summaries.
- Loading, empty, error, and success states.
- Consistent status labels.
- Appropriate access restrictions.

All three tabs must open the same comprehensive payroll review interface, with actions and available information determined by the batch's current status and the administrator's permissions.

---

# PART 2 – PENDING PAYROLL APPROVALS

## TASK 1: Create Payroll Approval List APIs

Implement the required APIs and backend functions for retrieving payroll batches submitted by HR and awaiting administrative review.

The Pending tab must contain payroll requests that require an administrator's decision.

### Required table columns

| Field | Description |
|---|---|
| Payroll Batch | Payroll batch name or identifier |
| Date Period | Payroll coverage period |
| Net Payable | Total net compensation for included employees |
| Employees | Number of employees included |
| Status | Current submission or review status |
| Action | View / Review button |

### Requirements

- Retrieve actual submitted payroll batch records.
- Only display batches that are eligible for administrative review.
- Retrieve the latest submitted payroll version.
- Display the correct payroll period.
- Display the net payable from the authoritative payroll snapshot.
- Calculate the included employee count accurately.
- Retrieve the current status from the database.
- Prevent draft, incomplete, or unsubmitted batches from appearing as pending approvals.
- Prevent duplicate batch entries caused by one-to-many database relationships.
- Support appropriate search and filtering.
- Implement server-side pagination.

Ensure that the displayed financial information corresponds to the exact payroll version submitted by HR.

Do not recompute or approximate the displayed net payable directly from frontend data.

## TASK 2: Implement Payroll Review Navigation

When the administrator clicks the View or Review button, open the detailed payroll review interface.

All relevant information must be retrieved from the database through dedicated APIs.

The review interface must contain the following sections:

1. Payroll Overview.
2. Financial Summary.
3. Payable Breakdown.
4. Employee Deductions.
5. Employee Payroll Details.
6. Validation and Exceptions.
7. Adjustments.
8. Audit Timeline.

The interface must also provide the appropriate administrative actions:

- Return for Correction.
- Reject Batch.
- Approve Payroll.

All actions must be available or disabled according to the batch status, authorization rules, and validation results.

---

# PART 3 – PAYROLL OVERVIEW AND REPORT EXPORT

## TASK 3: Implement Payroll Batch Overview API

At the top of the payroll review interface, display the batch information.

### Required fields

| Field | Description |
|---|---|
| Batch Number | Unique payroll batch identifier |
| Date Period | Payroll coverage period |
| HR Assigned | HR account responsible for preparing and submitting the payroll |
| Date Submitted | Actual submission timestamp |
| Number of Employees | Total included employees |
| Payroll Cutoff / Span | Applicable payroll cutoff or payroll coverage information |
| Payroll Version | Specific submitted payroll version |
| Report | Download XLSX button |

### Requirements

- Retrieve the batch metadata from the correct database records.
- Display the submitting HR account accurately.
- Distinguish the payroll period from the payroll cutoff where necessary.
- Display the correct version identifier.
- Preserve the submission timestamp.
- Ensure that batch metadata cannot become inconsistent with its employee payroll records.

## TASK 4: Implement XLSX Payroll Report Generation

Create a secure, accurate, and scalable XLSX report-generation function.

When the administrator clicks **Download Report**, the system must generate and download the complete payroll report for the selected submitted payroll version.

The Excel file must represent the exact payroll snapshot being reviewed.

Do not independently recalculate payroll using a separate formula implementation during export.

### Recommended workbook structure

Organize the workbook into clearly labeled sheets.

**Sheet 1 – Payroll Summary**

Include:

- Company information, where available.
- Payroll batch number.
- Payroll period.
- Payroll cutoff.
- Submitted by.
- Submission date.
- Payroll version.
- Total employees.
- Total gross payable.
- Total deductions.
- Total net payable.
- Summary of earnings.
- Summary of deductions.

**Sheet 2 – Employee Payroll Details**

Include one record per included employee:

- Employee ID.
- Employee name.
- Department.
- Position.
- Employment or salary classification, where applicable.
- Applicable compensation basis.
- Applicable salary rate.
- Days worked.
- Regular hours worked.
- Overtime hours.
- Gross pay.
- Total deductions.
- Net pay.

**Sheet 3 – Earnings Breakdown**

Include:

- Employee ID.
- Employee name.
- Basic pay.
- Overtime pay.
- Night differential.
- Holiday premiums.
- Allowances.
- Bonuses.
- Other approved earnings or adjustments.
- Total gross earnings.

**Sheet 4 – Employee Deductions**

Include:

- Employee ID.
- Employee name.
- SSS.
- PhilHealth.
- Pag-IBIG.
- Withholding tax.
- Late or undertime deductions, where authorized.
- HMO or dependent-related deductions, where applicable and authorized.
- Other authorized deductions.
- Total deductions.

**Sheet 5 – Attendance Details**

Include:

- Employee ID.
- Employee name.
- Attendance date.
- Time in.
- Time out.
- Additional time entries where multiple attendance punches exist.
- Total hours.
- Approved overtime hours.
- Attendance classification or exception, where applicable.

**Sheet 6 – Adjustments**

Include:

- Adjustment ID.
- Employee ID.
- Employee name.
- Adjustment type.
- Amount.
- Reason.
- Requested by.
- Approved by.
- Approval date.
- Adjustment status.

**Sheet 7 – Validation and Exceptions**

Include all validation records associated with the payroll version:

- Exception ID.
- Employee ID.
- Employee name.
- Exception category.
- Severity.
- Description.
- Resolution status.
- Relevant references.

### XLSX data accuracy requirements

Before generating the workbook:

1. Validate the payroll batch identifier and version.
2. Retrieve the exact payroll snapshot.
3. Verify employee inclusion.
4. Normalize and format all fields.
5. Validate numeric values and decimal precision.
6. Validate dates and timestamps.
7. Verify all employee identifiers and relationships.
8. Verify financial totals against the authoritative database snapshot.
9. Verify that earnings and deductions are not duplicated.
10. Verify that employee totals reconcile with batch totals.

### Formatting requirements

- Use clear worksheet names.
- Use descriptive column headers.
- Apply appropriate number formats for currency and quantities.
- Format dates and timestamps consistently.
- Preserve employee identifiers that contain leading zeros.
- Apply appropriate column widths.
- Freeze headers where useful.
- Add filters for employee-level records.
- Add clear total rows where applicable.
- Distinguish monetary values from percentages, hours, and dates.
- Avoid ambiguous or inconsistent labels.

### Security and reliability requirements

- Prevent spreadsheet formula injection from user-controlled text fields.
- Use proper cell types instead of inserting untrusted strings as formulas.
- Avoid exposing internal secrets, authentication information, or unnecessary personal data.
- Restrict report generation to authorized users.
- Restrict access to downloaded reports.
- Use secure file delivery or controlled private storage.
- Avoid permanent public report URLs.
- Ensure temporary files are securely managed and cleaned up.
- Implement appropriate error handling.
- Use streaming, batching, or other memory-efficient processing when needed for large payroll batches.
- Log export activity without logging unnecessary sensitive data.

The XLSX report must be reproducible for the same payroll version.

The report's totals must match the figures displayed in the payroll approval interface.

A report-generation failure must not change the payroll batch's approval status.## TASK 4: Implement XLSX Payroll Report Generation

Create a secure, accurate, and scalable XLSX report-generation function.

When the administrator clicks **Download Report**, the system must generate and download the complete payroll report for the selected submitted payroll version.

The Excel file must represent the exact payroll snapshot being reviewed.

Do not independently recalculate payroll using a separate formula implementation during export.

### Recommended workbook structure

Organize the workbook into clearly labeled sheets.

**Sheet 1 – Payroll Summary**

Include:

- Company information, where available.
- Payroll batch number.
- Payroll period.
- Payroll cutoff.
- Submitted by.
- Submission date.
- Payroll version.
- Total employees.
- Total gross payable.
- Total deductions.
- Total net payable.
- Summary of earnings.
- Summary of deductions.

**Sheet 2 – Employee Payroll Details**

Include one record per included employee:

- Employee ID.
- Employee name.
- Department.
- Position.
- Employment or salary classification, where applicable.
- Applicable compensation basis.
- Applicable salary rate.
- Days worked.
- Regular hours worked.
- Overtime hours.
- Gross pay.
- Total deductions.
- Net pay.

**Sheet 3 – Earnings Breakdown**

Include:

- Employee ID.
- Employee name.
- Basic pay.
- Overtime pay.
- Night differential.
- Holiday premiums.
- Allowances.
- Bonuses.
- Other approved earnings or adjustments.
- Total gross earnings.

**Sheet 4 – Employee Deductions**

Include:

- Employee ID.
- Employee name.
- SSS.
- PhilHealth.
- Pag-IBIG.
- Withholding tax.
- Late or undertime deductions, where authorized.
- HMO or dependent-related deductions, where applicable and authorized.
- Other authorized deductions.
- Total deductions.

**Sheet 5 – Attendance Details**

Include:

- Employee ID.
- Employee name.
- Attendance date.
- Time in.
- Time out.
- Additional time entries where multiple attendance punches exist.
- Total hours.
- Approved overtime hours.
- Attendance classification or exception, where applicable.

**Sheet 6 – Adjustments**

Include:

- Adjustment ID.
- Employee ID.
- Employee name.
- Adjustment type.
- Amount.
- Reason.
- Requested by.
- Approved by.
- Approval date.
- Adjustment status.

**Sheet 7 – Validation and Exceptions**

Include all validation records associated with the payroll version:

- Exception ID.
- Employee ID.
- Employee name.
- Exception category.
- Severity.
- Description.
- Resolution status.
- Relevant references.

### XLSX data accuracy requirements

Before generating the workbook:

1. Validate the payroll batch identifier and version.
2. Retrieve the exact payroll snapshot.
3. Verify employee inclusion.
4. Normalize and format all fields.
5. Validate numeric values and decimal precision.
6. Validate dates and timestamps.
7. Verify all employee identifiers and relationships.
8. Verify financial totals against the authoritative database snapshot.
9. Verify that earnings and deductions are not duplicated.
10. Verify that employee totals reconcile with batch totals.

### Formatting requirements

- Use clear worksheet names.
- Use descriptive column headers.
- Apply appropriate number formats for currency and quantities.
- Format dates and timestamps consistently.
- Preserve employee identifiers that contain leading zeros.
- Apply appropriate column widths.
- Freeze headers where useful.
- Add filters for employee-level records.
- Add clear total rows where applicable.
- Distinguish monetary values from percentages, hours, and dates.
- Avoid ambiguous or inconsistent labels.

### Security and reliability requirements

- Prevent spreadsheet formula injection from user-controlled text fields.
- Use proper cell types instead of inserting untrusted strings as formulas.
- Avoid exposing internal secrets, authentication information, or unnecessary personal data.
- Restrict report generation to authorized users.
- Restrict access to downloaded reports.
- Use secure file delivery or controlled private storage.
- Avoid permanent public report URLs.
- Ensure temporary files are securely managed and cleaned up.
- Implement appropriate error handling.
- Use streaming, batching, or other memory-efficient processing when needed for large payroll batches.
- Log export activity without logging unnecessary sensitive data.

The XLSX report must be reproducible for the same payroll version.

The report's totals must match the figures displayed in the payroll approval interface.

A report-generation failure must not change the payroll batch's approval status.

---

# PART 4 – PAYROLL FINANCIAL SUMMARY

## TASK 5: Implement Payroll Summary APIs

Create APIs for retrieving the overall financial summary of the selected payroll batch.

Display four summary cards.

### Summary Card 1 – Gross Payable

The total gross earnings of all included employees.

### Summary Card 2 – Total Deductions

The combined employee deductions of all included employees.

### Summary Card 3 – Net Payable

The total amount payable to all included employees after applicable employee deductions.

### Summary Card 4 – Included Employees

The accurate count of employees included in the payroll batch.

### Reconciliation requirement

Ensure the following relationship holds under the existing payroll accounting conventions:

**Net Payable = Gross Payable − Total Employee Deductions**

If the existing payroll system has additional formally defined components affecting this relationship, inspect and document those rules rather than silently changing the calculation.

Summary card values must be derived from the authoritative payroll snapshot.

Do not independently calculate these values on the frontend.

---

# PART 5 – PAYABLE BREAKDOWN

## TASK 6: Implement Payable Breakdown API

Create the API and backend functions for retrieving the aggregated earnings breakdown of all employees included in the payroll batch.

Display the following categories:

1. Total Basic Pay.
2. Overtime Pay.
3. Night Differential.
4. Holiday Premiums.
5. Allowances.
6. Bonuses and Adjustments.

Each category must display the accurate aggregated amount from the employee payroll records.

### Requirements

- Retrieve actual payroll earning components.
- Respect existing compensation rules.
- Use the appropriate payroll period and employee eligibility.
- Avoid counting an earning component twice.
- Distinguish regular earnings from additional earnings.
- Ensure that only valid and approved earnings are included.
- Include other earning components if supported by the existing system.
- Reconcile the displayed breakdown against gross payable.

Bonuses and adjustments must not be included twice when they are already represented by another earning category.

Use the existing payroll calculation engine and approved transaction records as the source of financial values.

---

# PART 6 – EMPLOYEE DEDUCTIONS

## TASK 7: Implement Employee Deductions API

Create APIs for retrieving the aggregated deductions of all included employees.

Display the following deduction categories:

1. SSS.
2. PhilHealth.
3. Pag-IBIG.
4. Withholding Tax.
5. Other Authorized Deductions.

Other deductions may include:

- Late or undertime deductions, when authorized by existing rules.
- HMO-related deductions.
- Dependent-related deductions, where applicable.
- Other approved and properly documented employee deductions.

### Requirements

- Retrieve deduction details from the authoritative payroll records.
- Aggregate amounts by deduction type.
- Support additional deduction categories without hardcoding the entire deduction system.
- Distinguish employee deductions from employer contributions.
- Do not include employer contributions as employee deductions unless the existing accounting model explicitly defines otherwise.
- Ensure deductions are properly associated with the correct employee and payroll period.
- Prevent duplicate deductions.
- Verify deduction eligibility and authorization.
- Maintain traceability to the underlying deduction records.

### Deduction calculation requirements

When deduction calculation functionality is missing, first inspect the existing payroll calculation engine and deduction configuration tables.

Use the existing authoritative calculation service wherever possible.

If new calculation support is required:

- Use the correct configured statutory rules and contribution tables.
- Support effective dates and applicable payroll periods.
- Maintain versioned deduction configurations.
- Ensure that statutory values are not hardcoded into frontend components or scattered backend functions.
- Validate employee eligibility and applicable salary or compensation basis.
- Use the appropriate calculation and rounding rules.
- Record the relevant calculation inputs and rule version.
- Distinguish statutory deductions from voluntary or company-authorized deductions.

Do not invent SSS, PhilHealth, Pag-IBIG, or withholding tax formulas.

Use properly maintained, approved, and effective-dated configurations.

If the existing configuration is missing or outdated, flag the issue instead of generating an unsupported deduction value.

---

# PART 7 – EMPLOYEE PAYROLL DETAILS

## TASK 8: Implement Employee Payroll List API

Create the necessary API and backend functions for retrieving every employee included in the selected payroll batch.

The employee list must provide a complete overview of individual payroll amounts.

### Required fields

| Field | Description |
|---|---|
| Employee ID | Unique employee identifier |
| Employee Name | Full name of the employee |
| Position | Employee's current applicable position |
| Days Worked | Validated days worked during the payroll period |
| Compensation Basis | Monthly, daily, or hourly |
| Applicable Rate | Actual applicable salary rate |
| Additional Earnings | OT, holiday premiums, night differential, allowances, bonuses, and other approved earnings |
| Deductions | All applicable employee deductions |
| Net Amount | Final payable amount for the employee |

### Requirements

- Retrieve employees from the payroll batch's actual inclusion records.
- Display each employee only once in the primary payroll list.
- Use the employee's applicable compensation basis.
- Do not display irrelevant salary rates as though they all apply to the employee.
- Calculate days worked using the appropriate approved attendance and payroll rules.
- Display earnings and deductions using the payroll snapshot.
- Ensure net amount matches the individual employee payroll calculation.
- Provide an API for retrieving individual employee payroll details.
- Implement server-side pagination and filtering where necessary.

Employee records must remain traceable to the exact payroll version.

## TASK 9: Implement Individual Employee Salary Breakdown API

When the administrator clicks an employee's record, open the detailed employee payroll breakdown interface.

Retrieve the employee's complete payroll information through a dedicated API.

The detail interface must include the following sections.

### A. Employee Information

Display:

- Employee ID.
- Employee name.
- Profile image, where available.
- Department.
- Position.
- Compensation basis.
- Applicable salary rate.
- Payroll period.
- Payroll batch.
- Payroll version.

### B. Attendance Details

Display the employee's attendance records within the selected payroll period.

Include:

- Attendance date.
- Time in.
- Time out.
- Multiple punch records, where applicable.
- Total hours worked.
- Regular hours.
- Approved overtime hours.
- Night differential hours, where applicable.
- Holiday classification, where applicable.
- Attendance exceptions.
- Relevant attendance approval status.

Show the actual recorded timestamps.

Use the correct company timezone and consistent date/time formatting.

Do not fabricate missing punches or treat missing attendance values as approved attendance.

Where an attendance record is missing or incomplete, show the appropriate exception.

### C. Employee Earnings Summary

Display:

- Total Basic Pay.
- Overtime Pay.
- Night Differential.
- Holiday Premiums.
- Allowances.
- Bonuses.
- Other approved earnings and adjustments.
- Total Gross Pay.

### D. Employee Deductions

Display:

- SSS.
- PhilHealth.
- Pag-IBIG.
- Withholding Tax.
- Authorized attendance-related deductions.
- HMO and dependent-related deductions, where applicable.
- Other authorized deductions.
- Total Deductions.

### E. Final Employee Payroll Summary

Display:

- Gross Pay.
- Total Deductions.
- Net Pay.

The employee's net pay must reconcile with the amount included in the overall payroll batch.

## TASK 10: Implement Employee Deduction Calculation and Verification Functions

Create or integrate the APIs required for retrieving, calculating, and validating employee deductions.

This must not create an independent calculation engine that conflicts with existing payroll computations.

Requirements:

- Integrate with the authoritative deduction calculation service.
- Reuse the approved statutory contribution configurations.
- Support effective-dated tax and contribution tables.
- Verify authorized company-related deductions.
- Verify applicable employee eligibility.
- Prevent duplicate deduction entries.
- Detect missing or outdated deduction configurations.
- Preserve a traceable explanation of the amount calculated.
- Ensure that employee deductions reconcile with the batch deduction summary.

Where the approval module needs recalculation for verification, it must use the same calculation logic and configuration version as the payroll calculation engine.

Do not silently replace the values already submitted by HR.

Any discrepancy between submitted values and independently verified values must be recorded as a validation exception.

---

# PART 8 – VALIDATION AND EXCEPTIONS

## TASK 11: Implement the Payroll Validation Engine

This is one of the most important components of the entire module.

Create robust backend validation functions and APIs that systematically inspect the payroll batch before approval.

The system must identify missing records, incomplete calculations, unauthorized transactions, duplicate payments, suspicious changes, inconsistent totals, and other conditions that could result in incorrect employee compensation.

Do not rely on manual administrator inspection as the primary validation mechanism.

Validation must be performed by the backend using actual database relationships and payroll rules.

### Required validation categories

**A. Employee Record Validation**

Detect:

- Missing employee records.
- Invalid employee identifiers.
- Employees included without valid payroll eligibility.
- Inactive or deactivated employees included unexpectedly.
- Employees with incomplete salary information.
- Employees with missing compensation configurations.
- Employees included more than once.
- Employees missing required payroll data.

**B. Attendance Validation**

Detect:

- Missing attendance records.
- Incomplete time-in or time-out records.
- Attendance exceptions that have not been reviewed or resolved.
- Attendance records inconsistent with approved work schedules.
- Unapproved or unsupported overtime entries.
- Unapproved holiday or special schedule classifications.
- Duplicate attendance entries.
- Attendance records outside the applicable payroll period.
- Incorrect attendance-to-payroll relationships.

**C. Compensation Validation**

Detect:

- Unusual salary changes.
- Invalid compensation rates.
- Unexpected differences between the employee's configured rate and the payroll rate.
- Unexpected basic pay amounts.
- Incorrect working-day or payable-day calculations.
- Unexpected additional earnings.
- Invalid holiday premiums.
- Unexpected night differential values.
- Unapproved allowances or bonuses.
- Duplicate earning transactions.

**D. Deduction Validation**

Detect:

- Missing statutory deductions when applicable.
- Missing or outdated deduction configurations.
- Incorrect deduction calculations.
- Duplicate deductions.
- Unauthorized deductions.
- Incorrect employee eligibility.
- Unexpected deduction changes.
- Invalid negative deductions.
- Inconsistencies between individual deductions and aggregated deduction totals.

**E. Adjustment Validation**

Detect:

- Unapproved adjustments.
- Missing supporting requests.
- Adjustments without a valid reason.
- Adjustments with invalid amounts.
- Duplicate adjustment entries.
- Adjustments linked to the wrong employee.
- Adjustments outside the relevant payroll period.
- Adjustments without proper approval records.

**F. Financial Reconciliation Validation**

Detect:

- Inconsistent gross pay totals.
- Inconsistent deduction totals.
- Incorrect net pay totals.
- Negative net pay.
- Unexpected zero-pay records.
- Incorrect aggregated totals.
- Duplicate employee payments.
- Mismatches between employee payroll values and batch-level summary values.
- Mismatches between payroll components and the authoritative calculation records.

**G. General Configuration Validation**

Detect:

- Missing payroll configurations.
- Missing statutory deduction tables.
- Invalid payroll cutoff settings.
- Incorrect payroll version references.
- Missing required relationships.
- Invalid or conflicting payroll records.
- Other conditions that could materially affect financial accuracy.

Add other meaningful validation conditions identified during codebase inspection.

Do not introduce arbitrary warning rules without understanding their business context.

## TASK 12: Implement Exception Classification and Storage

Every identified issue must be stored as a traceable validation exception associated with the relevant payroll batch and version.

### Severity levels

Use four severity levels:

1. Critical
2. High
3. Warning
4. Info

Classification must be based on the actual financial and operational impact.

Examples:

| Severity | Typical meaning |
|---|---|
| Critical | Serious financial inconsistency, duplicate payment, invalid employee inclusion, or issue that makes payroll unsafe to approve |
| High | Material missing approval, invalid calculation, or compensation discrepancy requiring correction |
| Warning | Suspicious or unusual record requiring examination |
| Info | Non-critical information that helps administrators understand the payroll data |

These are examples, not hardcoded classifications. Establish consistent validation rules and severity mappings.

### Required exception information

Each flagged record must contain:

- Exception ID.
- Payroll batch identifier.
- Payroll version.
- Employee ID or employee code, where applicable.
- Employee name, where applicable.
- Exception category.
- Severity.
- Issue title.
- Detailed description.
- Affected financial or attendance field.
- Actual value.
- Expected value, where determinable.
- Related database record references.
- Detection timestamp.
- Resolution status.
- Resolution details.
- Resolver and resolution timestamp, when applicable.

For batch-level issues that do not belong to one employee, display an appropriate batch-level identifier instead of inventing an employee code.

### Sorting

Display exceptions in the following severity order:

1. Critical.
2. High.
3. Warning.
4. Info.

Within each severity group, use a consistent deterministic order, such as detection timestamp or employee code.

### View Details

When the administrator clicks View Details, display exactly where the issue originated.

The detail interface should identify:

- The affected employee or batch.
- The affected data field.
- The corresponding attendance, earnings, deduction, or adjustment record.
- The actual stored value.
- The expected or configured value, where applicable.
- Why the system flagged the issue.
- The relevant source records.
- The required corrective action.

Do not display vague messages such as "Payroll error detected" without showing the underlying cause.

## TASK 13: Enforce Strict Approval Blocking

The system must not allow an administrator to approve payroll while unresolved validation exceptions remain.

Implement this restriction on the backend and frontend.

### Mandatory rules

- Every unresolved validation exception must block approval.
- Severity must not be used to bypass unresolved issues.
- Critical, High, Warning, and Info exceptions must all be resolved before approval under the strict approval policy.
- The frontend must display the number of unresolved exceptions.
- The Approve Payroll button must be disabled when unresolved exceptions exist.
- The API must independently verify that no unresolved exceptions remain.
- Direct API requests must not bypass this restriction.
- A stale frontend state must not allow an invalid approval.

An exception must not be considered resolved merely because the administrator viewed it or dismissed a notification.

### Exception resolution

Resolve issues through the appropriate source correction and validation process.

Examples:

- Incorrect salary: correct the underlying compensation or payroll calculation record.
- Missing attendance: correct or complete the attendance record.
- Unapproved overtime: complete the proper overtime approval workflow.
- Unapproved adjustment: obtain the required approval or remove the invalid adjustment.
- Incorrect deduction: correct the underlying deduction configuration or payroll calculation.
- Duplicate payment: remove or correct the duplicate transaction and rerun the affected validation.

After the underlying data is corrected:

1. Re-run the relevant validation.
2. Confirm that the inconsistency no longer exists.
3. Update the exception resolution status.
4. Record the corrective action.
5. Preserve the original exception history.

Do not allow arbitrary manual deletion of exception records to bypass approval restrictions.

Do not provide a general-purpose override that permits approval while unresolved exceptions remain.

## TASK 14: Return Payroll for Correction

Implement the **Return for Correction** action.

When clicked:

1. Validate that the batch is eligible for return.
2. Require the administrator to provide a correction note or review comment.
3. Identify the unresolved validation exceptions.
4. Record the return action.
5. Change the batch status to Returned.
6. Preserve the previously submitted payroll version.
7. Record the administrator responsible and the return timestamp.
8. Notify HR.
9. Make the batch available for HR correction.

### HR-side behavior

When HR opens the returned payroll request:

- Display the administrator's review notes.
- Highlight the affected employee records.
- Highlight the affected financial or attendance fields.
- Display exception severity.
- Display the issue descriptions.
- Provide the relevant source references.
- Allow authorized HR personnel to correct the underlying records.

The entire payroll request must be returned, not only the individual flagged rows.

### Resubmission behavior

When HR resubmits a corrected payroll:

- Create a new payroll version.
- Preserve the previous submitted version.
- Associate the new version with the existing batch or the appropriate batch lifecycle record.
- Recalculate or regenerate the payroll snapshot through the authoritative payroll engine.
- Re-run all required validations.
- Record the resubmission timestamp.
- Preserve the number of previous returns.
- Send the new version back to Pending approval.

An administrator must review the newly submitted version rather than accidentally approving a previously returned version.

---

# PART 9 – ADJUSTMENTS

## TASK 15: Implement Payroll Adjustments API

Create the API and backend functionality for retrieving adjustment records associated with the payroll batch.

The Adjustments tab must display the adjustments requested and approved through the existing TL and HR workflows.

### Required table fields

| Field | Description |
|---|---|
| Adjustment ID | Unique adjustment identifier |
| Employee | Employee associated with the adjustment |
| Type | Adjustment category |
| Amount | Adjustment amount |
| Reason | Explanation for the adjustment |
| Requested By | TL account responsible for the request |
| Approved By | HR account responsible for approval |
| Status | Current adjustment status |

### Adjustment context

These adjustments may be relevant when an employee did not submit a request for an allowance, overtime, leave-related benefit, or other benefit at the appropriate time, or when HR did not process the request immediately.

Such delays may create missing or inconsistent payroll records.

The adjustment workflow must help identify and document these cases without bypassing the existing approval process.

### Requirements

- Retrieve actual adjustment records.
- Display the original request and approval references.
- Verify that the requesting TL account is valid.
- Verify that the approving HR account is valid.
- Display the actual approval status.
- Prevent unauthorized or unapproved adjustments from being silently included in payroll.
- Associate every adjustment with the relevant employee and payroll period.
- Detect duplicates.
- Preserve the adjustment's original amount and approval history.
- Distinguish pending, approved, rejected, and other supported adjustment statuses.
- Verify that adjustment amounts match their underlying payroll transactions.

Only adjustments that satisfy the existing authorization and payroll inclusion rules may affect an employee's final compensation.

An adjustment must not be treated as authorized merely because it appears in the payroll adjustment list.

The system must also flag missing or incomplete approval records.

---

# PART 10 – AUDIT TIMELINE

## TASK 16: Implement Payroll Audit Timeline API

Create the API and backend functions for retrieving the complete activity history of the payroll batch.

The Audit Timeline must show a chronological history of important operations.

### Expected activities

Include events such as:

- Payroll batch created.
- Payroll calculations completed.
- Payroll submitted by HR.
- Payroll version created.
- Adjustments requested.
- Adjustments approved by HR.
- Validation executed.
- Exceptions detected.
- Payroll returned for correction.
- HR made corrections.
- Payroll resubmitted.
- Administrator opened or reviewed the payroll, where audit policy requires this.
- Payroll rejected.
- Payroll approved.
- Payroll sent to the disbursement workflow.
- Disbursement status updates, where available.

### Required timeline information

Each event must contain:

- Event ID.
- Payroll batch identifier.
- Payroll version, where relevant.
- Event type.
- Event description.
- Acting user.
- Acting user's role.
- Timestamp.
- Relevant affected record references.
- Additional change details, where applicable.

### Requirements

- Retrieve actual historical events from the audit system.
- Use deterministic chronological ordering.
- Display the correct actor and timestamp.
- Preserve prior events even when a batch is returned multiple times.
- Distinguish the administrator's actions from HR actions.
- Preserve history across resubmissions.
- Prevent unauthorized modification of audit events.
- Do not fabricate timeline entries from current batch status.

The timeline must provide traceability for the entire payroll lifecycle.

---

# PART 11 – APPROVAL, REJECTION, AND DISBURSEMENT

## TASK 17: Implement Payroll Approval API

Create the backend functionality for approving a payroll batch.

When the administrator clicks **Approve Payroll**, the system must verify all approval requirements before executing the operation.

### Mandatory approval validation

Verify that:

1. The administrator is authenticated.
2. The administrator has the required approval permission.
3. The payroll batch exists.
4. The selected payroll version exists.
5. The payroll version is currently Pending approval.
6. The payroll version has not been modified since it was submitted.
7. The batch contains valid employee payroll records.
8. All employee records satisfy the applicable payroll inclusion requirements.
9. The financial totals reconcile.
10. All statutory and authorized deductions are valid.
11. All required adjustments are approved.
12. No unresolved validation exceptions remain.
13. There are no duplicate employee payments.
14. The batch has not already been approved or rejected.
15. All required submission metadata is present.

Re-validate these conditions immediately before committing the approval.

Do not rely on the validation result previously displayed in the browser.

### Approval transaction

Once all checks pass:

1. Start an appropriate database transaction.
2. Verify the payroll batch and version are still eligible.
3. Lock or otherwise protect the approved payroll version against modification.
4. Confirm that the financial totals match the authoritative snapshot.
5. Record the administrator's identity.
6. Record the approval timestamp.
7. Update the payroll batch or version status to Approved.
8. Create the required approval audit event.
9. Create the appropriate disbursement authorization or handoff record, if supported by the existing architecture.
10. Commit the transaction.

Ensure that the approval operation is atomic.

If any critical operation fails, do not leave the batch partially approved.

### Prevent repeated approval

Implement idempotency and concurrency protection.

Prevent:

- Double-clicking from approving the batch twice.
- Repeated API requests from creating duplicate approval records.
- Two administrators approving the same payroll version simultaneously.
- Approval of a stale version after HR has submitted a newer version.
- Approval of a batch that is no longer pending.

## TASK 18: HR Notification After Approval

After a successful approval, notify the responsible HR account.

The notification must contain:

- Payroll batch identifier.
- Payroll period.
- Approved payroll version.
- Approved net payable.
- Date and time of approval.
- Administrator who approved the batch.
- Next steps for the HR disbursement workflow.

Use the existing notification and email infrastructure.

Do not expose unnecessary employee financial information in general notifications.

Ensure that a notification failure does not create a duplicate payroll approval.

Use a reliable notification mechanism, such as an outbox pattern or the existing retry infrastructure, if available.

## TASK 19: Separate Approval from Actual Disbursement

An approved payroll batch is authorized for the next disbursement step. Approval alone does not prove that money has been transferred to employees.

After approval, HR must be able to proceed with the existing employee payment or disbursement workflow.

Inspect the existing disbursement functionality before implementing any new process.

The system must distinguish between:

- Pending approval.
- Approved.
- Ready for disbursement.
- Processing payment, where supported.
- Partially paid, where supported.
- Paid.
- Disbursement failed, where supported.

Only implement additional disbursement statuses if compatible with the existing architecture.

Do not mark payroll as Paid merely because an administrator approved it.

Do not simulate bank transfers or claim that employees received their salaries unless an actual payment integration or verified disbursement record confirms it.

Preserve an auditable relationship between the approved payroll snapshot and any subsequent payment records.

## TASK 20: Implement Payroll Rejection API

Create the functionality for permanently rejecting a submitted payroll batch.

When the administrator clicks **Reject Batch**:

1. Display a rejection confirmation interface.
2. Require the administrator to enter a mandatory rejection reason.
3. Validate the reason.
4. Verify the administrator's approval or rejection permissions.
5. Verify the current batch status.
6. Record the rejection reason.
7. Record the administrator's identity.
8. Record the rejection timestamp.
9. Update the batch or payroll version status to Rejected.
10. Add the rejection event to the audit timeline.
11. Notify the responsible HR account.

A rejected payroll batch must not be eligible for approval.

Keep rejection distinct from returning a batch for correction.

### Difference between return and rejection

**Return for Correction**

Used when the administrator identifies correctable issues and expects HR to revise and resubmit the batch.

The original submission is preserved, and a new payroll version is created upon resubmission.

**Reject Batch**

Used when the administrator permanently rejects the submitted request.

Record the mandatory reason and preserve the rejection history.

Do not automatically treat a rejected batch as an editable pending submission.

Any subsequent attempt to submit a replacement must follow the application's explicitly defined payroll batch lifecycle.

---

# PART 12 – APPROVED TAB

## TASK 21: Implement Approved Payroll API

Create the APIs and database queries for retrieving the history of payroll batches approved by administrators.

The Approved tab must display actual approved payroll records.

### Required table fields

| Field | Description |
|---|---|
| Payroll Batch | Batch name or identifier |
| Date Period | Payroll period |
| Net Payable | Approved net payable |
| Employees | Number of included employees |
| Status | Current approval or disbursement-related status |
| Action | View button |

### Requirements

- Retrieve only records with an actual approval history.
- Display the approved payroll version.
- Preserve the original approved amounts.
- Distinguish approved payroll from payroll that has already been disbursed.
- Display the correct approval timestamp and administrator.
- Support search and filtering.
- Implement server-side pagination.
- Ensure the history remains available even after subsequent payroll periods are processed.

### View functionality

When the View button is clicked, display the same comprehensive payroll review interface described in Parts 3–10.

However:

- Do not allow modifications to an approved payroll snapshot.
- Do not display approval actions as available.
- Preserve the historical values.
- Display the approval information.
- Display any subsequent disbursement status.
- Allow authorized users to retrieve the XLSX report for that exact approved version.

The interface must accurately represent the historical payroll state.

Do not load the latest employee salary information and use it to overwrite historical approved values.

---

# PART 13 – REJECTED / RETURNED TAB

## TASK 22: Implement Rejected and Returned Payroll APIs

Create APIs for retrieving all rejected or returned payroll requests.

The tab must preserve the complete history of payroll batches that were rejected or returned by administrators.

### Required table fields

| Field | Description |
|---|---|
| Payroll Batch | Batch name or identifier |
| Date Period | Payroll coverage period |
| Date Submitted | Original or relevant submission timestamp |
| Date of Last Action | Most recent return or rejection timestamp |
| Number of Returns | Total number of times the batch was returned |
| Status | Returned or Rejected |
| Action | View button |

The requested Date Approved field should not be populated for rejected or returned batches. If approval information is needed, display it only when an actual approval event exists.

### Requirements

- Retrieve actual rejected and returned batch records.
- Distinguish returned batches from permanently rejected batches.
- Preserve the original submission timestamp.
- Maintain the total number of return cycles.
- Display the most recent return or rejection event.
- Implement appropriate search and pagination.
- Preserve all earlier return and correction histories.
- Ensure that a resubmitted batch does not erase previous return history.

### View details

When View is clicked, display the complete historical information.

Include:

- Payroll overview.
- Original payroll period.
- Original submission details.
- Submitted payroll version.
- Previous payroll versions, where available.
- Return and rejection reasons.
- All flagged validation exceptions.
- Administrator review notes.
- HR correction history.
- Resubmission timestamps.
- Number of returns.
- Complete audit timeline.

Clearly identify which issues caused each return or rejection.

Do not display only the latest issue list when previous versions contained different issues.

The administrator must be able to understand the complete history of why the payroll request was returned or rejected.

---

# PART 14 – DATA CONSISTENCY AND FINANCIAL INTEGRITY

## TASK 23: Implement Centralized Payroll Reconciliation

Establish a centralized validation and reconciliation mechanism.

The application must maintain one authoritative source for payroll calculations and approved payroll values.

All screens, APIs, reports, and summaries must retrieve consistent values from the same payroll version and data source.

### Required financial relationships

At the employee level:

Gross earnings must represent the sum of the applicable approved earning components.

Net pay must reconcile with gross earnings less the applicable employee deductions and any other explicitly defined payroll accounting adjustments.

At the batch level:

- Total gross payable must reconcile with employee gross earnings.
- Total deductions must reconcile with employee deduction records.
- Total net payable must reconcile with employee net pay amounts.
- Included employee count must match the payroll inclusion records.
- Each employee must be represented according to the batch's inclusion rules.

### Additional requirements

- Use appropriate decimal precision for financial values.
- Avoid floating-point arithmetic for monetary calculations.
- Use the application's established decimal or fixed-precision database types.
- Apply rounding rules consistently.
- Prevent accidental repeated rounding across intermediate calculations.
- Preserve the original calculation inputs and results where required.
- Detect differences between the payroll calculation engine and stored payroll values.
- Ensure exported XLSX totals match the database snapshot.
- Ensure the review interface matches the exported report.

Never silently correct a financial discrepancy during display or export.

Any discrepancy must be surfaced as a validation exception.

## TASK 24: Implement Payroll Versioning and Immutability

A payroll submission must be traceable to the exact version HR submitted.

Implement or reuse a versioning mechanism that guarantees:

- Each submission has an identifiable payroll version.
- Previously submitted versions remain available.
- Returned versions are not overwritten.
- Resubmissions create new versions.
- Approved versions become immutable.
- Approved financial values cannot change through ordinary editing operations.
- Reports remain associated with the exact version they represent.
- Audit history identifies which version was submitted, returned, corrected, resubmitted, approved, or rejected.

If a payroll batch changes after submission, ensure that the changes cannot silently alter the version currently being reviewed.

An administrator must never approve a payroll version that differs from the version that was validated.

---

# PART 15 – API AND DATABASE ARCHITECTURE

## TASK 25: Implement Required Backend APIs

Create or extend all APIs and supporting functions required by this specification.

Organize the implementation by domain and follow the existing application's architecture.

At minimum, ensure that the backend supports these operations:

### Payroll Batch APIs

- Retrieve pending payroll batches.
- Retrieve approved payroll batches.
- Retrieve rejected payroll batches.
- Retrieve returned payroll batches.
- Retrieve payroll batch overview.
- Retrieve payroll version information.
- Retrieve payroll review data.
- Retrieve payroll batch summary.
- Retrieve payroll payable breakdown.
- Retrieve payroll deduction breakdown.
- Retrieve included employee records.
- Retrieve individual employee payroll details.
- Retrieve employee attendance details.
- Retrieve adjustment records.
- Retrieve audit timeline.
- Retrieve validation exceptions.

### Payroll Action APIs

- Return payroll for correction.
- Reject payroll batch.
- Approve payroll.
- Retrieve approval history.
- Retrieve rejection history.
- Retrieve return history.
- Retrieve disbursement status, where supported.

### Payroll Validation APIs

- Run payroll validation.
- Retrieve validation results.
- Retrieve exception details.
- Re-run validation after corrections.
- Record valid exception resolutions.
- Check payroll approval eligibility.

### XLSX APIs

- Generate payroll XLSX report.
- Download payroll XLSX report.
- Retrieve report-generation status, if asynchronous processing is needed.

### Requirements

- Use the existing Next.js API architecture or the existing backend framework.
- Follow established route naming and response conventions.
- Separate route handlers from business logic.
- Use service functions for reusable payroll operations.
- Use appropriate repository or database access patterns.
- Centralize financial reconciliation.
- Centralize payroll version checks.
- Centralize approval eligibility checks.
- Centralize exception generation and resolution logic.
- Avoid duplicating the same business rules across multiple API endpoints.

Do not create arbitrary endpoints without understanding existing architecture.

## TASK 26: Database Schema and Relationship Verification

Inspect and verify that the existing database supports all required functionality.

Create or modify database models only when necessary.

Evaluate the need for:

- Payroll batch records.
- Payroll versions.
- Payroll employee inclusion records.
- Payroll earning components.
- Payroll deductions.
- Payroll adjustments.
- Payroll validation exceptions.
- Payroll approval records.
- Payroll return and rejection records.
- Payroll audit events.
- Report-generation records.
- Disbursement authorization or payment records, where applicable.

These are logical entities to inspect, not instructions to create duplicate tables if equivalent structures already exist.

Ensure proper:

- Primary keys.
- Foreign keys.
- Unique constraints.
- Indexes.
- Referential integrity.
- Decimal precision.
- Status constraints.
- Version relationships.
- Audit references.

Use migrations only when required.

Protect historical payroll records from accidental deletion or modification.

---

# PART 16 – SECURITY AND ACCESS CONTROL

## TASK 27: Apply Strict Payroll Authorization

Use the existing role and permission system.

All payroll approval endpoints must independently validate the acting user's permissions.

At minimum, enforce:

- Only authorized Admin accounts can approve or reject payroll.
- Only authorized Admin accounts can return payroll for correction.
- HR can submit payroll and correct returned payroll according to existing permissions.
- HR cannot approve its own payroll submission unless the organization's explicitly established authorization policy allows it.
- Employees cannot access administrative payroll approval data.
- TL accounts cannot perform administrative payroll approval actions unless explicitly authorized.
- Access to employee-level payroll details must be restricted.
- Access to downloadable payroll files must be restricted.
- Deactivated accounts must be rejected.

The system must not rely exclusively on frontend button visibility.

Prevent privilege escalation through direct API requests.

## TASK 28: Apply Financial Data Security

Protect sensitive information, including:

- Employee identities.
- Salary rates.
- Net pay.
- Statutory deductions.
- Tax information.
- Attendance records.
- Bank or payment information, if present.
- Personal information.

Additional requirements:

- Return only necessary data to the client.
- Prevent unauthorized access to other payroll batches.
- Validate ownership and permissions for every requested record.
- Protect against injection and unsafe query construction.
- Prevent insecure direct object references.
- Secure report downloads.
- Protect generated report files.
- Avoid logging sensitive financial or authentication details.
- Apply appropriate rate limiting and abuse controls to sensitive endpoints.
- Ensure that administrative actions are traceable.

Run the security-audit skill against the complete implementation, not just individual endpoints.

---

# PART 17 – UI/UX IMPLEMENTATION

## TASK 29: Update the Payroll Approvals Interface

Implement the UI changes required to support all APIs and workflows.

Preserve the existing design system, visual identity, and established dashboard patterns.

Do not redesign unrelated pages or modules.

The interface must contain:

### Main Payroll Approvals Page

- Pending tab.
- Approved tab.
- Rejected / Returned tab.
- Appropriate search and filters.
- Accurate payroll tables.
- Pagination.
- Loading and error states.

### Payroll Review Interface

- Payroll overview.
- Download XLSX report button.
- Financial summary cards.
- Payable breakdown.
- Employee deductions.
- Employee payroll list.
- Employee salary breakdown.
- Validation and exceptions.
- Adjustments.
- Audit Timeline.
- Return for Correction button.
- Reject Batch button.
- Approve Payroll button.

### Interaction requirements

- Every button must execute its intended API operation.
- Every displayed value must originate from real data.
- Search and filters must update the correct records.
- All summary values must reflect the current payroll version.
- Employee details must display the correct attendance and payroll records.
- Exception details must identify actual underlying inconsistencies.
- Return and rejection forms must require appropriate explanations.
- Approval must be disabled when unresolved exceptions remain.
- Loading indicators must be shown during data retrieval and submission.
- Prevent duplicate actions while requests are processing.
- Display clear success and error feedback.
- Refresh relevant data following successful operations.
- Do not display stale financial values after a payroll version changes.

### Historical view requirements

For Approved, Rejected, and Returned tabs:

- Show historical information from the correct payroll version.
- Preserve prior values.
- Disable unavailable actions.
- Provide appropriate audit history.
- Prevent accidental modification of finalized records.

Ensure that the interface is responsive and accessible.

---

# PART 18 – TESTING AND VERIFICATION

## TASK 30: Create Comprehensive Tests

Create and execute tests for all critical financial and operational workflows.

Do not consider the implementation complete merely because the APIs respond or the interface renders.

### A. Payroll List Tests

Verify:

- Pending batches are retrieved correctly.
- Approved batches are retrieved correctly.
- Rejected and returned batches are classified correctly.
- The correct batch version is displayed.
- Employee counts are accurate.
- Net payable matches the authoritative snapshot.
- Search, filters, and pagination work correctly.

### B. Financial Calculation and Reconciliation Tests

Verify:

- Gross payable matches included employee earnings.
- Deductions match employee deduction records.
- Net payable matches the correct payroll calculation.
- Basic pay is accurate.
- Overtime amounts are accurate.
- Night differential amounts are accurate.
- Holiday premiums are accurate.
- Allowances and bonuses are not duplicated.
- Employee adjustments are correctly included or excluded.
- Statutory deductions use the correct configurations and effective dates.
- Batch totals match employee-level totals.
- Negative and inconsistent values are detected where applicable.
- Decimal precision and rounding are consistent.

### C. Employee Payroll Tests

Verify:

- Correct employee inclusion.
- Correct compensation basis.
- Correct applicable salary rate.
- Accurate attendance timestamps.
- Correct working-day calculations.
- Approved overtime is properly included.
- Unauthorized earnings are flagged.
- Individual net pay reconciles with batch totals.

### D. Validation and Exception Tests

Verify:

- Missing employee records are detected.
- Unapproved overtime is detected.
- Attendance exceptions are detected.
- Duplicate employee payments are detected.
- Unusual salary changes are detected.
- Negative net pay is detected.
- Missing deduction configurations are detected.
- Inconsistent financial totals are detected.
- Unapproved adjustments are detected.
- Severity classification works correctly.
- Exception details identify the correct source records.
- Correcting source data and rerunning validation resolves the relevant exceptions.
- Unresolved exceptions block approval, including lower-severity exceptions.

### E. Approval Workflow Tests

Verify:

- Valid payroll batches can be approved.
- Payroll with unresolved exceptions cannot be approved.
- Unauthorized users cannot approve payroll.
- Returned payroll cannot be approved using an outdated version.
- Rejected payroll cannot be approved.
- Repeated requests do not create duplicate approvals.
- Concurrent approval attempts are handled safely.
- Approved versions cannot be modified.
- HR is notified after successful approval.
- Notification failures do not duplicate approval operations.

### F. Return and Rejection Tests

Verify:

- Return requires a correction note.
- Rejection requires a reason.
- Returned payroll becomes available for HR correction.
- HR can identify flagged employee records.
- Resubmission creates a new version.
- Previous versions remain available.
- Return counts are accurate.
- Rejection history is preserved.
- Rejection and return statuses are not confused.

### G. XLSX Export Tests

Verify:

- The correct payroll version is exported.
- All required worksheets are generated.
- Employee IDs retain their formatting.
- Dates and monetary values are formatted correctly.
- Formula injection is prevented.
- Employee details are complete.
- Earnings and deductions reconcile.
- Workbook totals match the payroll review interface.
- Large exports do not exhaust memory.
- Unauthorized users cannot generate or download reports.
- Report-generation failures do not affect approval status.

### H. Security Tests

Verify:

- Every API enforces authorization.
- Unauthorized users cannot access payroll details.
- Direct API calls cannot bypass disabled UI controls.
- Deactivated accounts cannot access protected endpoints.
- Sensitive fields are not unnecessarily exposed.
- Report URLs cannot be publicly accessed.
- Approval and rejection operations are protected from duplicate execution.
- Audit events are preserved.
- No sensitive authentication data is written to logs.

### I. General Quality Checks

Run:

- TypeScript checks.
- Linting.
- Unit tests.
- Integration tests.
- API tests.
- Database tests.
- Security checks.
- Relevant end-to-end tests.
- Production build checks.

Fix implementation-related failures before marking tasks complete.

Do not suppress important warnings or weaken existing validation to make tests pass.

---

# PART 19 – EXECUTION PLAN AND TASK BREAKDOWN

Execute the implementation in the following order.

Do not attempt to implement the entire module through one large, uncontrolled code change.

Each task must be inspected, implemented, verified, and documented before proceeding to dependent tasks.

## PHASE 1 – CODEBASE DISCOVERY AND SECURITY REVIEW

**Task 1.1 – Activate and inspect Ponytail and security-audit skills.**

**Task 1.2 – Inspect the existing payroll architecture, database models, and API routes.**

**Task 1.3 – Trace the complete HR payroll calculation and submission process.**

**Task 1.4 – Identify existing financial calculations, deduction configurations, approvals, attendance, adjustments, and notifications.**

**Task 1.5 – Document gaps, conflicts, and missing dependencies.**

Deliverable: Codebase discovery report and implementation plan.

## PHASE 2 – DATA MODEL AND FINANCIAL INTEGRITY FOUNDATION

**Task 2.1 – Verify payroll batch and payroll version structures.**

**Task 2.2 – Verify employee payroll, earning, deduction, and adjustment relationships.**

**Task 2.3 – Verify validation exception and audit history structures.**

**Task 2.4 – Implement only the necessary schema changes and migrations.**

**Task 2.5 – Establish payroll versioning and historical snapshot protection.**

**Task 2.6 – Implement centralized payroll reconciliation functions.**

Deliverable: Verified database structure and reliable payroll data foundation.

## PHASE 3 – PAYROLL RETRIEVAL APIS

**Task 3.1 – Pending payroll list API.**

**Task 3.2 – Approved payroll list API.**

**Task 3.3 – Rejected and returned payroll list APIs.**

**Task 3.4 – Payroll overview API.**

**Task 3.5 – Payroll summary API.**

**Task 3.6 – Payable breakdown API.**

**Task 3.7 – Employee deductions API.**

**Task 3.8 – Employee payroll list API.**

Deliverable: Complete database-backed payroll retrieval functionality.

## PHASE 4 – EMPLOYEE PAYROLL DETAILS

**Task 4.1 – Individual employee payroll details API.**

**Task 4.2 – Employee attendance details API.**

**Task 4.3 – Employee earnings breakdown API.**

**Task 4.4 – Employee deductions details and verification API.**

**Task 4.5 – Employee-level reconciliation functions.**

Deliverable: Accurate employee-level payroll examination functionality.

## PHASE 5 – VALIDATION AND EXCEPTIONS ENGINE

**Task 5.1 – Employee validation.**

**Task 5.2 – Attendance validation.**

**Task 5.3 – Compensation validation.**

**Task 5.4 – Deduction validation.**

**Task 5.5 – Adjustment validation.**

**Task 5.6 – Financial reconciliation validation.**

**Task 5.7 – General configuration validation.**

**Task 5.8 – Exception severity classification and persistence.**

**Task 5.9 – Exception details and corrective-action traceability.**

**Task 5.10 – Strict approval-blocking enforcement.**

Deliverable: Centralized payroll validation engine and exception management APIs.

## PHASE 6 – ADJUSTMENTS AND AUDIT TIMELINE

**Task 6.1 – Adjustments retrieval API.**

**Task 6.2 – Adjustment authorization and payroll inclusion verification.**

**Task 6.3 – Audit timeline API.**

**Task 6.4 – Historical version and activity traceability.**

Deliverable: Complete adjustment and audit history functionality.

## PHASE 7 – PAYROLL WORKFLOW ACTIONS

**Task 7.1 – Return for Correction API.**

**Task 7.2 – HR correction and resubmission workflow integration.**

**Task 7.3 – Payroll version creation during resubmission.**

**Task 7.4 – Payroll rejection API.**

**Task 7.5 – Payroll approval API.**

**Task 7.6 – Transactional approval and concurrency protection.**

**Task 7.7 – HR approval notification.**

**Task 7.8 – Disbursement handoff and status integration.**

Deliverable: Complete and secure payroll approval lifecycle.

## PHASE 8 – XLSX REPORT GENERATION

**Task 8.1 – Payroll workbook data extraction.**

**Task 8.2 – Workbook worksheet structure.**

**Task 8.3 – Data normalization and formatting.**

**Task 8.4 – Financial reconciliation before export.**

**Task 8.5 – Formula injection prevention and access control.**

**Task 8.6 – Secure report delivery and download.**

**Task 8.7 – Large-report performance verification.**

Deliverable: Accurate, secure, and scalable XLSX payroll report generation.

## PHASE 9 – FRONTEND INTEGRATION

**Task 9.1 – Pending tab implementation.**

**Task 9.2 – Approved tab implementation.**

**Task 9.3 – Rejected / Returned tab implementation.**

**Task 9.4 – Payroll overview and summary cards.**

**Task 9.5 – Payable breakdown and employee deductions.**

**Task 9.6 – Employee payroll table and individual salary breakdown.**

**Task 9.7 – Validation and exceptions interface.**

**Task 9.8 – Adjustments interface.**

**Task 9.9 – Audit timeline interface.**

**Task 9.10 – Approval, return, rejection, and XLSX download interactions.**

Deliverable: Fully integrated Payroll Approvals UI/UX.

## PHASE 10 – FINAL VERIFICATION AND SECURITY AUDIT

**Task 10.1 – Execute all backend and database tests.**

**Task 10.2 – Execute financial reconciliation tests.**

**Task 10.3 – Execute workflow and concurrency tests.**

**Task 10.4 – Execute XLSX export tests.**

**Task 10.5 – Execute frontend integration tests.**

**Task 10.6 – Run the security-audit skill against the complete implementation.**

**Task 10.7 – Resolve identified defects and regressions.**

**Task 10.8 – Perform final production build and verification.**

Deliverable: Verified implementation and complete development report.

---

# PART 20 – PROGRESS TRACKING REQUIREMENTS

Maintain an implementation status throughout the entire development process.

For every task:

1. Inspect the existing implementation.
2. Identify relevant files, APIs, models, and dependencies.
3. Define the exact changes required.
4. Implement the task.
5. Verify database persistence and backend behavior.
6. Verify frontend integration where applicable.
7. Run relevant tests.
8. Update the implementation status before proceeding.

Use clear status values:

- Not Started
- In Progress
- Completed
- Blocked
- Needs Verification

Maintain a task tracking document, such as:

`reports/payroll-approvals-implementation-status.md`

The document must include:

- Task ID.
- Task name.
- Status.
- Relevant files modified.
- APIs created or modified.
- Database changes.
- Tests executed.
- Test results.
- Dependencies.
- Known issues.
- Remaining work.

Update this document after each task or coherent task group.

Do not mark a task Completed when only part of its functionality has been implemented.

A task involving an API is not complete until its database behavior, validation, authorization, and integration are verified.

A task involving a frontend component is not complete until the controls are connected to functioning backend operations.

Do not proceed past a critical dependency that could compromise financial integrity. Record the blocker and continue with independent tasks where appropriate.

---

# PART 21 – FINAL DEVELOPMENT REPORT

After implementation and verification, create a detailed report containing:

## A. Codebase Findings

- Existing payroll architecture.
- Relevant database models.
- Existing calculation engine.
- Existing approval and submission workflows.
- Reused services and components.
- Identified conflicts and dependencies.

## B. Database Changes

- New or modified models.
- Relationships.
- Constraints.
- Indexes.
- Migrations.
- Payroll versioning changes.
- Historical data protection.

## C. API Implementation

For each API, document:

- Endpoint.
- HTTP method.
- Purpose.
- Request structure.
- Response structure.
- Authentication requirements.
- Authorization requirements.
- Validation behavior.
- Relevant database operations.

## D. Payroll Calculation and Reconciliation

- Source of gross earnings.
- Source of employee deductions.
- Net pay calculation logic.
- Deduction configuration used.
- Rounding and precision rules.
- Employee-level reconciliation.
- Batch-level reconciliation.
- Exception handling.

## E. Validation and Exception System

- Validation categories implemented.
- Severity rules.
- Exception records.
- Resolution workflow.
- Approval-blocking behavior.
- Outstanding validation gaps.

## F. Approval Workflow

- Submission process.
- Review process.
- Return-for-correction behavior.
- Resubmission and versioning.
- Rejection behavior.
- Approval behavior.
- HR notifications.
- Disbursement handoff.

## G. XLSX Report

- Worksheets created.
- Data sources.
- Formatting rules.
- Financial verification.
- Security controls.
- Performance considerations.

## H. Frontend Changes

- Tabs.
- Tables.
- Modals.
- Summary cards.
- Employee detail interface.
- Validation interface.
- Adjustments interface.
- Audit timeline.
- Action buttons.
- Responsive behavior.

## I. Security Audit

- Security issues identified.
- Issues fixed.
- Authorization controls.
- Sensitive data protection.
- Report download security.
- Transaction and concurrency protections.
- Remaining security concerns.

## J. Testing Results

For each test category, state:

- Tests executed.
- Tests passed.
- Tests failed.
- Outstanding issues.
- Build results.
- Type-check results.
- Linting results.

## K. Remaining Work

Identify anything incomplete or blocked.

Explain:

- What is incomplete.
- Why it is incomplete.
- Which files or components are affected.
- What dependency or business rule is missing.
- What is required to finish it.

Do not claim successful implementation without actual verification.

---

# FINAL IMPLEMENTATION DIRECTIVE

Treat this module as a financial control and approval system, not merely a payroll dashboard.

The system must ensure that every amount displayed, exported, reviewed, and approved corresponds to an identifiable payroll batch and version.

The administrator must be able to understand exactly:

- Which employees are included.
- How each employee's salary was calculated.
- Which attendance records support the calculation.
- Which earnings were included.
- Which deductions were applied.
- Which adjustments were approved.
- Which validation issues were detected.
- Why an issue exists.
- What HR did to correct it.
- What exact payroll version is being approved.
- Who submitted, returned, rejected, or approved it.
- What happens after approval.

**Never prioritize development speed over financial correctness.**

Do not fabricate records, guess payroll rules, bypass validations, silently modify financial values, or weaken security controls.

Use Ponytail and security-audit throughout the implementation.

Inspect first. Establish the financial source of truth. Implement in controlled tasks. Validate each task. Preserve historical records. Verify the complete payroll lifecycle before declaring the module finished.