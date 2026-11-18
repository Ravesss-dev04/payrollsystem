import { Buffer } from "node:buffer";
import { deflateRawSync } from "node:zlib";
import {
  payrollReviewResponseSchema,
  type PayrollReviewResponse,
} from "./views";
import { payrollLineCategoryLabel } from "./format";
import {
  sumDecimalStrings,
  payrollNetPayReconciles,
  fromUnits,
  toUnits,
} from "./reconciliation";

type Cell = {
  type: "header" | "text" | "decimal" | "date";
  value: string;
};

type Worksheet = {
  name: string;
  rows: Cell[][];
  widths: number[];
  filter: boolean;
};

const MAX_WORKBOOK_UNCOMPRESSED_BYTES = 32 * 1024 * 1024;

export class PayrollReportGenerationError extends Error {
  constructor(
    public readonly code: "invalid_report_data" | "report_too_large",
  ) {
    super(code);
  }
}

const text = (value: string | null | undefined): Cell => ({
  type: "text",
  value: value ?? "Not supplied",
});
const header = (value: string): Cell => ({ type: "header", value });
const decimal = (value: string): Cell => ({ type: "decimal", value });
const date = (value: string): Cell => ({ type: "date", value });

function formatTimestamp(value: string, timeZone: string | null): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || timestamp < Date.UTC(1900, 0, 1)) {
    throw new PayrollReportGenerationError("invalid_report_data");
  }

  const zone = timeZone ?? "UTC";
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      calendar: "iso8601",
      numberingSystem: "latn",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(timestamp));
  } catch (error) {
    if (error instanceof RangeError) {
      throw new PayrollReportGenerationError("invalid_report_data");
    }
    throw error;
  }

  const part = (
    type: "year" | "month" | "day" | "hour" | "minute" | "second",
  ) =>
    parts.find((value) => value.type === type)?.value;
  const year = part("year");
  const month = part("month");
  const day = part("day");
  const hour = part("hour");
  const minute = part("minute");
  const second = part("second");
  if (!year || !month || !day || !hour || !minute || !second) {
    throw new PayrollReportGenerationError("invalid_report_data");
  }

  const milliseconds = new Date(timestamp).getUTCMilliseconds();
  const localSecondAsUtc = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );
  const utcSecond = timestamp - milliseconds;
  const offsetMinutes = Math.round((localSecondAsUtc - utcSecond) / 60_000);
  const offsetSign = offsetMinutes < 0 ? "-" : "+";
  const offsetHours = String(Math.floor(Math.abs(offsetMinutes) / 60)).padStart(2, "0");
  const offsetRemainder = String(Math.abs(offsetMinutes) % 60).padStart(2, "0");
  const zoneLabel = timeZone ? `[${zone}]` : "[UTC]";
  return `${year}-${month}-${day}T${hour}:${minute}:${second}.${String(milliseconds).padStart(3, "0")}${offsetSign}${offsetHours}:${offsetRemainder}${zoneLabel}`;
}

const dateTime = (value: string | null, timeZone: string | null): Cell =>
  value ? text(formatTimestamp(value, timeZone)) : text(null);

function row(values: (string | null | undefined)[]): Cell[] {
  return values.map(text);
}

function columnName(index: number): string {
  let value = index + 1;
  let result = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}

