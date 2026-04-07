const VALID_LANGUAGES = new Set([
  "Python", "JavaScript", "TypeScript", "Java", "Go",
  "Rust", "SQL", "Docker", "C/C++", "Unknown",
]);

export function validateErrorInput(text: string): { valid: boolean; reason?: string } {
  if (!text || text.trim().length < 10) {
    return { valid: false, reason: "Input too short to be a valid error" };
  }
  if (text.length > 50000) {
    return { valid: false, reason: "Input too large — please trim to the relevant stack trace" };
  }
  return { valid: true };
}

export function validateLanguageHint(hint?: string): { valid: boolean; reason?: string } {
  if (!hint) return { valid: true };
  if (!VALID_LANGUAGES.has(hint)) {
    return {
      valid: false,
      reason: `Invalid language hint "${hint}". Allowed: ${[...VALID_LANGUAGES].join(", ")}`,
    };
  }
  return { valid: true };
}
