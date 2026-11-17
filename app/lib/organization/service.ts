import "server-only";
import { prisma } from "../db";
import { writeDomainAuditEvent } from "../audit/domain-audit";
import type { SessionPrincipal } from "../auth/session-policy";
import {
  branchInputSchema,
  departmentInputSchema,
  employmentStatusPolicyInputSchema,
  organizationSettingsInputSchema,
  organizationUnitUpdateSchema,
  teamInputSchema,
  teamUpdateSchema,
  type BranchInput,
  type DepartmentInput,
  type EmploymentStatusDefinition,
  type EmploymentStatusPolicyInput,
  type OrganizationSettingsInput,
  type OrganizationUnitUpdate,
  type TeamInput,
  type TeamUpdate,
} from "./policy";

export const ORGANIZATION_ID = "primary";

function getOrganizationDate(now: Date, timeZone: string): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  );
  return new Date(
    Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day),
    ),
  );
}

export class OrganizationServiceError extends Error {
  constructor(
    public readonly code:
      | "forbidden"
      | "organization_not_configured"
      | "policy_effective_date_must_increase"
      | "department_not_found"
      | "branch_not_found"
      | "team_not_found"
      | "department_has_active_teams",
    public readonly status: 403 | 404 | 409,
  ) {
    super(code);
  }
}

function requireAdmin(actor: SessionPrincipal): void {
  if (actor.role !== "admin") {
    throw new OrganizationServiceError("forbidden", 403);
  }
}

function requireOrganization(
  organization: { id: string } | null,
): asserts organization is { id: string } {
  if (!organization) {
    throw new OrganizationServiceError("organization_not_configured", 409);
  }
}

export async function getBranches() {
  return prisma.branch.findMany({
    where: { organizationId: ORGANIZATION_ID },
    orderBy: { name: "asc" },
    select: { id: true, name: true, active: true },
  });
}

export async function createBranch(actor: SessionPrincipal, input: BranchInput) {
  requireAdmin(actor);
  const branchInput = branchInputSchema.parse(input);
  return prisma.$transaction(async (transaction) => {
    const organization = await transaction.organizationSettings.findUnique({
      where: { id: ORGANIZATION_ID },
      select: { id: true },
    });
    requireOrganization(organization);
    const branch = await transaction.branch.create({
      data: {
        organizationId: ORGANIZATION_ID,
        name: branchInput.name,
      },
      select: { id: true, name: true, active: true },
    });
    await writeDomainAuditEvent(transaction, {
      actor,
      action: "organization.branch.created",
      entityType: "branch",
      entityId: branch.id,
      summary: "Branch created",
    });
    return branch;
  });
}

export async function updateBranch(
  actor: SessionPrincipal,
  branchId: string,
  input: OrganizationUnitUpdate,
) {
  requireAdmin(actor);
  const update = organizationUnitUpdateSchema.parse(input);
  return prisma.$transaction(async (transaction) => {
    const current = await transaction.branch.findFirst({
      where: { id: branchId, organizationId: ORGANIZATION_ID },
      select: { id: true },
    });
    if (!current) throw new OrganizationServiceError("branch_not_found", 404);
    const branch = await transaction.branch.update({
      where: { id: branchId },
      data: update,
      select: { id: true, name: true, active: true },
    });
    await writeDomainAuditEvent(transaction, {
      actor,
      action: "organization.branch.updated",
      entityType: "branch",
      entityId: branch.id,
      summary: "Branch updated",
    });
    return branch;
  });
}

export async function getDepartments() {
  return prisma.department.findMany({
    where: { organizationId: ORGANIZATION_ID },
    orderBy: { name: "asc" },
    select: { id: true, name: true, active: true },
  });
}

