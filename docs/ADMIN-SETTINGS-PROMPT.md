# IMPLEMENTATION SPECIFICATION
# ADMIN PORTAL – ORGANIZATION SETTINGS AND EMPLOYMENT STRUCTURE

## 1. PROJECT OBJECTIVE

Implement and integrate the following Settings pages in the Admin Portal:

1. Organization Profile.
2. Employment Status Policy.
3. Organization Structure.

The implementation must include the necessary APIs, backend services, database operations, validation, frontend modifications, authorization, and audit logging.

The objective is to establish a centralized and reliable organization configuration system that serves as the authoritative source of company information, employment status policies, branches, and departments.

Every displayed field, form, button, dropdown, filter, and action must be connected to its corresponding backend functionality and database records.

Prioritize:

- Data accuracy and integrity.
- Security and authorization.
- Clear organization and employment relationships.
- Effective-dated configuration management.
- Historical record preservation.
- Consistent data formatting.
- Intuitive UI/UX.
- Scalability and maintainability.

Do not implement frontend-only functionality, mock records, or hardcoded organization information.

---

# 2. MANDATORY DEVELOPMENT INSTRUCTIONS

## 2.1 Required Agent Skills

Use the following skills throughout the entire implementation.

**Ponytail Skill**

Apply Ponytail when:

- Inspecting the existing architecture.
- Organizing API routes and backend services.
- Implementing reusable components.
- Structuring database operations.
- Improving validation and error handling.
- Reviewing code quality and maintainability.
- Integrating frontend and backend functionality.

**Security-Audit Skill**

Use security-audit when:

- Inspecting existing authentication and authorization.
- Implementing organization settings APIs.
- Modifying employment status configurations.
- Managing branch and department records.
- Implementing database relationships.
- Handling sensitive organization information.
- Implementing audit logging and historical records.
- Reviewing direct API access and privilege restrictions.

Invoke the actual installed skills and follow their instructions. Do not simply mention them in the final report.

## 2.2 Inspect the Existing Codebase First

Before modifying anything, inspect:

- Existing Admin Settings page structure.
- Organization Profile page and its intended purpose.
- Existing organization configuration models.
- Employment Status Policy page.
- Existing employment status records and relationships.
- Employee onboarding and registration workflows.
- Employee profile and employment information.
- Headcount calculation and reporting logic.
- Branch and site structures.
- Department structures.
- Existing Team models and references.
- Existing organization-related APIs.
- Existing validation schemas.
- Role-based access control.
- Audit logging.
- Existing database migrations and constraints.
- Existing UI components and design system.

Trace how organization information and employment status data are currently retrieved, saved, and used throughout the system.

Identify which existing modules depend on these settings.

Do not create duplicate models, API implementations, or configuration sources.

## 2.3 Non-Negotiable Implementation Rules

- Use the database as the source of truth.
- Validate all inputs on the server.
- Reuse existing backend services and components where appropriate.
- Follow the existing technology stack and architecture.
- Use transactions for related database changes.
- Preserve historical records.
- Prevent duplicate records and conflicting relationships.
- Enforce authorization independently in every protected API.
- Avoid unnecessary schema modifications.
- Do not permanently delete referenced organizational records.
- Do not silently change existing employee records when configurations are modified.
- Do not make unrelated UI or architectural changes.
- Update the implementation status after each completed task.
- Do not mark features complete without testing actual database persistence and frontend integration.

---

# 3. ORGANIZATION PROFILE

## TASK 1 – IMPLEMENT ORGANIZATION PROFILE RETRIEVAL AND UPDATE APIS

Modify the Organization Profile page in the Admin Portal Settings section.

Refer to the existing Organization Profile interface to understand its purpose, intended fields, and how organization information is expected to be used throughout the application.

The immediate requirement is to support saving, retrieving, and displaying:

1. Organization Name.
2. Company Time Zone.

Use the existing organization configuration structure if one already exists.

Do not create duplicate organization records or independent settings storage.

## 3.1 Organization Name

