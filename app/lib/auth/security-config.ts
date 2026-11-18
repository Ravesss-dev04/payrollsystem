export interface SecurityConfig {
  appOrigin: string;
  encryptionKey: Buffer;
  rateLimitKey: Buffer;
  secureCookies: boolean;
}

export function loadSecurityConfig(
  environment: Record<string, string | undefined> = process.env,
  nodeEnvironment = process.env.NODE_ENV ?? "development",
): SecurityConfig {
  const rawOrigin = environment.APP_ORIGIN;
  if (!rawOrigin) {
    throw new Error("APP_ORIGIN must be configured");
  }

  let origin: URL;
  try {
    origin = new URL(rawOrigin);
  } catch {
    throw new Error("APP_ORIGIN must be a valid absolute URL");
  }
  if (
    origin.username ||
    origin.password ||
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash ||
    (origin.protocol !== "https:" &&
      !["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname))
  ) {
    throw new Error("APP_ORIGIN is not permitted");
  }

  return {
    appOrigin: origin.origin,
    encryptionKey: decodeKey(
      environment.AUTH_ENCRYPTION_KEY,
      "AUTH_ENCRYPTION_KEY",
    ),
    rateLimitKey: decodeKey(
      environment.RATE_LIMIT_SECRET,
      "RATE_LIMIT_SECRET",
    ),
    secureCookies: origin.protocol === "https:",
  };
}

function decodeKey(value: string | undefined, name: string): Buffer {
  if (!value) {
    throw new Error(`${name} must be configured`);
  }
  const key = Buffer.from(value, "base64");
  if (key.length !== 32 || key.toString("base64") !== value) {
    throw new Error(`${name} must be canonical base64 for 32 random bytes`);
  }
  return key;
}
