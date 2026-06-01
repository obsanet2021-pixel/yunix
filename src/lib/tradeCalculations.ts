// Trade analytics calculation utilities

export interface TradeWithPricing {
  id: string;
  pair: string;
  profit: number;
  entry_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  close_price: number | null;
  volume: number | null;
  trade_type: string | null;
  rule_broken?: boolean | null;
  mistake_tags?: string[] | null;
}

// ── Instrument-aware lot size lookup ────────────────────────────────────────
//
// FIX: Original code used STANDARD_LOT = 100,000 for everything.
// XAUUSD is 100 oz/lot, indices and crypto are 1 unit/lot.
// Using Forex lot size for gold/indices produces R-Multiples 100-1000x too small.
//
const LOT_SIZES: { pattern: RegExp; lotSize: number; label: string }[] = [
  // Gold
  { pattern: /^XAU/i,                   lotSize: 100,     label: "Gold (oz)" },
  // Silver
  { pattern: /^XAG/i,                   lotSize: 5000,    label: "Silver (oz)" },
  // Crypto (BTC, ETH, etc.) — 1 unit per lot
  { pattern: /^(BTC|ETH|LTC|XRP)/i,    lotSize: 1,       label: "Crypto" },
  // Indices (US30, NAS100, SPX, GER40, UK100, etc.)
  { pattern: /^(US|NAS|SP|DJ|GER|UK|AUS|JPN|FRA)/i, lotSize: 1, label: "Index" },
  // Oil
  { pattern: /^(OIL|WTI|BRENT|USOIL|UKOIL)/i, lotSize: 1000, label: "Oil (bbl)" },
  // Standard Forex — 100,000 units per lot (default)
  { pattern: /./,                        lotSize: 100000,  label: "Forex" },
];

function getLotSize(pair: string): number {
  for (const entry of LOT_SIZES) {
    if (entry.pattern.test(pair)) return entry.lotSize;
  }
  return 100000;
}

/**
 * Calculate R-Multiple for a trade.
 * R = Profit / Risk (where Risk = |Entry − SL| × volume × lotSize)
 *
 * Uses instrument-aware lot sizes — XAUUSD, indices, crypto are no longer
 * calculated with a Forex lot size (was producing values 100–1000× too small).
 */
export const calculateRMultiple = (trade: TradeWithPricing): number | null => {
  if (
    !trade.entry_price ||
    !trade.stop_loss ||
    trade.profit === null ||
    trade.profit === undefined
  ) return null;

  const riskPerUnit = Math.abs(trade.entry_price - trade.stop_loss);
  if (riskPerUnit === 0) return null;

  const volume = trade.volume || 1;
  const lotSize = getLotSize(trade.pair ?? "");
  const riskInDollars = riskPerUnit * volume * lotSize;
  if (riskInDollars === 0) return null;

  return trade.profit / riskInDollars;
};

/**
 * Calculate Risk/Reward Ratio for a trade.
 * RR = TP distance / SL distance
 */
export const calculateRiskReward = (trade: TradeWithPricing): number | null => {
  if (!trade.entry_price || !trade.stop_loss || !trade.take_profit) return null;

  const slDistance = Math.abs(trade.entry_price - trade.stop_loss);
  const tpDistance = Math.abs(trade.take_profit - trade.entry_price);
  if (slDistance === 0) return null;

  return tpDistance / slDistance;
};

/**
 * Calculate Expectancy.
 * Expectancy = (Win% × Avg Win) − (Loss% × Avg Loss)
 */
export const calculateExpectancy = (trades: TradeWithPricing[]): number => {
  if (trades.length === 0) return 0;

  const wins   = trades.filter(t => t.profit > 0);
  const losses = trades.filter(t => t.profit < 0);

  const winRate = wins.length / trades.length;
  const avgWin  = wins.length > 0
    ? wins.reduce((s, t) => s + t.profit, 0) / wins.length
    : 0;
  const avgLoss = losses.length > 0
    ? Math.abs(losses.reduce((s, t) => s + t.profit, 0) / losses.length)
    : 0;

  return winRate * avgWin - (1 - winRate) * avgLoss;
};