Create the necessary API and service functions for retrieving and updating the organization name.

Requirements:

- Retrieve the current organization name from the database.
- Display the saved name when the page is opened.
- Allow authorized administrators to modify it.
- Save changes to the appropriate organization record.
- Reflect the latest saved value when the page is reopened.
- Ensure consistent organization name usage wherever the company name is displayed in the system.

### Validation

- Required field.
- Cannot contain only spaces.
- Trim unnecessary leading and trailing whitespace.
- Normalize text consistently.
- Enforce an appropriate maximum length based on the existing schema.
- Reject invalid or excessively long values.
- Preserve valid Unicode characters.
- Avoid creating duplicate organization records.
- Use the authenticated organization context rather than trusting an arbitrary organization ID submitted by the frontend.

Do not automatically overwrite unrelated company information when the organization name is changed.

## 3.2 Company Time Zone

Create the necessary API and service functions for retrieving and updating the company's time zone.

The interface must display the currently configured time zone and allow an authorized administrator to select a different supported time zone.

Use standardized IANA time zone identifiers instead of storing arbitrary UTC offsets.

Examples:

- `Asia/Manila`
- `Asia/Singapore`
- `Asia/Tokyo`
- `UTC`

Do not hardcode the dropdown to only these examples. Use a comprehensive supported time zone list or an appropriate timezone library.

### Validation

- Require a valid supported IANA time zone identifier.
- Reject invalid or unrecognized values.
- Normalize the stored value.
- Validate the selection server-side.
- Prevent invalid timezone strings from reaching database records.

### Time zone behavior

The configured company time zone must be consistently respected by relevant system functionality, including:

- Date and time display.
- Attendance records.
- Schedule presentation.
- Payroll cutoff interpretation.
- Payroll period boundaries.
- Organization-related activity timestamps.
- Audit timeline display.
- Reports and relevant dashboards.

Preserve a consistent timestamp storage convention, preferably UTC where supported by the existing architecture.

Convert timestamps to the configured company time zone when displaying them.

**Important:** Changing the company time zone must not rewrite or reinterpret historical UTC timestamps. Do not silently change existing attendance records, payroll calculations, or historical audit events.

Inspect how the existing system handles date and time values before implementing the change.

If a timezone change affects date-based payroll or attendance operations, ensure the application applies the new setting consistently without changing previously finalized payroll records.

## 3.3 Organization Profile UI/UX

Improve the existing interface to make organization configuration intuitive.

Requirements:

- Display the current organization name.
- Display the current time zone.
- Use an appropriate text input for organization name.
- Use a searchable dropdown for time zone selection.
- Provide clear descriptions of each field.
- Provide Save Changes functionality.
- Show appropriate loading and saving states.
- Display field-level validation errors.
- Display success and failure feedback.
- Prevent duplicate submission.
- Preserve unsaved changes when appropriate.
- Reflect updated values after successful persistence.

Do not redesign unrelated Settings pages.

## 3.4 Organization Profile Audit

Record relevant organization profile modifications.

Each update should record:

- Setting modified.
- Previous value.
- New value.
- Acting user.
- Timestamp.
- Organization identifier.
- Change reason, where required.

Preserve historical organization setting changes.

---

# 4. EMPLOYMENT STATUS POLICY

## TASK 2 – IMPLEMENT EMPLOYMENT STATUS POLICY APIS AND UI

Create or extend the necessary APIs, backend functions, and frontend integration for the Employment Status Policy page in the Admin Portal.

Refer to the existing Employment Status Policy interface to understand its intended purpose and how its configuration is expected to affect the rest of the system.

The page must retrieve and display the actual employment status policies configured in the database.

The system must support creating and maintaining employment status policy versions.

## 4.1 Employment Status Policy List

Create an API for displaying all configured employment status policies.

Display the following information:

| Field | Description |
|---|---|
| Status Code | Unique employment status identifier |
| Display Name | Human-readable employment status |
| Headcount Eligible | Indicates whether employees under this status count toward company headcount |
| Effective From | Date when the policy becomes applicable |
| Version | Current policy version |
| Status | Current policy configuration state |
| Actions | View details or manage the policy |

