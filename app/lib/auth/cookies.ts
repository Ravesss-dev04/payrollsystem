import { timingSafeEqual } from "node:crypto";
import { hashOpaqueToken } from "./tokens";

export const SESSION_COOKIE_NAME = "__Host-payroll-session";
export const DEVELOPMENT_SESSION_COOKIE_NAME = "payroll-session";
export const CSRF_COOKIE_NAME = "__Host-payroll-csrf";
export const DEVELOPMENT_CSRF_COOKIE_NAME = "payroll-csrf";
export const MFA_CHALLENGE_COOKIE_NAME = "__Host-payroll-mfa";
export const DEVELOPMENT_MFA_CHALLENGE_COOKIE_NAME = "payroll-mfa";

export interface AuthCookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict";
  path: "/";
  maxAge: number;
}

export function sessionCookieOptions(_secure: boolean, _maxAge: number) {
  return {
    httpOnly: true,
    secure: _secure,
    sameSite: "lax",
    path: "/",
    maxAge: _maxAge,
  } satisfies AuthCookieOptions;
}

export function csrfCookieOptions(_secure: boolean, _maxAge: number) {
  return {
    httpOnly: false,
    secure: _secure,
    sameSite: "strict",
    path: "/",
    maxAge: _maxAge,
  } satisfies AuthCookieOptions;
}

export function hasValidCsrfToken(
  cookieToken: string | null,
  headerToken: string | null,
  persistedHash: string,
): boolean {
  if (
    !cookieToken ||
    !headerToken ||
    !/^[A-Za-z0-9_-]{43}$/.test(cookieToken) ||
    !/^[A-Za-z0-9_-]{43}$/.test(headerToken) ||
    !/^[a-f0-9]{64}$/.test(persistedHash)
  ) {
    return false;
  }

  const cookie = Buffer.from(cookieToken);
  const header = Buffer.from(headerToken);
  const expectedHash = Buffer.from(persistedHash, "hex");
  const actualHash = Buffer.from(hashOpaqueToken(headerToken), "hex");
  return (
    timingSafeEqual(cookie, header) &&
    timingSafeEqual(expectedHash, actualHash)
  );
}
