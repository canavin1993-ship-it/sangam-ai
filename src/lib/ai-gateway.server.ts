import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

// Provider is env-driven and vendor-neutral — point it at any OpenAI-compatible
// endpoint (Claude via OpenRouter / an Anthropic-compat gateway / your own).
// Defaults target Claude. Set in .env:
//   AI_BASE_URL   e.g. https://openrouter.ai/api/v1
//   AI_API_KEY    your provider key
//   AI_MODEL      e.g. anthropic/claude-sonnet-5   (see DEFAULT_AI_MODEL)
// ponytail: reuses the already-installed openai-compatible adapter, so switching
// providers is an env change, not a code change — and nothing depends on Lovable.
export function createAiProvider() {
  const baseURL = process.env.AI_BASE_URL;
  const apiKey = process.env.AI_API_KEY;
  if (!baseURL || !apiKey) {
    throw new Error(
      "AI provider not configured. Set AI_BASE_URL and AI_API_KEY (and optionally AI_MODEL) in the environment.",
    );
  }
  return createOpenAICompatible({
    name: "sangam-ai",
    baseURL,
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

/** Default chat model id; override with AI_MODEL. Claude by default. */
export const DEFAULT_AI_MODEL = process.env.AI_MODEL ?? "anthropic/claude-sonnet-5";