Retrieve actual configured records.

Do not use hardcoded employment status values.

If the existing system has additional relevant fields, preserve them where necessary.

## 4.2 Create New Employment Status Policy

Implement the API and interface for creating a new employment status policy.

Required fields:

1. Status Code.
2. Display Name.
3. Headcount Eligible checkbox.
4. Effective From date.

### Status Code

Requirements:

- Required.
- Unique within the applicable organization.
- Consistent formatting.
- Trim unnecessary whitespace.
- Validate allowed characters according to the existing naming convention.
- Prevent duplicate status codes.
- Prevent invalid or ambiguous identifiers.

Use a stable internal identifier for database relationships. Do not use the editable display name as the primary identifier.

### Display Name

Requirements:

- Required.
- Human-readable.
- Properly formatted.
- Cannot contain only whitespace.
- Subject to appropriate length limits.
- Must support valid Unicode characters.

### Headcount Eligible

Implement a checkbox indicating whether employees assigned to the corresponding employment status should be included in organizational headcount calculations.

The checkbox must reflect the saved database value.

When selected, employees assigned to that employment status must be included in applicable headcount calculations.

When unselected, those employees must be excluded from headcount totals where the policy applies.

**Important distinction:** Headcount eligibility is not automatically equivalent to payroll eligibility, system account status, benefit eligibility, or employment termination status.

Do not use this checkbox to independently determine whether an employee can receive salary or access the system.

Those behaviors must continue to follow their respective business rules.

### Effective From

Require a valid effective date.

Use consistent date formatting and the configured company time zone when interpreting date-based business operations.

Prevent invalid effective dates and conflicting policy versions.

Do not modify historical employee employment records when a new policy version is created.

## 4.3 Save New Policy Version

When the administrator clicks Save New Policy Version:

1. Validate all submitted fields.
2. Verify the acting administrator's permission.
3. Validate the status code.
4. Validate the effective date.
5. Check for duplicate or conflicting records.
6. Create the new policy version.
7. Preserve the previous configuration.
8. Record the user responsible.
9. Record the creation timestamp.
10. Persist the new version.
11. Record the appropriate audit event.
12. Make the new configuration available according to its effective date.

Do not overwrite previous policy versions.

If the existing implementation uses an aggregate policy version rather than individual versions per status, preserve that architecture and implement the versioning at the appropriate configuration level.

Avoid creating incompatible versioning approaches.

## 4.4 Where Employment Status Policies Must Reflect

Determine the actual consumers of employment status policies by tracing the current implementation.

A newly created or updated policy must appear in the appropriate parts of the system.

At minimum, inspect the following:

**Employee Management**

- Employee creation forms.
- Employee onboarding.
- Employee profile editing.
- Employment information.
- Employment status selection.
- Employee details and status display.

**Headcount and Workforce Reporting**

- Headcount calculations.
- Employee directory filters.
- Workforce summaries.
- Relevant Admin and HR dashboards.
- Reports that categorize employees by employment status.

**Other Dependent Modules**

Inspect whether attendance, scheduling, payroll, benefits, and other modules use employment status.

Integrate the policy only where the existing business rules require it.

Do not automatically assume that headcount eligibility controls payroll eligibility, attendance eligibility, or benefit entitlements.

Use one centralized status resolution and headcount eligibility mechanism instead of duplicating status rules throughout the application.

## 4.5 Employment Status Policy History

Preserve:

- Previous status codes.
- Previous display names.
- Previous headcount eligibility values.
- Previous effective dates.
- Policy version.
- Created by.
- Modified by.
- Modification timestamp.
- Reason for modification, where required.

If an employment status has already been used by employee records, do not permanently delete it.

Use retirement or versioned status management where necessary to protect historical employment records.

Prevent a retired status from being newly assigned where the business rules prohibit it.

Existing employee historical records must remain readable.

## 4.6 Employment Status Policy UI/UX

The interface must provide:

