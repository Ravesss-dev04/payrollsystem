export function formatPayrollAmount(amount: string, currencyCode: string): string {
  const [whole, fraction] = amount.split(".");
  const groupedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${currencyCode} ${groupedWhole}${fraction ? `.${fraction}` : ""}`;
}

export function formatPayrollDateTime(
  value: string | null,
  timeZone: string | null = null,
): string {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unavailable"
    : new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: timeZone ?? "UTC",
        timeZoneName: "short",
      }).format(date);
}

export function payrollStatusLabel(status: string): string {
  switch (status) {
    case "PendingAdminApproval":
      return "Pending Admin approval";
    case "HRVerified":
      return "HR verified";
    case "RejectedOrReturned":
      return "Rejected / returned";
    default:
      return status;
  }
}

export function payrollLineCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    BasicPay: "Basic pay",
    OvertimePay: "Overtime pay",
    NightDifferential: "Night differential",
    HolidayPremium: "Holiday premium",
    Allowance: "Allowance",
    Bonus: "Bonus",
    Adjustment: "Adjustment",
    BonusesAndAdjustments: "Bonuses and adjustments",
    SSS: "SSS",
    PhilHealth: "PhilHealth",
    PagIBIG: "Pag-IBIG",
    WithholdingTax: "Withholding tax",
    AuthorizedOther: "Other authorized deduction",
    Other: "Other",
  };
  return labels[category] ?? category;
}
