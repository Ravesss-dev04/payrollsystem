import { requireApiPermission } from "@/app/lib/auth/api-guard.server";

export function requireCompensationActor(
  request: Request,
  permission: "compensation:policy:manage" | "compensation:adjustment:approve" = "compensation:policy:manage",
) {
  return requireApiPermission(request, permission);
}
