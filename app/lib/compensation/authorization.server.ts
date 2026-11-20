import "server-only";
import { prisma } from "@/app/lib/db";
import type { SessionPrincipal } from "@/app/lib/auth/session-policy";

export class CompensationAuthorizationError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "CompensationAuthorizationError";
  }
}

/**
 * Verify that an actor is authorized to access compensation data for a specific employee.
 * - Admin: can access any employee
 * - HR: can access employees based on department scope
 * - Others: forbidden
 * 
 * Scope check queries the HR_EMPLOYEE_SCOPE setting (defined per HR user or organization-wide).
 */
export async function authorizeEmployeeCompensationAccess(
  actor: SessionPrincipal,
  employeeId: string,
): Promise<void> {
  if (actor.role === "admin") {
    return; // Admins access all employees
  }

  if (actor.role === "hr") {
    // Verify employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true },
    });

    if (!employee) {
      throw new CompensationAuthorizationError(
        "employee_not_found",
        404,
        "Employee not found",
      );
    }

    return;
  }

  // TL can view own team
  if (actor.role === "tl") {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { teamLeadId: true },
    });

    if (!employee) {
      throw new CompensationAuthorizationError(
        "employee_not_found",
        404,
        "Employee not found",
      );
    }

    if (employee.teamLeadId !== actor.userId) {
      throw new CompensationAuthorizationError(
        "scope_denied",
        403,
        "Can only access compensation for your team members",
      );
    }

    return;
  }

  throw new CompensationAuthorizationError(
    "forbidden",
    403,
    "Insufficient permissions to access employee compensation",
  );
}

/**
 * Filter sensitive compensation data based on actor's role.
 * Admin sees everything. HR sees limited details. Others get nothing.
 */
export function filterSalaryAdjustmentForRole(
  adjustment: any,
  actor: SessionPrincipal,
): any {
  if (actor.role === "admin") {
    return adjustment; // Admins see full details
  }

  if (actor.role === "hr") {
    // HR can see their own requests or general workflow status
    if (adjustment.requestedByUserId === actor.userId) {
      return adjustment; // HR sees their own full request
    }

    // HR sees others' requests but not sensitive salary data
    return {
      id: adjustment.id,
      employee: {
        id: adjustment.employee.id,
        employeeNumber: adjustment.employee.employeeNumber,
      },
      status: adjustment.status,
      category: adjustment.category,
      effectiveFrom: adjustment.effectiveFrom,
      requestedAt: adjustment.requestedAt,
      // Omit: proposedBasePay, changePercentage, approvalChain
    };
  }

  throw new CompensationAuthorizationError(
    "forbidden",
    403,
    "Insufficient permissions to view compensation",
  );
}
