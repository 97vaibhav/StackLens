import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { ErrorResult } from "../schemas/errorResult.js";

export function logResult(input: string, output: ErrorResult): void {
  const logDir = path.join(process.cwd(), "logs");
  fs.mkdirSync(logDir, { recursive: true });

  // Hash input for deduplication — never log raw error text (may contain credentials/PII)
  const inputHash = crypto.createHash("sha256").update(input).digest("hex").slice(0, 12);

  const entry = {
    timestamp: new Date().toISOString(),
    input_hash: inputHash,
    input_length: input.length,
    severity: output.severity,
    language: output.language,
  };

  const logPath = path.join(logDir, "stacklens.jsonl");
  fs.appendFileSync(logPath, JSON.stringify(entry) + "\n");
}