export async function createDepartment(
  actor: SessionPrincipal,
  input: DepartmentInput,
) {
  requireAdmin(actor);
  const departmentInput = departmentInputSchema.parse(input);
  return prisma.$transaction(async (transaction) => {
    const organization = await transaction.organizationSettings.findUnique({
      where: { id: ORGANIZATION_ID },
      select: { id: true },
    });
    requireOrganization(organization);
    const department = await transaction.department.create({
      data: {
        organizationId: ORGANIZATION_ID,
        name: departmentInput.name,
      },
      select: { id: true, name: true, active: true },
    });
    await writeDomainAuditEvent(transaction, {
      actor,
      action: "organization.department.created",
      entityType: "department",
      entityId: department.id,
      summary: "Department created",
    });
    return department;
  });
}

export async function updateDepartment(
  actor: SessionPrincipal,
  departmentId: string,
  input: OrganizationUnitUpdate,
) {
  requireAdmin(actor);
  const update = organizationUnitUpdateSchema.parse(input);
  return prisma.$transaction(async (transaction) => {
    const current = await transaction.department.findFirst({
      where: { id: departmentId, organizationId: ORGANIZATION_ID },
      select: { id: true },
    });
    if (!current) {
      throw new OrganizationServiceError("department_not_found", 404);
    }
    if (update.active === false) {
      const activeTeams = await transaction.team.count({
        where: { departmentId, active: true },
      });
      if (activeTeams > 0) {
        throw new OrganizationServiceError(
          "department_has_active_teams",
          409,
        );
      }
    }
    const department = await transaction.department.update({
      where: { id: departmentId },
      data: update,
      select: { id: true, name: true, active: true },
    });
    await writeDomainAuditEvent(transaction, {
      actor,
      action: "organization.department.updated",
      entityType: "department",
      entityId: department.id,
      summary: "Department updated",
    });
    return department;
  });
}

export async function getTeams() {
  return prisma.team.findMany({
    where: { department: { organizationId: ORGANIZATION_ID } },
    orderBy: [{ department: { name: "asc" } }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      active: true,
      department: { select: { id: true, name: true } },
    },
  });
}

export async function createTeam(actor: SessionPrincipal, input: TeamInput) {
  requireAdmin(actor);
  const teamInput = teamInputSchema.parse(input);
  return prisma.$transaction(async (transaction) => {
    const department = await transaction.department.findFirst({
      where: {
        id: teamInput.departmentId,
        organizationId: ORGANIZATION_ID,
        active: true,
      },
      select: { id: true },
    });
    if (!department) {
      throw new OrganizationServiceError("department_not_found", 404);
    }
    const team = await transaction.team.create({
      data: {
        departmentId: department.id,
        name: teamInput.name,
      },
      select: {
        id: true,
        name: true,
        active: true,
        department: { select: { id: true, name: true } },
      },
    });
    await writeDomainAuditEvent(transaction, {
      actor,
      action: "organization.team.created",
      entityType: "team",
      entityId: team.id,
      summary: "Team created",
    });
    return team;
  });
}

export async function updateTeam(
  actor: SessionPrincipal,
  teamId: string,
  input: TeamUpdate,
) {
  requireAdmin(actor);
  const update = teamUpdateSchema.parse(input);
  return prisma.$transaction(async (transaction) => {
    const current = await transaction.team.findFirst({
      where: {
        id: teamId,
        department: { organizationId: ORGANIZATION_ID, active: true },
      },
      select: { id: true },
    });
    if (!current) throw new OrganizationServiceError("team_not_found", 404);
    const team = await transaction.team.update({
      where: { id: teamId },
      data: update,
      select: {
        id: true,
        name: true,
        active: true,
        department: { select: { id: true, name: true } },
      },
    });
    await writeDomainAuditEvent(transaction, {
      actor,
      action: "organization.team.updated",
      entityType: "team",
      entityId: team.id,
      summary: "Team updated",
    });
    return team;
  });
}

