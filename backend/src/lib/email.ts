import { fetchWithRetry } from "./httpRetry";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

async function sendViaResend(message: EmailMessage, apiKey: string): Promise<void> {
  // Real Resend API (api.resend.com/emails) — not the generic webhook
  // contract, a dedicated integration for the actual provider in use.
  // Without a verified sending domain (EMAIL_FROM defaults to Resend's own
  // onboarding@resend.dev sandbox sender), Resend only delivers to the
  // account owner's own registered email — a real, documented limitation,
  // not a bug here. Verifying a domain removes that restriction.
  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";
  const res = await fetchWithRetry("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ from, to: message.to, subject: message.subject, text: message.text }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend send failed: ${res.status} ${body}`);
  }
}

/**
 * Resolves to a real provider when RESEND_API_KEY is set (a dedicated
 * integration, since Resend's actual API doesn't match any generic
 * contract). Falls back to EMAIL_WEBHOOK_URL — a generic {to, subject,
 * text} POST — for any other provider, same "real structure, thin adapter
 * needed" pattern as everywhere else in this app. With neither configured,
 * this degrades to a clearly-labeled no-op rather than silently pretending
 * to work, same as Ticketmaster/SeatGeek/Google Places without a key.
 */
export async function sendEmail(message: EmailMessage): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    await sendViaResend(message, resendKey);
    return;
  }

  const webhookUrl = process.env.EMAIL_WEBHOOK_URL;
  if (!webhookUrl) {
    // A password-reset email carries a raw, unhashed secret in its body.
    // Logging that in full is fine for a developer's own local terminal,
    // but this same fallback would also fire in a misconfigured production
    // deploy — and a raw reset token reaching a centralized log aggregator
    // (Datadog, CloudWatch, ...) is a real account-takeover vector, not a
    // hypothetical one. Failing loudly in production is safer than
    // succeeding silently while leaking the secret into logs.
    if (process.env.NODE_ENV === "production") {
      throw new Error("No email provider configured — refusing to silently drop or log this email");
    }
    console.warn(`[email] No provider configured — would have sent:`, message);
    return;
  }

  const res = await fetchWithRetry(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
  });
  if (!res.ok) {
    throw new Error(`Email send failed: ${res.status}`);
  }
}
