import { describe, expect, it } from "bun:test";
import type { SessionPrincipal } from "../../app/lib/auth/session-policy";
import {
  createdDefinitions,
  createdPolicy,
  definitionFindMany,
  domainAuditCreate,
  organizationUnitMocks,
  organizationUpsert,
  policyFindFirst,
  resetOrganizationDatabase,
  setLatestDefinitions,
  setLatestPolicy,
} from "../support/organization-test-database";

const admin = {
  userId: "admin-1",
  role: "admin",
} as SessionPrincipal;

function reset() {
  resetOrganizationDatabase();
}

async function loadPolicy() {
  return import("../../app/lib/organization/policy");
}

async function loadService() {
  return import("../../app/lib/organization/service");
}

describe("organization policy validation", () => {
  it("rejects unknown organization fields and invalid time zones", async () => {
    const { organizationSettingsInputSchema } = await loadPolicy();

    expect(
      organizationSettingsInputSchema.safeParse({
        name: "Example Payroll",
        timeZone: "Asia/Manila",
      }).success,
    ).toBe(true);
    expect(
      organizationSettingsInputSchema.safeParse({
        name: "Example Payroll",
        timeZone: "Asia/Manila",
        organizationId: "another-organization",
      }).success,
    ).toBe(false);
    expect(
      organizationSettingsInputSchema.safeParse({
        name: "Example Payroll",
        timeZone: "Mars/Olympus",
      }).success,
    ).toBe(false);
  });

  it("requires unique status codes and an explicit headcount eligibility flag", async () => {
    const { employmentStatusPolicyInputSchema } = await loadPolicy();
    const definitions = [
      { code: "ACTIVE", label: "Active", active: true, headcountEligible: true },
      { code: "INACTIVE", label: "Inactive", active: true, headcountEligible: false },
    ];

    expect(
      employmentStatusPolicyInputSchema.safeParse({
        effectiveFrom: "2026-02-01",
        definitions,
      }).success,
    ).toBe(true);
    expect(
      employmentStatusPolicyInputSchema.safeParse({
        effectiveFrom: "2026-02-01",
        definitions: [definitions[0], { ...definitions[1], code: "ACTIVE" }],
      }).success,
    ).toBe(false);
    expect(
      employmentStatusPolicyInputSchema.safeParse({
        effectiveFrom: "2026-02-01",
        definitions: [{ code: "ACTIVE", label: "Active", active: true }],
      }).success,
    ).toBe(false);
  });

  it("rejects organization IDs in branch and team inputs", async () => {
    const {
      branchInputSchema,
      teamInputSchema,
    } = await loadPolicy();

    expect(branchInputSchema.safeParse({ name: "North" }).success).toBe(true);
    expect(
      branchInputSchema.safeParse({
        name: "North",
        organizationId: "attacker-controlled",
      }).success,
    ).toBe(false);
    expect(
      teamInputSchema.safeParse({
        name: "Payroll",
        departmentId: "department-1",
      }).success,
    ).toBe(true);
    expect(
      teamInputSchema.safeParse({
        name: "Payroll",
        departmentId: "department-1",
        organizationId: "attacker-controlled",
      }).success,
    ).toBe(false);
  });
});

