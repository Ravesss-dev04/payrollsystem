# IMPLEMENTATION SPECIFICATION
# ADMIN PORTAL – PAYROLL CALCULATION RULES AND COMPENSATION MANAGEMENT

## 1. PROJECT OBJECTIVE

Implement and enhance the following areas of the Admin Portal:

1. Payroll Calculation Rules – Rule Document Editor.
2. Compensation – Pay Grades.
3. Compensation – Allowances.
4. Compensation – Bonuses & Incentives.
5. Compensation – Salary Adjustments.

This implementation must include the necessary frontend changes, APIs, backend services, database operations, validation, authorization, audit history, and role-based workflows.

The objective is to establish a centralized, reliable, and fully traceable compensation management system.

All compensation-related information must be stored and managed through the database. Every displayed field, search function, filter, form, checkbox, action button, and modal must be connected to its corresponding backend functionality.

The implementation must integrate with the existing centralized Payroll Configuration and Calculation Engine.

**Do not create a separate compensation calculation engine or duplicate existing payroll rules.** Pay grades, allowances, bonuses, incentives, and salary adjustments must use the existing payroll configuration, versioning, calculation, and audit architecture.

Prioritize:

- Financial accuracy and data integrity.
- Security and authorization.
- Clear role responsibilities.
- Intuitive UI/UX.
- Effective-dated compensation records.
- Historical data preservation.
- Auditability and traceability.
- Scalability and maintainability.

---

# 2. MANDATORY DEVELOPMENT RULES

## 2.1 Required Skills

Use the following skills throughout the entire implementation:

**Ponytail Skill**

Apply Ponytail when inspecting, organizing, implementing, reviewing, and improving:

- Component architecture.
- API organization.
- Backend service functions.
- Database access.
- Reusable components.
- Validation logic.
- Code maintainability.
- Implementation consistency.

**Security-Audit Skill**

Use security-audit throughout the development process, particularly when implementing:

- Compensation APIs.
- Payroll configuration changes.
- Salary information retrieval.
- Employee compensation assignments.
- Supporting document uploads.
- Approval workflows.
- Audit logs.
- Soft deletion and archival.
- Permission restrictions.
- Sensitive financial data access.

Invoke the actual installed skills and follow their instructions. Do not merely mention them in the final report.

## 2.2 Inspect Before Modifying

Thoroughly inspect the existing codebase before implementing anything.

Identify:

- Existing Payroll Calculation Rules page and Rule Document structure.
- Existing payroll configuration models.
- Existing centralized payroll calculation engine.
- Existing compensation-related database models.
- Existing employee position and department relationships.
- Existing pay grade structures, if any.
- Existing allowance and bonus configurations.
- Existing employee salary records.
- Existing employee compensation history.
- Existing HR and Admin workflows.
- Existing adjustment request and approval workflows.
- Existing role and permission definitions.
- Existing audit logging.
- Existing notification services.
- Existing document upload infrastructure.
- Existing UI components and design system.

Trace how compensation configurations are currently created, modified, approved, assigned to employees, and incorporated into payroll.

Reuse existing functionality wherever possible.

Do not introduce unnecessary dependencies, duplicate database entities, or unrelated architectural changes.

## 2.3 Non-Negotiable Rules

- Use the database as the source of truth.
- Do not implement frontend-only functionality.
- Do not hardcode employee compensation information.
- Do not calculate payroll separately inside individual pages.
- Reuse the centralized calculation engine.
- Validate all submitted values server-side.
- Protect salary information through role-based access.
- Use transactions for related database modifications.
- Preserve historical records.
- Use effective dates for compensation changes.
- Do not silently modify previously approved payroll.
- All relevant modifications must be auditable.
- Prevent unauthorized privilege escalation.
- Prevent duplicate or conflicting compensation assignments.
- Do not claim a feature is complete without actual database and API verification.

---

# 3. ROLE RESPONSIBILITIES AND GOVERNANCE

## TASK 1 – AUDIT AND ESTABLISH COMPENSATION RESPONSIBILITIES

Before implementing the Compensation page, analyze the existing roles, permissions, hierarchy, and responsibilities.

The system must maintain a clear distinction between:

- Compensation policy management.
- Employee compensation assignment.
- Compensation change requests.
- Compensation approval.
- Payroll calculation.
- Historical compensation review.

Use the following responsibility model as the recommended baseline.

| Responsibility | Admin | HR | TL | Employee |
|---|---|---|---|---|
| Create pay grade structures | Yes | Propose, where authorized | No | No |
| Edit pay grade ranges | Yes | Propose, where authorized | No | No |
| Assign employees to approved pay grades | Oversight | Yes | No | No |
| Create allowance policies | Yes | Propose, where authorized | No | No |
| Manage employee allowance eligibility | Oversight | Yes | Request, where authorized | No |
| Create bonus and incentive programs | Yes | Propose, where authorized | Recommend | No |
| Submit individual bonus nominations | Review | Yes | Yes, where authorized | No |
| Create salary adjustment requests | Review | Yes | Recommend through existing workflow | No |
| Approve salary adjustments | Yes | No, unless explicitly delegated | No | No |
| Reject salary adjustments | Yes | No, unless explicitly delegated | No | No |
| Review compensation history | Yes | According to permissions | Restricted | Own records only |
| Modify payroll calculation rules | Protected approval | Prepare proposals | No | No |

### Responsibility requirements

**Admin**

Admin is responsible for compensation policy governance and final oversight.

The Admin should be able to manage approved pay grade structures, compensation program definitions, approval requirements, and salary adjustment decisions.

**HR**

HR is responsible for operational employee compensation management.

HR should maintain employee-to-pay-grade assignments, determine employee eligibility according to approved policies, prepare salary adjustment requests, and maintain supporting employee information.

HR must not independently approve its own salary adjustment requests when administrative approval is required.

**TL**

TL may recommend or submit employee-related requests through existing authorized workflows.

TL must not independently change an employee's base salary, pay grade, allowance configuration, or bonus calculation rules.

