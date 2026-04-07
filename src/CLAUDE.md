# src/CLAUDE.md

Guidance for working inside the `src/` directory.

## Module Map

```
index.ts              MCP server entry — registers tools/prompts, dispatches requests
tools/
  explainError.ts     Calls Claude API, strips fences, parses + Zod-validates JSON
  detectLanguage.ts   Heuristic keyword detection (no external deps)
prompts/
  systemPrompt.ts     System prompt — enforces strict JSON-only Claude output
schemas/
  errorResult.ts      Zod schema + ErrorResult type (single source of truth)
utils/
  formatter.ts        Renders ErrorResult → Markdown with severity icons (🔴🟡🔵)
hooks/
  validateInput.ts    Pre-call guard: rejects input <10 chars or >50k chars
  logResult.ts        Post-call: appends JSONL entry to logs/stacklens.jsonl
test.ts               Runs 3 hardcoded errors through the full pipeline (real API calls)
```

## Request Flow

```
MCP client
  → CallToolRequestSchema handler (index.ts)
  → validateErrorInput (hooks/validateInput.ts)
  → explainError (tools/explainError.ts)
      → Claude API (claude-sonnet-4-20250514)
      → strip markdown fences
      → JSON.parse
      → ErrorResultSchema.parse (throws on invalid shape)
  → formatResult (utils/formatter.ts)
  → logResult (hooks/logResult.ts)
  → MCP response
```

## ESM Import Convention

All imports **must use `.js` extensions**, even when importing `.ts` source files. This is required by Node16 module resolution:

```ts
// correct
import { explainError } from "./tools/explainError.js";

// wrong — will fail at runtime
import { explainError } from "./tools/explainError";
```

## stdio Contract

The MCP protocol uses **stdout** as its wire format. Never write to stdout in application code:

```ts
console.error("StackLens MCP server running");  // correct — goes to stderr
console.log("debug info");                        // wrong — corrupts MCP wire
```

## Shebang

`src/index.ts` must keep `#!/usr/bin/env node` as its first line. The compiled `dist/index.js` needs it for `npx` and direct CLI execution.
