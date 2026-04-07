# StackLens — Claude Plugin Build Guide
> Paste this entire file into Claude Code and say: "Follow this guide to build the StackLens plugin step by step."

---

## Plugin Identity

- **Name:** StackLens
- **Tagline:** Paste an error. Understand it instantly.
- **Description:** A Claude plugin that takes any stack trace or error log and returns a structured explanation — root cause, plain-English summary, code fix, severity level, and common causes. Supports Python, JavaScript, Java, Go, Rust, SQL, Docker, and more.

---

## What You Are Building

A Claude.ai plugin (MCP server) that:
1. Accepts a stack trace / error message as input
2. Sends it to Claude with a structured system prompt
3. Returns a rich, structured JSON response rendered as a result card
4. Integrates with the Claude marketplace and is publishable on GitHub

---

## Prerequisites — Ask Claude Code to Verify These First

```
Check that the following are installed and working:
- Node.js >= 18
- npm >= 9
- git
- A valid Anthropic API key in environment (ANTHROPIC_API_KEY)
- GitHub CLI (gh) — optional but helpful
```

---

## Phase 1 — Project Scaffold

### Step 1.1 — Create the project

```bash
mkdir stacklens
cd stacklens
npm init -y
git init
```

### Step 1.2 — Install dependencies

```bash
npm install @anthropic-ai/sdk @modelcontextprotocol/sdk zod dotenv
npm install --save-dev typescript @types/node tsx rimraf
```

### Step 1.3 — Create tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Step 1.4 — Update package.json scripts

```json
{
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "stacklens": "dist/index.js"
  },
  "scripts": {
    "build": "rimraf dist && tsc",
    "dev": "tsx src/index.ts",
    "start": "node dist/index.js",
    "test": "tsx src/test.ts"
  }
}
```

### Step 1.5 — Create .env file

```env
ANTHROPIC_API_KEY=your_key_here
```

### Step 1.6 — Create .gitignore

```
node_modules/
dist/
.env
*.log
.DS_Store
```

---

## Phase 2 — Core Source Files

### Step 2.1 — Create folder structure

```
src/
  index.ts          ← MCP server entry point
  tools/
    explainError.ts ← main tool logic
    detectLanguage.ts
  prompts/
    systemPrompt.ts ← the Claude system prompt
  schemas/
    errorResult.ts  ← Zod schema for structured output
  utils/
    formatter.ts    ← formats output for display
  test.ts           ← manual test runner
```

### Step 2.2 — Write the system prompt (src/prompts/systemPrompt.ts)

```typescript
export const SYSTEM_PROMPT = `You are StackLens, an expert debugging assistant.

When given a stack trace, error message, or log output, you MUST respond with ONLY valid JSON — no preamble, no markdown backticks, no explanation outside the JSON object.

Respond in exactly this structure:
{
  "summary": "One sentence plain-English explanation of what went wrong",
  "severity": "crash" | "warning" | "silent",
  "language": "detected language or runtime (e.g. Python, Node.js, Java)",
  "root_cause": {
    "file": "filename or null",
    "line": line number as integer or null,
    "reason": "specific technical reason why this failed"
  },
  "fix": {
    "before": "the broken code snippet (reproduce the problem line)",
    "after": "the corrected code snippet",
    "explanation": "what changed and why it fixes it"
  },
  "common_causes": ["cause 1", "cause 2", "cause 3"],
  "docs_link": "most relevant official docs URL or null"
}

Rules:
- severity is "crash" if the process terminates, "warning" if recoverable, "silent" if it causes incorrect behavior without throwing
- If you cannot determine something, use null — never guess
- Keep summary under 20 words
- Keep fix snippets under 10 lines each
- JSON only. No other text.`;
```

### Step 2.3 — Write the Zod schema (src/schemas/errorResult.ts)

```typescript
import { z } from "zod";

export const ErrorResultSchema = z.object({
  summary: z.string(),
  severity: z.enum(["crash", "warning", "silent"]),
  language: z.string(),
  root_cause: z.object({
    file: z.string().nullable(),
    line: z.number().nullable(),
    reason: z.string(),
  }),
  fix: z.object({
    before: z.string(),
    after: z.string(),
    explanation: z.string(),
  }),
  common_causes: z.array(z.string()),
  docs_link: z.string().nullable(),
});

export type ErrorResult = z.infer<typeof ErrorResultSchema>;
```

