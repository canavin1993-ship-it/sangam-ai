import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createHash } from "crypto";

function hashOtp(otp: string, salt: string) {
  return createHash("sha256").update(`${salt}:${otp}`).digest("hex");
}

export const sendPhoneOtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { phone: string }) =>
    z.object({ phone: z.string().regex(/^\+?[1-9]\d{7,14}$/, "Invalid phone") }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const phone = data.phone.startsWith("+") ? data.phone : `+91${data.phone}`;
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = hashOtp(otp, context.userId);
    const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("phone_verifications").insert({
      user_id: context.userId,
      phone,
      otp_hash: otpHash,
      expires_at: expiresAt,
    });

    try {
      const { sendOtpSms } = await import("@/lib/msg91.server");
      await sendOtpSms(phone, otp);
    } catch (e) {
      console.error("MSG91 send failed", e);
      // In dev without MSG91 keys, surface the OTP so the user can still verify.
      if (process.env.NODE_ENV !== "production") return { ok: true, devOtp: otp };
      throw e;
    }
    return { ok: true };
  });

export const verifyPhoneOtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { otp: string }) => z.object({ otp: z.string().length(6) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("phone_verifications")
      .select("id, otp_hash, attempts, expires_at, verified, phone")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!row) throw new Error("No pending verification");
    if (row.verified) return { ok: true, alreadyVerified: true };
    if (new Date(row.expires_at) < new Date()) throw new Error("OTP expired");
    if (row.attempts >= 5) throw new Error("Too many attempts");

    const match = hashOtp(data.otp, context.userId) === row.otp_hash;
    if (!match) {
      await supabaseAdmin
        .from("phone_verifications")
        .update({ attempts: row.attempts + 1 })
        .eq("id", row.id);
      throw new Error("Incorrect OTP");
    }
    await supabaseAdmin.from("phone_verifications").update({ verified: true }).eq("id", row.id);
    await supabaseAdmin
      .from("profiles")
      .update({ phone: row.phone, phone_verified: true })
      .eq("id", context.userId);
    return { ok: true };
  });