describe("organization policy services", () => {
  it("denies non-admin organization changes before persistence", async () => {
    reset();
    const { saveOrganizationSettings } = await loadService();

    await expect(
      saveOrganizationSettings(
        { ...admin, role: "hr" } as SessionPrincipal,
        { name: "Example Payroll", timeZone: "Asia/Manila" },
      ),
    ).rejects.toThrow("forbidden");

    expect(organizationUpsert).not.toHaveBeenCalled();
    expect(domainAuditCreate).not.toHaveBeenCalled();
  });

  it("writes only organization settings and an attributable audit event", async () => {
    reset();
    const { saveOrganizationSettings } = await loadService();

    await saveOrganizationSettings(admin, {
      name: "Example Payroll",
      timeZone: "Asia/Manila",
    });

    expect(organizationUpsert).toHaveBeenCalledWith({
      where: { id: "primary" },
      create: {
        id: "primary",
        name: "Example Payroll",
        timeZone: "Asia/Manila",
      },
      update: {
        name: "Example Payroll",
        timeZone: "Asia/Manila",
      },
      select: {
        id: true,
        name: true,
        timeZone: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    expect(domainAuditCreate.mock.calls[0]?.[0]).toMatchObject({
      data: {
        actorUserId: "admin-1",
        actorRole: "admin",
        action: "organization.settings.updated",
        entityType: "organization",
        entityId: "primary",
      },
    });
  });

  it("creates an immutable next policy version and records the explicit eligibility flags", async () => {
    reset();
    setLatestPolicy({
      version: 4,
      effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
    });
    const { saveEmploymentStatusPolicy } = await loadService();

    await saveEmploymentStatusPolicy(admin, {
      effectiveFrom: "2026-02-01",
      definitions: [
        { code: "ACTIVE", label: "Active", active: true, headcountEligible: true },
        { code: "LEAVE", label: "On leave", active: true, headcountEligible: false },
      ],
    });

    expect(createdPolicy).toEqual({
      data: {
        organizationId: "primary",
        version: 5,
        effectiveFrom: new Date("2026-02-01T00:00:00.000Z"),
        createdByUserId: "admin-1",
      },
      select: { id: true, version: true, effectiveFrom: true },
    });
    expect(createdDefinitions).toEqual({
      data: [
        {
          policyId: "policy-2",
          code: "ACTIVE",
          label: "Active",
          active: true,
          headcountEligible: true,
        },
        {
          policyId: "policy-2",
          code: "LEAVE",
          label: "On leave",
          active: true,
          headcountEligible: false,
        },
      ],
    });
    expect(domainAuditCreate.mock.calls[0]?.[0]).toMatchObject({
      data: {
        actorUserId: "admin-1",
        action: "employment_status_policy.versioned",
        entityType: "employment_status_policy",
      },
    });
  });

  it("reads only active definitions from the effective current policy", async () => {
    reset();
    setLatestDefinitions([
      { code: "ACTIVE", label: "Active", active: true, headcountEligible: true },
      { code: "RETIRED", label: "Retired", active: false, headcountEligible: false },
    ]);
    const { getEmploymentStatusPolicy } = await loadService();

    await expect(getEmploymentStatusPolicy()).resolves.toEqual([
      { code: "ACTIVE", label: "Active", headcountEligible: true },
    ]);
    expect(policyFindFirst).toHaveBeenCalledWith({
      where: {
        organizationId: "primary",
        effectiveFrom: { lte: expect.any(Date) },
      },
      orderBy: [{ effectiveFrom: "desc" }, { version: "desc" }],
      select: { id: true },
    });
    expect(definitionFindMany).toHaveBeenCalledWith({
      where: { policyId: expect.any(String), active: true },
      orderBy: { code: "asc" },
      select: {
        code: true,
        label: true,
        headcountEligible: true,
      },
    });
  });

  it("creates a branch only in the configured organization and audits the write", async () => {
    reset();
    const { branchCreate } = organizationUnitMocks();
    const { createBranch } = await loadService();

    await createBranch(admin, { name: "North" });

    expect(branchCreate).toHaveBeenCalledWith({
      data: { organizationId: "primary", name: "North" },
      select: { id: true, name: true, active: true },
    });
    expect(domainAuditCreate.mock.calls.at(-1)?.[0]).toMatchObject({
      data: {
        actorUserId: "admin-1",
        action: "organization.branch.created",
        entityType: "branch",
      },
    });
  });

  it("rejects a team whose department is not in the configured organization", async () => {
    reset();
    const { departmentFindFirst, teamCreate } = organizationUnitMocks();
    const { createTeam } = await loadService();

    await expect(
      createTeam(admin, { name: "Payroll", departmentId: "foreign-department" }),
    ).rejects.toThrow("department_not_found");

    expect(departmentFindFirst).toHaveBeenCalledWith({
      where: {
        id: "foreign-department",
        organizationId: "primary",
        active: true,
      },
      select: { id: true },
    });
    expect(teamCreate).not.toHaveBeenCalled();
  });

  it("does not reactivate or update a team under an inactive department", async () => {
    reset();
    const { teamFindFirst, teamUpdate } = organizationUnitMocks();
    const { updateTeam } = await loadService();

    await expect(
      updateTeam(admin, "team-1", { active: true }),
    ).rejects.toThrow("team_not_found");

    expect(teamFindFirst).toHaveBeenCalledWith({
      where: {
        id: "team-1",
        department: { organizationId: "primary", active: true },
      },
      select: { id: true },
    });
    expect(teamUpdate).not.toHaveBeenCalled();
  });
});
