import { CHARACTER_LIMIT } from "../constants.js";
import { ResponseFormat } from "../types.js";

/** Truncates text to CHARACTER_LIMIT, appending a clear notice so agents know to paginate/filter. */
export function truncate(text: string, limit: number = CHARACTER_LIMIT): string {
  if (text.length <= limit) return text;
  return (
    text.slice(0, limit) +
    `\n\n[Response truncated at ${limit} characters. Narrow your query with filters, a smaller limit, or a later offset to see more.]`
  );
}

/** Builds the standard { content, structuredContent } tool result for either format. */
export function toolResult(
  format: ResponseFormat,
  markdownText: string,
  structured: Record<string, unknown>
) {
  const text =
    format === ResponseFormat.JSON ? JSON.stringify(structured, null, 2) : markdownText;
  return {
    content: [{ type: "text" as const, text: truncate(text) }],
    structuredContent: structured
  };
}

export function fmtMoney(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}`;
}

export function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `${(n * 100).toFixed(1)}%`;
}
