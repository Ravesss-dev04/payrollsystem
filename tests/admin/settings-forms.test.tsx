import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "bun:test";

describe("Admin settings forms", () => {
  it("accepts exactly one well-formed CSRF cookie", async () => {
    const { parseCsrfCookie } = await import(
      "../../app/admin/settings/settings-api"
    );
    const token = "A".repeat(43);

    expect(parseCsrfCookie(`payroll-csrf=${token}`)).toBe(token);
    expect(parseCsrfCookie(`__Host-payroll-csrf=${token}`)).toBe(token);
    expect(
      parseCsrfCookie(`payroll-csrf=${token}; __Host-payroll-csrf=${token}`),
    ).toBeNull();
    expect(parseCsrfCookie("payroll-csrf=malformed")).toBeNull();
  });

  it("renders organization settings with accessible, prefilled fields", async () => {
    const { OrganizationSettingsForm } = await import(
      "../../app/admin/settings/OrganizationSettingsForm"
    );
    const markup = renderToStaticMarkup(
      createElement(OrganizationSettingsForm, {
        initialSettings: {
          name: "Example Payroll",
          timeZone: "Asia/Manila",
        },
      }),
    );

    expect(markup).toContain('aria-label="Organization name"');
    expect(markup).toContain('value="Example Payroll"');
    expect(markup).toContain('aria-label="Company time zone"');
    expect(markup).toContain('value="Asia/Manila"');
    expect(markup).toContain("Save organization settings");
  });

  it("renders organization structure with parent context and reversible status controls", async () => {
    const { OrganizationStructureForm } = await import(
      "../../app/admin/settings/OrganizationStructureForm"
    );
    const markup = renderToStaticMarkup(
      createElement(OrganizationStructureForm, {
        initialBranches: [{ id: "branch-1", name: "North", active: true }],
        initialDepartments: [
          { id: "department-1", name: "People", active: true },
        ],
      }),
    );

    expect(markup).toContain("North");
    expect(markup).toContain("People");
    expect(markup).toContain('aria-label="Department branch"');
    expect(markup).not.toContain("Teams");
    expect(markup).toContain("Deactivate");
  });

  it("renders employment status as explicit policy, not account status", async () => {
    const { EmploymentStatusPolicyForm } = await import(
      "../../app/admin/settings/EmploymentStatusPolicyForm"
    );
    const markup = renderToStaticMarkup(
      createElement(EmploymentStatusPolicyForm, {
        initialDefinitions: [
          { code: "ACTIVE", label: "Active", headcountEligible: true },
        ],
      }),
    );

    expect(markup).toContain("Effective from");
    expect(markup).toContain("Headcount eligible");
    expect(markup).toContain("Add employment status");
    expect(markup).not.toContain("Account status");
  });
});
