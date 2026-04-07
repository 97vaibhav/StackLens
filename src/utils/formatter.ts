import type { ErrorResult } from "../schemas/errorResult.js";

const SEVERITY_ICONS: Record<string, string> = {
  crash: "🔴",
  warning: "🟡",
  silent: "🔵",
};

export function formatResult(result: ErrorResult): string {
  const icon = SEVERITY_ICONS[result.severity] ?? "⚪";

  const lines: string[] = [
    `## ${icon} ${result.summary}`,
    ``,
    `**Language:** ${result.language}  |  **Severity:** ${result.severity}`,
    ``,
    `### Root cause`,
  ];

  if (result.root_cause.file) {
    const loc = result.root_cause.line ? ` line ${result.root_cause.line}` : "";
    lines.push(`\`${result.root_cause.file}\`${loc}`);
  }

  lines.push(result.root_cause.reason, ``, `### Fix`, `**Before:**`, "```");
  lines.push(result.fix.before, "```", `**After:**`, "```");
  lines.push(result.fix.after, "```", result.fix.explanation, ``);

  lines.push(`### Common causes`);
  for (const cause of result.common_causes) {
    lines.push(`- ${cause}`);
  }

  if (result.docs_link) {
    lines.push(``, `**Docs:** ${result.docs_link}`);
  }

  return lines.filter((line, i) => !(line === "" && lines[i - 1] === "")).join("\n");
}
