// Unified notification seam for SMS / Email / WhatsApp / Push.
//
// Design goals:
//  - ONE interface; providers swap by editing this file, not call sites.
//  - Functional with zero credentials: an unconfigured channel logs and returns
//    { status: "skipped" } instead of throwing, so the app never breaks waiting
//    on a provider account.
//  - No fabricated success: a real send that fails returns { status: "error" }.
//
// ponytail: no durable queue / retry / rate-limit / template store yet — those
// are speculative until a provider account AND measurable volume exist. Today
// this is a direct fire-and-forget send with graceful skip. Upgrade path:
// enqueue DeliveryResult rows in a `notifications` table + a worker that retries
// on status="error"; add per-recipient rate limiting there, not here.
//
// The existing phone-OTP flow (src/lib/phone.functions.ts → msg91.server.ts)
// intentionally stays separate: OTP is latency-critical and needs its own error
// surface. This seam is for NON-OTP notifications (interest received, match
// found, profile approved, reminders).

export type Channel = "sms" | "email" | "whatsapp" | "push";

export type NotificationInput = {
  channel: Channel;
  to: string; // E.164 phone, email address, or push token
  body: string;
  subject?: string; // email only
};

export type DeliveryResult = {
  channel: Channel;
  provider: string;
  status: "sent" | "skipped" | "error";
  detail?: string;
};

type Provider = {
  name: string;
  configured: () => boolean;
  send: (input: NotificationInput) => Promise<void>; // throws on failure
};

// --- SMS: MSG91 (India). Reuses the same MSG91_AUTH_KEY as OTP. ---
const msg91Sms: Provider = {
  name: "msg91",
  configured: () => !!process.env.MSG91_AUTH_KEY,
  async send({ to, body }) {
    const params = new URLSearchParams({
      authkey: process.env.MSG91_AUTH_KEY!,
      mobiles: to.replace("+", ""),
      message: body,
      sender: process.env.MSG91_SENDER_ID || "JNGAMA",
      route: "4",
      country: "91",
    });
    if (process.env.MSG91_DLT_TEMPLATE_ID)
      params.set("DLT_TE_ID", process.env.MSG91_DLT_TEMPLATE_ID);
    const res = await fetch("https://api.msg91.com/api/sendhttp.php?" + params.toString());
    if (!res.ok) throw new Error(`msg91 ${res.status}: ${await res.text()}`);
  },
};

// --- Email: Resend (recommended, generous free tier). ---
const resendEmail: Provider = {
  name: "resend",
  configured: () => !!process.env.RESEND_API_KEY,
  async send({ to, subject, body }) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "Jangama Matrimony <noreply@jangamamatrimony.com>",
        to,
        subject: subject ?? "Jangama Matrimony",
        text: body,
      }),
    });
    if (!res.ok) throw new Error(`resend ${res.status}: ${await res.text()}`);
  },
};

// --- WhatsApp: MSG91 WhatsApp (same vendor as SMS). Declared, unconfigured. ---
const msg91Whatsapp: Provider = {
  name: "msg91-whatsapp",
  configured: () => !!process.env.MSG91_WHATSAPP_KEY,
  async send() {
    // ponytail: wire the MSG91 WhatsApp template API when MSG91_WHATSAPP_KEY +
    // an approved template exist. Until then this channel reports "skipped".
    throw new Error("whatsapp provider not implemented (awaiting approved template)");
  },
};

// --- Push: declared, unconfigured (FCM/Web Push added with the mobile app). ---
const noopPush: Provider = {
  name: "push",
  configured: () => false,
  async send() {
    throw new Error("push provider not implemented");
  },
};

const PROVIDERS: Record<Channel, Provider> = {
  sms: msg91Sms,
  email: resendEmail,
  whatsapp: msg91Whatsapp,
  push: noopPush,
};

/**
 * Send one notification. Never throws — returns a DeliveryResult so callers can
 * log/store outcomes. Unconfigured channel => status "skipped" (app stays up).
 */
export async function sendNotification(input: NotificationInput): Promise<DeliveryResult> {
  const provider = PROVIDERS[input.channel];
  if (!provider.configured()) {
    console.warn(`[notify] ${input.channel} skipped — ${provider.name} not configured`);
    return { channel: input.channel, provider: provider.name, status: "skipped" };
  }
  try {
    await provider.send(input);
    return { channel: input.channel, provider: provider.name, status: "sent" };
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error(`[notify] ${input.channel} error via ${provider.name}: ${detail}`);
    return { channel: input.channel, provider: provider.name, status: "error", detail };
  }
}

/** Test seam: which provider backs a channel, and is it live. */
export function channelStatus(channel: Channel): { provider: string; configured: boolean } {
  const p = PROVIDERS[channel];
  return { provider: p.name, configured: p.configured() };
}
