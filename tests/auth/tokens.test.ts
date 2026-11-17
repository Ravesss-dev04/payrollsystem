import { describe, expect, it } from "bun:test";
import {
  createOpaqueToken,
  createRecoveryCode,
  hashOpaqueToken,
  hashRecoveryCode,
} from "../../app/lib/auth/tokens";

describe("authentication tokens", () => {
  it("uses unpredictable tokens and stores only deterministic digests", () => {
    const first = createOpaqueToken();
    const second = createOpaqueToken();

    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(first).not.toBe(second);
    expect(hashOpaqueToken(first)).toBe(hashOpaqueToken(first));
    expect(hashOpaqueToken(first)).not.toBe(first);
  });

  it("generates high-entropy recovery codes with normalized single-use hashes", () => {
    const code = createRecoveryCode();
    expect(code).toMatch(/^[A-F0-9]{8}(?:-[A-F0-9]{8}){3}$/);
    expect(hashRecoveryCode(code)).toBe(
      hashRecoveryCode(code.toLowerCase().replaceAll("-", "")),
    );
    expect(hashRecoveryCode(code)).not.toBe(code);
  });
});
