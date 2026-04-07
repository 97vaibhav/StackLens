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

  const userMessage = `Language hint: ${detectedLang}

Error to analyze:
\`\`\`
${errorText.trim()}
\`\`\``;

  const response = await server.createMessage({
    messages: [{ role: "user", content: { type: "text", text: userMessage } }],
    systemPrompt: SYSTEM_PROMPT,
    maxTokens: 1024,
  });

  const rawText = response.content.type === "text" ? response.content.text : "";

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
