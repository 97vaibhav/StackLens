# src/tools/CLAUDE.md

Guidance for the `tools/` layer — the only place that calls the Claude API.

## JSON-Only Contract

The system prompt in `prompts/systemPrompt.ts` instructs Claude to return **JSON only** with no preamble or markdown fences. `explainError.ts` defensively strips fences before parsing:

```ts
const cleaned = rawText.replace(/```json|```/g, "").trim();
const parsed = JSON.parse(cleaned);
return ErrorResultSchema.parse(parsed);  // throws if shape is wrong
```

If Claude returns malformed JSON, `JSON.parse` throws and the MCP handler returns `isError: true` to the client. Do not silently swallow parse errors.

## Language Detection

`detectLanguage.ts` uses keyword heuristics — no external dependencies, no API calls. It runs before the Claude call to supply a `language_hint` in the user message. The model does its own detection too; this hint just improves accuracy.

When adding new language support, add a keyword check to `detectLanguage.ts` **and** update the system prompt's language list in `prompts/systemPrompt.ts`.

## Batch Tool

`explain_errors_batch` processes errors with `Promise.allSettled` — failures in one item must not cancel others. Always use `allSettled`, not `Promise.all`.