Preserve any existing TL-to-HR request and approval process.

**Employee**

Employees must only be able to view compensation information that belongs to them and is permitted under the existing employee portal permissions.

### Important separation of duties

The following workflows must remain distinct:

1. Admin defines or approves compensation policies.
2. HR manages employee applicability and assignment.
3. HR prepares salary adjustment requests.
4. Admin reviews and decides on salary adjustment requests.
5. The centralized calculation engine applies the approved compensation configuration.

Do not allow the same user to request and approve a financially material change when maker-checker separation is required.

If existing permissions conflict with this model, document the conflict and implement the most secure, coherent responsibility structure without breaking unrelated workflows.

---

# 4. PAYROLL CALCULATION RULES – RULE DOCUMENT EDITOR

## TASK 2 – REPLACE THE JSON TEXTAREA WITH STRUCTURED FORM FIELDS

Modify the Rule Document section of the Payroll Calculation Rules page in the Admin Portal.

The existing implementation uses a single textarea containing JSON-formatted values.

Replace this interface with a structured, user-friendly configuration form.

Do not require administrators to understand or manually edit JSON to manage payroll calculation rules.

The backend may continue storing structured configuration data in JSON or another suitable format, but the frontend must present it through intuitive and appropriate form controls.

### 4.1 Organize fields into logical sections

Group configuration fields based on their actual payroll calculation category.

Suggested sections:

**A. General Information**

- Rule name.
- Rule code.
- Description.
- Rule category.
- Applicable employee group.
- Status.
- Effective start date.
- Effective end date.
- Supporting policy or reference.

**B. Calculation Basis**

- Monthly.
- Daily.
- Hourly.
- Per unit.
- Fixed amount.
- Percentage.
- Table-based calculation.
- Other supported calculation methods.

**C. Calculation Parameters**

Display only the fields relevant to the selected calculation method.

Examples:

- Base amount.
- Percentage.
- Multiplier.
- Hourly rate basis.
- Daily rate basis.
- Standard working hours.
- Divisor.
- Minimum amount.
- Maximum amount.
- Contribution ceiling.
- Applicable threshold.
- Rounding method.

**D. Eligibility and Applicability**

- All eligible employees.
- Specific department.
- Specific position.
- Specific employment category.
- Specific pay grade.
- Selected employees.
- Other supported employee groups.

Show additional fields dynamically when the selected option requires more specific information.

**E. Conditions and Exceptions**

Allow authorized users to configure supported conditions, eligibility criteria, minimum and maximum requirements, and exception handling.

**F. Tax and Contribution Treatment**

Display relevant classifications, such as:

- Taxable.
- Non-taxable, where legally supported.
- Subject to statutory contribution.
- Excluded from a particular contribution basis, where legally supported.
- Employer-paid.
- Employee-funded.

Do not allow arbitrary classifications that contradict the centralized statutory rules.

**G. Effective Dates and Version Information**

Display:

- Effective start date.
- Effective end date.
- Current version.
- Status.
- Created by.
- Last modified by.
- Last modified date.

### 4.2 Dynamic field behavior

The interface must adjust according to the selected calculation method.

Examples:

- If Monthly is selected, display monthly calculation fields.
- If Hourly is selected, display hourly rate and applicable hour fields.
- If Percentage is selected, require the calculation basis.
- If a contribution table is selected, display the applicable table and reference.
- If specific departments are selected, display department multi-select.
- If specific employees are selected, display employee selection.

Do not display irrelevant fields when they are not applicable.

### 4.3 Formula configuration interface

Where calculation formulas need to be customized, implement a controlled formula builder or approved parameter-based editor.

Do not replace the JSON textarea with an unrestricted code textarea.

Provide:

- Approved calculation variables.
- Supported operators.
- Allowed functions.
- Calculation preview.
- Input/output explanation.
- Validation messages.
- Formula description in readable language.

Never execute arbitrary JavaScript, TypeScript, SQL, Python, or user-supplied code.

Use the existing centralized formula engine and its approved expression format.

### 4.4 UX requirements

Prioritize:

- Clear field labels.
- Helpful descriptions.
- Appropriate units.
- Tooltips where useful.
- Logical field grouping.
- Responsive layouts.
- Conditional fields.
- Clear required and optional indicators.
- Inline validation.
- Friendly error messages.
- Consistent input formatting.
- Convenient date selection.
- Currency formatting.
- Percentage formatting.
- Easy review before saving.

Provide a human-readable summary of the configured rule so administrators can understand what it does without inspecting JSON.

Provide a calculation preview when appropriate.

### 4.5 Data handling

All fields must correspond to the existing centralized configuration structure.

Ensure that:

- Data is validated before persistence.
- Values are normalized.
- Unused fields are handled correctly.
- Invalid combinations are rejected.
- Existing configuration versions remain preserved.
- Changes are versioned and audited.

Do not break existing payroll rules during the UI migration.

---

# 5. COMPENSATION – PAY GRADES

## TASK 3 – IMPLEMENT PAY GRADE LIST AND APIs

Create or extend the APIs, service functions, and database operations for managing employee pay grades.

The Pay Grades tab must display all existing pay grade records from the database.

### 5.1 Required table columns

| Field | Description |
|---|---|
| Pay Grade | Pay grade name or title |
| Position | Associated position or position group |
| Base Pay Range | Minimum and maximum base pay |
| Employees | Number of employees assigned |
| Status | Current pay grade status |
| Actions | View, Edit, Retire/Remove |

The base pay must be displayed as a range, not a single fixed salary.

Example:

`₱25,000 – ₱35,000`

Support the appropriate compensation basis, such as:

- Monthly.
- Daily.
- Hourly.

Do not compare or combine salary ranges using incompatible compensation bases.

### 5.2 Pay Grade List APIs

Implement APIs for:

- Retrieving pay grade records.
- Retrieving individual pay grade details.
- Creating a pay grade.
- Editing a pay grade.
- Retrieving assigned employees.
- Retrieving pay grade history.
- Searching pay grades.
- Filtering by status.
- Retiring or soft-deleting a pay grade.
- Reassigning or validating employee assignments where supported.

