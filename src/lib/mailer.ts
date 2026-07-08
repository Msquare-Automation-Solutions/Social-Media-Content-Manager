// Email sending. Dev logs the link to the console (no SMTP needed); production
// would send via Resend using RESEND_API_KEY / EMAIL_FROM.

type MailKind = "invite" | "reset";

export async function sendLinkEmail(
  kind: MailKind,
  to: string,
  link: string,
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    const label = kind === "invite" ? "INVITE" : "PASSWORD RESET";
    console.log(
      `\n📧  [${label}] for ${to}\n    ${link}\n    (dev mode — no email sent; RESEND_API_KEY not set)\n`,
    );
    return;
  }
  // Production Resend send would go here.
  console.log(`[mailer] would send ${kind} email to ${to} via Resend`);
}
