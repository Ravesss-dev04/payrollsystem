export type MfaVerificationMethod = "totp" | "recovery";

export function buildMfaVerificationPayload(
  method: MfaVerificationMethod,
  value: string,
): { code: string } | { recoveryCode: string } {
  return method === "recovery"
    ? { recoveryCode: value }
    : { code: value };
}