Use server-side pagination and efficient database queries.

### 5.3 Search functionality

Allow administrators to search by:

- Pay grade name.
- Pay grade code.
- Position.
- Minimum base pay.
- Maximum base pay.

Search must support partial and case-insensitive matches.

Use appropriate normalized search inputs and deterministic result ordering.

### 5.4 Filters

Implement filters for:

- Status.
- Position.
- Compensation basis.
- Effective date, where appropriate.

Ensure that search and filters work together.

Reset or reconcile pagination when filter values change.

### 5.5 Add New Pay Grade

Provide an Add Pay Grade interface.

Required fields should include:

- Pay grade name.
- Unique pay grade code.
- Description or notes.
- Associated position or positions.
- Minimum base pay.
- Maximum base pay.
- Compensation basis.
- Effective start date.
- Effective end date, optional.
- Status.
- Applicable employee group, where supported.

Validate:

- Required fields.
- Unique identifiers.
- Minimum and maximum values.
- Minimum pay not exceeding maximum pay.
- Valid effective dates.
- Position relationships.
- Supported compensation basis.
- Applicable payroll configuration.

If pay grades have overlapping salary ranges within the same position or grade structure, detect and appropriately flag the conflict.

Do not automatically reject legitimate overlaps between unrelated job families or structures.

### 5.6 View Pay Grade Details

The View interface must display:

**General Information**

- Pay grade name.
- Grade code.
- Description.
- Position.
- Status.
- Effective date.
- Compensation basis.
- Minimum base pay.
- Maximum base pay.
- Notes.

**Employee Assignment Summary**

- Total assigned employees.
- Assigned employee names.
- Employee codes.
- Positions.
- Departments.
- Current assignment dates.

**History**

- Creation history.
- Previous values.
- Updated values.
- Changed by.
- Date modified.
- Reason for modification.
- Approval information, where applicable.

### 5.7 Edit Pay Grade

Create APIs and frontend functionality for editing pay grade information.

All modifications must:

- Be validated.
- Be persisted correctly.
- Generate a history record.
- Record the acting user.
- Record the previous and new values.
- Record the timestamp and reason where required.

If an active pay grade is modified, preserve the previous configuration version and apply an effective-dated new version.

Changing a pay grade's salary range must not automatically change the actual salary of assigned employees.

If an employee's existing salary falls outside the updated range, flag the discrepancy for authorized review.

### 5.8 Employee Assignment Responsibility

Admin owns the pay grade structure.

HR should normally manage employee-to-pay-grade assignments using approved pay grade records.

The Admin may inspect assignments and manage the pay grade structure, but must not create conflicting assignment workflows.

Ensure:

- Employees can only be assigned to valid active pay grades.
- Assignment dates are maintained.
- Employees have one valid effective pay grade at a given point in time, unless the existing system explicitly supports otherwise.
- Assignment history is preserved.
- Assignment changes are traceable.

### 5.9 Retire or Remove Pay Grade

Implement a Retire/Remove action.

<badge color="danger">Non-negotiable business rule</badge>

Before removing a pay grade, **all employees assigned to it must first be reassigned to another valid pay grade**.

The backend must enforce this condition.

Do not rely only on a frontend confirmation message.

The retirement API must reject the operation if:

- Any employee remains assigned.
- A scheduled future assignment remains.
- Any other active relationship prevents safe retirement.

Do not automatically move employees to another pay grade without an authorized reassignment operation.

Once eligible for retirement:

- Mark the pay grade as retired or soft-deleted.
- Preserve its historical record.
- Preserve old employee assignments.
- Preserve previous salary and payroll history.
- Keep it accessible through the history or archived view.
- Prevent new assignments to the retired pay grade.

Never permanently delete a pay grade that has historical compensation relationships.

---

# 6. COMPENSATION – ALLOWANCES

## TASK 4 – IMPLEMENT ALLOWANCE LIST AND APIS

Create the required allowance management functionality.

The Allowances tab must display actual allowance records from the database.

### 6.1 Required table fields

| Field | Description |
|---|---|
| Allowance | Allowance name |
| Amount | Fixed amount or configured value |
| Recurrence / Eligibility | Payment frequency and applicable employee group |
| Effective Date | Start of applicability |
| Status | Current allowance status |
| Actions | View, Edit, Pause/Retire |

### 6.2 Allowance search

Support searching by:

- Allowance name.
- Allowance code.
- Amount.
- Recurrence.
- Eligibility group.
- Applicable branch.

Use partial, case-insensitive searching.

### 6.3 Filters

Implement:

- Status filter.
- Eligibility filter.
- Recurrence filter.
- Applicable branch filter, where useful.

When an eligibility value other than All Employees is selected, display additional controls for selecting the applicable records.

Do not allow the system to save a specific eligibility option without its required selections.

### 6.4 Add New Allowance

Create the necessary API and interface for adding an allowance.

Required fields:

- Allowance name.
- Allowance code.
- Description.
- Allowance amount.
- Calculation or amount type, where supported.
- Recurrence.
- Eligible employee group.
- Applicable branches, optional.
- Effective start date.
- Effective end date, optional.
- Status.
- Tax treatment review.
- Notes or supporting policy.

### Recurrence options

Use clearly differentiated options:

- Weekly.
- Biweekly – every two weeks.
- Semimonthly – twice per month.
- Monthly.
- Bimonthly – every two months.
- Quarterly.
- Annually.
- One-time.
- Every eligible payroll period.
- Other approved recurrence options supported by the payroll engine.

Do not use an ambiguous "bi-monthly" label without explaining its frequency.

### 6.5 Dynamic eligibility selector

Provide the following suggested eligibility options, adapting them to the existing employee data structure:

- All eligible employees.
- Specific departments.
- Specific positions.
- Specific employment categories.
- Specific pay grades.
- Specific branches.
- Selected employees.
- Other supported employee groups.

