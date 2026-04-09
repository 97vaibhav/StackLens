// eslint-disable-next-line @typescript-eslint/no-deprecated
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SYSTEM_PROMPT } from "../prompts/systemPrompt.js";
import { ErrorResultSchema, type ErrorResult } from "../schemas/errorResult.js";
import { detectLanguage } from "./detectLanguage.js";

export async function explainError(
  errorText: string,
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  server: Server,
  hintLanguage?: string
): Promise<ErrorResult> {
  const detectedLang = hintLanguage ?? detectLanguage(errorText);

  // JSON-encode the error text to prevent prompt injection via embedded instructions
  const userMessage = `Language hint: ${detectedLang}

Error to analyze (JSON-encoded plain text):
${JSON.stringify(errorText.trim())}`;

  const TIMEOUT_MS = 30_000;
  const response = await Promise.race([
    server.createMessage({
      messages: [{ role: "user", content: { type: "text", text: userMessage } }],
      systemPrompt: SYSTEM_PROMPT,
      maxTokens: 1024,
    }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out")), TIMEOUT_MS)
    ),
  ]);

  const rawText = response.content.type === "text" ? response.content.text : "";

  const cleaned = rawText.replace(/```json|```/g, "").trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Model returned an unexpected response format. Please try again.");
  }

  return ErrorResultSchema.parse(parsed);
}
