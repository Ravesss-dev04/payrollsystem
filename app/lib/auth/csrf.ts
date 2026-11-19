export function parseCsrfCookie(cookieHeader: string): string | null {
  const values = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(
      (part) =>
        part.startsWith("__Host-payroll-csrf=") ||
        part.startsWith("payroll-csrf="),
    )
    .map((part) => part.slice(part.indexOf("=") + 1));
  return values.length === 1 && /^[A-Za-z0-9_-]{43}$/.test(values[0])
    ? values[0]
    : null;
}
