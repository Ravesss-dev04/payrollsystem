import { describe, expect, it } from "bun:test";
import {
  HttpInputError,
  getRequestCookie,
  readJsonBody,
} from "../../app/lib/auth/http";

describe("bounded JSON request parsing", () => {
  it("parses a valid JSON body within the limit", async () => {
    await expect(
      readJsonBody(
        new Request("https://payroll.example.com/api/auth/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: "person@example.com" }),
        }),
      ),
    ).resolves.toEqual({ email: "person@example.com" });
  });

  it("rejects malformed or oversized bodies without returning parser details", async () => {
    await expect(
      readJsonBody(
        new Request("https://payroll.example.com/api/auth/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{",
        }),
      ),
    ).rejects.toBeInstanceOf(HttpInputError);

    await expect(
      readJsonBody(
        new Request("https://payroll.example.com/api/auth/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ value: "x".repeat(9000) }),
        }),
      ),
    ).rejects.toMatchObject({ status: 413, code: "payload_too_large" });
  });

  it("rejects ambiguous duplicate authentication cookies", () => {
    const request = new Request("https://payroll.example.com", {
      headers: { cookie: "payroll-mfa=one; payroll-mfa=two" },
    });
    expect(getRequestCookie(request, "payroll-mfa")).toBeNull();
  });
});
