export type AdminProfile = {
  name: string;
  email: string;
  phone: string;
  language: string;
  timezone: string;
  avatar: string;
};
export type AuditResult = "Success" | "Warning" | "Failure";
export type AuditEventChange = { field: string; before: string; after: string };
export type AuditEvent = {
  id: string;
  timestamp: string;
  actorId: string;
  actor: string;
  module: string;
  action: string;
  targetType: string;
  targetId: string;
  target: string;
  result: AuditResult;
  summary: string;
  changes?: AuditEventChange[];
};
export type OrganizationPreferences = {
  timezone: string;
  dateFormat: string;
  language: string;
  currency: string;
  week: string;
  period: string;
  branch: string;
};
export type NotificationPreference = {
  category: string;
  label: string;
  inApp: boolean;
  email: boolean;
  mandatory?: boolean;
};
export type IntegrationStatus =
  | "Not Connected"
  | "Requires Configuration"
  | "Demo Only";