### Step 2.4 — Write the language detector (src/tools/detectLanguage.ts)

```typescript
export function detectLanguage(errorText: string): string {
  const text = errorText.toLowerCase();
  if (text.includes("traceback (most recent call last)")) return "Python";
  if (text.includes("at ") && text.includes(".js:")) return "JavaScript";
  if (text.includes("at ") && text.includes(".ts:")) return "TypeScript";
  if (text.includes("exception in thread") || text.includes(".java:")) return "Java";
  if (text.includes("goroutine") || text.includes("panic:")) return "Go";
  if (text.includes("thread 'main' panicked")) return "Rust";
  if (text.includes("sqlstate") || text.includes("syntax error near")) return "SQL";
  if (text.includes("error response from daemon") || text.includes("dockerfile")) return "Docker";
  if (text.includes("segmentation fault") || text.includes("core dumped")) return "C/C++";
  return "Unknown";
}
```

### Step 2.5 — Write the main tool (src/tools/explainError.ts)

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "../prompts/systemPrompt.js";
import { ErrorResultSchema, type ErrorResult } from "../schemas/errorResult.js";
import { detectLanguage } from "./detectLanguage.js";

const client = new Anthropic();

export async function explainError(
  errorText: string,
  hintLanguage?: string
): Promise<ErrorResult> {
  const detectedLang = hintLanguage || detectLanguage(errorText);

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
    .map((b) => b.text)
    .join("");

  // Strip any accidental markdown fences
  const cleaned = rawText.replace(/```json|```/g, "").trim();

  const parsed = JSON.parse(cleaned);
  return ErrorResultSchema.parse(parsed);
}
```

### Step 2.6 — Write the formatter (src/utils/formatter.ts)

```typescript
import type { ErrorResult } from "../schemas/errorResult.js";

const SEVERITY_ICONS: Record<string, string> = {
  crash: "🔴",
  warning: "🟡",
  silent: "🔵",
};

export function formatResult(result: ErrorResult): string {
  const icon = SEVERITY_ICONS[result.severity] ?? "⚪";

  return [
    `## ${icon} ${result.summary}`,
    ``,
    `**Language:** ${result.language}  |  **Severity:** ${result.severity}`,
    ``,
    `### Root cause`,
    result.root_cause.file
      ? `\`${result.root_cause.file}\`${result.root_cause.line ? ` line ${result.root_cause.line}` : ""}`
      : "",
    result.root_cause.reason,
    ``,
    `### Fix`,
    `**Before:**`,
    `\`\`\``,
    result.fix.before,
    `\`\`\``,
    `**After:**`,
    `\`\`\``,
    result.fix.after,
    `\`\`\``,
    result.fix.explanation,
    ``,
    `### Common causes`,
    ...result.common_causes.map((c) => `- ${c}`),
    ``,
    result.docs_link ? `**Docs:** ${result.docs_link}` : "",
  ]
    .filter((line) => line !== "")
    .join("\n");
}
```

### Step 2.7 — Write the MCP server (src/index.ts)

```typescript
#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { explainError } from "./tools/explainError.js";
import { formatResult } from "./utils/formatter.js";

const server = new Server(
  {
    name: "stacklens",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      prompts: {},
    },
  }
);

// ── List tools ──────────────────────────────────────────────
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "explain_error",
      description:
        "Analyzes a stack trace or error message and returns a structured explanation with root cause, fix, and severity.",
      inputSchema: {
        type: "object",
        properties: {
          error_text: {
            type: "string",
            description: "The full stack trace or error message to analyze",
          },
          language_hint: {
            type: "string",
            description:
              "Optional language hint (e.g. Python, JavaScript). Auto-detected if not provided.",
          },
        },
        required: ["error_text"],
      },
    },
  ],
}));