- Clear policy list.
- Add New Status Policy action.
- Structured form fields.
- Headcount eligibility checkbox.
- Effective date picker.
- Version information.
- View details.
- History tracking.
- Clear save and validation feedback.

The checkbox must have an explanatory label so administrators understand its effect on headcount calculations.

Use clear descriptions rather than technical database terminology.

Display the effective date and version clearly.

---

# 5. ORGANIZATION STRUCTURE

## TASK 3 – IMPLEMENT BRANCH AND DEPARTMENT MANAGEMENT

Modify the Organization Structure page in Admin Portal Settings.

The organization structure must support:

1. Company Branches or Sites.
2. Company Departments.

The Team component must be removed from this page because it is not part of the intended organization structure for this system.

Inspect existing relationships and dependencies before removing it.

Do not delete existing Team-related database records or break other modules that still reference them.

The UI component must be removed, and obsolete team-specific functionality should only be removed or deprecated when confirmed safe.

## 5.1 Branch and Site Management

Create the necessary APIs, services, and frontend components for managing company branches or sites.

### Branch list

Display existing branches using actual database records.

Recommended fields:

| Field | Description |
|---|---|
| Branch Name | Name of the company branch or site |
| Branch Code | Unique branch identifier, where supported |
| Location | Branch address or location |
| Departments | Number of departments assigned |
| Status | Current branch status |
| Actions | View, Edit, and available lifecycle actions |

### Add New Branch

Implement a clearly visible Add Branch or Add Site button.

When clicked, show an intuitive form.

Required fields:

- Branch Name.
- Location.

Add a unique Branch Code if it is supported by the existing data model or required for reliable identification.

Additional metadata may include:

- Description.
- Status.
- Effective date.
- Notes.

Do not introduce unnecessary required fields without a clear business purpose.

### Location field

The location field must allow the administrator to specify the physical location of the branch.

Inspect the existing application data structure before deciding whether location should be represented as:

- A single formatted address.
- Separate address fields.
- A structured geographic location.

Use a consistent structure throughout the application.

If structured address fields are appropriate, consider:

- Street or Building.
- City or Municipality.
- Province or State.
- Postal Code.
- Country.

Do not require geographic coordinates or map integration unless the existing system already supports or needs them.

Validate and normalize location data appropriately.

### Branch APIs

Implement functions for:

- Retrieving branch lists.
- Retrieving individual branch details.
- Creating branches.
- Updating branch information.
- Retrieving assigned departments.
- Retrieving branch history.
- Managing branch status where supported.

All operations must be connected to actual database records.

## 5.2 Department Management

Create the APIs and frontend functionality for managing company departments.

Departments must be associated with their respective branches.

### Department list

Display:

| Field | Description |
|---|---|
| Department | Department name |
| Branch/Site | Associated company branch |
| Department Code | Unique identifier, where supported |
| Employees | Number of assigned employees |
| Status | Current department status |
| Actions | View and Edit |

### Add New Department

Provide a clearly visible Add Department button.

Required fields:

- Department Name.
- Branch/Site selection.

Additional fields may include:

- Department Code.
- Description.
- Status.
- Effective date.
- Notes.

The Branch/Site field must retrieve actual branch records from the database through the appropriate API.

Do not use hardcoded branch options.

### Department-to-Branch Relationship

Implement the appropriate database relationship between departments and branches.

Under the requested organization structure, each department should belong to its selected branch unless the existing architecture explicitly supports shared departments across multiple branches.

Validate the relationship on the backend.

Do not accept arbitrary or nonexistent branch identifiers.

Ensure that:

- The selected branch exists.
- The branch is active where required.
- Department names and codes follow the correct uniqueness rules.
- Invalid department-branch relationships are rejected.
- Existing employee assignments remain consistent.

If departments are allowed to have the same name across different branches, enforce uniqueness according to the appropriate scope rather than globally.

For example, duplicate department names may be valid in different branches if that is how the company organizes its structure.

### Department Editing

Add an Edit action for every department record.

