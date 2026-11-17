import argon2 from "argon2";

const COMMON_PASSWORDS = new Set([
  "password123",
  "password123!",
  "password",
  "password1",
  "qwerty123",
  "letmein123",
  "welcome123",
  "admin123",
]);

export function normalizeEmail(value: string): string {
  const email = value.trim().toLowerCase();
  if (!isValidEmail(email)) {
    throw new Error("Invalid email address");
  }
  return email;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validateNewPassword(password: string): void {
  const length = Array.from(password).length;
  if (
    length < 12 ||
    length > 128 ||
    !password.trim() ||
    COMMON_PASSWORDS.has(password.trim().toLowerCase())
  ) {
    throw new Error("Password does not meet security requirements");
  }
}

export async function hashPassword(password: string): Promise<string> {
  validateNewPassword(password);
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
    hashLength: 32,
  });
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  if (!hash.startsWith("$argon2id$")) {
    return false;
  }
  return argon2.verify(hash, password);
}