// ── Call tool ───────────────────────────────────────────────
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== "explain_error") {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  const { error_text, language_hint } = request.params.arguments as {
    error_text: string;
    language_hint?: string;
  };

  try {
    const result = await explainError(error_text, language_hint);
    const formatted = formatResult(result);

    return {
      content: [
        {
          type: "text",
          text: formatted,
        },
        {
          type: "text",
          text: `\n\n<details><summary>Raw JSON</summary>\n\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\`\n\n</details>`,
        },
      ],
    };
  } catch (err) {
    return {
      content: [
        {
          type: "text",
          text: `StackLens failed to analyze this error: ${err instanceof Error ? err.message : String(err)}`,
        },
      ],
      isError: true,
    };
  }
});

// ── Prompts (slash commands) ────────────────────────────────
server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: [
    {
      name: "debug",
      description: "Explain an error or stack trace using StackLens",
      arguments: [
        {
          name: "error",
          description: "Paste your stack trace or error here",
          required: true,
        },
      ],
    },
  ],
}));

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  if (request.params.name !== "debug") {
    throw new Error(`Unknown prompt: ${request.params.name}`);
  }

  const errorText = request.params.arguments?.error ?? "";

  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Please use the explain_error tool to analyze this:\n\n${errorText}`,
        },
      },
    ],
  };
});

// ── Start server ────────────────────────────────────────────
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("StackLens MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
```

### Step 2.8 — Write the test runner (src/test.ts)

```typescript
import { explainError } from "./tools/explainError.js";
import { formatResult } from "./utils/formatter.js";
import "dotenv/config";

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
    console.log(`\n${"=".repeat(60)}`);
    console.log(`TEST: ${test.name}`);
    console.log("=".repeat(60));
    try {
      const result = await explainError(test.text);
      console.log(formatResult(result));
    } catch (err) {
      console.error("FAILED:", err);
    }
  }
}

runTests();
```

---

## Phase 3 — Claude Desktop Integration (Local Testing)

### Step 3.1 — Build the project

```bash
npm run build
```

### Step 3.2 — Find your Claude Desktop config file

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux:** `~/.config/claude/claude_desktop_config.json`

### Step 3.3 — Add StackLens to Claude Desktop config

```json
{
  "mcpServers": {
    "stacklens": {
      "command": "node",
      "args": ["/absolute/path/to/stacklens/dist/index.js"],
      "env": {
        "ANTHROPIC_API_KEY": "your_key_here"
      }
    }
  }
}
```

> Replace `/absolute/path/to/stacklens` with the actual path from `pwd`

### Step 3.4 — Restart Claude Desktop and verify

Look for the hammer icon (tools) in Claude Desktop. You should see `explain_error` listed. Test it by typing:

```
/debug
```

Or directly: "Use explain_error to analyze this: [paste any error]"

---

## Phase 4 — Hooks & Agent Behaviors

### Step 4.1 — Add a pre-call validation hook

Create `src/hooks/validateInput.ts`:

```typescript
export function validateErrorInput(text: string): { valid: boolean; reason?: string } {
  if (!text || text.trim().length < 10) {
    return { valid: false, reason: "Input too short to be a valid error" };
  }
  if (text.length > 50000) {
    return { valid: false, reason: "Input too large — please trim to the relevant stack trace" };
  }
  return { valid: true };
}
```

### Step 4.2 — Add a post-call logging hook

Create `src/hooks/logResult.ts`:

```typescript
import fs from "fs";
import path from "path";

export function logResult(input: string, output: object) {
  const logDir = path.join(process.cwd(), "logs");
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

  const entry = {
    timestamp: new Date().toISOString(),
    input_preview: input.slice(0, 100),
    output,
  };

  const logPath = path.join(logDir, "stacklens.jsonl");
  fs.appendFileSync(logPath, JSON.stringify(entry) + "\n");
}
```

### Step 4.3 — Register hooks in the tool call handler

In `src/index.ts`, update the `CallToolRequestSchema` handler to call these before/after `explainError`.

### Step 4.4 — Add an agent skill: batch mode

Add a second tool `explain_errors_batch` that accepts an array of errors and processes them in parallel:

