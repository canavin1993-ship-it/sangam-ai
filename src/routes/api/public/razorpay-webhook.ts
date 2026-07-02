import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/razorpay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        const sig = request.headers.get("x-razorpay-signature");
        const { verifyRazorpayWebhook } = await import("@/lib/razorpay.server");
        if (!verifyRazorpayWebhook(raw, sig)) return new Response("bad sig", { status: 401 });

        type RazorpayEvent = {
          event?: string;
          payload?: {
            payment?: { entity?: { id?: string; order_id?: string } };
            order?: { entity?: { id?: string } };
          };
        };
        const evt = JSON.parse(raw) as RazorpayEvent;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const orderId =
          evt?.payload?.payment?.entity?.order_id ?? evt?.payload?.order?.entity?.id ?? null;
        const paymentId = evt?.payload?.payment?.entity?.id ?? null;

        await supabaseAdmin.from("payment_events").insert({
          event_type: evt.event ?? "unknown",
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          payload: evt,
        });

        if (evt.event === "payment.captured" && orderId) {
          const { data: sub } = await supabaseAdmin
            .from("subscriptions")
            .select("id, tier")
            .eq("razorpay_order_id", orderId)
            .maybeSingle();
          if (sub) {
            const days = sub.tier === "elite" ? 180 : 90;
            await supabaseAdmin
              .from("subscriptions")
              .update({
                status: "active",
                razorpay_payment_id: paymentId,
                starts_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + days * 86400_000).toISOString(),
              })
              .eq("id", sub.id);
          }
        }
        if (evt.event === "payment.failed" && orderId) {
          await supabaseAdmin
            .from("subscriptions")
            .update({ status: "failed" })
            .eq("razorpay_order_id", orderId);
        }
        return new Response("ok");
      },
    },
  },
});
