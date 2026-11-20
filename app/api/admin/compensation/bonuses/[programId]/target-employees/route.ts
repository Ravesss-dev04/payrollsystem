import { requireApiPermission } from "@/app/lib/auth/api-guard.server";
import { prisma } from "@/app/lib/db";

export async function GET(request: Request, { params }: { params: Promise<{ programId: string }> }) {
  try {
    await requireApiPermission(request, "compensation:read");
    const { programId } = await params;
    const program = await prisma.bonusProgram.findUnique({ where: { id: programId }, select: { id: true, eligibility: true, targetData: true } });
    if (!program) return Response.json({ error: "program_not_found" }, { status: 404 });
    const target = (program.targetData ?? {}) as { employeeIds?: string[]; values?: string[] };
    const ids = target.employeeIds ?? target.values ?? [];
    const employees = program.eligibility === "SelectedEmployees" && ids.length
      ? await prisma.employee.findMany({ where: { id: { in: ids } }, select: { id: true, employeeNumber: true, firstName: true, lastName: true }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] })
      : [];
    return Response.json({ eligibility: program.eligibility, targetData: program.targetData, employees, total: employees.length });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "request_failed" }, { status: 400 });
  }
}
