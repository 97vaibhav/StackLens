import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "../prompts/systemPrompt.js";
import { ErrorResultSchema, type ErrorResult } from "../schemas/errorResult.js";
import { detectLanguage } from "./detectLanguage.js";

const client = new Anthropic();

export async function explainError(
  errorText: string,
  hintLanguage?: string
): Promise<ErrorResult> {
  const detectedLang = hintLanguage ?? detectLanguage(errorText);

  const userMessage = `Language hint: ${detectedLang}

Error to analyze:
\`\`\`
${errorText.trim()}
\`\`\``;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const rawText = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  const cleaned = rawText.replace(/```json|```/g, "").trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(
      `Model returned non-JSON response: ${err instanceof SyntaxError ? err.message : String(err)}. ` +
      `Preview: ${cleaned.slice(0, 150)}`
    );
  }

  return ErrorResultSchema.parse(parsed);
}
