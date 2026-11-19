export type AttendanceStatus = "Present" | "Late" | "Absent" | "Rest Day";
export type CorrectionStatus = "Pending Approval" | "Approved" | "Rejected";

export type AttendanceEmployee = {
  employeeId: string;
  name: string;
  department: string;
  employmentType: string;
  position: string;
};

export type DailyAttendanceRecord = {
  id: string;
  employeeId: string;
  date: string;
  status: AttendanceStatus;
  timeIn?: string;
  timeOut?: string;
  source?: string;
  elapsedMinutes?: number;
  creditedMinutes?: number;
  lateMinutes: number;
  undertimeMinutes: number;
  overtimeMinutes: number;
  overtimeStatus?: "Approved" | "Pending";
  remark?: string;
  correction?: AttendanceCorrection;
};

export type AttendanceCorrection = {
  id: string;
  attendanceRecordId: string;
  employeeId: string;
  type: "Time In" | "Time Out" | "Missing Punch";
  originalValue: string;
  requestedValue: string;
  reason: string;
  status: CorrectionStatus;
  submittedAt: string;
};

export const attendanceEmployees: AttendanceEmployee[] = [
  { employeeId: "EMP-10074", name: "James Reed", department: "Operations", employmentType: "Full-time", position: "Operations Lead" },
  { employeeId: "EMP-10057", name: "Maria Santos", department: "Marketing", employmentType: "Full-time", position: "Marketing Specialist" },
  { employeeId: "EMP-10069", name: "Liam Chen", department: "Engineering", employmentType: "Full-time", position: "Software Engineer" },
  { employeeId: "EMP-10102", name: "Ava Mitchell", department: "Sales", employmentType: "Full-time", position: "Account Executive" },
  { employeeId: "EMP-10119", name: "Noah Brooks", department: "HR & Admin", employmentType: "Full-time", position: "HR Coordinator" },
];

const liamRecords: DailyAttendanceRecord[] = [
  { id: "att-10069-27", employeeId: "EMP-10069", date: "2025-01-27", status: "Present", timeIn: "08:01 AM", timeOut: "05:03 PM", source: "Web (Office)", elapsedMinutes: 542, creditedMinutes: 542, lateMinutes: 1, undertimeMinutes: 0, overtimeMinutes: 0 },
  { id: "att-10069-28", employeeId: "EMP-10069", date: "2025-01-28", status: "Late", timeIn: "08:28 AM", timeOut: "05:46 PM", source: "Web (Office)", elapsedMinutes: 558, creditedMinutes: 512, lateMinutes: 28, undertimeMinutes: 0, overtimeMinutes: 90, overtimeStatus: "Approved", remark: "Late by 28m", correction: { id: "corr-10069-28", attendanceRecordId: "att-10069-28", employeeId: "EMP-10069", type: "Time In", originalValue: "08:28 AM", requestedValue: "08:00 AM", reason: "Forgot to clock in at the start of shift.", status: "Pending Approval", submittedAt: "2025-01-28" } },
  { id: "att-10069-29", employeeId: "EMP-10069", date: "2025-01-29", status: "Present", timeIn: "08:03 AM", timeOut: "05:13 PM", source: "Web (Office)", elapsedMinutes: 550, creditedMinutes: 530, lateMinutes: 3, undertimeMinutes: 0, overtimeMinutes: 0 },
  { id: "att-10069-30", employeeId: "EMP-10069", date: "2025-01-30", status: "Present", timeIn: "08:00 AM", timeOut: "05:05 PM", source: "Web (Office)", elapsedMinutes: 545, creditedMinutes: 523, lateMinutes: 0, undertimeMinutes: 0, overtimeMinutes: 0 },
  { id: "att-10069-31", employeeId: "EMP-10069", date: "2025-01-31", status: "Present", timeIn: "08:00 AM", timeOut: "05:00 PM", source: "Web (Office)", elapsedMinutes: 540, creditedMinutes: 540, lateMinutes: 0, undertimeMinutes: 0, overtimeMinutes: 0 },
  { id: "att-10069-02", employeeId: "EMP-10069", date: "2025-02-01", status: "Rest Day", lateMinutes: 0, undertimeMinutes: 0, overtimeMinutes: 0 },
  { id: "att-10069-03", employeeId: "EMP-10069", date: "2025-02-02", status: "Rest Day", lateMinutes: 0, undertimeMinutes: 0, overtimeMinutes: 0 },
];

function makeWeek(employee: AttendanceEmployee, start = "2025-01-27") {
  const values: Array<Pick<DailyAttendanceRecord, "status" | "timeIn" | "timeOut" | "elapsedMinutes" | "creditedMinutes"> & { lateMinutes?: number }> = [
    { status: "Present", timeIn: "08:00 AM", timeOut: "05:00 PM", elapsedMinutes: 540, creditedMinutes: 510, lateMinutes: 0 },
    { status: "Present", timeIn: "08:12 AM", timeOut: "05:08 PM", elapsedMinutes: 536, creditedMinutes: 506, lateMinutes: 12 },
    { status: "Present", timeIn: "08:00 AM", timeOut: "05:00 PM", elapsedMinutes: 540, creditedMinutes: 510, lateMinutes: 0 },
    { status: "Present", timeIn: "08:00 AM", timeOut: "05:00 PM", elapsedMinutes: 540, creditedMinutes: 510, lateMinutes: 0 },
    { status: "Present", timeIn: "08:00 AM", timeOut: "05:00 PM", elapsedMinutes: 540, creditedMinutes: 510, lateMinutes: 0 },
    { status: "Rest Day" },
    { status: "Rest Day" },
  ];
  const base = new Date(`${start}T12:00:00`);
  return values.map((value, index) => {
    const date = new Date(base); date.setDate(base.getDate() + index);
    return { id: `att-${employee.employeeId}-${date.toISOString().slice(0, 10)}`, employeeId: employee.employeeId, date: date.toISOString().slice(0, 10), source: value.timeIn ? "Web (Office)" : undefined, undertimeMinutes: 0, overtimeMinutes: 0, ...value, lateMinutes: value.lateMinutes ?? 0 };
  });
}

export const attendanceRecords: DailyAttendanceRecord[] = attendanceEmployees.flatMap((employee) => employee.employeeId === "EMP-10069" ? liamRecords : makeWeek(employee));

export function getAttendanceEmployee(employeeId: string) { return attendanceEmployees.find((employee) => employee.employeeId === employeeId); }
export function getEmployeeRecords(employeeId: string) { return attendanceRecords.filter((record) => record.employeeId === employeeId); }
export function toDateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
export function getMonday(date: Date) { const result = new Date(date); const day = result.getDay(); result.setDate(result.getDate() - (day === 0 ? 6 : day - 1)); result.setHours(12, 0, 0, 0); return result; }
export function addDays(date: Date, amount: number) { const result = new Date(date); result.setDate(result.getDate() + amount); return result; }
export function formatMinutes(minutes: number) { return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`; }
export function formatDate(date: string, options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }) { return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", options); }
