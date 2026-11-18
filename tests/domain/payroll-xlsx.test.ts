import { describe, expect, it } from "bun:test";
import { Buffer } from "node:buffer";
import { inflateRawSync } from "node:zlib";
import {
  payrollReviewResponseSchema,
  type PayrollReviewResponse,
} from "../../app/lib/payroll-results/views";
import {
  generatePayrollXlsx,
  PayrollReportGenerationError,
} from "../../app/lib/payroll-results/xlsx";

const review: PayrollReviewResponse = payrollReviewResponseSchema.parse({
  organization: {
    name: "Example Organization",
    timeZone: "Asia/Manila",
  },
  batch: {
    id: "batch-1",
    batchNumber: "PAY-1",
    versionId: "version-1",
    version: 1,
    status: "Approved",
    periodStart: "2026-11-01",
    periodEnd: "2026-11-15",
    cutoffReference: "cutoff-1",
    currencyCode: "PHP",
    sourceReference: "source-1",
    sourceCalculatedAt: "2026-11-16T00:00:00.000Z",
    preparedBy: "HR",
    submittedBy: "HR",
    submittedAt: "2026-11-16T00:01:00.000Z",
    employeeCount: 1,
    recordedEmployeeCount: 1,
    grossPayable: "100.25",
    totalDeductions: "10.25",
    netPayable: "90",
    employerContributions: null,
    laborCost: null,
    overtimeCost: null,
    deductionCategorySetVersion: null,
  },
  payableBreakdown: [{ category: "BasicPay", amount: "100.25" }],
  payableBreakdownReconciles: true,
  deductionBreakdown: [{ category: "AuthorizedOther", amount: "10.25" }],
  deductionBreakdownReconciles: true,
  employees: [
    {
      id: "row-1",
      employeeReference: "employee-1",
      employeeNumber: "00017",
      employeeName: '=HYPERLINK("https://example.invalid","pay")',
      department: "Operations",
      position: null,
      compensationBasis: "Monthly",
      applicableRate: "100.25",
      daysWorked: "1",
      regularHours: "8",
      overtimeHours: "0",
      grossPay: "100.25",
      totalDeductions: "10.25",
      netPay: "90",
      sourceReference: "employee-source",
      earnings: [
        {
          category: "BasicPay",
          label: "=1+1",
          amount: "100.25",
          sourceReference: "earning-1",
        },
      ],
      deductions: [
        {
          category: "AuthorizedOther",
          label: "Deduction",
          amount: "10.25",
          sourceReference: "deduction-1",
        },
      ],
      attendance: [
        {
          sourceReference: "attendance-1",
          workDate: "2026-11-02",
          timeIn: "2026-11-02T01:00:00.000Z",
          timeOut: "2026-11-02T09:00:00.000Z",
          totalHours: "8",
          regularHours: "8",
          overtimeHours: "0",
          nightDifferentialHours: "0",
          classification: "Present",
          approvalStatus: "Approved",
          exceptionDetails: null,
        },
      ],
      adjustments: [],
    },
  ],
  exceptions: [],
  decisions: [
    {
      decision: "Approved",
      reason: null,
      actor: "Admin",
      createdAt: "2026-11-16T00:02:00.000Z",
    },
  ],
  audit: [],
});

function zipEntries(workbook: Buffer): Map<string, string> {
  const entries = new Map<string, string>();
  let offset = 0;
  while (workbook.readUInt32LE(offset) === 0x04034b50) {
    const compressedSize = workbook.readUInt32LE(offset + 18);
    const nameLength = workbook.readUInt16LE(offset + 26);
    const extraLength = workbook.readUInt16LE(offset + 28);
    const method = workbook.readUInt16LE(offset + 8);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const name = workbook.toString("utf8", nameStart, nameStart + nameLength);
    const compressed = workbook.subarray(dataStart, dataStart + compressedSize);
    const contents =
      method === 8 ? inflateRawSync(compressed) : Buffer.from(compressed);
    entries.set(name, contents.toString("utf8"));
    offset = dataStart + compressedSize;
  }
  return entries;
}