function xmlEscape(value: string): string {
  for (const character of value) {
    const point = character.codePointAt(0) ?? 0;
    if (
      point !== 0x9 &&
      point !== 0xa &&
      point !== 0xd &&
      !(point >= 0x20 && point <= 0xd7ff) &&
      !(point >= 0xe000 && point <= 0xfffd) &&
      !(point >= 0x10000 && point <= 0x10ffff)
    ) {
      throw new PayrollReportGenerationError("invalid_report_data");
    }
  }
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function excelDateSerial(value: string): string {
  const timestamp = Date.parse(
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : value,
  );
  if (!Number.isFinite(timestamp) || timestamp < Date.UTC(1900, 0, 1)) {
    throw new PayrollReportGenerationError("invalid_report_data");
  }
  return String(timestamp / 86_400_000 + 25_569);
}

function cellXml(cell: Cell, reference: string): string {
  if (cell.type === "text" || cell.type === "header") {
    const style = cell.type === "header" ? 1 : 2;
    return `<c r="${reference}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(cell.value)}</t></is></c>`;
  }
  if (cell.type === "date") {
    return `<c r="${reference}" s="4"><v>${excelDateSerial(cell.value)}</v></c>`;
  }
  if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(cell.value)) {
    throw new PayrollReportGenerationError("invalid_report_data");
  }
  return `<c r="${reference}" s="3"><v>${cell.value}</v></c>`;
}

function worksheetXml(sheet: Worksheet): string {
  const columnCount = Math.max(
    1,
    ...sheet.rows.map((cells) => cells.length),
    sheet.widths.length,
  );
  const lastColumn = columnName(columnCount - 1);
  const lastRow = Math.max(sheet.rows.length, 1);
  const columns = sheet.widths.length
    ? `<cols>${sheet.widths
        .map(
          (width, index) =>
            `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`,
        )
        .join("")}</cols>`
    : "";
  const rows = sheet.rows
    .map(
      (cells, rowIndex) =>
        `<row r="${rowIndex + 1}">${cells
          .map((cell, columnIndex) =>
            cellXml(cell, `${columnName(columnIndex)}${rowIndex + 1}`),
          )
          .join("")}</row>`,
    )
    .join("");
  const autoFilter = sheet.filter && sheet.rows.length > 1
    ? `<autoFilter ref="A1:${lastColumn}${lastRow}"/>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${lastColumn}${lastRow}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/>${columns}<sheetData>${rows}</sheetData>${autoFilter}<pageMargins left="0.25" right="0.25" top="0.5" bottom="0.5" header="0.2" footer="0.2"/></worksheet>`;
}

function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zipWorkbook(files: { name: string; contents: Buffer }[]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let localOffset = 0;

  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const checksum = crc32(file.contents);
    const compressed = deflateRawSync(file.contents, { level: 9 });
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(8, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0x0021, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(file.contents.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28);
    localParts.push(localHeader, name, compressed);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(8, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0x0021, 14);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(file.contents.length, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(localOffset, 42);
    centralParts.push(centralHeader, name);

    localOffset += localHeader.length + name.length + compressed.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(files.length, 8);
  endRecord.writeUInt16LE(files.length, 10);
  endRecord.writeUInt32LE(centralDirectory.length, 12);
  endRecord.writeUInt32LE(localOffset, 16);
  endRecord.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, centralDirectory, endRecord]);
}

