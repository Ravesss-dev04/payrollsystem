export function normalizeUserSearch(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

export function escapeSqlLike(value: string): string {
  return value.replace(/[!%_]/g, "!$&");
}

export function rankUserSearch(input: {
  name: string;
  email: string;
  role: string;
  query: string;
}): number {
  const query = normalizeUserSearch(input.query);
  if (!query) return 0;
  const name = normalizeUserSearch(input.name);
  const email = normalizeUserSearch(input.email);
  const role = normalizeUserSearch(input.role);

  if (name === query) return 1;
  if (email === query) return 2;
  if (role === query) return 3;
  if (name.startsWith(query)) return 4;
  if (email.startsWith(query)) return 5;
  if (name.includes(query)) return 6;
  if (email.includes(query)) return 7;
  if (role.includes(query)) return 8;
  return Number.POSITIVE_INFINITY;
}
