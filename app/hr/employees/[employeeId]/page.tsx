import { notFound } from "next/navigation";
import { ZodError } from "zod";
import { getEmployeeDetails, EmployeeServiceError } from "../../../lib/employees/service";
import { EmployeeDetailsClient } from "./EmployeeDetailsClient";

export default async function EmployeeDetailsPage({ params }: { params: Promise<{ employeeId: string }> }) {
  const { employeeId } = await params;
  let employee;
  try {
    employee = await getEmployeeDetails(employeeId);
  } catch (error) {
    if (error instanceof ZodError || (error instanceof EmployeeServiceError && error.status === 404)) notFound();
    throw error;
  }
  return <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 [scrollbar-color:#c6b5df_transparent] [scrollbar-width:thin] sm:px-7"><div className="mx-auto max-w-[1500px]"><EmployeeDetailsClient employee={employee} /></div></main>;
}
