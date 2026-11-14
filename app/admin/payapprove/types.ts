export type Status = "Pending" | "Approved" | "Rejected" | "Returned for Correction";
export type Employee = { id: string; name: string; department: string; basic: number; overtime: number; night: number; holiday: number; allowance: number; bonus: number; sss: number; philhealth: number; pagibig: number; tax: number; other: number };
export type Exception = { id: string; severity: "Info" | "Warning" | "Blocking Error"; reference: string; issue: string; field: string; source: string; reviewed: boolean };
export type Adjustment = { id: string; employee: string; type: string; amount: number; reason: string; requested: string; approved: string; status: string };
export type Event = { action: string; actor: string; time: string; remarks?: string; version: string };
export type Batch = { id: string; period: string; net: number; count: number; status: Status; prepared: string; submitted: string; version: string; employees: Employee[]; exceptions: Exception[]; adjustments: Adjustment[]; events: Event[] };
