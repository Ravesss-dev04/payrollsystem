import { mock } from "bun:test";

export let organizationUpsertResult = {
  id: "primary",
  name: "Example Payroll",
  timeZone: "Asia/Manila",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};
export let latestPolicy: { version: number; effectiveFrom: Date } | null = null;
export let createdPolicy: unknown;
export let createdDefinitions: unknown;
export let latestDefinitions: Array<{
  code: string;
  label: string;
  active: boolean;
  headcountEligible: boolean;
}> = [];
export let branches: Array<{ id: string; organizationId: string; name: string; active: boolean }> = [];
export let departments: Array<{ id: string; organizationId: string; name: string; active: boolean }> = [];
export let teams: Array<{ id: string; departmentId: string; name: string; active: boolean }> = [];
export type TestEmployee = {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  workEmail: string;
  userId: string | null;
  createdAt: Date;
  updatedAt: Date;
};
export type TestEmployeeAssignment = {
  id: string;
  employeeId: string;
  statusDefinitionId: string;
  departmentId: string;
  effectiveFrom: Date;
  effectiveTo: Date | null;
};
export let employees: TestEmployee[] = [];
export let employeeAssignments: TestEmployeeAssignment[] = [];
export let employeeAssignmentResults: unknown[] = [];
export let employeeAccount: {
  id: string;
  email: string;
  isTestAccount: boolean;
  role: "admin" | "hr" | "employee";
  status: "Active" | "Invited" | "Suspended" | "Inactive";
} | null = null;
export let employeeUpdateCount = 1;
export let assignmentUpdateCount = 1;

export const organizationFindUnique = mock(async () => organizationUpsertResult);
export const organizationUpsert = mock(async (query: unknown) => {
  const data = query as {
    create: typeof organizationUpsertResult;
    update: Partial<typeof organizationUpsertResult>;
  };
  organizationUpsertResult = {
    ...organizationUpsertResult,
    ...data.create,
    ...data.update,
  };
  return organizationUpsertResult;
});
export const policyFindFirst = mock(async (query: unknown) => {
  const select = (query as { select?: { id?: boolean; definitions?: unknown } }).select;
  if (select?.definitions) {
    return {
      id: "policy-current",
      definitions: latestDefinitions
        .filter((definition) => definition.active)
        .map((definition) => ({
          id: `status-${definition.code.toLowerCase()}`,
          code: definition.code,
          label: definition.label,
          active: definition.active,
        })),
    };
  }
  if (select?.id) {
    return { id: "policy-current" };
  }
  return latestPolicy;
});
export const policyCreate = mock(async (query: unknown) => {
  const data = (query as {
    data: { version: number; effectiveFrom: Date };
  }).data;
  createdPolicy = query;
  return { id: "policy-2", ...data };
});
export const definitionCreateMany = mock(async (query: unknown) => {
  createdDefinitions = query;
  return { count: 2 };
});
export const definitionFindMany = mock(
  async (query: { where?: { active?: boolean } }) =>
    latestDefinitions.filter(
      (definition) =>
        query.where?.active === undefined ||
        definition.active === query.where.active,
    ).map(({ code, label, headcountEligible }) => ({
      code,
      label,
      headcountEligible,
    })),
);
export const domainAuditCreate = mock(async (query: unknown) => query);

