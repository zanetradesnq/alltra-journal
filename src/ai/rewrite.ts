/**
 * AI text transforms for the selection menu — calls Claude (Opus 4.8) via the
 * official Anthropic SDK. Browser-direct (dangerouslyAllowBrowser) since this
 * is a local, single-user app with no backend.
 *
 * ⚠️ The API key is exposed to the browser. Fine for a personal/local build;
 * for anything shipped, move these calls behind a small server proxy so the key
 * stays secret.
 */
import Anthropic from "@anthropic-ai/sdk";

const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

const client = apiKey
  ? new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
  : null;

export const AI_ENABLED = client !== null;

export type AiAction = "translate" | "grammar" | "positive" | "punchier";

const INSTRUCTIONS: Record<AiAction, string> = {
  translate:
    "Translate the user's text to English. If it is already in English, translate it to Spanish instead.",
  grammar:
    "Fix spelling, grammar, and punctuation in the user's text. Keep the original meaning, tone, and language.",
  positive:
    "Rewrite the user's text in a warmer, more positive and upbeat tone while preserving its meaning and language.",
  punchier:
    "Rewrite the user's text to be punchier — tighter, more vivid and impactful — while preserving its meaning and language.",
};

const GUARD =
  " Return ONLY the resulting text. No preamble, no quotation marks, no explanations, no markdown, no notes about what you changed.";

export async function aiTransform(
  action: AiAction,
  text: string
): Promise<string> {
  if (!client) {
    throw new Error(
      "AI is off. Add VITE_ANTHROPIC_API_KEY to a .env file in the project root and restart the dev server."
    );
  }
  const message = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 2048,
    system: INSTRUCTIONS[action] + GUARD,
    messages: [{ role: "user", content: text }],
  });
  const block = message.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text.trim() : "";
}
