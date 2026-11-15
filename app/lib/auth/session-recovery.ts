export type SessionCheckClassification =
  | "authenticated"
  | "unauthenticated"
  | "retry";

export function classifySessionCheck(
  status: number | null,
): SessionCheckClassification {
  if (status !== null && status >= 200 && status < 300) {
    return "authenticated";
  }
  if (status === 401) {
    return "unauthenticated";
  }
  return "retry";
}

export function getSessionRetryDelay(
  attempt: number,
  randomValue = Math.random(),
): number {
  if (!Number.isInteger(attempt) || attempt < 0) {
    throw new Error("Invalid retry attempt");
  }
  const boundedRandom = Math.max(0, Math.min(0.999999, randomValue));
  const exponentialDelay = Math.min(1000 * 2 ** Math.min(attempt, 5), 30000);
  return Math.round(exponentialDelay * (0.5 + boundedRandom * 0.5));
}