```typescript
// In ListToolsRequestSchema handler, add:
{
  name: "explain_errors_batch",
  description: "Analyze multiple errors at once. Returns an array of results.",
  inputSchema: {
    type: "object",
    properties: {
      errors: {
        type: "array",
        items: { type: "string" },
        description: "Array of error strings to analyze",
        maxItems: 10,
      },
    },
    required: ["errors"],
  },
}

// In CallToolRequestSchema handler, add:
if (request.params.name === "explain_errors_batch") {
  const { errors } = request.params.arguments as { errors: string[] };
  const results = await Promise.allSettled(errors.map((e) => explainError(e)));
  // format and return each
}
```

---

## Phase 5 — GitHub Setup

### Step 5.1 — Create the README (README.md)

```markdown
# StackLens

> Paste an error. Understand it instantly.

StackLens is a Claude MCP plugin that analyzes any stack trace or error log and returns a structured explanation — root cause, plain-English summary, code fix, severity level, and common causes.

## Supported languages

Python · JavaScript · TypeScript · Java · Go · Rust · SQL · Docker · C/C++

## Quick install

### Prerequisites
- Node.js 18+
- A Claude Desktop account
- An Anthropic API key

### 1. Clone and build

\`\`\`bash
git clone https://github.com/YOUR_USERNAME/stacklens.git
cd stacklens
npm install
npm run build
\`\`\`

### 2. Add to Claude Desktop

Edit your Claude Desktop config file:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

\`\`\`json
{
  "mcpServers": {
    "stacklens": {
      "command": "node",
      "args": ["/path/to/stacklens/dist/index.js"],
      "env": {
        "ANTHROPIC_API_KEY": "your_key_here"
      }
    }
  }
}
\`\`\`

### 3. Restart Claude Desktop

Look for the tools icon. StackLens is ready when you see `explain_error` available.

## Usage

**Option 1 — Use the slash command:**
\`\`\`
/debug [paste your error here]
\`\`\`

**Option 2 — Natural language:**
\`\`\`
Use explain_error to analyze: [paste stack trace]
\`\`\`

**Option 3 — Batch mode:**
\`\`\`
Use explain_errors_batch with these errors: [...]
\`\`\`

## Example output

\`\`\`
🔴 Trying to call .upper() on a None value — user.name was not set

Language: Python  |  Severity: crash

Root cause
app.py line 42
user.name is None because the database query returned no result

Fix
Before:
result = user.name.upper()

After:
result = user.name.upper() if user.name else ""

Common causes
- User record not found in database
- Optional field not validated before use
- Race condition where user object is partially populated

Docs: https://docs.python.org/3/library/stdtypes.html#str.upper
\`\`\`

## Development

\`\`\`bash
npm run dev        # run without building
npm test           # run test suite
npm run build      # compile to dist/
\`\`\`

## Contributing

Pull requests welcome. Please open an issue first for large changes.

## License

MIT
```

### Step 5.2 — Create GitHub Actions CI (.github/workflows/ci.yml)

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
```

### Step 5.3 — Push to GitHub

```bash
git add .
git commit -m "feat: initial StackLens MCP plugin"
gh repo create stacklens --public --push
# OR manually:
git remote add origin https://github.com/YOUR_USERNAME/stacklens.git
git push -u origin main
```

### Step 5.4 — Create a GitHub Release

```bash
gh release create v1.0.0 --title "StackLens v1.0.0" --notes "Initial release"
```

---

## Phase 6 — npm Publishing (so others can install easily)

### Step 6.1 — Finalize package.json for publishing

```json
{
  "name": "stacklens-mcp",
  "version": "1.0.0",
  "description": "Claude MCP plugin — paste an error, understand it instantly",
  "keywords": ["claude", "mcp", "debugging", "stack-trace", "developer-tools"],
  "author": "YOUR_NAME",
  "license": "MIT",
  "homepage": "https://github.com/YOUR_USERNAME/stacklens",
  "repository": {
    "type": "git",
    "url": "https://github.com/YOUR_USERNAME/stacklens.git"
  },
  "files": ["dist/", "README.md", "LICENSE"],
  "bin": {
    "stacklens": "dist/index.js"
  }
}
```

### Step 6.2 — Add shebang to compiled output

At the very top of `src/index.ts`, the `#!/usr/bin/env node` line ensures it runs as a CLI.