When a user selects an eligibility option, display the corresponding multi-select component or detailed selection interface.

Examples:

- Specific department → Department multi-select.
- Specific position → Position multi-select.
- Specific pay grade → Pay grade multi-select.
- Specific branch → Branch multi-select.
- Selected employees → Employee search and selection.

When applicable, allow combinations of approved criteria.

Display a readable eligibility summary before saving.

### 6.6 Tax Treatment Review

Allowance tax treatment must integrate with the existing centralized statutory and payroll calculation rules.

Display:

- Tax treatment classification.
- Applicable statutory rule.
- Taxability basis.
- Contribution treatment.
- 13th-month basic salary treatment, where relevant.
- Supporting source or reference.
- Review status.

Do not allow HR or Admin to arbitrarily mark an allowance non-taxable if the applicable statutory rules do not support that classification.

When tax treatment requires review, flag it for the appropriate authorized reviewer.

### 6.7 Allowance Details

The View interface must contain:

**General Information**

- Allowance name.
- Code.
- Description.
- Amount.
- Calculation type.
- Recurrence.
- Status.
- Effective date.
- Expiration date.
- Notes.

**Eligibility and Assignment Summary**

- Eligible employee group.
- Selected departments.
- Selected positions.
- Selected pay grades.
- Branches.
- Assigned employees.
- Total affected employees.

**Tax and Payroll Treatment**

- Tax classification.
- Contribution treatment.
- Payroll calculation category.
- Applicable configuration version.

**History**

- Creation.
- Modifications.
- Previous values.
- New values.
- Changed by.
- Timestamp.
- Reason.
- Approval status.

### 6.8 Edit Allowance

Allow authorized users to modify all permitted allowance fields.

All changes must:

- Be validated.
- Be persisted.
- Generate an audit record.
- Preserve previous versions.
- Identify affected employees.
- Use an appropriate effective date.
- Preserve historical payroll calculations.

Do not retroactively modify submitted or approved payroll records.

### 6.9 Pause, Retire, and Remove

Implement appropriate lifecycle actions.

**Pause**

- Stop future allowance application according to the pause effective date.
- Prevent new eligible payroll earnings from being generated.
- Preserve historical and already submitted payroll values.
- Preserve previously earned or paid allowances.
- Record the actor, reason, and timestamp.

**Retire/Remove**

- End the allowance program's future applicability.
- Remove it from active employee eligibility.
- Preserve historical employee assignments.
- Preserve actual paid, accrued, and submitted allowance records.
- Mark the record as retired or soft-deleted.
- Keep it accessible through archived records and history.

Never delete historical payroll earnings when an allowance program is paused or retired.

---

# 7. COMPENSATION – BONUSES AND INCENTIVES

## TASK 5 – IMPLEMENT BONUS AND INCENTIVE MANAGEMENT APIS

Create complete functionality for managing company bonus and incentive programs.

### 7.1 Bonus List

Display:

| Field | Description |
|---|---|
| Program | Program name |
| Type | Bonus or incentive category |
| Rule / Value | Configured calculation basis and amount |
| Target Employees | Eligible employee group |
| Status | Current program status |
| Actions | View, Edit, Pause, Retire |

### 7.2 Search functionality

Allow searches by:

- Program name.
- Program code.
- Description.
- Program type.
- Calculation basis.
- Configured value.
- Target employees.

Use partial and case-insensitive matching.

### 7.3 Filters

Implement:

- Status filter.
- Program type filter.
- Frequency filter.
- Eligibility or target employee group filter, where appropriate.

Ensure that search and filters work together.

### 7.4 Add New Bonus or Incentive

Create the necessary APIs and form.

Required fields:

- Program name.
- Program code.
- Description.
- Program type.
- Calculation basis.
- Value.
- Value type (Peso or Percentage).
- Percentage calculation basis, when applicable.
- Target employee group.
- Frequency.
- Effective start date.
- Effective end date.
- Approval requirements.
- Status.
- Notes and supporting policy.

### Program types

Support existing company categories or other approved program types, such as:

- Performance bonus.
- Attendance incentive.
- Productivity incentive.
- Sales commission.
- Sales incentive.
- Spot bonus.
- Retention incentive.
- Loyalty award.
- Other company-approved incentive programs.

Do not automatically treat all programs as statutory benefits.

Do not duplicate 13th-month pay functionality with an ordinary discretionary bonus program.

### 7.5 Calculation basis

Support the applicable calculation methods:

- Fixed amount.
- Percentage of basic pay.
- Percentage of another approved compensation basis.
- Performance-based calculation.
- Attendance-based calculation.
- Productivity-based calculation.
- Sales-based calculation.
- Approved tiered calculation.
- Other supported methods in the centralized calculation engine.

Percentage-based programs must explicitly define the percentage calculation basis.

Do not allow unsupported formulas or arbitrary executable code.

### 7.6 Target employee group

Provide the same controlled dynamic eligibility-selection behavior used for allowances.

Support applicable employee groups:

- All eligible employees.
- Specific departments.
- Positions.
- Employment classifications.
- Pay grades.
- Branches.
- Selected employees.

Display the selected target group and total affected employees before saving.

### 7.7 Individual Awards

The bonus program must support individual award records where the program requires employee-specific nominations or calculations.

Each award must be traceable to:

- Program ID.
- Employee ID.
- Award amount.
- Calculation basis.
- Award period.
- Supporting performance or attendance records.
- Requested by.
- Approved by.
- Approval status.
- Payroll inclusion status.

Do not assume that merely being included in a target group means the employee has automatically earned a bonus.

The system must evaluate the applicable eligibility and approval requirements.

### 7.8 Bonus Program Details

The View interface must display:

**Program Information**

- Name.
- Code.
- Description.
- Program type.
- Calculation basis.
- Value.
- Value type.
- Frequency.
- Effective dates.
- Status.

**Eligibility**

- Target employee group.
- Departments.
- Positions.
- Pay grades.
- Branches.
- Selected employees.
- Total target employees.

