import nodemailer from "nodemailer";

function createTransport() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    throw new Error("SMTP_USER and SMTP_PASS environment variables are required for email sending");
  }

  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS || 10000),
    greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT_MS || 10000),
    socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT_MS || 12000),
    requireTLS: true,
    tls: {
      minVersion: "TLSv1.2",
      rejectUnauthorized: true,
    },
  });
}

async function tryResendFallback(toEmail: string, code: string): Promise<boolean> {
  const hasResend = !!process.env.RESEND_API_KEY || !!process.env.REPLIT_CONNECTORS_HOSTNAME;
  if (!hasResend) return false;

  try {
    const { sendOtpEmail: sendViaResend } = await import("./resend");
    await sendViaResend(toEmail, code);
    console.warn("[mailer] SMTP failed; OTP sent via Resend fallback.");
    return true;
  } catch (fallbackErr) {
    console.error("[mailer] Resend fallback also failed:", fallbackErr);
    return false;
  }
}

export async function sendOtpEmail(toEmail: string, code: string): Promise<void> {
  const transport = createTransport();
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER!;

  try {
    await transport.sendMail({
      from: `"Colyx" <${fromEmail}>`,
      to: toEmail,
      subject: "Your Colyx verification code",
      html: `
      <div style="font-family: Inter, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #f8f8fb;">
        <div style="background: #fff; border-radius: 20px; padding: 36px; box-shadow: 0 2px 16px rgba(91,79,232,0.08);">
          <div style="text-align: center; margin-bottom: 28px;">
            <div style="display: inline-block; background: #EDE9FE; border-radius: 16px; padding: 14px 20px; margin-bottom: 16px;">
              <span style="font-size: 28px;">🎓</span>
            </div>
            <h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: #1a1a2e;">Colyx</h1>
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Email Verification</p>
          </div>

          <p style="color: #374151; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
            Hi there! Use the code below to verify your college email and complete your Colyx registration.
          </p>

          <div style="background: #f3f0ff; border: 2px solid #5B4FE8; border-radius: 16px; padding: 28px; text-align: center; margin: 24px 0;">
            <p style="color: #5B4FE8; font-size: 12px; font-weight: 600; letter-spacing: 2px; margin: 0 0 12px; text-transform: uppercase;">Verification Code</p>
            <div style="letter-spacing: 10px; font-size: 40px; font-weight: 800; color: #1a1a2e; font-family: monospace;">${code}</div>
            <p style="color: #6b7280; font-size: 12px; margin: 12px 0 0;">Expires in 10 minutes</p>
          </div>

          <p style="color: #9ca3af; font-size: 13px; text-align: center; margin-top: 24px; line-height: 1.5;">
            If you didn't request this code, you can safely ignore this email.
          </p>
        </div>
      </div>
    `,
      text: `Your Colyx verification code is: ${code}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this, ignore this email.`,
    });
    return;
  } catch (smtpErr: any) {
    console.error("[mailer] SMTP send failed:", smtpErr);
    const sentViaFallback = await tryResendFallback(toEmail, code);
    if (sentViaFallback) return;
    throw smtpErr;
  }
}