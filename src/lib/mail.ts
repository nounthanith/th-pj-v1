// src/lib/mail.ts
import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT ?? 587);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!host || !user || !pass) {
    throw new Error("Email configuration is missing. Check EMAIL_HOST/USER/PASS.");
  }

  transporter ??= nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return transporter;
}

export async function sendOtpEmail(to: string, name: string, otp: string) {
  const fromName = process.env.EMAIL_FROM_NAME ?? "Your Shop Name";
  const fromEmail = process.env.EMAIL_FROM_EMAIL ?? process.env.EMAIL_USER!;
  const expiresIn = process.env.EMAIL_OTP_EXPIRES_MINUTES ?? "10";

  await getTransporter().sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject: "Your email verification code",
    text: `Hi ${name},\n\nYour verification code is ${otp}.\nIt expires in ${expiresIn} minutes.\n\nIf you did not request this, you can ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Verify your email</h2>
        <p>Hi ${escapeHtml(name)},</p>
        <p>Use this code to verify your email address:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px;">${otp}</p>
        <p>This code expires in ${escapeHtml(expiresIn)} minutes.</p>
        <p>If you did not request this, you can ignore this email.</p>
      </div>
    `,
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