**Individual Awards**

- Employee.
- Award amount.
- Award period.
- Calculation basis.
- Requested by.
- Approved by.
- Status.
- Payroll inclusion.

**Approval and History**

- Program creation.
- Modifications.
- Approval history.
- Pausing.
- Resuming.
- Retirement.
- Individual award history.

### 7.9 Edit Bonus and Incentive

Allow authorized users to modify all permitted program fields.

Every modification must:

- Be validated.
- Be saved.
- Create an audit event.
- Preserve previous versions.
- Identify affected employees.
- Respect effective dates.
- Preserve already approved awards and historical payroll.

### 7.10 Pause Program

Implement a Pause action.

Once paused:

- Stop future program eligibility and awards from being generated.
- Do not include future bonuses in payroll for dates on or after the effective pause date.
- Prevent HR from approving new awards that violate the paused program's rules.
- Notify relevant users where required.
- Preserve previously earned, approved, submitted, or paid awards.
- Record the reason, actor, effective date, and timestamp.

A paused bonus program must not continue producing new payroll earnings.

Do not retroactively remove an already earned or approved bonus without an authorized correction process.

### 7.11 Retire or Remove

Implement soft deletion or retirement.

When retired:

- Stop future bonus eligibility.
- Prevent new award creation under the retired program.
- Preserve historical award records.
- Preserve approved and paid bonuses.
- Preserve employee relationships.
- Make the program accessible in history and archived records.

Never permanently delete a bonus program that has historical award or payroll relationships.

---

# 8. COMPENSATION – SALARY ADJUSTMENTS

## TASK 6 – IMPLEMENT SALARY ADJUSTMENT REQUEST AND APPROVAL WORKFLOW

Create the APIs, backend services, and frontend functionality for managing employee salary adjustment requests.

This is a financially sensitive operation. It must use the existing compensation history, payroll configuration, audit, and maker-checker architecture.

### 8.1 Responsibility model

Recommended default workflow:

- HR creates and submits salary adjustment requests.
- Admin reviews the submitted request.
- Admin approves, rejects, or returns the request for revision.
- The approved salary adjustment becomes effective according to its approved date.

TL may provide recommendations through the existing request workflow, but must not independently change employee base pay.

Do not allow an administrator to bypass maker-checker controls by creating and approving the same request when separation of duties is required.

Inspect the existing salary adjustment and compensation workflows before deciding whether additional roles or permissions are necessary.

### 8.2 Salary Adjustment List

Create API functionality for retrieving all salary adjustment records.

The table must display:

| Field | Description |
|---|---|
| Employee | Employee full name |
| Current Pay | Existing approved base salary |
| Proposed Pay | Requested base salary |
| Effective Date | Requested effective date |
| Status | Request status |
| Action | View Details |

### 8.3 Search and filters

Support searching by:

- Employee name.
- Employee code.
- Department.
- Position.

Implement filters for:

- Request status.
- Effective date.
- Adjustment category.
- Requesting HR user, where appropriate.

Use server-side searching, filtering, and pagination.

### 8.4 Create Salary Adjustment API

Implement the salary adjustment creation workflow in the appropriate portal and role.

The API must support:

- Employee selection.
- Current salary retrieval.
- Proposed base pay.
- Effective date.
- Reason for adjustment.
- Adjustment category.
- Supporting document metadata.
- Reviewer notes.
- Requesting user.
- Submission timestamp.

The current salary must be retrieved from the authoritative compensation record.

Do not allow the request creator to arbitrarily replace the displayed current salary.

### Adjustment categories

Support appropriate categories such as:

- Promotion.
- Merit increase.
- Performance adjustment.
- Market adjustment.
- Annual salary review.
- Role or position change.
- Internal transfer.
- Correction of a previous compensation record.
- Other authorized adjustment types.

### 8.5 Validation

Validate:

- Employee existence.
- Employee employment status.
- Current compensation.
- Proposed salary.
- Applicable pay grade.
- Pay grade range.
- Effective date.
- Existing pending adjustments.
- Conflicting scheduled adjustments.
- Required supporting documents.
- Adjustment category.
- Reason.
- Requesting user's permissions.

If the proposed pay falls outside the employee's assigned pay grade range, flag the discrepancy and require an explicitly authorized exception or pay grade review.

Do not automatically modify the employee's pay grade to make the proposed salary valid.

Prevent duplicate pending requests for the same employee and effective period unless the existing workflow explicitly permits multiple proposals.

### 8.6 Supporting documents

Use the existing secure file upload infrastructure.

Store document metadata and protected references.

Validate:

- File type.
- File size.
- Access authorization.
- Upload ownership.
- File integrity.

Do not expose private supporting documents through public URLs.

### 8.7 Salary Adjustment Details

When View is clicked, display:

**Employee Information**

- Profile image.
- Employee name.
- Employee code.
- Position.
- Department.
- Current pay grade.
- Employment status, where relevant.

**Salary Change**

- Current base pay.
- Proposed base pay.
- Difference in amount.
- Percentage increase or decrease.
- Compensation basis.
- Applicable pay grade range.
- Effective date.

**Request Information**

- Requested by.
- Request date.
- Adjustment category.
- Reason.
- Supporting documents.
- Reviewer notes.

**Approval Timeline**

- Request submitted.
- HR review, where applicable.
- Returned for revision.
- Resubmitted.
- Approved.
- Rejected.
- Effective date.
- Acting user.
- Timestamp.
- Remarks.

### 8.8 Approval Actions

The Admin must have three actions:

**Approve**

When approving:

1. Verify the acting administrator's permission.
2. Confirm the request is eligible for approval.
3. Verify the employee's current compensation has not changed unexpectedly.
4. Validate the effective date.
5. Recheck the pay grade range.
6. Check for conflicting adjustments.
7. Create the approved effective-dated compensation record.
8. Preserve the previous compensation history.
9. Create an audit event.
10. Notify HR of the decision.

