export function detectLanguage(errorText: string): string {
  const text = errorText.toLowerCase();
  if (text.includes("traceback (most recent call last)")) return "Python";
  if (text.includes("at ") && text.includes(".ts:")) return "TypeScript";
  if (text.includes("at ") && text.includes(".js:")) return "JavaScript";
  if (text.includes("exception in thread") || text.includes(".java:")) return "Java";
  if (text.includes("goroutine") || text.includes("panic:")) return "Go";
  if (text.includes("thread 'main' panicked")) return "Rust";
  if (text.includes("sqlstate") || text.includes("syntax error near")) return "SQL";
  if (text.includes("error response from daemon") || text.includes("dockerfile")) return "Docker";
  if (text.includes("segmentation fault") || text.includes("core dumped")) return "C/C++";
  return "Unknown";
}
