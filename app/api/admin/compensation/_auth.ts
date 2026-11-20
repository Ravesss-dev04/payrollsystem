import { requireApiPermission } from "@/app/lib/auth/api-guard.server";

export function requireCompensationActor(
  request: Request,
  permission: "compensation:read" | "compensation:policy:manage" | "compensation:assignment:manage" | "compensation:adjustment:approve" | "compensation:tax:review" = "compensation:read",
) {
  return requireApiPermission(request, permission);
}