When clicked, display the existing department information.

Allow authorized administrators to modify:

- Department Name.
- Department Code, where editable.
- Associated Branch.
- Description.
- Status.
- Other supported metadata.

All modifications must:

- Be validated.
- Be saved in the database.
- Record the acting user.
- Record the modification timestamp.
- Preserve previous values.
- Create an audit history entry.

When changing the branch of a department, inspect affected employee assignments and other dependent records.

Do not silently modify historical employee department assignments.

New department relationships must follow the appropriate effective-date or reassignment workflow.

## 5.3 Branch and Department Detail Views

Where the existing UI supports detailed viewing, provide appropriate detail interfaces.

### Branch details

Display:

- Branch name.
- Branch code.
- Location.
- Status.
- Assigned departments.
- Employee count, where applicable.
- Creation date.
- Last modified date.
- Modification history.

### Department details

Display:

- Department name.
- Department code.
- Associated branch.
- Description.
- Status.
- Assigned employees.
- Employee count.
- Creation date.
- Last modified date.
- Modification history.

Retrieve details from actual database relationships.

## 5.4 Branch and Department Lifecycle Protection

Do not permanently delete branches or departments if they have historical employee or organizational relationships.

Before retiring a branch:

- Identify its departments.
- Identify employees assigned to it.
- Identify other dependent records.
- Prevent unsafe retirement where active relationships remain.
- Require authorized reassignment or another valid resolution.

Before retiring a department:

- Identify assigned employees.
- Check related records.
- Preserve historical department relationships.
- Apply appropriate reassignment requirements.

Use soft deletion or retirement when compatible with the existing architecture.

Historical employee, attendance, payroll, and audit records must remain intact.

---

# 6. REMOVE THE TEAM COMPONENT

## TASK 4 – REMOVE TEAM FROM ORGANIZATION STRUCTURE UI

Remove the Team component from the Organization Structure page.

This includes:

- Team section or tab.
- Team list component.
- Add Team button.
- Team creation form.
- Team-specific action buttons.
- Team-specific filters.
- Unnecessary Team-related navigation or UI elements within this page.

Do not leave empty panels, unused tabs, or broken layout elements.

### Dependency inspection

Before removing any Team-related implementation:

1. Search for Team model usage.
2. Inspect Team relationships with employees.
3. Inspect Team Leader relationships.
4. Inspect attendance and scheduling dependencies.
5. Inspect payroll or approval dependencies.
6. Inspect APIs and frontend references.
7. Identify whether Team remains necessary in other modules.

If Team records are still referenced by other application features:

- Preserve the relevant database records.
- Preserve necessary relationships.
- Remove only the obsolete Organization Structure interface and functionality.
- Maintain compatibility with dependent modules.

Do not automatically drop Team database tables or foreign keys.

If Team has no remaining valid purpose anywhere in the system, document the finding and perform any necessary cleanup through safe migrations.

The goal is to remove Team from the organization structure interface without introducing data loss or application regressions.

---

# 7. ROLE RESPONSIBILITIES AND ACCESS CONTROL

## TASK 5 – VERIFY ORGANIZATION SETTINGS PERMISSIONS

Review the existing roles and responsibilities before changing permissions.

Recommended baseline:

| Action | Admin | HR | TL | Employee |
|---|---|---|---|---|
| Edit organization name | Yes | No | No | No |
| Change company time zone | Yes | No | No | No |
| Manage employment status policies | Yes | View/use according to permission | No | No |
| Create branches | Yes | No, unless delegated | No | No |
| Edit branches | Yes | No, unless delegated | No | No |
| Create departments | Yes | No, unless delegated | No | No |
| Edit departments | Yes | No, unless delegated | No | No |
| Assign employees to branches/departments | Oversight | According to HR permissions | Restricted | No |
| View own department and employment status | Yes | Yes | Yes | Yes |

Adapt this matrix to the application's existing permission architecture.

Do not create conflicting or duplicated permission names.

Do not automatically grant HR organization configuration permissions just because HR uses the resulting branch, department, and employment status data.

