# Changelog

## [1.0.0] - 2026-04-07

### Added
- `explain_error` tool — analyzes a single stack trace or error message
- `explain_errors_batch` tool — analyzes up to 10 errors in parallel
- `/debug` slash command for quick error analysis
- Support for Python, JavaScript, TypeScript, Java, Go, Rust, SQL, Docker, C/C++
- Heuristic language detection (no external dependencies)
- Severity classification: crash / warning / silent
- Structured output: root cause, before/after fix, common causes, docs link
- Input validation hook (rejects input <10 or >50,000 chars)
- JSONL result logging to `logs/stacklens.jsonl`
- Claude Desktop integration via stdio MCP transport
