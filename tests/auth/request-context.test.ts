import { describe, expect, it } from "bun:test";
import {
  getRequestContext,
  isSameOrigin,
} from "../../app/lib/auth/request-context";

describe("request security context", () => {
  it("accepts only a valid single IP and bounds audit metadata", () => {
    const request = new Request("https://payroll.example.com/api/auth/login", {
      headers: {
        "x-real-ip": "203.0.113.8",
        "x-request-id": "123e4567-e89b-12d3-a456-426614174000",
        "user-agent": "A".repeat(900),
      },
    });
    const context = getRequestContext(request);

    expect(context.sourceIp).toBe("203.0.113.8");
    expect(context.requestId).toBe("123e4567-e89b-12d3-a456-426614174000");
    expect(context.userAgent?.length).toBeLessThanOrEqual(512);
  });

  it("rejects spoofed multi-value IP metadata and cross-origin requests", () => {
    const request = new Request("https://payroll.example.com/api/auth/login", {
      headers: {
        origin: "https://attacker.example",
        "x-real-ip": "203.0.113.8, 198.51.100.1",
      },
    });
    const context = getRequestContext(request);

    expect(context.sourceIp).toBeNull();
    expect(isSameOrigin(request, "https://payroll.example.com")).toBe(false);
    expect(
      isSameOrigin(
        new Request("https://payroll.example.com/api/auth/login", {
          headers: { origin: "https://payroll.example.com" },
        }),
        "https://payroll.example.com",
      ),
    ).toBe(true);
  });
});
