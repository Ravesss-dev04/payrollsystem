import type { PoolConfig } from "mariadb";

export function getMySqlPoolConfig(connectionString: string): PoolConfig {
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error("DATABASE_URL must be a valid MySQL connection URL");
  }

  if (
    url.protocol !== "mysql:" ||
    !url.username ||
    !url.pathname ||
    url.pathname === "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error("DATABASE_URL must identify a MySQL database without URL options");
  }

  let database: string;
  let user: string;
  let password: string;
  try {
    database = decodeURIComponent(url.pathname.slice(1));
    user = decodeURIComponent(url.username);
    password = decodeURIComponent(url.password);
  } catch {
    throw new Error("DATABASE_URL contains invalid encoded fields");
  }

  const host = url.hostname.replace(/^\[|\]$/g, "");
  const port = url.port ? Number(url.port) : 3306;
  if (
    !host ||
    !database ||
    database.includes("/") ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  ) {
    throw new Error("DATABASE_URL contains invalid MySQL connection fields");
  }

  const loopbackHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  const isLoopback = loopbackHosts.has(host.toLowerCase());

  return {
    host,
    port,
    user,
    password,
    database,
    timezone: "Z",
    connectTimeout: 10_000,
    acquireTimeout: 15_000,
    ...(isLoopback ? {} : { ssl: { rejectUnauthorized: true } }),
  };
}
