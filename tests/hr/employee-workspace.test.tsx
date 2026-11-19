import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "bun:test";

describe("HR employee workspace", () => {
  it("renders the selected record and four detail tabs without sample metrics", async () => {
    const { EmployeeDetailsClient } = await import("../../app/hr/employees/[employeeId]/EmployeeDetailsClient");
    const markup = renderToStaticMarkup(createElement(EmployeeDetailsClient, {
      employee: { id: "employee-1", employeeNumber: "EMP-104", firstName: "Ada", lastName: "Lovelace", workEmail: "ada@example.test", employmentStatus: { code: "ACTIVE", label: "Active" }, department: { id: "department-1", name: "People" }, effectiveFrom: "2026-02-01" },
    }));
    for (const label of ["Profile", "Shift &amp; Schedule", "Assets &amp; Devices", "Attendance Summary", "Personal Information", "Employee Stats", "Quick Actions"]) expect(markup).toContain(label);
    expect(markup).toContain("Ada Lovelace");
    expect(markup).toContain("EMP-104");
    expect(markup).toContain("Unavailable");
    expect(markup).not.toContain("Sophia Reynolds");
    expect(markup).not.toContain("98.6%");
  });
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

    expect(markup).toContain("Add Employee");
    expect(markup).toContain("No employees found.");
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
