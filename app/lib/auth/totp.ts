import { Secret, TOTP } from "otpauth";

const ISSUER = "Payroll System";
const DIGITS = 6;
const PERIOD = 30;
const WINDOW = 1;

export function createTotpSecret(): string {
  return new Secret({ size: 20 }).base32;
}

export function createTotpUri(secret: string, email: string): string {
  return new TOTP({
    issuer: ISSUER,
    label: email,
    secret,
    algorithm: "SHA1",
    digits: DIGITS,
    period: PERIOD,
  }).toString();
}

export function verifyTotp(
  secret: string,
  token: string,
  timestamp = Date.now(),
): boolean {
  if (!/^\d{6}$/.test(token)) {
    return false;
  }
  return (
    TOTP.validate({
      secret,
      token,
      timestamp,
      digits: DIGITS,
      period: PERIOD,
      algorithm: "SHA1",
      window: WINDOW,
    }) !== null
  );
}

export function generateTotp(secret: string, timestamp: number): string {
  return TOTP.generate({
    secret,
    timestamp,
    digits: DIGITS,
    period: PERIOD,
    algorithm: "SHA1",
  });
}