A future effective adjustment must be scheduled and must not change the employee's current salary prematurely.

A retroactive adjustment must use the appropriate authorized retroactive calculation or correction workflow.

**Reject**

Require a rejection reason.

Record:

- Administrator.
- Reason.
- Timestamp.
- Request version.
- Audit event.

Notify the requesting HR account.

**Return for Revision**

Require the administrator to specify:

- Reason for return.
- Information requiring correction.
- Missing documents.
- Required supporting evidence.
- Other review instructions.

When returned:

- Change status to Returned.
- Preserve the previous submitted request.
- Notify HR.
- Display correction instructions.
- Allow HR to revise and resubmit.
- Preserve the return history.

### 8.9 Salary Adjustment Lifecycle

Implement a clear lifecycle using the existing status conventions.

Suggested statuses:

- Draft.
- Pending Review.
- Returned.
- Resubmitted.
- Approved.
- Scheduled.
- Effective.
- Rejected.
- Cancelled.

Do not implement redundant statuses if equivalent states already exist.

The approved salary adjustment must create a new effective-dated compensation record rather than overwriting historical salary records.

Historical payroll must remain unchanged.

---

# 9. UNIFIED AUDIT HISTORY

## TASK 7 – CENTRALIZE COMPENSATION CHANGE HISTORY

Every compensation-related modification must be recorded.

This applies to changes initiated by Admin, HR, and other authorized users.

Track modifications involving:

- Pay grades.
- Salary ranges.
- Employee pay grade assignments.
- Allowance configurations.
- Allowance applicability.
- Bonus and incentive programs.
- Individual bonus awards.
- Salary adjustments.
- Effective dates.
- Calculation rules.
- Employee compensation assignments.
- Pause and resume actions.
- Retirement and archival.
- Approval and rejection decisions.

Each audit event should contain:

- Audit ID.
- Record type.
- Record identifier.
- Version.
- Action.
- Acting user ID.
- Acting user's role.
- Previous values or previous version reference.
- New values or new version reference.
- Reason.
- Timestamp.
- Effective date.
- Approval information.
- Affected employee or group.
- Related document reference, where applicable.

Use append-only audit behavior.

Do not allow ordinary APIs to delete or modify historical audit records.

### Historical preservation

Changes to compensation programs must not silently modify:

- Submitted payroll.
- Returned payroll versions.
- Approved payroll.
- Paid payroll.
- Previously earned bonuses.
- Previously accrued benefits.
- Historical salary records.

Changes must take effect according to the approved effective date and applicable payroll version.

---

# 10. API AND DATABASE IMPLEMENTATION

## TASK 8 – IMPLEMENT COMPENSATION APIs

Create or extend the following API capabilities using the existing application architecture.

### Pay Grades

- Retrieve pay grade list.
- Search and filter pay grades.
- Retrieve pay grade details.
- Create pay grade.
- Edit pay grade.
- Retrieve assigned employees.
- Retrieve pay grade history.
- Validate employee reassignment.
- Retire or soft-delete pay grade.

### Allowances

- Retrieve allowance list.
- Search and filter allowances.
- Retrieve allowance details.
- Create allowance.
- Edit allowance.
- Retrieve allowance eligibility.
- Retrieve assigned employees.
- Retrieve allowance history.
- Pause allowance.
- Retire or soft-delete allowance.

### Bonuses and Incentives

- Retrieve program list.
- Search and filter programs.
- Retrieve program details.
- Create program.
- Edit program.
- Retrieve target employees.
- Retrieve individual awards.
- Create and manage authorized award records.
- Retrieve program history.
- Pause or resume program.
- Retire or soft-delete program.

### Salary Adjustments

- Retrieve salary adjustment list.
- Search and filter salary adjustments.
- Retrieve adjustment details.
- Create adjustment request.
- Update authorized draft or returned requests.
- Submit request.
- Approve request.
- Reject request.
- Return request for revision.
- Retrieve approval timeline.
- Retrieve supporting documents.

### Audit

- Retrieve compensation history.
- Retrieve record-specific history.
- Compare previous and current versions.
- Retrieve actor and approval information.
- Retrieve affected employee relationships.

### API requirements

Use consistent request and response structures.

Every endpoint must perform:

- Authentication checks.
- Authorization checks.
- Input validation.
- Database relationship validation.
- Business rule validation.
- Safe error handling.
- Appropriate transaction handling.
- Audit logging where applicable.

Use server-side pagination and filtering.

Avoid N+1 queries and excessive data retrieval.

Do not rely on frontend validation for financial or authorization rules.

## TASK 9 – DATABASE INTEGRITY

Inspect the existing schema and reuse equivalent structures.

Determine whether the existing database supports:

- Pay grade records.
- Pay grade versions.
- Employee pay grade assignments.
- Allowance programs.
- Allowance eligibility assignments.
- Bonus and incentive programs.
- Individual award records.
- Salary adjustment requests.
- Effective-dated compensation history.
- Supporting document metadata.
- Audit events.
- Approval history.
- Archived records.

Create or modify models only when necessary.

Ensure:

- Correct primary and foreign keys.
- Valid employee relationships.
- Appropriate unique constraints.
- Effective-date validation.
- Decimal precision for monetary values.
- Appropriate indexes.
- Transactional updates.
- Safe soft deletion.
- Historical record preservation.

Do not create duplicate tables for existing functionality.

Do not permanently delete records that have historical compensation or payroll relationships.

---

# 11. UI/UX AND RESPONSIBILITY ALIGNMENT

## TASK 10 – REVIEW AND IMPROVE THE COMPENSATION PAGE

Before modifying the Compensation page, evaluate its current layout and behavior.

Identify:

- Inconsistent component designs.
- Confusing interactions.
- Missing actions.
- Duplicate functions.
- Unclear ownership between HR and Admin.
- Missing approval states.
- Inadequate history visibility.
- Inconsistent form fields.
- Missing confirmation dialogs.
- Poor search or filtering behavior.
- Incomplete database integration.

Update the interface to provide a coherent experience across all four tabs.