export async function getOrganizationSettings() {
  return prisma.organizationSettings.findUnique({
    where: { id: ORGANIZATION_ID },
    select: {
      id: true,
      name: true,
      timeZone: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function saveOrganizationSettings(
  actor: SessionPrincipal,
  input: OrganizationSettingsInput,
) {
  requireAdmin(actor);
  const settings = organizationSettingsInputSchema.parse(input);

  return prisma.$transaction(async (transaction) => {
    const organization = await transaction.organizationSettings.upsert({
      where: { id: ORGANIZATION_ID },
      create: {
        id: ORGANIZATION_ID,
        name: settings.name,
        timeZone: settings.timeZone,
      },
      update: {
        name: settings.name,
        timeZone: settings.timeZone,
      },
      select: {
        id: true,
        name: true,
        timeZone: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await writeDomainAuditEvent(transaction, {
      actor,
      action: "organization.settings.updated",
      entityType: "organization",
      entityId: ORGANIZATION_ID,
      summary: "Organization settings updated",
    });
    return organization;
  });
}

export async function getEmploymentStatusPolicy(): Promise<
  EmploymentStatusDefinition[]
> {
  const organization = await prisma.organizationSettings.findUnique({
    where: { id: ORGANIZATION_ID },
    select: { timeZone: true },
  });
  if (!organization) return [];

  const policy = await prisma.employmentStatusPolicy.findFirst({
    where: {
      organizationId: ORGANIZATION_ID,
      effectiveFrom: {
        lte: getOrganizationDate(new Date(), organization.timeZone),
      },
    },
    orderBy: [{ effectiveFrom: "desc" }, { version: "desc" }],
    select: { id: true },
  });
  if (!policy) return [];

  return prisma.employmentStatusDefinition.findMany({
    where: { policyId: policy.id, active: true },
    orderBy: { code: "asc" },
    select: {
      code: true,
      label: true,
      headcountEligible: true,
    },
  });
}

export async function saveEmploymentStatusPolicy(
  actor: SessionPrincipal,
  input: EmploymentStatusPolicyInput,
): Promise<EmploymentStatusDefinition[]> {
  requireAdmin(actor);
  const policyInput = employmentStatusPolicyInputSchema.parse(input);
  const effectiveFrom = new Date(`${policyInput.effectiveFrom}T00:00:00.000Z`);

  return prisma.$transaction(async (transaction) => {
    const organization = await transaction.organizationSettings.findUnique({
      where: { id: ORGANIZATION_ID },
      select: { id: true },
    });
    if (!organization) {
      throw new OrganizationServiceError("organization_not_configured", 409);
    }

    const latestPolicy = await transaction.employmentStatusPolicy.findFirst({
      where: { organizationId: ORGANIZATION_ID },
      orderBy: { version: "desc" },
      select: { version: true, effectiveFrom: true },
    });
    if (latestPolicy && effectiveFrom <= latestPolicy.effectiveFrom) {
      throw new OrganizationServiceError(
        "policy_effective_date_must_increase",
        409,
      );
    }

    const policy = await transaction.employmentStatusPolicy.create({
      data: {
        organizationId: ORGANIZATION_ID,
        version: (latestPolicy?.version ?? 0) + 1,
        effectiveFrom,
        createdByUserId: actor.userId,
      },
      select: { id: true, version: true, effectiveFrom: true },
    });
    await transaction.employmentStatusDefinition.createMany({
      data: policyInput.definitions.map((definition) => ({
        policyId: policy.id,
        code: definition.code,
        label: definition.label,
        active: definition.active,
        headcountEligible: definition.headcountEligible,
      })),
    });

    await writeDomainAuditEvent(transaction, {
      actor,
      action: "employment_status_policy.versioned",
      entityType: "employment_status_policy",
      entityId: policy.id,
      summary: `Employment status policy version ${policy.version} created`,
    });

    return policyInput.definitions
      .filter((definition) => definition.active)
      .map(({ code, label, headcountEligible }) => ({
        code,
        label,
        headcountEligible,
      }));
  });
}
