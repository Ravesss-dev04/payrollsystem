"use client";
import { CompanyDepartment } from "../company/types";
import { Management } from "./CompanyBranches";
export default function CompanyDepartments({
  departments,
  onChange,
}: {
  departments: CompanyDepartment[];
  onChange: (v: CompanyDepartment[]) => void;
}) {
  return (
    <Management
      title="Departments"
      subtitle="Organize departments and manage workforce assignments."
      singular="Department"
      records={departments}
      onChange={onChange}
      blank={{
        id: "",
        name: "",
        code: "",
        head: "",
        description: "",
        status: "Active",
        employees: 0,
      }}
      fields={[
        { key: "name", label: "Department Name" },
        { key: "code", label: "Department Code" },
        { key: "head", label: "Department Head" },
        { key: "description", label: "Description" },
      ]}
      columns={[
        { label: "Department Name", value: (x) => x.name },
        { label: "Department Code", value: (x) => x.code },
        { label: "Department Head", value: (x) => x.head },
        { label: "Employees", value: (x) => x.employees },
      ]}
    />
  );
}