### General UI/UX requirements

- Maintain the existing design system and visual direction.
- Use appropriate tables and detailed views.
- Keep forms organized by logical sections.
- Use conditional fields where necessary.
- Use searchable employee and department selectors.
- Provide clear eligibility summaries.
- Provide intuitive currency and percentage inputs.
- Use appropriate date pickers.
- Clearly indicate required and optional fields.
- Provide loading, empty, success, and error states.
- Prevent duplicate form submissions.
- Provide clear confirmation for consequential actions.
- Display meaningful validation messages.
- Ensure that all controls are actually functional.
- Maintain responsive and accessible interactions.

### Role-specific interface behavior

Show only the actions the current user is authorized to perform.

Do not simply hide unauthorized buttons and assume the operation is secure.

The backend must enforce the same permissions independently.

For every record, the displayed action buttons must match its actual status and lifecycle.

Examples:

- An active pay grade may be edited or retired by authorized Admin users.
- A retired pay grade must not accept new employee assignments.
- A paused allowance must not generate new payroll earnings.
- A paused bonus program must not generate new future awards.
- A pending salary adjustment may be approved, rejected, or returned by authorized Admin users.
- An approved salary adjustment must not be editable through the ordinary request form.

---

# 12. SECURITY, VALIDATION, AND SCALABILITY

## TASK 11 – FINANCIAL DATA SECURITY

Apply security-audit recommendations throughout the implementation.

Protect:

- Employee salary information.
- Pay grades.
- Allowance amounts.
- Bonus and incentive values.
- Salary adjustment requests.
- Supporting documents.
- Compensation history.
- Approval information.
- Payroll configuration records.

Enforce strict role-based access.

Prevent:

- Unauthorized salary modification.
- Unauthorized pay grade assignment.
- Unauthorized compensation approval.
- Unauthorized allowance or bonus changes.
- Privilege escalation.
- Insecure direct object references.
- Access to another employee's restricted information.
- Unauthorized document retrieval.
- Deactivated accounts from accessing protected functionality.

Use server-side permission validation for every protected action.

## TASK 12 – DATA VALIDATION AND BUSINESS RULE ENFORCEMENT

Validate all submitted data before persistence.

Include:

- Required fields.
- Numeric boundaries.
- Currency formatting.
- Decimal precision.
- Percentage limits.
- Effective date ranges.
- Employee eligibility.
- Position and department relationships.
- Pay grade ranges.
- Allowance applicability.
- Bonus calculations.
- Salary adjustment conflicts.
- Duplicate assignments.
- Invalid status transitions.
- Tax treatment compatibility.

Use consistent normalization and formatting.

Reject invalid or contradictory data.

Never silently modify submitted compensation values.

## TASK 13 – PERFORMANCE AND SCALABILITY

Optimize all list, detail, and employee assignment operations.

Use:

- Database indexes.
- Server-side filtering.
- Server-side pagination.
- Efficient relationship queries.
- Avoidance of N+1 queries.
- Transactional updates.
- Appropriate concurrency protection.
- Idempotent sensitive actions.
- Reusable backend services.
- Efficient audit history queries.

Ensure that employee counts and eligibility summaries remain accurate even with a large number of employees.

Avoid loading all employee records into the frontend just to perform filtering or selection.

Support efficient searching through employee selectors.

Do not sacrifice validation or audit integrity for performance.

---

# 13. TESTING AND ACCEPTANCE CRITERIA

## TASK 14 – COMPREHENSIVE TESTING

### A. Rule Document Editor

Verify:

- JSON textarea is replaced with structured fields.
- All required data loads correctly.
- Dynamic fields behave correctly.
- Invalid configurations are rejected.
- Existing payroll configurations remain compatible.
- Updates are persisted.
- Configuration versions and audit records are created.
- Formula configuration cannot execute arbitrary code.

### B. Pay Grades

Verify:

- Pay grade list retrieval.
- Search and filters.
- Base pay range display.
- Create and edit operations.
- Employee assignment retrieval.
- History tracking.
- Soft deletion.
- Retirement rejection when employees remain assigned.
- Retired grades cannot receive new employees.
- Existing employee salary records remain unchanged.

### C. Allowances

Verify:

- Search and filtering.
- Creation and modification.
- Eligibility selection.
- Dynamic employee group controls.
- Branch assignment.
- Recurrence handling.
- Tax treatment validation.
- History tracking.
- Pause and retirement.
- Future payroll inclusion behavior.
- Preservation of historical allowances.

### D. Bonuses and Incentives

Verify:

- Program creation and editing.
- Search and filters.
- Calculation basis.
- Employee group eligibility.
- Individual award records.
- Approval requirements.
- Pause behavior.
- Retirement and archival.
- No future awards after pause.
- Preservation of previously earned or approved awards.

### E. Salary Adjustments

Verify:

- Request creation.
- Current compensation retrieval.
- Proposed salary validation.
- Pay grade range checking.
- Search and filters.
- Supporting document security.
- Admin approval.
- Rejection with mandatory reason.
- Return for revision with mandatory instructions.
- Resubmission.
- Effective-dated salary updates.
- Compensation history.
- Duplicate and concurrent request protection.

### F. Role and Permission Tests

Verify:

- Admin controls policy definitions and approvals.
- HR performs authorized employee assignments and submits salary adjustment requests.
- TL cannot modify base pay or compensation configurations.
- Employees only access their permitted information.
- Direct API calls cannot bypass frontend restrictions.
- Maker-checker separation works where required.

### G. Audit Tests

Verify:

- Every modification creates an audit event.
- Previous and new values are accurate.
- The acting user is identified.
- Timestamps and effective dates are accurate.
- Retired records remain accessible.
- Historical records cannot be modified through normal APIs.
- Rejected changes remain visible in history.

### H. General Quality Checks

Run:

- TypeScript checks.
- Linting.
- Unit tests.
- Integration tests.
- API tests.
- Database tests.
- Security tests.
- Relevant end-to-end tests.
- Production build checks.

