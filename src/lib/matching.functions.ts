import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const InputSchema = z.object({ otherProfileId: z.string().uuid() });

type ProfileLite = {
  id: string;
  display_name: string;
  gender: string | null;
  date_of_birth: string | null;
  sub_sect: string | null;
  gotra: string | null;
  guru_lineage: string | null;
  ishtalinga_practicing: boolean | null;
  marital_status: string | null;
  education: string | null;
  profession: string | null;
  annual_income_inr: number | null;
  city: string | null;
  state: string | null;
  country: string | null;
  native_district: string | null;
  diet: string | null;
  about: string | null;
};

const PROFILE_COLS =
  "id, display_name, gender, date_of_birth, sub_sect, gotra, guru_lineage, ishtalinga_practicing, marital_status, education, profession, annual_income_inr, city, state, country, native_district, diet, about";

function summarise(p: ProfileLite) {
  return {
    name: p.display_name,
    gender: p.gender,
    dob: p.date_of_birth,
    community: {
      sub_sect: p.sub_sect,
      gotra: p.gotra,
      guru_lineage: p.guru_lineage,
      ishtalinga_practicing: p.ishtalinga_practicing,
    },
    marital_status: p.marital_status,
    education: p.education,
    profession: p.profession,
    annual_income_inr: p.annual_income_inr,
    location: { city: p.city, state: p.state, country: p.country, native_district: p.native_district },
    diet: p.diet,
    about: p.about,
  };
}

export const getCompatibility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.otherProfileId === userId) {
      return { score: 100, summary: "This is your own profile.", strengths: [], considerations: [], cached: false };
    }

    const [a, b] = [userId, data.otherProfileId].sort();
    const { data: cached } = await supabase
      .from("matches")
      .select("ai_score, ai_reason, computed_at")
      .eq("profile_a", a)
      .eq("profile_b", b)
      .maybeSingle();
    if (cached) {
      const reason = (cached.ai_reason ?? {}) as {
        summary?: string;
        strengths?: string[];
        considerations?: string[];
      };
      return {
        score: cached.ai_score,
        summary: reason.summary ?? "",
        strengths: reason.strengths ?? [],
        considerations: reason.considerations ?? [],
        cached: true,
      };
    }

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select(PROFILE_COLS)
      .in("id", [userId, data.otherProfileId]);
    if (error) throw new Error(error.message);
    const me = profiles?.find((p) => p.id === userId) as ProfileLite | undefined;
    const other = profiles?.find((p) => p.id === data.otherProfileId) as ProfileLite | undefined;
    if (!me || !other) throw new Error("Profile not found");

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    const prompt = `You are a compatibility analyst for the Jangama (Veerashaiva-Lingayat) matrimonial community. Rate how compatible these two members are for marriage on a 0-100 scale. Weigh community fit (sub-sect, gotra, guru lineage, ishtalinga practice), values & lifestyle (diet, spirituality, about text), life stage (age, marital status, career), location proximity/openness, and family & career alignment. Be honest — do not inflate.

Member A (viewer):
${JSON.stringify(summarise(me), null, 2)}

Member B (candidate):
${JSON.stringify(summarise(other), null, 2)}

Return a concise, plain-English rationale for a matrimony user.`;

    const { output } = await generateText({
      model,
      output: Output.object({
        schema: z.object({
          score: z.number().min(0).max(100),
          summary: z.string(),
          strengths: z.array(z.string()).max(5),
          considerations: z.array(z.string()).max(5),
        }),
      }),
      prompt,
    });

    await supabase.from("matches").upsert({
      profile_a: a,
      profile_b: b,
      ai_score: Math.round(output.score),
      ai_reason: output,
    });

    return { ...output, score: Math.round(output.score), cached: false };
  });