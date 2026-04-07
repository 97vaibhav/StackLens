/**
 * Developer test harness — calls the Anthropic API directly.
 * Requires ANTHROPIC_API_KEY in .env (for local dev only).
 * End-users of the plugin do NOT need an API key; the server uses MCP sampling.
 */
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "./prompts/systemPrompt.js";
import { ErrorResultSchema } from "./schemas/errorResult.js";
import { detectLanguage } from "./tools/detectLanguage.js";
import { formatResult } from "./utils/formatter.js";

const client = new Anthropic();

const TEST_ERRORS = [
  {
    name: "Python TypeError",
    text: `Traceback (most recent call last):
  File "app.py", line 42, in process_user
    result = user.name.upper()
AttributeError: 'NoneType' object has no attribute 'upper'`,
  },
  {
    name: "JavaScript TypeError",
    text: `TypeError: Cannot read properties of undefined (reading 'map')
    at UserList (/app/components/UserList.tsx:24:18)
    at renderWithHooks (/app/node_modules/react-dom/cjs/react-dom.development.js:14985:18)`,
  },
  {
    name: "SQL Error",
    text: `ERROR 1064 (42000): You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near 'WHERE id = 5' at line 1`,
  },
];

async function runTests() {
  for (const test of TEST_ERRORS) {
    console.error(`\n${"=".repeat(60)}`);
    console.error(`TEST: ${test.name}`);
    console.error("=".repeat(60));
    try {
      const lang = detectLanguage(test.text);
      const userMessage = `Language hint: ${lang}\n\nError to analyze:\n\`\`\`\n${test.text.trim()}\n\`\`\``;

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
      const result = ErrorResultSchema.parse(JSON.parse(cleaned));
      process.stdout.write(formatResult(result) + "\n");
    } catch (err) {
      console.error("FAILED:", err);
    }
  }
}

runTests();
