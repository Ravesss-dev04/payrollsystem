import { describe, expect, it } from "bun:test";
import { buildMfaVerificationPayload } from "../../app/login/mfa-verification";

describe("MFA verification form payload", () => {
  it("submits a recovery code instead of a TOTP code when recovery is selected", () => {
    expect(
      buildMfaVerificationPayload(
        "recovery",
        "01234567-89ABCDEF-01234567-89ABCDEF",
      ),
    ).toEqual({
      recoveryCode: "01234567-89ABCDEF-01234567-89ABCDEF",
    });
  });

  it("submits the authenticator code when TOTP is selected", () => {
    expect(buildMfaVerificationPayload("totp", "123456")).toEqual({
      code: "123456",
    });
  });
});
