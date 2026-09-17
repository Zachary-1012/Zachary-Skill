/**
 * Small dependency-free sanitizer for untrusted snippets before they enter a
 * rendered HTML context. The console normally renders text, but connectors may
 * still provide markup-shaped summaries, so unsafe tags/attributes are removed.
 */
export function sanitizeHtml(input: string): string {
  return String(input)
    .replace(/<\s*(script|style|iframe|object|embed|form|link|meta)[^>]*>[\s\S]*?<\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|style|iframe|object|embed|form|link|meta)\b[^>]*\/?>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+(?:href|src|action| formaction)\s*=\s*(?:"\s*javascript:[^"]*"|'\s*javascript:[^']*'|\s*javascript:[^\s>]+)/gi, "")
    .replace(/javascript\s*:/gi, "")
    .trim();
}

export function stripHtml(input: string): string {
  return sanitizeHtml(input).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

