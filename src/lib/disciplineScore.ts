interface DisciplineTrade {
  id: string;
  trade_date: string;
  profit: number | null;
  session?: string | null;
  emotion?: string | null;
  emotion_tag?: string | null;
  rule_broken?: boolean | null;
  mistake_tags?: string[] | null;
  stop_loss?: number | null;
}

interface DisciplineMetric {
  key: "rules" | "risk" | "emotion" | "pacing";
  label: string;
  score: number;
  description: string;
}

export interface DisciplineScoreResult {
  score: number;
  grade: "Elite" | "Strong" | "Developing" | "At Risk";
  summary: string;
  periodLabel: string;
  tradesAnalyzed: number;
  metrics: DisciplineMetric[];
  insights: string[];
}

const RISKY_EMOTIONS = new Set(["revenge", "fomo", "greedy", "frustrated", "fearful"]);
const RISKY_MISTAKES = new Set(["revenge_trade", "fomo_trade", "oversized", "moved_sl", "chased_price"]);
const MAX_TRADES_PER_DAY = 3;
const HARD_OVERTRADING_LIMIT = 5;

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, Math.round(value)));

const getGrade = (score: number): DisciplineScoreResult["grade"] => {
  if (score >= 85) return "Elite";
  if (score >= 70) return "Strong";
  if (score >= 50) return "Developing";
  return "At Risk";
};

const buildSummary = (score: number, topMetric: DisciplineMetric, lowMetric: DisciplineMetric) => {
  const grade = getGrade(score);

  if (grade === "Elite") {
    return `Excellent discipline lately. ${topMetric.label} is your edge right now.`;
  }

  if (grade === "Strong") {
    return `You are trading with solid structure. Tighten ${lowMetric.label.toLowerCase()} to level up.`;
  }

  if (grade === "Developing") {
    return `Your discipline is improving, but ${lowMetric.label.toLowerCase()} is still leaking performance.`;
  }

  return `Your recent behavior shows meaningful discipline drift. Start by improving ${lowMetric.label.toLowerCase()}.`;
};

