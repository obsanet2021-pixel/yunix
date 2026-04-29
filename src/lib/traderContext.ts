import { supabase } from '@/integrations/supabase/client';

export interface Trade {
  id: string;
  user_id: string;
  prop_firm_id?: string;
  pair: string;
  profit: number;
  session: string;
  emotion: string;
  notes: string;
  trade_date: string;
  created_at: string;
  updated_at?: string;
}

export interface DailyCheckin {
  id: string;
  user_id: string;
  checkin_date: string;
  mood: string;
  confidence_level: number;
  stress_level: number;
  sleep_quality: string;
  trading_plan: string;
  planned_pairs: string[];
  daily_risk_limit: number;
  max_trades: number;
  ai_response?: string;
  created_at: string;
  updated_at?: string;
}

/**
 * Build context for AI from trader's recent activity
 * Returns compact string (<2KB) with PnL summary, recent trades, streak info
 */
export async function buildCheckinContext(userId: string): Promise<string> {
  try {
    // Get yesterday's check-in
    const { data: yesterdayCheckin } = await supabase
      .from('daily_checkins')
      .select('mood, confidence_level, stress_level, sleep_quality, trading_plan, ai_response, checkin_date')
      .eq('user_id', userId)
      .eq('checkin_date', new Date().toISOString().split('T')[0])
      .single();

    // Get last 5 trades
    const { data: recentTrades } = await supabase
      .from('trades')
      .select('pair, profit, session, emotion, notes, trade_date')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    // Calculate PnL summary
    const totalPnl = recentTrades.reduce((sum, trade) => sum + trade.profit, 0);
    const winRate = recentTrades.filter(t => t.profit > 0).length / recentTrades.length;
    const recentLosses = recentTrades.filter(t => t.profit < 0).length;
    const streak = recentLosses === 0 ? 'W' : `L${recentLosses}`;

    // Build context string
    const contextParts: string[] = [];

    if (yesterdayCheckin) {
      contextParts.push('YESTERDAY CHECK-IN:');
      contextParts.push(`- Mood: ${yesterdayCheckin.mood}`);
      contextParts.push(`- Confidence: ${yesterdayCheckin.confidence_level}/10}`);
      contextParts.push(`- Stress: ${yesterdayCheckin.stress_level}/10}`);
      contextParts.push(`- Sleep: ${yesterdayCheckin.sleep_quality}`);
      contextParts.push(`- Plan: ${yesterdayCheckin.trading_plan || 'none'}`);
    }

    if (recentTrades.length > 0) {
      contextParts.push(`\nRECENT TRADES (last 5):`);
      contextParts.push(`- Total P&L: $${totalPnl.toFixed(2)}`);
      contextParts.push(`- Win Rate: ${(winRate * 100).toFixed(1)}%`);
      contextParts.push(`- Recent Losses: ${recentLosses}`);
      contextParts.push(`- Current Streak: ${streak}`);
      recentTrades.slice(0, 3).forEach((trade, i) => {
        contextParts.push(`  ${i + 1}. ${trade.pair} | P&L: $${trade.profit.toFixed(2)} | ${trade.emotion || 'neutral'}`);
      });
    }

    return contextParts.join('\n');
  } catch (error) {
    console.error('Error building trader context:', error);
    return '';
  }
}
