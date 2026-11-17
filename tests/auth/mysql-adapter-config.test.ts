import { describe, expect, it } from "bun:test";
import { getMySqlPoolConfig } from "../../app/lib/mysql-adapter-config";

describe("MySQL adapter configuration", () => {
  it("decodes the URL fields and requires verified TLS for remote hosts", () => {
    const config = getMySqlPoolConfig(
      "mysql://payroll%40user:p%40ss%3Aword@db.example:3307/payroll_test",
    );

    expect(config).toMatchObject({
      host: "db.example",
      user: "payroll@user",
      password: "p@ss:word",
      port: 3307,
      database: "payroll_test",
      timezone: "Z",
      connectTimeout: 10000,
      acquireTimeout: 15000,
      ssl: { rejectUnauthorized: true },
    });
  });

  it("does not require TLS for loopback development databases", () => {
    const config = getMySqlPoolConfig(
      "mysql://user:password@localhost/payroll_test",
    );

    expect(config.host).toBe("localhost");
    expect(config.port).toBe(3306);
    expect(config.ssl).toBeUndefined();
  });

  it("rejects unsupported providers, missing databases, and query options", () => {
    expect(() =>
      getMySqlPoolConfig("postgresql://user:password@localhost/payroll_test"),
    ).toThrow();
    expect(() =>
      getMySqlPoolConfig("mysql://user:password@localhost"),
    ).toThrow();
    expect(() =>
      getMySqlPoolConfig("mysql://user:password@localhost/payroll_test?ssl=false"),
    ).toThrow();
  });
});