export function calculateDisciplineScore(allTrades: DisciplineTrade[]): DisciplineScoreResult {
  const sortedTrades = [...allTrades]
    .filter((trade) => trade.trade_date)
    .sort((left, right) => new Date(right.trade_date).getTime() - new Date(left.trade_date).getTime());

  const now = new Date();
  const last30Days = sortedTrades.filter((trade) => {
    const tradeDate = new Date(trade.trade_date);
    const diff = now.getTime() - tradeDate.getTime();
    return diff >= 0 && diff <= 30 * 24 * 60 * 60 * 1000;
  });

  const trades = last30Days.length >= 8 ? last30Days : sortedTrades.slice(0, 20);

  if (trades.length === 0) {
    return {
      score: 0,
      grade: "Developing",
      summary: "Log more trades to unlock your first discipline score.",
      periodLabel: "No data yet",
      tradesAnalyzed: 0,
      metrics: [
        { key: "rules", label: "Rule Adherence", score: 0, description: "No tracked trades yet" },
        { key: "risk", label: "Risk Planning", score: 0, description: "No tracked trades yet" },
        { key: "emotion", label: "Emotional Control", score: 0, description: "No tracked trades yet" },
        { key: "pacing", label: "Trade Pacing", score: 0, description: "No tracked trades yet" },
      ],
      insights: [
        "Start logging trades with emotions, rules, and stop losses.",
        "The more structured your journal is, the smarter Yunix gets.",
      ],
    };
  }

  const periodLabel = last30Days.length >= 8 ? "Last 30 days" : `Last ${trades.length} trades`;

  const trackedRuleTrades = trades.filter((trade) => trade.rule_broken !== null && trade.rule_broken !== undefined);
  const cleanRuleTrades = trackedRuleTrades.filter((trade) => trade.rule_broken !== true).length;
  const ruleScore = trackedRuleTrades.length > 0
    ? clamp((cleanRuleTrades / trackedRuleTrades.length) * 100)
    : 70;

  const riskPlannedTrades = trades.filter((trade) => typeof trade.stop_loss === "number" && trade.stop_loss > 0).length;
  const riskScore = clamp((riskPlannedTrades / trades.length) * 100);

  const emotionallyRiskyTrades = trades.filter((trade) => {
    const emotion = (trade.emotion_tag || trade.emotion || "").toLowerCase();
    const mistakeTags = trade.mistake_tags || [];
    return RISKY_EMOTIONS.has(emotion) || mistakeTags.some((tag) => RISKY_MISTAKES.has(tag));
  }).length;
  const emotionScore = clamp(100 - (emotionallyRiskyTrades / trades.length) * 100);

  const tradesByDay = trades.reduce<Record<string, number>>((accumulator, trade) => {
    const dayKey = new Date(trade.trade_date).toISOString().slice(0, 10);
    accumulator[dayKey] = (accumulator[dayKey] || 0) + 1;
    return accumulator;
  }, {});
  const activeDays = Object.values(tradesByDay);
  const controlledDays = activeDays.filter((count) => count <= MAX_TRADES_PER_DAY).length;
  const overtradePenalty = activeDays.some((count) => count > HARD_OVERTRADING_LIMIT) ? 15 : 0;
  const pacingBase = activeDays.length > 0 ? (controlledDays / activeDays.length) * 100 : 100;
  const pacingScore = clamp(pacingBase - overtradePenalty);

  const weightedScore = clamp(
    ruleScore * 0.35 +
    riskScore * 0.25 +
    emotionScore * 0.2 +
    pacingScore * 0.2
  );

  const metrics: DisciplineMetric[] = [
    {
      key: "rules",
      label: "Rule Adherence",
      score: ruleScore,
      description: trackedRuleTrades.length > 0
        ? `${cleanRuleTrades}/${trackedRuleTrades.length} tracked trades followed plan`
        : "Add rule tracking to improve this metric",
    },
    {
      key: "risk",
      label: "Risk Planning",
      score: riskScore,
      description: `${riskPlannedTrades}/${trades.length} trades had a stop loss recorded`,
    },
    {
      key: "emotion",
      label: "Emotional Control",
      score: emotionScore,
      description: emotionallyRiskyTrades > 0
        ? `${emotionallyRiskyTrades} trades showed tilt/FOMO/revenge signals`
        : "No major emotional red flags detected",
    },
    {
      key: "pacing",
      label: "Trade Pacing",
      score: pacingScore,
      description: `${controlledDays}/${activeDays.length || 1} trading days stayed within ${MAX_TRADES_PER_DAY} trades`,
    },
  ];

  const topMetric = [...metrics].sort((left, right) => right.score - left.score)[0];
  const lowMetric = [...metrics].sort((left, right) => left.score - right.score)[0];

  const insights: string[] = [];

  if (riskScore < 65) {
    insights.push("Record a stop loss on every trade to improve planning discipline.");
  }
  if (emotionScore < 70) {
    insights.push("Your journal shows emotional leakage. Watch revenge, FOMO, and oversized setups.");
  }
  if (pacingScore < 70) {
    insights.push("Recent trade frequency suggests overtrading on some days. Cap your session count.");
  }
  if (ruleScore >= 80) {
    insights.push("Rule adherence is becoming a strength. Keep reinforcing your checklist.");
  }

  if (insights.length === 0) {
    insights.push("Discipline looks stable. Keep journaling consistently to strengthen coaching accuracy.");
  }

  return {
    score: weightedScore,
    grade: getGrade(weightedScore),
    summary: buildSummary(weightedScore, topMetric, lowMetric),
    periodLabel,
    tradesAnalyzed: trades.length,
    metrics,
    insights: insights.slice(0, 3),
  };
}
