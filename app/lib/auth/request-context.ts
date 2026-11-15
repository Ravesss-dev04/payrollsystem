import { randomUUID } from "node:crypto";
import { isIP } from "node:net";

export function getRequestContext(_request: Request) {
  const rawIp = _request.headers.get("x-real-ip");
  const rawAgent = _request.headers.get("user-agent");
  const requestId = _request.headers.get("x-request-id");
  return {
    sourceIp: rawIp && isIP(rawIp) ? rawIp : null,
    userAgent: rawAgent
      ? rawAgent.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 512)
      : null,
    requestId:
      requestId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)
        ? requestId
        : randomUUID(),
  };
}

export function isSameOrigin(request: Request, expectedOrigin: string): boolean {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (!origin) {
    return (
      (request.method === "GET" || request.method === "HEAD") &&
      fetchSite === "same-origin"
    );
  }
  try {
    if (new URL(origin).origin !== expectedOrigin) {
      return false;
    }
  } catch {
    return false;
  }
  return fetchSite === null || fetchSite === "same-origin";
}