/** Average R-Multiple across a trade set. */
export const calculateAverageR = (trades: TradeWithPricing[]): number | null => {
  const rs = trades.map(t => calculateRMultiple(t)).filter((r): r is number => r !== null);
  if (rs.length === 0) return null;
  return rs.reduce((s, r) => s + r, 0) / rs.length;
};

/** Average Risk/Reward Ratio across a trade set. */
export const calculateAverageRiskReward = (trades: TradeWithPricing[]): number | null => {
  const rrs = trades.map(t => calculateRiskReward(t)).filter((r): r is number => r !== null);
  if (rrs.length === 0) return null;
  return rrs.reduce((s, r) => s + r, 0) / rrs.length;
};

/** Total $ lost on trades where rules were broken. */
export const calculateMistakeCost = (trades: TradeWithPricing[]): number =>
  trades
    .filter(t => t.rule_broken === true && t.profit < 0)
    .reduce((s, t) => s + Math.abs(t.profit), 0);

/** Count occurrences of each mistake tag. */
export const countMistakesByType = (trades: TradeWithPricing[]): Record<string, number> => {
  const counts: Record<string, number> = {};
  trades.forEach(t => {
    (t.mistake_tags ?? []).forEach(tag => {
      counts[tag] = (counts[tag] ?? 0) + 1;
    });
  });
  return counts;
};

/** Total $ loss attributed to each mistake tag. */
export const getLossByMistakeType = (trades: TradeWithPricing[]): Record<string, number> => {
  const losses: Record<string, number> = {};
  trades.forEach(t => {
    if ((t.mistake_tags?.length ?? 0) > 0 && t.profit < 0) {
      t.mistake_tags!.forEach(tag => {
        losses[tag] = (losses[tag] ?? 0) + Math.abs(t.profit);
      });
    }
  });
  return losses;
};

// ── Emotion tags ─────────────────────────────────────────────────────────────

export const EMOTION_TAGS = [
  { value: "calm",        label: "Calm",        color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { value: "confident",   label: "Confident",   color: "bg-green-500/20 text-green-400 border-green-500/30" },
  { value: "fearful",     label: "Fearful",     color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  { value: "greedy",      label: "Greedy",      color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  { value: "fomo",        label: "FOMO",        color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  { value: "revenge",     label: "Revenge",     color: "bg-red-500/20 text-red-400 border-red-500/30" },
  { value: "frustrated",  label: "Frustrated",  color: "bg-pink-500/20 text-pink-400 border-pink-500/30" },
] as const;

// ── Mistake tags ──────────────────────────────────────────────────────────────

export const MISTAKE_TAGS = [
  { value: "early_entry",   label: "Early Entry",   description: "Entered before confirmation" },
  { value: "late_entry",    label: "Late Entry",    description: "Entered too late in the move" },
  { value: "moved_sl",      label: "Moved SL",      description: "Moved stop loss against the trade" },
  { value: "removed_tp",    label: "Removed TP",    description: "Removed take profit target" },
  { value: "oversized",     label: "Oversized",     description: "Position size too large" },
  { value: "revenge_trade", label: "Revenge Trade", description: "Trading to recover losses" },
  { value: "fomo_trade",    label: "FOMO Trade",    description: "Fear of missing out" },
  { value: "chased_price",  label: "Chased Price",  description: "Entered at a bad price" },
] as const;

export const getEmotionTagStyle = (tag: string): string =>
  EMOTION_TAGS.find(e => e.value === tag)?.color ?? "bg-muted text-muted-foreground";

export const getMistakeTagLabel = (tag: string): string =>
  MISTAKE_TAGS.find(m => m.value === tag)?.label ?? tag;
