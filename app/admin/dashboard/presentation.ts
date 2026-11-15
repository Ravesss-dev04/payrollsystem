const REPORTING_TIME_ZONE = "Asia/Manila";

export function getDashboardPresentation(
  now: Date,
  displayName: string,
): { greeting: string; snapshotDate: string } {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: REPORTING_TIME_ZONE,
    }).format(now),
  );
  const period =
    hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const snapshotDate = new Intl.DateTimeFormat("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: REPORTING_TIME_ZONE,
  }).format(now);

  return {
    greeting: `Good ${period}, ${displayName}!`,
    snapshotDate,
  };
}