The Admin controls organization-wide configuration.

HR should use the approved organization structure in employee management and assignment workflows according to its existing permissions.

All API authorization must be enforced server-side.

---

# 8. DATABASE, API, AND DATA INTEGRITY

## TASK 6 – IMPLEMENT AND VERIFY DATABASE STRUCTURES

Inspect the existing Prisma schema and database models before creating or modifying anything.

Reuse existing models where possible.

Verify that the system has appropriate structures for:

### Organization Profile

- Organization identity.
- Organization name.
- Company time zone.
- Updated by.
- Updated timestamp.
- Organization settings history, where supported.

### Employment Status Policy

- Stable status identifier.
- Status code.
- Display name.
- Headcount eligibility.
- Effective date.
- Policy version.
- Lifecycle status.
- Creation and modification information.

### Branches

- Branch ID.
- Branch name.
- Branch code, where supported.
- Location.
- Status.
- Creation and modification information.

### Departments

- Department ID.
- Department name.
- Department code, where supported.
- Branch relationship.
- Status.
- Creation and modification information.

### History and Audit

Maintain appropriate audit relationships for all relevant settings modifications.

Ensure:

- Valid foreign keys.
- Unique constraints.
- Proper indexes.
- Referential integrity.
- Appropriate field types.
- Consistent date handling.
- Proper soft deletion or archival.
- Historical version preservation.

Create migrations only when necessary.

Do not duplicate an existing setting or organizational record structure.

## TASK 7 – IMPLEMENT REQUIRED APIS

Organize APIs according to the existing application conventions.

At minimum, provide:

### Organization Profile

- Retrieve organization profile.
- Update organization name.
- Update company time zone.
- Retrieve profile change history.

### Employment Status Policy

- Retrieve employment status policies.
- Retrieve individual policy details.
- Create new policy versions.
- Retrieve policy history.
- Validate status code uniqueness.
- Resolve currently applicable policies.
- Retrieve headcount eligibility configuration.

### Organization Structure – Branches

- Retrieve branch list.
- Retrieve branch details.
- Create branch.
- Update branch.
- Retrieve branch departments.
- Retrieve branch history.
- Update branch lifecycle status where supported.

### Organization Structure – Departments

- Retrieve department list.
- Retrieve department details.
- Create department.
- Update department.
- Retrieve department employees.
- Retrieve department history.
- Update department lifecycle status where supported.

All APIs must:

- Validate authentication.
- Enforce authorization.
- Validate input fields.
- Validate relationships.
- Handle duplicates.
- Use appropriate database transactions.
- Return consistent response structures.
- Handle errors safely.
- Avoid exposing internal database details.
- Support efficient filtering and pagination where needed.

Do not create endpoints that only return mock data or simulate successful persistence.

---

# 9. UI/UX IMPLEMENTATION

## TASK 8 – COMPLETE FRONTEND INTEGRATION

Modify the existing Settings pages to accommodate the APIs and required fields.

Preserve the application's established visual design and component conventions.

### Organization Profile

- Display saved organization name.
- Display saved company time zone.
- Add appropriate editing controls.
- Provide a searchable timezone selector.
- Provide Save Changes.
- Show validation and success/error feedback.

### Employment Status Policy

- Display actual configured employment statuses.
- Include Status Code.
- Include Display Name.
- Include Headcount Eligible.
- Include Effective From.
- Include Version and Status where supported.
- Add New Status Policy.
- Add Save New Policy Version.
- Provide details and history views.
- Display clear explanations of headcount eligibility.

### Organization Structure

Provide a Branches/Sites section and Departments section.

**Branches/Sites**

- Branch list.
- Branch name.
- Location.
- Branch code where applicable.
- Department count.
- Add Branch button.
- View details.
- Edit.

**Departments**

- Department list.
- Department name.
- Associated branch.
- Employee count.
- Add Department button.
- View details.
- Edit.

Remove the Team component entirely from this page.

### UX requirements

