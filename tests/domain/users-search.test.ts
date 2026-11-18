import { describe, expect, it } from "bun:test";
import {
  escapeSqlLike,
  normalizeUserSearch,
  rankUserSearch,
} from "../../app/lib/users/search";

describe("user search ranking", () => {
  it("normalizes whitespace and case without changing unrelated values", () => {
    expect(normalizeUserSearch("  ADA   Lovelace  ")).toBe("ada lovelace");
    expect(escapeSqlLike("a!%_b")).toBe("a!!!%!_b");
  });

  it("ranks exact name, email, and role ahead of prefixes and partial matches", () => {
    const result = (query: string) =>
      [
        rankUserSearch({
          name: "Ada Lovelace",
          email: "ada@example.test",
          role: "employee",
          query,
        }),
        rankUserSearch({
          name: "Ada Byron",
          email: "byron@example.test",
          role: "hr",
          query,
        }),
        rankUserSearch({
          name: "Byron Ada",
          email: "ada-lovelace@example.test",
          role: "hr",
          query,
        }),
      ];

    expect(result("Ada Lovelace")).toEqual([1, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY]);
    expect(result("ada@example.test")[0]).toBe(2);
    expect(
      rankUserSearch({
        name: "Ruth",
        email: "ruth@example.test",
        role: "hr",
        query: "HR",
      }),
    ).toBe(3);
    expect(result("ada")[0]).toBe(4);
    expect(result("byron@")[1]).toBe(5);
    expect(result("lovelace")[0]).toBe(6);
    expect(result("example.test")[0]).toBe(7);
  });

  it("does not rank unrelated users", () => {
    expect(
      rankUserSearch({
        name: "Ada Lovelace",
        email: "ada@example.test",
        role: "employee",
        query: "payroll",
      }),
    ).toBe(Number.POSITIVE_INFINITY);
  });
});
