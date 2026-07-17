import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Referral engine surface. The reward logic (two-sided premium on verification +
// milestones) lives in the DB — see migration 20260716120000_referrals.sql. These
// functions only read the dashboard and record a redemption.
// NOTE: referral tables + RPCs aren't in the generated Supabase types until you
// regenerate after applying the migration, so those calls are cast. Regen with:
//   supabase gen types typescript --local > src/integrations/supabase/types.ts

const FOUNDING_FAMILY_AT = 5; // verified referrals for Founding Family (elite)

function shareBase(): string {
  return process.env.SITE_URL ?? "https://jangamamatrimony.com";
}

export type ReferralDashboard = {
  code: string;
  shareUrl: string;
  totalReferred: number;
  verifiedReferred: number;
  pending: number;
  badge: "Member" | "Community Builder" | "Founding Family";
  foundingFamily: boolean;
  nextMilestoneAt: number | null; // verified referrals needed for the next reward
  remainingToNextMilestone: number | null;
};

export const getMyReferral = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ReferralDashboard> => {
    const { supabase, userId } = context;
    const db = supabase as unknown as {
      rpc: (fn: string, args?: unknown) => Promise<{ data: unknown; error: { message: string } | null }>;
      from: (t: string) => any;
    };

    const { data: code, error: codeErr } = await db.rpc("get_my_referral_code");
    if (codeErr) throw new Error(codeErr.message);

    const { data: rows, error: rowsErr } = await db
      .from("referrals")
      .select("status")
      .eq("referrer_id", userId);
    if (rowsErr) throw new Error(rowsErr.message);

    const list = (rows ?? []) as Array<{ status: string }>;
    const verifiedReferred = list.filter((r) => r.status === "rewarded").length;
    const totalReferred = list.length;
    const pending = totalReferred - verifiedReferred;
    const foundingFamily = verifiedReferred >= FOUNDING_FAMILY_AT;

    const badge: ReferralDashboard["badge"] = foundingFamily
      ? "Founding Family"
      : verifiedReferred >= 1
        ? "Community Builder"
        : "Member";

    return {
      code: String(code),
      shareUrl: `${shareBase()}/join?ref=${encodeURIComponent(String(code))}`,
      totalReferred,
      verifiedReferred,
      pending,
      badge,
      foundingFamily,
      nextMilestoneAt: foundingFamily ? null : FOUNDING_FAMILY_AT,
      remainingToNextMilestone: foundingFamily ? null : FOUNDING_FAMILY_AT - verifiedReferred,
    };
  });

const RedeemInput = z.object({ code: z.string().trim().min(4).max(16) });

// Call once during onboarding when the new family arrived via a ?ref= link.
export const redeemReferral = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RedeemInput.parse(d))
  .handler(async ({ data, context }): Promise<{ applied: boolean }> => {
    const db = context.supabase as unknown as {
      rpc: (fn: string, args?: unknown) => Promise<{ data: unknown; error: { message: string } | null }>;
    };
    const { data: applied, error } = await db.rpc("redeem_referral", { p_code: data.code });
    if (error) throw new Error(error.message);
    return { applied: Boolean(applied) };
  });
