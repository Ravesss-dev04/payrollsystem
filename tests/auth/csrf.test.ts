import { describe, expect, it } from "bun:test";
import {
  csrfCookieOptions,
  hasValidCsrfToken,
  sessionCookieOptions,
} from "../../app/lib/auth/cookies";
import { createOpaqueToken, hashOpaqueToken } from "../../app/lib/auth/tokens";

describe("session cookie and CSRF controls", () => {
  it("uses HttpOnly secure-scope session cookies", () => {
    expect(sessionCookieOptions(true, 60 * 60)).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 3600,
    });
    expect(sessionCookieOptions(true, 3600)).not.toHaveProperty("domain");
  });

  it("requires the CSRF cookie, header, and persisted digest to match", () => {
    const token = createOpaqueToken();
    const digest = hashOpaqueToken(token);

    expect(hasValidCsrfToken(token, token, digest)).toBe(true);
    expect(hasValidCsrfToken(token, "different", digest)).toBe(false);
    expect(hasValidCsrfToken(token, token, hashOpaqueToken("other"))).toBe(
      false,
    );
    expect(hasValidCsrfToken(null, token, digest)).toBe(false);
  });

  it("keeps the CSRF token readable but same-site and secure", () => {
    expect(csrfCookieOptions(true, 3600)).toMatchObject({
      httpOnly: false,
      secure: true,
      sameSite: "strict",
      path: "/",
    });
    expect(csrfCookieOptions(true, 3600)).not.toHaveProperty("domain");
  });
});
