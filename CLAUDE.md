# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

StackLens is a **Claude MCP (Model Context Protocol) plugin** that analyzes stack traces and error logs. It runs as a stdio-based MCP server, calls the Claude API with a structured system prompt, and returns Markdown-formatted explanations with root cause, severity, code fix, and docs link.

The repository currently contains only the build guide (`prd-stacklens.md`). Follow it phase-by-phase to implement the project.

## Commands

```bash
npm run build    # Compile TypeScript → dist/
npm run dev      # Run via tsx without building (requires .env)
npm start        # Run compiled server (after build)
npm test         # Run manual test runner against 3 real API calls
```

## Tech Stack

- **Runtime:** Node.js 18+, ESM (`"type": "module"`)
- **Language:** TypeScript (ES2022, Node16 module resolution, strict)
- **MCP SDK:** `@modelcontextprotocol/sdk` — stdio transport
- **AI:** `@anthropic-ai/sdk` — `claude-sonnet-4-20250514`, max_tokens 1024
- **Validation:** `zod` — `ErrorResultSchema` validates every Claude API response
- **Dev:** `tsx` (no-build execution), `rimraf` (clean dist)

## Environment

Requires `ANTHROPIC_API_KEY` in `.env` (local dev) or in the Claude Desktop config `env` block.

## Claude Desktop Integration

After `npm run build`, add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "stacklens": {
      "command": "node",
      "args": ["/absolute/path/to/stacklens/dist/index.js"],
      "env": { "ANTHROPIC_API_KEY": "your_key_here" }
    }
  }
}
```

After publishing to npm, use `"command": "npx", "args": ["-y", "stacklens-mcp"]` instead.
