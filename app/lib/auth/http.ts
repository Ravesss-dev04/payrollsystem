export const MAX_API_BODY_BYTES = 8 * 1024;

export class HttpInputError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
  ) {
    super(code === "payload_too_large" ? "Request body is too large" : "Invalid request");
  }
}

export async function readJsonBody(
  request: Request,
  maxBytes = MAX_API_BODY_BYTES,
): Promise<unknown> {
  const contentType = request.headers.get("content-type");
  if (!contentType?.toLowerCase().startsWith("application/json")) {
    throw new HttpInputError(415, "unsupported_media_type");
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    if (!/^\d+$/.test(contentLength)) {
      throw new HttpInputError(400, "invalid_request");
    }
    if (Number(contentLength) > maxBytes) {
      throw new HttpInputError(413, "payload_too_large");
    }
  }

  if (!request.body) {
    throw new HttpInputError(400, "invalid_request");
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new HttpInputError(413, "payload_too_large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new HttpInputError(400, "invalid_request");
  }
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new HttpInputError(400, "invalid_request");
    }
    throw error;
  }
}

export function jsonResponse(
  body: unknown,
  status = 200,
  headers?: HeadersInit,
): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("content-type", "application/json; charset=utf-8");
  responseHeaders.set("cache-control", "no-store, max-age=0");
  responseHeaders.set("x-content-type-options", "nosniff");
  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
}

export function getRequestCookie(
  request: Request,
  name: string,
): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  const matchingValues: string[] = [];
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    matchingValues.push(part.slice(separator + 1).trim());
  }
  return matchingValues.length === 1 ? matchingValues[0] : null;
}

