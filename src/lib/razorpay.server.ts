import { createHmac, timingSafeEqual } from "crypto";

const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

function assertKeys() {
  if (!KEY_ID || !KEY_SECRET) throw new Error("Razorpay keys not configured");
}

export async function createRazorpayOrder(
  amountInr: number,
  receipt: string,
  notes: Record<string, string> = {},
) {
  assertKeys();
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic " + Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64"),
    },
    body: JSON.stringify({
      amount: amountInr * 100,
      currency: "INR",
      receipt,
      notes,
    }),
  });
  if (!res.ok) throw new Error(`Razorpay order failed: ${await res.text()}`);
  return (await res.json()) as { id: string; amount: number; currency: string; status: string };
}

export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string) {
  if (!KEY_SECRET) throw new Error("Razorpay secret missing");
  const expected = createHmac("sha256", KEY_SECRET).update(`${orderId}|${paymentId}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function verifyRazorpayWebhook(rawBody: string, signature: string | null) {
  if (!WEBHOOK_SECRET || !signature) return false;
  const expected = createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const RAZORPAY_PUBLIC_KEY = KEY_ID ?? "";
