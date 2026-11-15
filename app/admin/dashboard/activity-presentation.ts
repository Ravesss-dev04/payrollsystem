import { SecurityEventType } from "../../generated/prisma/client";

export type AdminDashboardActivity = {
  id: string;
  title: string;
  actorName: string | null;
  category: "security" | "account";
  occurredAt: string;
};

export type SecurityAuditActivity = {
  id: string;
  eventType: SecurityEventType;
  createdAt: Date;
  user: { name: string } | null;
};

const ACTIVITY_COPY: Record<
  SecurityEventType,
  Pick<AdminDashboardActivity, "title" | "category">
> = {
  [SecurityEventType.LoginSuccess]: {
    title: "Successful sign-in",
    category: "security",
  },
  [SecurityEventType.LoginFailure]: {
    title: "Failed sign-in attempt",
    category: "security",
  },
  [SecurityEventType.LoginRateLimited]: {
    title: "Sign-in rate limit triggered",
    category: "security",
  },
  [SecurityEventType.MfaFailure]: {
    title: "MFA verification failed",
    category: "security",
  },
  [SecurityEventType.MfaEnrolled]: {
    title: "MFA enrolled",
    category: "account",
  },
  [SecurityEventType.PasswordChanged]: {
    title: "Password changed",
    category: "account",
  },
  [SecurityEventType.PasswordResetRequested]: {
    title: "Password reset requested",
    category: "account",
  },
  [SecurityEventType.SessionCreated]: {
    title: "Session created",
    category: "security",
  },
  [SecurityEventType.SessionTerminated]: {
    title: "Session ended",
    category: "security",
  },
  [SecurityEventType.SessionRevoked]: {
    title: "Session revoked",
    category: "security",
  },
  [SecurityEventType.AccountStatusChanged]: {
    title: "Account status changed",
    category: "account",
  },
  [SecurityEventType.RoleChanged]: {
    title: "Account role changed",
    category: "account",
  },
  [SecurityEventType.AccessDenied]: {
    title: "Access denied",
    category: "security",
  },
};

export function toAdminDashboardActivity(
  event: SecurityAuditActivity,
): AdminDashboardActivity {
  return {
    id: event.id,
    ...ACTIVITY_COPY[event.eventType],
    actorName: event.user?.name ?? null,
    occurredAt: event.createdAt.toISOString(),
  };
}
