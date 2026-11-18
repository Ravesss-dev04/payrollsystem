import "server-only";
import nodemailer from "nodemailer";

export type InvitationEmail = {
  recipientName: string;
  recipientEmail: string;
  roleLabel: string;
  departmentName: string;
  organizationName: string;
  message: string | null;
  invitationUrl: string;
  expiresAt: Date;
};

export class SmtpDeliveryError extends Error {
  constructor(
    public readonly code:
      | "email_not_configured"
      | "email_delivery_failed",
    public readonly status: 503,
  ) {
    super(code);
  }
}

function requiredValue(
  environment: NodeJS.ProcessEnv,
  name: string,
): string {
  const value = environment[name]?.trim();
  if (!value) {
    throw new SmtpDeliveryError("email_not_configured", 503);
  }
  return value;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendInvitationEmail(
  invitation: InvitationEmail,
  environment: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  const host = requiredValue(environment, "SMTP_HOST");
  const from = requiredValue(environment, "SMTP_FROM");
  const port = Number(requiredValue(environment, "SMTP_PORT"));
  const username = environment.SMTP_USER?.trim();
  const password = environment.SMTP_PASSWORD;
  const secureValue = environment.SMTP_SECURE?.trim().toLowerCase();

  if (
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65_535 ||
    (secureValue !== undefined &&
      secureValue !== "" &&
      secureValue !== "true" &&
      secureValue !== "false") ||
    (!!username !== !!password)
  ) {
    throw new SmtpDeliveryError("email_not_configured", 503);
  }

  const secure = secureValue ? secureValue === "true" : port === 465;
  const transport = nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: !secure,
    ...(username && password
      ? { auth: { user: username, pass: password } }
      : {}),
  });
  const safeName = escapeHtml(invitation.recipientName);
  const safeOrganization = escapeHtml(invitation.organizationName);
  const safeMessage = invitation.message
    ? escapeHtml(invitation.message).replaceAll("\n", "<br>")
    : "";
  const expiresAt = invitation.expiresAt.toISOString();
  const subject = `${invitation.organizationName} invited you to Payroll System`;
  const text = [
    `Hello ${invitation.recipientName},`,
    invitation.message ?? "",
    `You have been invited to join ${invitation.organizationName} as ${invitation.roleLabel} in ${invitation.departmentName}.`,
    `Create your account: ${invitation.invitationUrl}`,
    `This invitation link is valid for exactly 48 hours, until ${expiresAt}.`,
  ]
    .filter(Boolean)
    .join("\n\n");
  const html = [
    `<p>Hello ${safeName},</p>`,
    safeMessage ? `<p>${safeMessage}</p>` : "",
    `<p>You have been invited to join ${safeOrganization} as ${escapeHtml(invitation.roleLabel)} in ${escapeHtml(invitation.departmentName)}.</p>`,
    `<p><a href="${escapeHtml(invitation.invitationUrl)}">Create your account</a></p>`,
    `<p>This invitation link is valid for exactly 48 hours, until <time>${expiresAt}</time>.</p>`,
  ].join("");

  try {
    await transport.sendMail({
      from,
      to: invitation.recipientEmail,
      subject,
      text,
      html,
    });
  } catch {
    throw new SmtpDeliveryError("email_delivery_failed", 503);
  } finally {
    transport.close();
  }
}