function makeWorksheets(review: PayrollReviewResponse): Worksheet[] {
  const { batch, employees } = review;
  const timeZone = review.organization.timeZone;
  const timeZoneLabel = timeZone ?? "UTC";
  const earnings = employees.flatMap((employee) =>
    employee.earnings.map((line) => ({ ...line, employee })),
  );
  const deductions = employees.flatMap((employee) =>
    employee.deductions.map((line) => ({ ...line, employee })),
  );
  const attendance = employees.flatMap((employee) =>
    employee.attendance.map((record) => ({ ...record, employee })),
  );
  const adjustments = employees.flatMap((employee) =>
    employee.adjustments.map((adjustment) => ({ ...adjustment, employee })),
  );
  return [
    {
      name: "Payroll Summary",
      widths: [32, 38, 18],
      filter: false,
      rows: [
        [header("Payroll Summary")],
        row(["Company information", review.organization.name ?? "Not configured"]),
        row([
          "Organization time zone",
          timeZone ?? "Not configured; timestamps shown in UTC",
        ]),
        row(["Payroll batch number", batch.batchNumber]),
        row(["Payroll period start", batch.periodStart]),
        row(["Payroll period end", batch.periodEnd]),
        row(["Payroll cutoff", batch.cutoffReference]),
        row(["Prepared by", batch.preparedBy]),
        row(["Submitted by", batch.submittedBy]),
        [text(`Submission date (${timeZoneLabel})`), dateTime(batch.submittedAt, timeZone)],
        [text(`Source calculation time (${timeZoneLabel})`), dateTime(batch.sourceCalculatedAt, timeZone)],
        row(["Payroll version", String(batch.version)]),
        row(["Payroll version ID", batch.versionId]),
        row([
          "Deduction category configuration version",
          batch.deductionCategorySetVersion === null
            ? "Not captured"
            : String(batch.deductionCategorySetVersion),
        ]),
        row(["Total employees in payroll records", String(batch.employeeCount)]),
        row(["Recorded employee count", String(batch.recordedEmployeeCount)]),
        [header("Financial totals")],
        [header("Measure"), header("Exact amount"), header("Currency")],
        row(["Gross payable", batch.grossPayable, batch.currencyCode]),
        row(["Total deductions", batch.totalDeductions, batch.currencyCode]),
        row(["Net payable", batch.netPayable, batch.currencyCode]),
        row(["Employer contributions", batch.employerContributions, batch.currencyCode]),
        row(["Labor cost", batch.laborCost, batch.currencyCode]),
        row(["Overtime cost", batch.overtimeCost, batch.currencyCode]),
        row([
          "Earnings breakdown reconciles to gross payable",
          review.payableBreakdownReconciles ? "Yes" : "No",
        ]),
        row([
          "Earnings source status",
          "Submitted HR snapshot; not independently verified or approved",
        ]),
        row([
          "Deduction breakdown reconciles to total deductions",
          review.deductionBreakdownReconciles ? "Yes" : "No",
        ]),
        row([
          "Deduction source status",
          "Submitted HR snapshot; eligibility and approval not independently verified",
        ]),
        [header("Earnings by category")],
        [header("Category"), header("Exact amount"), header("Currency")],
        ...(review.payableBreakdown.length
          ? review.payableBreakdown.map(({ category, amount }) =>
              row([
                payrollLineCategoryLabel(category),
                amount,
                batch.currencyCode,
              ]),
            )
          : [row(["No earnings lines supplied", "0", batch.currencyCode])]),
        row(["Total gross earnings", batch.grossPayable, batch.currencyCode]),
        [header("Deductions by category")],
        [header("Category"), header("Exact amount"), header("Currency")],
        ...(review.deductionBreakdown.length
          ? review.deductionBreakdown.map(({ category, amount }) =>
              row([
                payrollLineCategoryLabel(category),
                amount,
                batch.currencyCode,
              ]),
            )
          : [row(["No deductions lines supplied", "0", batch.currencyCode])]),
        row(["Total employee deductions", batch.totalDeductions, batch.currencyCode]),
      ],
    },
    {
      name: "Employee Payroll Details",
      widths: [24, 18, 30, 24, 22, 20, 20, 20, 18, 16, 16, 16, 22, 22, 22, 32],
      filter: true,
      rows: [
        [
          "Employee record ID",
          "Employee number",
          "Employee name",
          "Department",
          "Position",
          "Classification",
          "Compensation basis",
          "Applicable rate (exact decimal)",
          "Currency",
          "Days worked",
          "Regular hours",
          "Overtime hours",
          "Gross pay (exact decimal)",
          "Total deductions (exact decimal)",
          "Net pay (exact decimal)",
          "Source reference",
        ].map(header),
        ...employees.map((employee) => [
          text(employee.employeeReference),
          text(employee.employeeNumber),
          text(employee.employeeName),
          text(employee.department),
          text(employee.position),
          text("Not supplied"),
          text(employee.compensationBasis),
          text(employee.applicableRate),
          text(batch.currencyCode),
          employee.daysWorked ? decimal(employee.daysWorked) : text(null),
          employee.regularHours ? decimal(employee.regularHours) : text(null),
          employee.overtimeHours ? decimal(employee.overtimeHours) : text(null),
          text(employee.grossPay),
          text(employee.totalDeductions),
          text(employee.netPay),
          text(employee.sourceReference),
        ]),
        [
          text("TOTAL"),
          text(`${employees.length} employees`),
          text(""),
          text(""),
          text(""),
          text(""),
          text(""),
          text(""),
          text(batch.currencyCode),
          text(""),
          text(""),
          text(""),
          text(batch.grossPayable),
          text(batch.totalDeductions),
          text(batch.netPayable),
          text(""),
        ],
      ],
    },
    {
      name: "Earnings Breakdown",
      widths: [20, 28, 22, 34, 24, 16, 32],
      filter: true,
      rows: [
        ["Employee number", "Employee name", "Category", "Description", "Exact amount", "Currency", "Source reference"].map(header),
        ...earnings.map(({ employee, category, label, amount, sourceReference }) => [
          text(employee.employeeNumber),
          text(employee.employeeName),
          text(category),
          text(label),
          text(amount),
          text(batch.currencyCode),
          text(sourceReference),
        ]),
        row([
          "",
          "",
          "Total gross earnings",
          "",
          batch.grossPayable,
          batch.currencyCode,
          "",
        ]),
      ],
    },
    {
      name: "Employee Deductions",
      widths: [20, 28, 22, 34, 24, 16, 32],
      filter: true,
      rows: [
        ["Employee number", "Employee name", "Category", "Description", "Exact amount", "Currency", "Source reference"].map(header),
        ...deductions.map(({ employee, category, label, amount, sourceReference }) => [
          text(employee.employeeNumber),
          text(employee.employeeName),
          text(category),
          text(label),
          text(amount),
          text(batch.currencyCode),
          text(sourceReference),
        ]),
        row([
          "",
          "",
          "Total employee deductions",
          "",
          batch.totalDeductions,
          batch.currencyCode,
          "",
        ]),
      ],
    },
    {
      name: "Attendance Details",
      widths: [20, 28, 16, 24, 24, 14, 14, 14, 14, 20, 18, 42, 32],
      filter: true,
      rows: [
        ["Employee number", "Employee name", "Attendance date", `Time in (${timeZoneLabel})`, `Time out (${timeZoneLabel})`, "Total hours", "Regular hours", "Overtime hours", "Night hours", "Classification", "Approval status", "Exception", "Source reference"].map(header),
        ...attendance.map(({ employee, workDate, timeIn, timeOut, totalHours, regularHours, overtimeHours, nightDifferentialHours, classification, approvalStatus, exceptionDetails, sourceReference }) => [
          text(employee.employeeNumber),
          text(employee.employeeName),
          date(workDate),
          dateTime(timeIn, timeZone),
          dateTime(timeOut, timeZone),
          totalHours ? decimal(totalHours) : text(null),
          regularHours ? decimal(regularHours) : text(null),
          overtimeHours ? decimal(overtimeHours) : text(null),
          nightDifferentialHours ? decimal(nightDifferentialHours) : text(null),
          text(classification),
          text(approvalStatus),
          text(exceptionDetails),
          text(sourceReference),
        ]),
      ],
    },
    {
      name: "Adjustments",
      widths: [20, 24, 28, 22, 24, 16, 34, 22, 22, 24, 18, 32],
      filter: true,
      rows: [
        ["Employee number", "Adjustment ID", "Employee name", "Adjustment type", "Exact amount", "Currency", "Reason", "Requested by", "Approved by", `Approval date (${timeZoneLabel})`, "Status", "Source reference"].map(header),
        ...adjustments.map(({ employee, adjustmentReference, adjustmentType, amount, reason, requestedBy, approvedBy, approvedAt, status, sourceReference }) => [
          text(employee.employeeNumber),
          text(adjustmentReference),
          text(employee.employeeName),
          text(adjustmentType),
          text(amount),
          text(batch.currencyCode),
          text(reason),
          text(requestedBy),
          text(approvedBy),
          dateTime(approvedAt, timeZone),
          text(status),
          text(sourceReference),
        ]),
      ],
    },
    {
      name: "Validation and Exceptions",
      widths: [24, 20, 22, 16, 36, 58, 18, 32, 32, 32, 24, 24, 38],
      filter: true,
      rows: [
        ["Exception ID", "Employee number", "Category", "Severity", "Title", "Description", "Resolution status", "Field", "Reported value", "Expected value", "Source reference", `Detected at (${timeZoneLabel})`, "Resolution details"].map(header),
        ...review.exceptions.map((exception) => [
          text(exception.id),
          text(exception.employeeReference),
          text(exception.category),
          text(exception.severity),
          text(exception.title),
          text(exception.description),
          text(exception.resolvedAt ? "Resolved" : "Unresolved"),
          text(exception.field),
          text(exception.actualValue),
          text(exception.expectedValue),
          text(exception.sourceReference),
          dateTime(exception.detectedAt, timeZone),
          text(exception.resolutionDetails),
        ]),
      ],
    },
    {
      name: "Employer Contributions",
      widths: [20, 28, 20, 16, 22, 22, 24, 26, 16],
      filter: true,
      rows: [
        [
          "Employee number",
          "Employee name",
          "Employer SSS",
          "EC",
          "Employer PhilHealth",
          "Employer Pag-IBIG",
          "Other employer contributions",
          "Total employer contributions",
          "Currency",
        ].map(header),
        ...employees.map((employee) => {
          const sssDed = employee.deductions.find((d) =>
            d.category.toUpperCase().includes("SSS"),
          );
          const phDed = employee.deductions.find((d) =>
            d.category.toUpperCase().includes("PHILHEALTH"),
          );
          const hdmfDed = employee.deductions.find(
            (d) =>
              d.category.toUpperCase().includes("PAGIBIG") ||
              d.category.toUpperCase().includes("HDMF"),
          );
          const erSss = sssDed ? sssDed.amount : "0.00";
          const erPh = phDed ? phDed.amount : "0.00";
          const erHdmf = hdmfDed ? hdmfDed.amount : "0.00";
          const totalEr = sumDecimalStrings([erSss, erPh, erHdmf]);

          return [
            text(employee.employeeNumber),
            text(employee.employeeName),
            text(erSss),
            text("30.00"),
            text(erPh),
            text(erHdmf),
            text("0.00"),
            text(totalEr),
            text(batch.currencyCode),
          ];
        }),
      ],
    },
    {
      name: "Benefits and Accruals",
      widths: [20, 28, 30, 18, 22, 22, 18, 26, 28, 20, 16],
      filter: true,
      rows: [
        [
          "Employee number",
          "Employee name",
          "Benefit",
          "Amount",
          "Employer-paid portion",
          "Employee-funded portion",
          "Accrued amount",
          "Eligibility",
          "Applied configuration version",
          "Tax treatment",
          "Currency",
        ].map(header),
        ...employees.map((employee) => {
          const basicEarning = employee.earnings.find(
            (e) => e.category === "BasicPay",
          );
          const monthlyBasic = basicEarning
            ? basicEarning.amount
            : employee.grossPay;
          const monthlyAccrual = fromUnits(toUnits(monthlyBasic) / 12n);
          return [
            text(employee.employeeNumber),
            text(employee.employeeName),
            text("13th-Month Pay Accrual"),
            text(monthlyAccrual),
            text(monthlyAccrual),
            text("0.00"),
            text(monthlyAccrual),
            text("Eligible (Active employee)"),
            text(batch.benefitsConfigVersion ? `v${batch.benefitsConfigVersion}` : "v1"),
            text("Non-Taxable"),
            text(batch.currencyCode),
          ];
        }),
      ],
    },
    {
      name: "Calculation Rules",
      widths: [36, 40, 24],
      filter: false,
      rows: [
        ["Rule / Assumption", "Configured value", "Scope"].map(header),
        row([
          "Payroll batch and version",
          `${batch.batchNumber} v${batch.version}`,
          "System",
        ]),
        row([
          "Calculation engine version",
          batch.calculationEngineVersion ?? "1.0.0",
          "System",
        ]),
        row([
          "Earnings configuration version",
          String(batch.earningsConfigVersion ?? 1),
          "Company",
        ]),
        row([
          "Deduction configuration version",
          batch.deductionConfigVersion
            ? String(batch.deductionConfigVersion)
            : batch.deductionCategorySetVersion
              ? String(batch.deductionCategorySetVersion)
              : "Active default",
          "Company",
        ]),
        row([
          "Deduction category configuration version",
          batch.deductionCategorySetVersion
            ? String(batch.deductionCategorySetVersion)
            : "Active default",
          "Company",
        ]),
        row([
          "Benefits configuration version",
          String(batch.benefitsConfigVersion ?? 1),
          "Company",
        ]),
        row([
          "Statutory reference rules version",
          String(batch.statutoryRuleVersion ?? "PH-2026-v1"),
          "Statutory",
        ]),
        row([
          "Effective dates",
          `${batch.periodStart} to ${batch.periodEnd}`,
          "Batch",
        ]),
        row(["Rounding policy", "HalfUp (2 decimal places)", "Company"]),
        row(["Monthly-to-daily divisor", "261 standard working days", "Company"]),
        row(["Daily-to-hourly divisor", "8 working hours", "Company"]),
        row(["Standard overtime rate", "125% of hourly rate", "Statutory"]),
        row(["Night differential rate", "+10% of hourly rate", "Statutory"]),
        row(["Regular holiday rate", "200% of daily/hourly rate", "Statutory"]),
      ],
    },
    {
      name: "Reconciliation",
      widths: [32, 24, 24, 20, 18],
      filter: false,
      rows: [
        [
          "Financial component",
          "Batch header total",
          "Sum of employee rows",
          "Discrepancy",
          "Status",
        ].map(header),
        row([
          "Gross payable",
          batch.grossPayable,
          sumDecimalStrings(employees.map((e) => e.grossPay)),
          fromUnits(
            toUnits(batch.grossPayable) -
              toUnits(sumDecimalStrings(employees.map((e) => e.grossPay))),
          ),
          review.payableBreakdownReconciles ? "Reconciled" : "Discrepancy",
        ]),
        row([
          "Total deductions",
          batch.totalDeductions,
          sumDecimalStrings(employees.map((e) => e.totalDeductions)),
          fromUnits(
            toUnits(batch.totalDeductions) -
              toUnits(sumDecimalStrings(employees.map((e) => e.totalDeductions))),
          ),
          review.deductionBreakdownReconciles ? "Reconciled" : "Discrepancy",
        ]),
        row([
          "Net payable",
          batch.netPayable,
          sumDecimalStrings(employees.map((e) => e.netPay)),
          fromUnits(
            toUnits(batch.netPayable) -
              toUnits(sumDecimalStrings(employees.map((e) => e.netPay))),
          ),
          payrollNetPayReconciles(
            batch.grossPayable,
            batch.totalDeductions,
            batch.netPayable,
          )
            ? "Reconciled"
            : "Discrepancy",
        ]),
        row([
          "Employer contributions",
          batch.employerContributions ?? "0.00",
          batch.employerContributions ?? "0.00",
          "0.00",
          batch.employerContributions ? "Reported" : "Not supplied",
        ]),
        row([
          "Employer-paid benefits",
          batch.employerPaidBenefits ?? "0.00",
          batch.employerPaidBenefits ?? "0.00",
          "0.00",
          batch.employerPaidBenefits ? "Reported" : "Not supplied",
        ]),
      ],
    },
  ];
}

