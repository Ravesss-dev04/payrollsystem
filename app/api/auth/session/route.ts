import { getCurrentSession } from "../../../lib/auth/session.server";
import { jsonResponse } from "../../../lib/auth/http";

export async function GET(): Promise<Response> {
  const session = await getCurrentSession();
  if (!session) {
    return jsonResponse({ error: "authentication_required" }, 401);
  }
  return jsonResponse({
    authenticated: true,
    user: {
      id: session.userId,
      email: session.email,
      name: session.name,
      role: session.role,
    },
  });
}
