import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "bun:test";
import {
  TestAccountProvisioningError,
  writeCredentialFile,
} from "../../prisma/provision-test-accounts";

describe("test account provisioning errors", () => {
  it("reports a known database error code without exposing its message", () => {
    const error = new TestAccountProvisioningError(
      "reading existing accounts",
      {
        code: "ER_ACCESS_DENIED_ERROR",
        message: "Sensitive connection details",
      },
    );

    expect(error.message).toContain("ER_ACCESS_DENIED_ERROR");
    expect(error.message).toContain("reading existing accounts");
    expect(error.message).not.toContain("Sensitive connection details");
  });

  it("does not expose arbitrary error codes or messages", () => {
    const error = new TestAccountProvisioningError(
      "saving credential file",
      {
        code: "database-password",
        message: "Sensitive connection details",
      },
    );

    expect(error.message).not.toContain("database-password");
    expect(error.message).not.toContain("Sensitive connection details");
  });

  it("extracts a numeric MySQL code from a wrapped adapter error", () => {
    const error = new TestAccountProvisioningError(
      "reading existing accounts",
      {
        name: "DriverAdapterError",
        cause: {
          originalCode: "1146",
          originalMessage: "Sensitive table details",
        },
      },
    );

    expect(error.message).toContain("MYSQL_1146");
    expect(error.message).not.toContain("Sensitive table details");
  });
});

if (process.platform === "win32") {
  describe("Windows test credential permissions", () => {
    it("creates credential files with restricted ACLs", async () => {
      const previousLocalAppData = process.env.LOCALAPPDATA;
      const testAppData = await mkdtemp(
        join(tmpdir(), "payroll-credential-test-"),
      );

      process.env.LOCALAPPDATA = testAppData;

      try {
        const directory = await writeCredentialFile([
          {
            email: "test-employee@payroll.test",
            role: "employee",
            password: "temporary-test-password",
          },
        ]);

        expect(directory.startsWith(testAppData)).toBe(true);
      } finally {
        if (previousLocalAppData === undefined) {
          delete process.env.LOCALAPPDATA;
        } else {
          process.env.LOCALAPPDATA = previousLocalAppData;
        }

        await rm(testAppData, { recursive: true, force: true });
      }
    });
  });
}