- Make all forms intuitive and well organized.
- Use searchable dropdowns when records may be numerous.
- Use appropriate date pickers.
- Clearly distinguish required and optional fields.
- Provide clear field descriptions.
- Use proper formatting.
- Show loading indicators.
- Prevent duplicate submissions.
- Provide meaningful error messages.
- Show success notifications only after confirmed persistence.
- Refresh relevant data after successful operations.
- Maintain responsive layouts.
- Do not leave decorative or nonfunctional controls.

---

# 10. TESTING AND VERIFICATION

## TASK 9 – IMPLEMENT COMPREHENSIVE TESTS

### A. Organization Profile Tests

Verify:

- Organization name is retrieved correctly.
- Organization name can be updated.
- Empty and invalid names are rejected.
- Time zone is retrieved correctly.
- Valid IANA timezone values are accepted.
- Invalid timezone values are rejected.
- Saved values remain after refreshing the page.
- Timezone changes do not rewrite historical timestamps.
- Relevant system components use the configured time zone correctly.
- Unauthorized users cannot modify organization settings.

### B. Employment Status Policy Tests

Verify:

- All configured policies are retrieved.
- New policies can be created.
- Status codes must be unique.
- Required fields are validated.
- Headcount eligibility is saved accurately.
- Effective dates are respected.
- New policy versions preserve previous versions.
- Newly configured statuses appear in the correct employee management interfaces.
- Headcount calculations include or exclude employees correctly.
- Historical employment records remain intact.
- Employment status is not confused with system account activation.
- Payroll eligibility is not incorrectly changed by the headcount checkbox.

### C. Organization Structure Tests

Verify:

- Branch records are retrieved correctly.
- New branches can be created.
- Branch locations are saved correctly.
- Department records are retrieved correctly.
- Departments can be created.
- Each department is linked to the correct branch.
- Invalid branch relationships are rejected.
- Department records can be edited.
- Department changes are recorded in history.
- Existing employee assignments remain consistent.
- Retired organizational records preserve historical relationships.

### D. Team Removal Tests

Verify:

- Team component is removed from Organization Structure.
- No empty or broken UI components remain.
- Existing Team relationships used elsewhere continue functioning.
- No referenced database records are accidentally deleted.
- Dependent modules remain operational.

### E. Security Tests

Verify:

- Only authorized Admin accounts can modify protected settings.
- HR can use organization data according to existing permissions.
- Unauthorized direct API calls are rejected.
- Invalid identifiers cannot access unrelated records.
- Historical records cannot be manipulated through ordinary APIs.
- Account deactivation and authentication restrictions remain enforced.

### F. General Quality Checks

Run:

- TypeScript checks.
- Linting.
- Unit tests.
- Integration tests.
- API tests.
- Database tests.
- Relevant end-to-end tests.
- Security checks.
- Production build checks.

Resolve implementation-related errors before marking the tasks complete.

Do not suppress meaningful errors or weaken validation to make tests pass.

---

# 11. IMPLEMENTATION ORDER

Execute the work in the following sequence.

## PHASE 1 – CODEBASE INSPECTION

- Inspect Organization Profile.
- Inspect Employment Status Policy.
- Inspect Organization Structure.
- Trace existing database models and relationships.
- Inspect employment status usage.
- Inspect headcount calculations.
- Inspect branch and department relationships.
- Inspect Team dependencies.
- Review role permissions.
- Invoke Ponytail and security-audit.

**Deliverable:** Codebase findings and dependency report.

## PHASE 2 – ORGANIZATION PROFILE

- Implement retrieval API.
- Implement update API.
- Implement organization name validation.
- Implement timezone validation.
- Integrate frontend.
- Implement audit history.
- Verify timezone behavior.

**Deliverable:** Fully functional Organization Profile page.

## PHASE 3 – EMPLOYMENT STATUS POLICY

- Inspect existing employment status configuration.
- Implement policy retrieval APIs.
- Implement version creation.
- Implement headcount eligibility.
- Implement effective-date handling.
- Integrate employee management.
- Integrate headcount reports.
- Implement history and audit.
- Verify downstream relationships.

