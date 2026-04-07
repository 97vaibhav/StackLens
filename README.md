# StackLens

> Paste an error. Understand it instantly.

StackLens is a Claude MCP plugin that analyzes any stack trace or error log and returns a structured explanation — root cause, plain-English summary, code fix, severity level, and common causes.

No API key required. StackLens uses MCP sampling — it asks Claude (your existing host) to run the analysis, so it works with your existing Claude Desktop or Claude Code session.

## Supported languages

Python · JavaScript · TypeScript · Java · Go · Rust · SQL · Docker · C/C++

## Quick install

**Prerequisites:** Node.js 18+

### Claude Desktop

Add to your config file:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

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

Restart Claude Desktop. Look for the tools icon — StackLens is ready when you see `explain_error` listed.

### Claude Code (CLI)

**Option 1 — Global** (available in all Claude Code sessions):

```bash
claude mcp add stacklens npx -- -y stacklens-mcp
```

**Option 2 — Project-level** (copy `.mcp.json` from this repo into your project root):

```bash
cp /path/to/stacklens/.mcp.json your-project/
```

Claude Code auto-loads `.mcp.json` from the project root.

## Usage

**Option 1 — Slash command:**
```
/debug [paste your error here]
```

**Option 2 — Natural language:**
```
Use explain_error to analyze: [paste stack trace]
```

**Option 3 — Batch mode:**
```
Use explain_errors_batch with these errors: [...]
```

## Example output

```
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
```

## Development

```bash
make setup    # install dependencies
make dev      # run without building
make test     # run against 3 real error cases (requires .env with ANTHROPIC_API_KEY)
make build    # compile to dist/
make lint     # type-check only
make clean    # remove dist/ and logs/
```

> `make test` is a developer tool that calls the Anthropic API directly.
> End-users of the plugin do not need an API key.

## How it works

StackLens uses **MCP sampling**: when you call `explain_error`, the server sends a `sampling/createMessage` request back to the Claude host (Desktop or Code). The host runs the inference using its own Claude connection and returns the result. No separate API key is needed.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Tool not appearing in Claude | Restart Claude Desktop completely |
| `JSON parse error` | Retry — the model returned non-JSON |
| `Module not found` | Run `make build` first |
| Batch mode timeout | Reduce batch size below 5 |
| `Client does not support sampling` | Upgrade Claude Desktop / Claude Code to a recent version |

## Contributing

Pull requests welcome. Please open an issue first for large changes.

## License

MIT