Do not suppress meaningful errors or weaken validation to make tests pass.

---

# 14. IMPLEMENTATION ORDER

Execute the work in the following order.

## Phase 1 – Inspection and Responsibility Audit

- Inspect the existing Compensation page.
- Inspect the Rule Document editor.
- Inspect database models and relationships.
- Inspect current Admin, HR, TL, and Employee permissions.
- Document existing compensation workflows.
- Identify conflicts and missing functionality.
- Invoke Ponytail and security-audit skills.

Deliverable: Codebase findings and responsibility matrix.

## Phase 2 – Rule Document UI

- Replace JSON textarea with structured fields.
- Implement appropriate dynamic controls.
- Add field-level validation.
- Add formula preview.
- Preserve compatibility with the existing configuration engine.

Deliverable: Usable Payroll Calculation Rules editor.

## Phase 3 – Pay Grades

- Implement Pay Grade APIs.
- Implement list, search, and filters.
- Implement add and edit forms.
- Implement details and history.
- Implement employee assignment visibility.
- Implement mandatory reassignment validation.
- Implement soft retirement.

Deliverable: Complete Pay Grades tab.

## Phase 4 – Allowances

- Implement allowance APIs.
- Implement list, search, and filters.
- Implement dynamic employee eligibility selection.
- Implement creation and editing.
- Implement tax treatment integration.
- Implement history and retirement.
- Implement pause behavior.

Deliverable: Complete Allowances tab.

## Phase 5 – Bonuses and Incentives

- Implement program APIs.
- Implement list and filters.
- Implement creation and editing.
- Implement eligibility and individual awards.
- Implement approval requirements.
- Implement pause and retirement.
- Implement history.

Deliverable: Complete Bonuses & Incentives tab.

## Phase 6 – Salary Adjustments

- Implement salary adjustment request APIs.
- Implement HR request interface.
- Implement Admin review interface.
- Implement approval, rejection, and return-for-revision.
- Implement effective-dated compensation history.
- Implement notifications and audit timeline.

Deliverable: Complete Salary Adjustments workflow.

## Phase 7 – Integration and Security

- Integrate all tabs with the centralized compensation and payroll configuration engine.
- Verify role permissions.
- Verify historical payroll protection.
- Verify effective dates.
- Verify audit logging.
- Verify soft deletion and archival.
- Run security-audit.

Deliverable: Integrated Compensation module.

## Phase 8 – Testing and Final Verification

- Execute all relevant tests.
- Resolve defects.
- Verify database persistence.
- Verify API authorization.
- Verify frontend behavior.
- Run the production build.
- Update implementation status.

Deliverable: Verified implementation and final report.

---

# 15. IMPLEMENTATION STATUS TRACKING

Maintain the existing implementation status document, or update the current project tracking file.

Do not create unnecessary duplicate tracking documents.

For each task, record:

- Task ID.
- Task name.
- Status.
- Files modified.
- APIs created or modified.
- Database changes.
- Role permissions affected.
- Business rules implemented.
- Audit behavior.
- Tests executed.
- Test results.
- Remaining issues.

Use these status values:

- Not Started.
- In Progress.
- Completed.
- Blocked.
- Needs Verification.

Update the implementation status after each task or coherent task group and before moving to dependent work.

A task must not be marked Completed merely because the interface has been created.

Verify the frontend, API, business logic, database persistence, authorization, and audit history before marking a task complete.

---

# 16. FINAL DEVELOPMENT REPORT

After implementation, provide a complete report containing:

**A. Codebase Findings**

- Existing compensation architecture.
- Existing Rule Document implementation.
- Existing role responsibilities.
- Identified conflicts and gaps.

**B. Database Changes**

- New or modified models.
- Relationships.
- Migrations.
- Constraints.
- Indexes.
- Effective-date and versioning changes.

**C. Rule Document Editor**

- Removed JSON textarea.
- Structured fields implemented.
- Dynamic field behavior.
- Formula configuration.
- Validation and compatibility.

**D. Pay Grades**

- APIs.
- Search and filters.
- Employee assignment responsibility.
- Reassignment restrictions.
- Retirement and history.

**E. Allowances**

- APIs.
- Dynamic eligibility.
- Recurrence.
- Tax treatment.
- Pause and retirement behavior.

**F. Bonuses and Incentives**

- APIs.
- Program types.
- Calculation rules.
- Employee targeting.
- Individual awards.
- Pause and retirement behavior.

**G. Salary Adjustments**

- Request workflow.
- Admin approval.
- Return and rejection.
- Effective-dated compensation updates.
- Supporting documents.
- History.

**H. Security and Audit**

- Authorization changes.
- Permission restrictions.
- Audit events.
- Historical data protection.
- Security-audit findings.

**I. Testing**

- Tests executed.
- Passed tests.
- Failed tests.
- Outstanding issues.
- Type-check and lint results.
- Production build results.

**J. Remaining Work**

Identify incomplete features, blockers, unresolved business rules, and outstanding integration requirements.

Do not claim that a feature is complete without verification.

---

# FINAL IMPLEMENTATION DIRECTIVE

Treat the Compensation page as part of the centralized payroll configuration and financial governance system.

Admin must control compensation policy definitions and financial approvals.

HR must manage employee compensation assignments and prepare employee-specific salary adjustment requests.

TL must operate within the authorized recommendation and request workflow.

Employees must only access their authorized compensation information.

All compensation configurations must integrate with the centralized payroll calculation engine.

Every modification must be validated, versioned where appropriate, and recorded in history.

No pay grade may be retired while employees remain assigned to it.

No allowance or bonus retirement may erase historical payroll records.

No salary adjustment may overwrite historical compensation data.

No unapproved compensation rule may affect actual payroll.

Use Ponytail and security-audit throughout the implementation.

**Inspect first. Verify responsibilities. Implement task by task. Preserve historical records. Enforce backend authorization. Validate every financial operation. Prioritize usability, security, scalability, and data integrity over implementation speed.**