**Deliverable:** Fully functional Employment Status Policy page.

## PHASE 4 – BRANCH MANAGEMENT

- Implement branch models or extensions.
- Implement branch retrieval.
- Implement branch creation.
- Implement branch editing.
- Implement location validation.
- Implement history.
- Integrate frontend.

**Deliverable:** Fully functional Branches/Sites section.

## PHASE 5 – DEPARTMENT MANAGEMENT

- Implement department retrieval.
- Implement department creation.
- Implement branch selection.
- Implement department editing.
- Validate branch relationships.
- Preserve employee assignments.
- Implement history.
- Integrate frontend.

**Deliverable:** Fully functional Departments section.

## PHASE 6 – TEAM COMPONENT REMOVAL

- Inspect Team dependencies.
- Remove Team UI from Organization Structure.
- Remove obsolete page-level functionality.
- Preserve required relationships elsewhere.
- Verify dependent modules.

**Deliverable:** Updated Organization Structure without the Team component.

## PHASE 7 – FINAL INTEGRATION AND VERIFICATION

- Verify all APIs and database operations.
- Verify role permissions.
- Verify historical preservation.
- Verify downstream employment status behavior.
- Verify timezone consistency.
- Run security-audit.
- Run the complete test suite.
- Run the production build.
- Update implementation status.

**Deliverable:** Fully verified Organization Settings implementation.

---

# 12. IMPLEMENTATION STATUS TRACKING

Maintain the existing implementation status document rather than creating unnecessary duplicate tracking files.

Record for every task:

- Task ID.
- Task name.
- Status.
- Files modified.
- APIs created or modified.
- Database changes.
- Role permissions affected.
- Business rules implemented.
- Tests executed.
- Results.
- Outstanding issues.

Use the following statuses:

- Not Started.
- In Progress.
- Completed.
- Blocked.
- Needs Verification.

Update the implementation status after every task or coherent task group and before proceeding to dependent tasks.

A task must not be marked Completed merely because its UI has been implemented.

Verify frontend integration, API behavior, database persistence, authorization, and relevant downstream effects.

---

# 13. FINAL DEVELOPMENT REPORT

After implementation, provide a detailed report covering:

**A. Codebase Findings**

- Existing organization settings architecture.
- Employment status implementation.
- Organization structure implementation.
- Team dependencies.
- Existing role responsibilities.

**B. Organization Profile**

- APIs.
- Database changes.
- Validation.
- Timezone handling.
- Audit history.

**C. Employment Status Policy**

- APIs.
- Policy versioning.
- Headcount eligibility.
- Effective-date behavior.
- Affected system components.
- Historical preservation.

**D. Organization Structure**

- Branch APIs.
- Department APIs.
- Location fields.
- Branch-department relationships.
- Editing functionality.
- Team component removal.
- Dependency preservation.

**E. Security and Authorization**

- Permission changes.
- Protected operations.
- API authorization.
- Data integrity controls.
- Security-audit findings.

**F. Testing Results**

- Tests executed.
- Passed tests.
- Failed tests.
- Outstanding issues.
- Type-check results.
- Lint results.
- Build results.

**G. Remaining Work**

Clearly identify incomplete features, unresolved dependencies, and any issues requiring further decisions.

Do not claim that a feature is complete without actual verification.

---

# FINAL IMPLEMENTATION DIRECTIVE

Implement Organization Settings as a centralized foundation for the entire company system.

The Organization Profile must provide the authoritative organization name and company time zone.

Employment Status Policy must control the configured employment status definitions and their headcount eligibility behavior.

Organization Structure must provide a reliable relationship between company branches and departments.

The removal of the Team component must not break other application modules or erase existing historical relationships.

All organization data must be validated, properly formatted, stored consistently, and protected through server-side authorization.

Use Ponytail and security-audit throughout the implementation.

**Inspect first. Preserve existing relationships. Implement systematically. Verify all dependent modules. Prioritize security, usability, scalability, and data integrity over implementation speed.**