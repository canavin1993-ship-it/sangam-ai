import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const PLANS = {
  free: { tier: "free" as const, amount: 0, label: "Free", days: 0 },
  premium: { tier: "premium" as const, amount: 1499, label: "Premium (3 months)", days: 90 },
  elite: { tier: "elite" as const, amount: 3999, label: "Elite (6 months)", days: 180 },
};

export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { plan: "premium" | "elite" }) =>
    z.object({ plan: z.enum(["premium", "elite"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const plan = PLANS[data.plan];
    const { createRazorpayOrder, RAZORPAY_PUBLIC_KEY } = await import("@/lib/razorpay.server");
    const receipt = `sub_${context.userId.slice(0, 8)}_${Date.now()}`;
    const order = await createRazorpayOrder(plan.amount, receipt, {
      userId: context.userId,
      plan: data.plan,
    });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("subscriptions").insert({
      user_id: context.userId,
      tier: plan.tier,
      status: "pending",
      amount_inr: plan.amount,
      razorpay_order_id: order.id,
    });
    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: RAZORPAY_PUBLIC_KEY,
      plan: plan.label,
    };
  });

export const verifyPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: string; paymentId: string; signature: string }) =>
    z.object({ orderId: z.string(), paymentId: z.string(), signature: z.string() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { verifyRazorpaySignature } = await import("@/lib/razorpay.server");
    if (!verifyRazorpaySignature(data.orderId, data.paymentId, data.signature)) {
      throw new Error("Invalid Razorpay signature");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("id, tier, user_id")
      .eq("razorpay_order_id", data.orderId)
      .single();
    if (!sub || sub.user_id !== context.userId) throw new Error("Order not found");
    const days = PLANS[sub.tier as "premium" | "elite"].days;
    const now = new Date();
    const expires = new Date(now.getTime() + days * 86400_000);
    await supabaseAdmin
      .from("subscriptions")
      .update({
        status: "active",
        razorpay_payment_id: data.paymentId,
        razorpay_signature: data.signature,
        starts_at: now.toISOString(),
        expires_at: expires.toISOString(),
      })
      .eq("id", sub.id);
    return { ok: true };
  });

export const getMySubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("subscriptions")
      .select("tier, status, expires_at, amount_inr")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data;
  });