export const employeeFindMany = mock(async (query: unknown) => {
  const where = (
    query as {
      select?: {
        assignments?: {
          where?: { effectiveFrom?: { lte?: Date } };
        };
      };
    }
  ).select?.assignments?.where;
  const latestEffectiveDate = where?.effectiveFrom?.lte;
  if (!latestEffectiveDate) return employeeAssignmentResults;

  return (
    employeeAssignmentResults as Array<{
      assignments?: Array<{ effectiveFrom: Date }>;
    }>
  ).map((employee) => ({
    ...employee,
    assignments:
      employee.assignments?.filter(
        (assignment) => assignment.effectiveFrom <= latestEffectiveDate,
      ) ?? [],
  }));
});
export const employeeFindUnique = mock(async (query: unknown) => {
  const where = (query as { where: { id?: string; workEmail?: string; userId?: string } }).where;
  return employees.find(
    (employee) =>
      (where.id === undefined || employee.id === where.id) &&
      (where.workEmail === undefined || employee.workEmail === where.workEmail) &&
      (where.userId === undefined || employee.userId === where.userId),
  ) ?? null;
});
export const employeeFindFirst = mock(async (query: unknown) => {
  const where = (query as { where?: { userId?: string; id?: string } }).where;
  return employees.find(
    (employee) =>
      (where?.userId === undefined || employee.userId === where.userId) &&
      (where?.id === undefined || employee.id === where.id),
  ) ?? null;
});
export const employeeCreate = mock(async (query: unknown) => {
  const data = (query as { data: Omit<TestEmployee, "id" | "createdAt" | "updatedAt" | "userId"> & { userId?: string | null } }).data;
  const employee: TestEmployee = {
    id: "employee-1",
    ...data,
    userId: data.userId ?? null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
  employees.push(employee);
  return employee;
});
export const employeeUpdate = mock(async (query: unknown) => {
  const input = query as { where: { id: string }; data: Partial<TestEmployee> };
  const current = employees.find((employee) => employee.id === input.where.id);
  if (!current) return null;
  Object.assign(current, input.data);
  return current;
});
export const employeeUpdateMany = mock(async (query: unknown) => {
  const input = query as { where: { id: string; userId?: null }; data: { userId?: string | null } };
  const current = employees.find((employee) => employee.id === input.where.id);
  if (!current || (input.where.userId === null && current.userId !== null)) {
    return { count: 0 };
  }
  Object.assign(current, input.data);
  return { count: employeeUpdateCount };
});
function findEmployeeAssignments(query: unknown) {
  const where = (query as {
    where?: { employeeId?: string; effectiveTo?: null; id?: string };
  }).where;
  return employeeAssignments
    .filter(
      (item) =>
        (where?.employeeId === undefined ||
          item.employeeId === where.employeeId) &&
        (where?.id === undefined || item.id === where.id) &&
        (where?.effectiveTo !== null || item.effectiveTo === null),
    )
    .sort(
      (left, right) =>
        right.effectiveFrom.getTime() - left.effectiveFrom.getTime(),
    )
    .map((assignment) => {
      const statusDefinition = latestDefinitions.find(
        (definition) =>
          assignment.statusDefinitionId ===
          `status-${definition.code.toLowerCase()}`,
      );
      const department = departments.find(
        (item) => item.id === assignment.departmentId,
      );
      return statusDefinition && department
        ? {
            ...assignment,
            statusDefinition: {
              id: assignment.statusDefinitionId,
              code: statusDefinition.code,
              label: statusDefinition.label,
            },
            department: { id: department.id, name: department.name },
          }
        : null;
    })
    .filter((assignment) => assignment !== null);
}
export const employeeAssignmentFindFirst = mock(
  async (query: unknown) => findEmployeeAssignments(query)[0] ?? null,
);
export const employeeAssignmentFindMany = mock(
  async (query: unknown) => findEmployeeAssignments(query),
);
export const employeeAssignmentCreate = mock(async (query: unknown) => {
  const data = (query as { data: Omit<TestEmployeeAssignment, "id"> }).data;
  const assignment = { id: `assignment-${employeeAssignments.length + 1}`, ...data };
  employeeAssignments.push(assignment);
  return assignment;
});
export const employeeAssignmentUpdateMany = mock(async (query: unknown) => {
  const input = query as { where: { id?: string; employeeId?: string }; data: { effectiveTo: Date } };
  const current = employeeAssignments.find(
    (assignment) =>
      (input.where.id === undefined || assignment.id === input.where.id) &&
      (input.where.employeeId === undefined || assignment.employeeId === input.where.employeeId) &&
      assignment.effectiveTo === null,
  );
  if (current) current.effectiveTo = input.data.effectiveTo;
  return { count: current ? assignmentUpdateCount : 0 };
});
export const employeeUserFindUnique = mock(async () => employeeAccount);

const branchFindMany = mock(async () => branches);
const branchCreate = mock(async (query: unknown) => {
  const data = (query as { data: { organizationId: string; name: string } }).data;
  const branch = { id: "branch-1", ...data, active: true };
  branches.push(branch);
  return branch;
});
const branchFindFirst = mock(async () => null);
const branchUpdate = mock(async (query: unknown) => query);
const departmentFindMany = mock(async (query: unknown) => {
  const where = (query as { where?: { organizationId?: string; active?: boolean } }).where;
  return departments.filter(
    (department) =>
      (where?.organizationId === undefined ||
        department.organizationId === where.organizationId) &&
      (where?.active === undefined || department.active === where.active),
  );
});
const departmentFindFirst = mock(async (query: unknown) => {
  const where = (query as {
    where?: { id?: string; organizationId?: string; active?: boolean };
  }).where;
  const department = departments.find(
    (item) =>
      (where?.id === undefined || item.id === where.id) &&
      (where?.organizationId === undefined ||
        item.organizationId === where.organizationId) &&
      (where?.active === undefined || item.active === where.active),
  );
  return department ? { id: department.id, name: department.name, active: department.active } : null;
});
const departmentCreate = mock(async (query: unknown) => query);
const departmentUpdate = mock(async (query: unknown) => query);
const teamFindMany = mock(async () => teams);
const teamFindFirst = mock(async () => null);
const teamCreate = mock(async (query: unknown) => query);
const teamUpdate = mock(async (query: unknown) => query);
const teamCount = mock(async () => 0);

const transaction = {
  organizationSettings: {
    findUnique: organizationFindUnique,
    upsert: organizationUpsert,
  },
  employmentStatusPolicy: {
    findFirst: policyFindFirst,
    create: policyCreate,
  },
  employmentStatusDefinition: {
    createMany: definitionCreateMany,
    findMany: definitionFindMany,
  },
  branch: {
    findMany: branchFindMany,
    create: branchCreate,
    findFirst: branchFindFirst,
    update: branchUpdate,
  },
  department: {
    findMany: departmentFindMany,
    findFirst: departmentFindFirst,
    create: departmentCreate,
    update: departmentUpdate,
  },
  team: {
    findMany: teamFindMany,
    findFirst: teamFindFirst,
    create: teamCreate,
    update: teamUpdate,
    count: teamCount,
  },
  employee: {
    findMany: employeeFindMany,
    findUnique: employeeFindUnique,
    findFirst: employeeFindFirst,
    create: employeeCreate,
    update: employeeUpdate,
    updateMany: employeeUpdateMany,
  },
  employeeAssignment: {
    findFirst: employeeAssignmentFindFirst,
    findMany: employeeAssignmentFindMany,
    create: employeeAssignmentCreate,
    updateMany: employeeAssignmentUpdateMany,
  },
  user: { findUnique: employeeUserFindUnique },
  domainAuditEvent: { create: domainAuditCreate },
};

export const transactionRunner = mock(
  async (callback: (tx: typeof transaction) => unknown) => callback(transaction),
);
export const prisma = {
  ...transaction,
  $transaction: transactionRunner,
};

export function setLatestPolicy(value: typeof latestPolicy) {
  latestPolicy = value;
}

export function setLatestDefinitions(
  value: typeof latestDefinitions,
) {
  latestDefinitions = value;
}

export function setEmployeeAccount(
  value: typeof employeeAccount,
) {
  employeeAccount = value;
}

export function setEmployeeUpdateCounts(input: {
  employee?: number;
  assignment?: number;
}) {
  employeeUpdateCount = input.employee ?? 1;
  assignmentUpdateCount = input.assignment ?? 1;
}

export function organizationUnitMocks() {
  return {
    branchFindMany,
    branchCreate,
    branchFindFirst,
    branchUpdate,
    departmentFindMany,
    departmentFindFirst,
    departmentCreate,
    departmentUpdate,
    teamFindMany,
    teamFindFirst,
    teamCreate,
    teamUpdate,
    teamCount,
  };
}

export function resetOrganizationDatabase() {
  organizationUpsertResult = {
    id: "primary",
    name: "Example Payroll",
    timeZone: "Asia/Manila",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
  latestPolicy = {
    version: 1,
    effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
  };
  createdPolicy = undefined;
  createdDefinitions = undefined;
  latestDefinitions = [
    { code: "ACTIVE", label: "Active", active: true, headcountEligible: true },
    { code: "INACTIVE", label: "Inactive", active: true, headcountEligible: false },
  ];
  branches = [];
  departments = [];
  teams = [];
  employees = [];
  employeeAssignments = [];
  employeeAssignmentResults = [];
  employeeAccount = null;
  employeeUpdateCount = 1;
  assignmentUpdateCount = 1;
  organizationFindUnique.mockClear();
  organizationUpsert.mockClear();
  policyFindFirst.mockClear();
  policyCreate.mockClear();
  definitionCreateMany.mockClear();
  definitionFindMany.mockClear();
  domainAuditCreate.mockClear();
  for (const mockFunction of Object.values(organizationUnitMocks())) {
    mockFunction.mockClear();
  }
  for (const mockFunction of [
    employeeFindMany,
    employeeFindUnique,
    employeeFindFirst,
    employeeCreate,
    employeeUpdate,
    employeeUpdateMany,
    employeeAssignmentFindFirst,
    employeeAssignmentFindMany,
    employeeAssignmentCreate,
    employeeAssignmentUpdateMany,
    employeeUserFindUnique,
  ]) {
    mockFunction.mockClear();
  }
  transactionRunner.mockClear();
}

mock.module("server-only", () => ({}));
mock.module("../../app/lib/db", () => ({ prisma }));