After build, verify `dist/index.js` starts with `#!/usr/bin/env node`.

### Step 6.3 — Publish

```bash
npm login
npm publish --access public
```

Users can now install with:

```bash
npx stacklens-mcp
```

And use this in their Claude config:

```json
{
  "mcpServers": {
    "stacklens": {
      "command": "npx",
      "args": ["-y", "stacklens-mcp"],
      "env": { "ANTHROPIC_API_KEY": "your_key_here" }
    }
  }
}
```

---

## Phase 7 — Claude Marketplace Submission

### Step 7.1 — What Anthropic requires

Before submitting, make sure you have:

- [ ] Working MCP server (passes local tests)
- [ ] Public GitHub repo with a clear README
- [ ] npm package published (or a direct install method)
- [ ] No storage of user error data without disclosure
- [ ] Does not send data to third parties (only the Anthropic API)
- [ ] Clear description of what the tool does and does not do

### Step 7.2 — Create a plugin manifest (plugin.json)

```json
{
  "name": "StackLens",
  "id": "stacklens",
  "version": "1.0.0",
  "description": "Analyzes stack traces and error logs. Returns root cause, severity, code fix, and documentation links. Supports Python, JavaScript, Java, Go, Rust, SQL, and Docker.",
  "author": "YOUR_NAME",
  "homepage": "https://github.com/YOUR_USERNAME/stacklens",
  "install": {
    "type": "npm",
    "package": "stacklens-mcp",
    "command": "npx",
    "args": ["-y", "stacklens-mcp"]
  },
  "tools": [
    {
      "name": "explain_error",
      "description": "Analyzes a single stack trace or error message"
    },
    {
      "name": "explain_errors_batch",
      "description": "Analyzes up to 10 errors simultaneously"
    }
  ],
  "prompts": [
    {
      "name": "debug",
      "description": "Slash command to quickly explain an error"
    }
  ],
  "required_env": ["ANTHROPIC_API_KEY"],
  "categories": ["developer-tools", "debugging"],
  "pricing": "free"
}
```

### Step 7.3 — Submit

Go to: **https://console.anthropic.com** → Integrations → Submit Plugin

Provide:
- Plugin manifest (plugin.json)
- GitHub repo URL
- npm package name
- A short demo video or GIF (record with QuickTime or Loom)
- Contact email

---

## Phase 8 — Post-Launch Checklist

- [ ] Add a demo GIF to README (use `npm run test` output recorded with asciinema)
- [ ] Add a `CHANGELOG.md`
- [ ] Set up GitHub issue templates for bug reports and feature requests
- [ ] Add badge to README: `[![npm](https://img.shields.io/npm/v/stacklens-mcp)](https://npmjs.com/package/stacklens-mcp)`
- [ ] Post in Anthropic Discord developer community
- [ ] Share on Twitter/X with `#ClaudeMCP` and `#DevTools`

---

## Troubleshooting Guide (add to README)

| Problem | Fix |
|---|---|
| `ANTHROPIC_API_KEY not set` | Add it to the `env` block in claude_desktop_config.json |
| Tool not appearing in Claude | Restart Claude Desktop completely |
| `JSON parse error` | The model returned non-JSON — retry or check system prompt |
| `Module not found` | Run `npm run build` first |
| Batch mode timeout | Reduce batch size below 5 for slow connections |

---

## File Tree — Final State

```
stacklens/
├── src/
│   ├── index.ts
│   ├── test.ts
│   ├── tools/
│   │   ├── explainError.ts
│   │   └── detectLanguage.ts
│   ├── prompts/
│   │   └── systemPrompt.ts
│   ├── schemas/
│   │   └── errorResult.ts
│   ├── utils/
│   │   └── formatter.ts
│   └── hooks/
│       ├── validateInput.ts
│       └── logResult.ts
├── .github/
│   └── workflows/
│       └── ci.yml
├── dist/              ← generated by build
├── logs/              ← generated at runtime
├── plugin.json
├── package.json
├── tsconfig.json
├── .env               ← never commit this
├── .gitignore
├── CHANGELOG.md
├── LICENSE
└── README.md
```

---

*Guide version 1.0 — built for StackLens MCP Plugin*