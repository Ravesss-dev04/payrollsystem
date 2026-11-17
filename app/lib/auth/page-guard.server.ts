import "server-only";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { SecurityEventType } from "../../generated/prisma/client";
import { hasPermission, type Permission } from "./authorization";
import { writeSecurityEvent } from "./audit";
import { getCurrentSession } from "./session.server";
import { loadSecurityConfig } from "./security-config";

export async function requirePagePermission(permission?: Permission) {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  if (
    permission &&
    !hasPermission({
      role: session.role,
      permission,
      actorId: session.userId,
    })
  ) {
    const config = loadSecurityConfig();
    const incomingHeaders = await headers();
    const requestHeaders = new Headers();
    for (const headerName of ["x-real-ip", "x-request-id", "user-agent"]) {
      const value = incomingHeaders.get(headerName);
      if (value) requestHeaders.set(headerName, value);
    }
    await writeSecurityEvent({
      eventType: SecurityEventType.AccessDenied,
      request: new Request(config.appOrigin, { headers: requestHeaders }),
      succeeded: false,
      userId: session.userId,
    });
    notFound();
  }

  return session;
}
