# StackLens

> Paste an error. Understand it instantly.

StackLens is a Claude MCP plugin that analyzes any stack trace or error log and returns a structured explanation — root cause, plain-English summary, code fix, severity level, and common causes.

## Supported languages

Python · JavaScript · TypeScript · Java · Go · Rust · SQL · Docker · C/C++

## Quick install

**Prerequisites:** Node.js 18+, Anthropic API key

```bash
git clone https://github.com/97vaibhav/stacklens.git
cd stacklens
make setup
make build
```

Add to your Claude Desktop config:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

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

After publishing to npm, use `npx` instead:

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

Restart Claude Desktop. Look for the tools icon — StackLens is ready when you see `explain_error` listed.

## Using with Claude Code (CLI)

**Option 1 — Project-level** (copy `.mcp.json` from this repo into your project root):

```bash
cp /path/to/stacklens/.mcp.json your-project/
```

Claude Code auto-loads `.mcp.json` from the project root. Make sure `ANTHROPIC_API_KEY` is set in your shell environment.

**Option 2 — Global** (available in all Claude Code sessions):

```bash
claude mcp add stacklens npx -- -y stacklens-mcp
```

Then set your key in the shell:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

Once configured, use it in Claude Code just like any other tool:

```
Use explain_error to analyze this: [paste stack trace]
```

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
make dev      # run without building (requires .env with ANTHROPIC_API_KEY)
make test     # run against 3 real error cases (charges tokens)
make build    # compile to dist/
make lint     # type-check only
make clean    # remove dist/ and logs/
```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `ANTHROPIC_API_KEY not set` | Add it to the `env` block in claude_desktop_config.json |
| Tool not appearing in Claude | Restart Claude Desktop completely |
| `JSON parse error` | Retry — the model returned non-JSON |
| `Module not found` | Run `make build` first |
| Batch mode timeout | Reduce batch size below 5 |

## Contributing

Pull requests welcome. Please open an issue first for large changes.

## License

MIT
