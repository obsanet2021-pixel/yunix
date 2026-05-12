/** Shared normalization for trades imported from text / AI (journal + AI chat). */

export type TradeImportTimezone = "Europe/London" | "America/New_York";

export function parseImportedOpenCloseTime(dateStr: string | undefined | null): string | null {
  if (!dateStr) return null;
  const isoSpace = dateStr.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})$/);
  if (isoSpace) return `${isoSpace[1]}T${isoSpace[2]}`;
  const ddmmyyyyMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4}),?\s*(\d{2}):(\d{2}):(\d{2})$/);
  if (ddmmyyyyMatch) {
    const [, d, m, y, h, mi, s] = ddmmyyyyMatch;
    return `${y}-${m}-${d}T${h}:${mi}:${s}`;
  }
  const yyyymmddMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (yyyymmddMatch) return dateStr;
  const ddmmyyyyOnlyMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (ddmmyyyyOnlyMatch) {
    const [, d, m, y] = ddmmyyyyOnlyMatch;
    return `${y}-${m}-${d}`;
  }
  if (dateStr.includes("T") || dateStr.match(/^\d{4}-\d{2}-\d{2}/)) return dateStr;
  return null;
}

export function parseImportedTradeDate(dateStr: string | undefined | null): string {
  if (!dateStr) return new Date().toISOString().split("T")[0];
  const dotted = dateStr.match(/^(\d{4})\.(\d{2})\.(\d{2})/);
  if (dotted) {
    const [, y, m, d] = dotted;
    return `${y}-${m}-${d}`;
  }
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;
  const ddmmyyyyMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (ddmmyyyyMatch) {
    const [, d, m, y] = ddmmyyyyMatch;
    return `${y}-${m}-${d}`;
  }
  const ddmmyyyyWithTimeMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4}),?\s*(\d{2}):(\d{2}):(\d{2})$/);
  if (ddmmyyyyWithTimeMatch) {
    const [, d, m, y] = ddmmyyyyWithTimeMatch;
    return `${y}-${m}-${d}`;
  }
  if (dateStr.includes("T")) return dateStr.split("T")[0];
  return dateStr;
}

export function sessionFromOpenTime(
  timeStr: string | undefined | null,
  timezone: TradeImportTimezone,
): string {
  if (!timeStr) return "Unknown";
  try {
    const date = new Date(timeStr);
    if (timezone === "Europe/London") {
      const hour = date.getUTCHours();
      if (hour >= 8 && hour < 12) return "London";
      if (hour >= 13 && hour < 17) return "New York";
      if (hour >= 21 || hour < 2) return "Asian";
    } else {
      const hour = date.getHours();
      if (hour >= 8 && hour < 12) return "London";
      if (hour >= 13 && hour < 17) return "New York";
      if (hour >= 21 || hour < 2) return "Asian";
    }
    return "Unknown";
  } catch {
    return "Unknown";
  }
}
