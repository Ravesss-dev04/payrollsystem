import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "bun:test";

describe("HR employee workspace", () => {
  it("renders accessible employee fields, configured options, and an honest empty state", async () => {
    const clientModule = await import(
      "../../app/hr/employees/EmployeesClient"
    ).catch(() => null);
    expect(clientModule).not.toBeNull();

    const markup = renderToStaticMarkup(
      createElement(clientModule!.EmployeesClient, {
        employees: [],
        departments: [{ id: "department-1", name: "People" }],
        employmentStatuses: [{ code: "ACTIVE", label: "Active" }],
      }),
    );

    for (const label of [
      "Employee number",
      "First name",
      "Last name",
      "Work email",
      "Employment status",
      "Department",
      "Effective from",
    ]) {
      expect(markup).toContain(label);
    }
    expect(markup).toContain("No employee records have been added.");
    expect(markup).toContain("People");
    expect(markup).not.toContain("Password");
    expect(markup).not.toContain("MFA");
    expect(markup).not.toContain("Salary");
  });

  it("renders persisted employee status and department without exposing account identity", async () => {
    const clientModule = await import(
      "../../app/hr/employees/EmployeesClient"
    ).catch(() => null);
    expect(clientModule).not.toBeNull();
    const markup = renderToStaticMarkup(
      createElement(clientModule!.EmployeesClient, {
        employees: [
          {
            id: "employee-1",
            employeeNumber: "EMP-104",
            firstName: "Ada",
            lastName: "Lovelace",
            workEmail: "ada@example.test",
            employmentStatus: { code: "ACTIVE", label: "Active" },
            department: { id: "department-1", name: "People" },
            effectiveFrom: "2026-02-01",
          },
        ],
        departments: [{ id: "department-1", name: "People" }],
        employmentStatuses: [{ code: "ACTIVE", label: "Active" }],
      }),
    );

    expect(markup).toContain("EMP-104");
    expect(markup).toContain("Ada");
    expect(markup).toContain("Active");
    expect(markup).toContain("People");
    expect(markup).not.toContain("userId");
    expect(markup).not.toContain("passwordHash");
  });
});
