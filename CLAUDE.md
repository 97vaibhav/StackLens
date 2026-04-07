# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

StackLens is a **Claude MCP (Model Context Protocol) plugin** that analyzes stack traces and error logs. It runs as a stdio-based MCP server and uses **MCP sampling** to delegate LLM calls back to the Claude host — no API key required from users.

## Commands

```bash
npm run build    # Compile TypeScript → dist/
npm run dev      # Run via tsx without building
npm start        # Run compiled server (after build)
npm test         # Run manual test runner (requires .env with ANTHROPIC_API_KEY)
```

## Tech Stack

- **Runtime:** Node.js 18+, ESM (`"type": "module"`)
- **Language:** TypeScript (ES2022, Node16 module resolution, strict)
- **MCP SDK:** `@modelcontextprotocol/sdk` — stdio transport + `server.createMessage()` for sampling
- **Validation:** `zod` — `ErrorResultSchema` validates every LLM response
- **Dev:** `tsx` (no-build execution), `rimraf` (clean dist), `@anthropic-ai/sdk` (test.ts only)

## Environment

No API key required for end-users. The server uses **MCP sampling** — it delegates LLM calls to the Claude host (Desktop or Code) via `server.createMessage()`.

`ANTHROPIC_API_KEY` in `.env` is only needed for `make test` (direct API dev testing).

## Claude Desktop Integration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "stacklens": {
      "command": "npx",
      "args": ["-y", "stacklens-mcp"]
    }
  }
}
```
