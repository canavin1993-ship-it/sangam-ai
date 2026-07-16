import { generateText } from "ai";
import type { LanguageModel } from "ai";
import type { z } from "zod";

// Vendor-neutral structured output. Instead of relying on each provider's
// native response_format / json_schema support (Gemini's OpenAI-compat endpoint
// doesn't honour it, so Output.object silently free-forms enum fields), we ask
// for JSON, parse it, validate with zod, and repair once. Works on any
// OpenAI-compatible endpoint. ponytail: one retry — if a model can't produce the
// shape twice with the errors handed back, a third try won't save it.
export async function generateJson<T>(
  model: LanguageModel,
  prompt: string,
  schema: z.ZodType<T>,
): Promise<T> {
  const system =
    "Respond with ONLY a single JSON object matching the requested shape. No markdown, no code fences, no commentary before or after. Enum fields must be exactly one of the listed literal values.";
  let lastErr = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const p =
      attempt === 0
        ? prompt
        : `${prompt}\n\nYour previous response failed validation:\n${lastErr}\nReturn the corrected JSON object only.`;
    const { text } = await generateText({ model, system, prompt: p });
    const parsed = schema.safeParse(extractJson(text));
    if (parsed.success) return parsed.data;
    lastErr = parsed.error.issues.map((i) => `- ${i.path.join(".") || "(root)"}: ${i.message}`).join("\n");
  }
  throw new Error(`AI did not return valid JSON after one repair attempt:\n${lastErr}`);
}

/** Pull the first {...} block out of a model reply, tolerating code fences/prose. */
export function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}
