import { Resend } from "resend"

export const resend = new Resend(process.env.RESEND_API_KEY)

export const ADMIN_EMAILS = (process.env.ADMIN_NOTIFICATION_EMAILS ?? "")
  .split(",")
  .map(e => e.trim())
  .filter(Boolean)

export async function sendAdminEmail(subject: string, html: string) {
  if (!process.env.RESEND_API_KEY || ADMIN_EMAILS.length === 0) return
  await resend.emails.send({
    from:    process.env.RESEND_FROM_EMAIL ?? "noreply@sucataosperanza.com.br",
    to:      ADMIN_EMAILS,
    subject,
    html,
  })
}