describe("payroll XLSX reports", () => {
  it("writes the exact version into eleven sheets and keeps user text out of formulas", () => {
    const workbook = generatePayrollXlsx(review);
    expect(workbook.subarray(0, 2).toString("ascii")).toBe("PK");

    const entries = zipEntries(workbook);
    const workbookXml = entries.get("xl/workbook.xml") ?? "";
    expect(workbookXml.match(/<sheet /g)).toHaveLength(11);
    expect(workbookXml).toContain("Validation and Exceptions");
    expect(workbookXml).toContain("Employer Contributions");
    expect(workbookXml).toContain("Benefits and Accruals");
    expect(workbookXml).toContain("Calculation Rules");
    expect(workbookXml).toContain("Reconciliation");
    for (let sheet = 1; sheet <= 11; sheet += 1) {
      expect(entries.has(`xl/worksheets/sheet${sheet}.xml`)).toBe(true);
    }

    const employeeSheet = entries.get("xl/worksheets/sheet2.xml") ?? "";
    expect(employeeSheet).toContain("00017");
    expect(employeeSheet).toContain('t="inlineStr"');
    expect(employeeSheet).toContain("=HYPERLINK");
    expect(employeeSheet).not.toContain("<f>");
    expect(employeeSheet).toContain("100.25");
    const summarySheet = entries.get("xl/worksheets/sheet1.xml") ?? "";
    expect(summarySheet).toContain("Example Organization");
    expect(summarySheet).toContain("Prepared by");
    expect(summarySheet).toContain("Payroll version ID");
    expect(summarySheet).toContain("Deduction category configuration version");
    expect(summarySheet).toContain("Not captured");
    expect(summarySheet).toContain("Total gross earnings");
    expect(summarySheet).toContain("Total employee deductions");
    expect(summarySheet).toContain(
      "Earnings breakdown reconciles to gross payable",
    );
    expect(summarySheet).toContain("Yes");
    expect(summarySheet).toContain(
      "Submitted HR snapshot; not independently verified or approved",
    );
    expect(summarySheet).toContain(
      "Deduction breakdown reconciles to total deductions",
    );
    expect(summarySheet).toContain(
      "Submitted HR snapshot; eligibility and approval not independently verified",
    );
    expect(summarySheet).toContain("2026-11-16T08:01:00.000+08:00[Asia/Manila]");

    // Benefits and Accruals sheet has Eligibility and Applied configuration version columns
    const benefitsSheet = entries.get("xl/worksheets/sheet9.xml") ?? "";
    expect(benefitsSheet).toContain("Eligibility");
    expect(benefitsSheet).toContain("Applied configuration version");
    expect(benefitsSheet).toContain("Eligible (Active employee)");

    // Calculation Rules sheet has batch/version and effective dates
    const rulesSheet = entries.get("xl/worksheets/sheet10.xml") ?? "";
    expect(rulesSheet).toContain("Payroll batch and version");
    expect(rulesSheet).toContain("Deduction configuration version");
    expect(rulesSheet).toContain("Effective dates");

    // Reconciliation sheet has employer contributions and employer-paid benefits rows
    const reconciliationSheet = entries.get("xl/worksheets/sheet11.xml") ?? "";
    expect(reconciliationSheet).toContain("Employer contributions");
    expect(reconciliationSheet).toContain("Employer-paid benefits");

    const attendanceSheet = entries.get("xl/worksheets/sheet5.xml") ?? "";
    expect(attendanceSheet).toContain("Time in (Asia/Manila)");
    expect(attendanceSheet).toContain("2026-11-02T09:00:00.000+08:00[Asia/Manila]");
    expect(
      [...entries.entries()]
        .filter(([name]) => name.startsWith("xl/worksheets/"))
        .every(([, contents]) => !contents.includes("<f>")),
    ).toBe(true);
  });

  it("uses the review API's exact category totals instead of recalculating them", () => {
    const report = generatePayrollXlsx({
      ...review,
      payableBreakdown: [{ category: "BasicPay", amount: "100.26" }],
    });
    const summary = zipEntries(report).get("xl/worksheets/sheet1.xml") ?? "";
    expect(summary).toContain("100.26");
  });

  it("generates identical bytes from identical submitted-version snapshots", () => {
    expect(generatePayrollXlsx(review).equals(generatePayrollXlsx(review))).toBe(
      true,
    );
  });

  it("uses an explicit UTC fallback when historical context was not captured", () => {
    const report = generatePayrollXlsx({
      ...review,
      organization: { name: null, timeZone: null },
      batch: {
        ...review.batch,
        preparedBy: "Historical account name not captured",
        submittedBy: "Historical account name not captured",
      },
    });
    const summary = zipEntries(report).get("xl/worksheets/sheet1.xml") ?? "";
    expect(summary).toContain("Not configured; timestamps shown in UTC");
    expect(summary).toContain("[UTC]");
    expect(summary).toContain("Historical account name not captured");
  });

  it("rejects XML-incompatible stored text rather than producing a broken workbook", () => {
    const invalidReview: PayrollReviewResponse = {
      ...review,
      employees: review.employees.map((employee) => ({
        ...employee,
        employeeName: "Invalid\u0001text",
      })),
    };
    expect(() => generatePayrollXlsx(invalidReview)).toThrow(
      PayrollReportGenerationError,
    );
  });

  it("rejects monetary values outside the stored decimal precision", () => {
    const invalidReview: PayrollReviewResponse = {
      ...review,
      batch: { ...review.batch, grossPayable: "100.12345" },
    };
    expect(() => generatePayrollXlsx(invalidReview)).toThrow(
      PayrollReportGenerationError,
    );
  });
});