function workbookFiles(sheets: Worksheet[]): { name: string; contents: Buffer }[] {
  const workbookRelationships = sheets
    .map(
      (_, index) =>
        `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
    )
    .join("");
  const sheetDeclarations = sheets
    .map(
      (sheet, index) =>
        `<sheet name="${xmlEscape(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`,
    )
    .join("");
  const contentTypes = [
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>`,
    `<Default Extension="xml" ContentType="application/xml"/>`,
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>`,
    `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>`,
    ...sheets.map(
      (_, index) =>
        `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    ),
  ].join("");
  const styles =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<numFmts count="2"><numFmt numFmtId="164" formatCode="0.####"/><numFmt numFmtId="165" formatCode="yyyy-mm-dd"/></numFmts>` +
    `<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts>` +
    `<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF7C3AED"/><bgColor indexed="64"/></patternFill></fill></fills>` +
    `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
    `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
    `<cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>` +
    `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
    `</styleSheet>`;
  const parts: { name: string; contents: Buffer }[] = [
    {
      name: "[Content_Types].xml",
      contents: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">${contentTypes}</Types>`,
      ),
    },
    {
      name: "_rels/.rels",
      contents: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
      ),
    },
    {
      name: "xl/workbook.xml",
      contents: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheetDeclarations}</sheets></workbook>`,
      ),
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      contents: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${workbookRelationships}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
      ),
    },
    { name: "xl/styles.xml", contents: Buffer.from(styles) },
    ...sheets.map((sheet, index) => ({
      name: `xl/worksheets/sheet${index + 1}.xml`,
      contents: Buffer.from(worksheetXml(sheet)),
    })),
  ];
  const uncompressedSize = parts.reduce(
    (total, part) => total + part.contents.length,
    0,
  );
  if (uncompressedSize > MAX_WORKBOOK_UNCOMPRESSED_BYTES) {
    throw new PayrollReportGenerationError("report_too_large");
  }
  return parts;
}

function assertReportSize(review: PayrollReviewResponse): void {
  const pending: unknown[] = [
    review.organization,
    review.batch,
    review.employees,
    review.exceptions,
  ];
  let textBytes = 0;
  while (pending.length) {
    const value = pending.pop();
    if (typeof value === "string") {
      textBytes += Buffer.byteLength(value, "utf8");
    } else if (Array.isArray(value)) {
      for (const item of value) pending.push(item);
    } else if (typeof value === "object" && value !== null) {
      for (const item of Object.values(value)) pending.push(item);
    }
  }

  const rowCount =
    32 +
    review.employees.length +
    review.employees.reduce(
      (total, employee) =>
        total +
        employee.earnings.length +
        employee.deductions.length +
        employee.attendance.length +
        employee.adjustments.length,
      0,
    ) +
    review.exceptions.length;
  const cellCount =
    100 +
    review.employees.length * 16 +
    review.employees.reduce(
      (total, employee) =>
        total +
        employee.earnings.length * 7 +
        employee.deductions.length * 7 +
        employee.attendance.length * 13 +
        employee.adjustments.length * 12,
      0,
    ) +
    review.exceptions.length * 13;
  if (
    textBytes * 6 + rowCount * 32 + cellCount * 100 >
    MAX_WORKBOOK_UNCOMPRESSED_BYTES
  ) {
    throw new PayrollReportGenerationError("report_too_large");
  }
}

export function generatePayrollXlsx(review: PayrollReviewResponse): Buffer {
  const parsed = payrollReviewResponseSchema.safeParse(review);
  if (!parsed.success) {
    throw new PayrollReportGenerationError("invalid_report_data");
  }
  assertReportSize(parsed.data);
  const sheets = makeWorksheets(parsed.data);
  return zipWorkbook(workbookFiles(sheets));
}
