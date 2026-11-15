import { describe, expect, it } from "bun:test";
import {
  classifySessionCheck,
  getSessionRetryDelay,
} from "../../app/lib/auth/session-recovery";

describe("session recovery policy", () => {
  it("only treats an explicit unauthenticated response as session loss", () => {
    expect(classifySessionCheck(200)).toBe("authenticated");
    expect(classifySessionCheck(401)).toBe("unauthenticated");
    expect(classifySessionCheck(null)).toBe("retry");
    expect(classifySessionCheck(403)).toBe("retry");
    expect(classifySessionCheck(503)).toBe("retry");
  });

  it("uses bounded exponential retry with jitter", () => {
    expect(getSessionRetryDelay(0, 0)).toBe(500);
    expect(getSessionRetryDelay(1, 0.5)).toBe(1500);
    expect(getSessionRetryDelay(20, 1)).toBe(30000);
  });
});
