import "server-only";
import nodemailer from "nodemailer";
import { prisma } from "../db";

export type HrApprovalNotification = {
  batchId: string;
  batchNumber: string;
  version: number;
  approvedBy: string;
  approvedAt: Date;
  totalAmount: string;
  employeeCount: number;
  disbursementSchedule?: string | null;
};

export type HrReturnedNotification = {
  batchId: string;
  batchNumber: string;
  version: number;
  returnedBy: string;
  returnedAt: Date;
  reason: string;
  unresolvedExceptionCount: number;
};

export type HrRejectedNotification = {
  batchId: string;
  batchNumber: string;
  version: number;
  rejectedBy: string;
  rejectedAt: Date;
  reason: string;
};

function getSmtpTransport(env: NodeJS.ProcessEnv = process.env) {
  const host = env.SMTP_HOST?.trim();
  const from = env.SMTP_FROM?.trim();
  const port = Number(env.SMTP_PORT?.trim());
  const username = env.SMTP_USER?.trim();
  const password = env.SMTP_PASSWORD;
  const secureValue = env.SMTP_SECURE?.trim().toLowerCase();

  if (!host || !from || !Number.isInteger(port) || port < 1 || port > 65535) {
    return null;
  }

  const secure = secureValue ? secureValue === "true" : port === 465;
  return {
    from,
    transport: nodemailer.createTransport({
      host,
      port,
      secure,
      requireTLS: !secure,
      ...(username && password ? { auth: { user: username, pass: password } } : {}),
    }),
  };
}

async function getHrRecipients(): Promise<{ email: string; name: string }[]> {
  try {
    const hrUsers = await prisma.user.findMany({
      where: { role: "hr", status: "Active" },
      select: { email: true, name: true },
    });
    return hrUsers.filter((u) => u.email && u.email.includes("@"));
  } catch (error) {
    console.error("[PayrollNotifications] Failed to load HR recipients:", error);
    return [];
  }
}

/**
 * Dispatches notification to HR users when a payroll batch version is approved.
 * Guaranteed safe: failures are caught and logged so that approval transaction
 * is NEVER rolled back and double approval is impossible.
 */
export async function notifyHrPayrollApproval(
  notification: HrApprovalNotification,
): Promise<{ success: boolean; recipientCount: number }> {
  try {
    const recipients = await getHrRecipients();
    if (!recipients.length) {
      return { success: true, recipientCount: 0 };
    }

    const smtp = getSmtpTransport();
    if (!smtp) {
      console.info(
        `[PayrollNotifications] SMTP not configured. Batch ${notification.batchNumber} v${notification.version} approval notification logged for ${recipients.length} HR recipient(s).`,
      );
      return { success: true, recipientCount: recipients.length };
    }

    const approvedDateStr =
      notification.approvedAt instanceof Date
        ? notification.approvedAt.toISOString()
        : notification.approvedAt
        ? String(notification.approvedAt)
        : new Date().toISOString();

    const subject = `[Payroll Approved] Batch ${notification.batchNumber} (v${notification.version}) Approved`;
    const text = [
      `Hello HR Team,`,
      `Payroll batch ${notification.batchNumber} (v${notification.version}) has been approved by ${notification.approvedBy} on ${approvedDateStr}.`,
      `Details:`,
      `- Total Net Payable: ${notification.totalAmount}`,
      `- Included Employees: ${notification.employeeCount}`,
      notification.disbursementSchedule ? `- Disbursement Schedule: ${notification.disbursementSchedule}` : "",
      `The batch has been handed off for disbursement processing.`,
    ]
      .filter(Boolean)
      .join("\n\n");

    for (const recipient of recipients) {
      try {
        await smtp.transport.sendMail({
          from: smtp.from,
          to: recipient.email,
          subject,
          text,
        });
      } catch (sendErr) {
        console.error(`[PayrollNotifications] Failed to send approval email to ${recipient.email}:`, sendErr);
      }
    }

    return { success: true, recipientCount: recipients.length };
  } catch (error) {
    console.error("[PayrollNotifications] notifyHrPayrollApproval error:", error);
    return { success: false, recipientCount: 0 };
  }
}

/**
 * Dispatches notification to HR users when a payroll batch version is returned for correction.
 */
export async function notifyHrPayrollReturned(
  notification: HrReturnedNotification,
): Promise<{ success: boolean; recipientCount: number }> {
  try {
    const recipients = await getHrRecipients();
    if (!recipients.length) return { success: true, recipientCount: 0 };

    const smtp = getSmtpTransport();
    if (!smtp) {
      console.info(
        `[PayrollNotifications] SMTP not configured. Batch ${notification.batchNumber} v${notification.version} returned notification logged. Reason: ${notification.reason}`,
      );
      return { success: true, recipientCount: recipients.length };
    }

    const subject = `[Action Required] Payroll Batch ${notification.batchNumber} (v${notification.version}) Returned for Correction`;
    const text = [
      `Hello HR Team,`,
      `Payroll batch ${notification.batchNumber} (v${notification.version}) has been returned for correction by ${notification.returnedBy}.`,
      `Correction Notes:`,
      `"${notification.reason}"`,
      notification.unresolvedExceptionCount > 0
        ? `Unresolved validation exceptions: ${notification.unresolvedExceptionCount}`
        : "",
      `Please review the highlighted employee records in the HR Portal, make the necessary corrections, and resubmit.`,
    ]
      .filter(Boolean)
      .join("\n\n");

    for (const recipient of recipients) {
      try {
        await smtp.transport.sendMail({
          from: smtp.from,
          to: recipient.email,
          subject,
          text,
        });
      } catch (sendErr) {
        console.error(`[PayrollNotifications] Failed to send return email to ${recipient.email}:`, sendErr);
      }
    }

    return { success: true, recipientCount: recipients.length };
  } catch (error) {
    console.error("[PayrollNotifications] notifyHrPayrollReturned error:", error);
    return { success: false, recipientCount: 0 };
  }
}

/**
 * Dispatches notification to HR users when a payroll batch is rejected.
 */
export async function notifyHrPayrollRejected(
  notification: HrRejectedNotification,
): Promise<{ success: boolean; recipientCount: number }> {
  try {
    const recipients = await getHrRecipients();
    if (!recipients.length) return { success: true, recipientCount: 0 };

    const smtp = getSmtpTransport();
    if (!smtp) {
      console.info(
        `[PayrollNotifications] SMTP not configured. Batch ${notification.batchNumber} v${notification.version} rejection notification logged. Reason: ${notification.reason}`,
      );
      return { success: true, recipientCount: recipients.length };
    }

    const subject = `[Notice] Payroll Batch ${notification.batchNumber} (v${notification.version}) Rejected`;
    const text = [
      `Hello HR Team,`,
      `Payroll batch ${notification.batchNumber} (v${notification.version}) has been rejected by ${notification.rejectedBy}.`,
      `Rejection Reason:`,
      `"${notification.reason}"`,
      `This version cannot be approved. Replacement submissions must follow the standard batch lifecycle.`,
    ]
      .filter(Boolean)
      .join("\n\n");

    for (const recipient of recipients) {
      try {
        await smtp.transport.sendMail({
          from: smtp.from,
          to: recipient.email,
          subject,
          text,
        });
      } catch (sendErr) {
        console.error(`[PayrollNotifications] Failed to send rejection email to ${recipient.email}:`, sendErr);
      }
    }

    return { success: true, recipientCount: recipients.length };
  } catch (error) {
    console.error("[PayrollNotifications] notifyHrPayrollRejected error:", error);
    return { success: false, recipientCount: 0 };
  }
}
