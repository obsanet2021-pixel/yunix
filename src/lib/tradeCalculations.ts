// Trade analytics calculation utilities

export interface TradeWithPricing {
  id: string;
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

// Standard lot size for forex (100,000 units)
const STANDARD_LOT = 100000;

/**
 * Calculate R-Multiple for a trade
 * R-Multiple = Profit / Risk (where Risk = Entry - SL in dollar terms)
 */
export const calculateRMultiple = (trade: TradeWithPricing): number | null => {
  if (!trade.entry_price || !trade.stop_loss || trade.profit === null || trade.profit === undefined) {
    return null;
  }

  const riskPerUnit = Math.abs(trade.entry_price - trade.stop_loss);
  if (riskPerUnit === 0) return null;

  const volume = trade.volume || 1;
  const riskInDollars = riskPerUnit * volume * STANDARD_LOT;

  if (riskInDollars === 0) return null;

  return trade.profit / riskInDollars;
};

/**
 * Calculate Risk/Reward Ratio for a trade
 * RR = TP distance / SL distance
 */
export const calculateRiskReward = (trade: TradeWithPricing): number | null => {
  if (!trade.entry_price || !trade.stop_loss || !trade.take_profit) {
    return null;
  }

  const slDistance = Math.abs(trade.entry_price - trade.stop_loss);
  const tpDistance = Math.abs(trade.take_profit - trade.entry_price);

  if (slDistance === 0) return null;

  return tpDistance / slDistance;
};

/**
 * Calculate Expectancy for a set of trades
 * Expectancy = (Win% x Avg Win) - (Loss% x Avg Loss)
 */
export const calculateExpectancy = (trades: TradeWithPricing[]): number => {
  if (trades.length === 0) return 0;

  const wins = trades.filter(t => t.profit > 0);
  const losses = trades.filter(t => t.profit < 0);

  const winRate = wins.length / trades.length;
  const avgWin = wins.length > 0
    ? wins.reduce((sum, t) => sum + t.profit, 0) / wins.length
    : 0;
  const avgLoss = losses.length > 0
    ? Math.abs(losses.reduce((sum, t) => sum + t.profit, 0) / losses.length)
    : 0;

  return (winRate * avgWin) - ((1 - winRate) * avgLoss);
};

/**
 * Calculate Average R-Multiple for a set of trades
 */
export const calculateAverageR = (trades: TradeWithPricing[]): number | null => {
  const rMultiples = trades
    .map(t => calculateRMultiple(t))
    .filter((r): r is number => r !== null);

  if (rMultiples.length === 0) return null;

  return rMultiples.reduce((sum, r) => sum + r, 0) / rMultiples.length;
};

/**
 * Calculate Average Risk/Reward Ratio for a set of trades
 */
export const calculateAverageRiskReward = (trades: TradeWithPricing[]): number | null => {
  const rrRatios = trades
    .map(t => calculateRiskReward(t))
    .filter((rr): rr is number => rr !== null);

  if (rrRatios.length === 0) return null;

  return rrRatios.reduce((sum, rr) => sum + rr, 0) / rrRatios.length;
};

/**
 * Calculate Mistake Cost - total $ lost on trades where rules were broken
 */
export const calculateMistakeCost = (trades: TradeWithPricing[]): number => {
  return trades
    .filter(t => t.rule_broken === true && t.profit < 0)
    .reduce((sum, t) => sum + Math.abs(t.profit), 0);
};

/**
 * Count trades by mistake type
 */
export const countMistakesByType = (trades: TradeWithPricing[]): Record<string, number> => {
  const counts: Record<string, number> = {};

  trades.forEach(trade => {
    if (trade.mistake_tags && trade.mistake_tags.length > 0) {
      trade.mistake_tags.forEach(tag => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    }
  });

  return counts;
};

/**
 * Get loss amount by mistake type
 */
export const getLossByMistakeType = (trades: TradeWithPricing[]): Record<string, number> => {
  const losses: Record<string, number> = {};

  trades.forEach(trade => {
    if (trade.mistake_tags && trade.mistake_tags.length > 0 && trade.profit < 0) {
      trade.mistake_tags.forEach(tag => {
        losses[tag] = (losses[tag] || 0) + Math.abs(trade.profit);
      });
    }
  });

  return losses;
};

// Emotion tag options
export const EMOTION_TAGS = [
  { value: 'calm', label: 'Calm', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'confident', label: 'Confident', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { value: 'fearful', label: 'Fearful', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { value: 'greedy', label: 'Greedy', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { value: 'fomo', label: 'FOMO', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { value: 'revenge', label: 'Revenge', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { value: 'frustrated', label: 'Frustrated', color: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
] as const;

// Mistake tag options
export const MISTAKE_TAGS = [
  { value: 'early_entry', label: 'Early Entry', description: 'Entered before confirmation' },
  { value: 'late_entry', label: 'Late Entry', description: 'Entered too late in the move' },
  { value: 'moved_sl', label: 'Moved SL', description: 'Moved stop loss against the trade' },
  { value: 'removed_tp', label: 'Removed TP', description: 'Removed take profit target' },
  { value: 'oversized', label: 'Oversized', description: 'Position size too large' },
  { value: 'revenge_trade', label: 'Revenge Trade', description: 'Trading to recover losses' },
  { value: 'fomo_trade', label: 'FOMO Trade', description: 'Fear of missing out' },
  { value: 'chased_price', label: 'Chased Price', description: 'Entered at a bad price' },
] as const;

export const getEmotionTagStyle = (tag: string): string => {
  const emotion = EMOTION_TAGS.find(e => e.value === tag);
  return emotion?.color || 'bg-muted text-muted-foreground';
};

export const getMistakeTagLabel = (tag: string): string => {
  const mistake = MISTAKE_TAGS.find(m => m.value === tag);
  return mistake?.label || tag;
};
