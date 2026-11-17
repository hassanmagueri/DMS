import nodemailer from "nodemailer";

export function mailConfigured() {
  return Boolean(process.env.SMTP_HOST);
}

export function devSkipEmail() {
  return (process.env.DEV_SKIP_EMAIL || "dev@dms.io").trim().toLowerCase();
}

export function isDevSkipEmail(email: string) {
  if (process.env.NODE_ENV === "production") return false;
  return email.trim().toLowerCase() === devSkipEmail();
}

export async function sendMail(to: string, subject: string, text: string) {
  if (process.env.NODE_ENV === "test") return;
  const host = process.env.SMTP_HOST;
  if (!host) return;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user ? { user, pass } : undefined,
  });
  await transporter.sendMail({
    from: process.env.SMTP_FROM || user || "dms@localhost",
    to,
    subject,
    text,
  });
}

export async function sendSignupCode(to: string, code: string) {
  await sendMail(to, "Confirm your DMS account", `Your sign-up code is ${code}. It expires in 10 minutes.`);
}

export async function sendLinkCode(to: string, code: string) {
  await sendMail(
    to,
    "Link your DMS account",
    `Your code to link this account to ${to} is ${code}. It expires in 10 minutes.`,
  );
}
