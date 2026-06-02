/**
 * PlaybookDetail.tsx
 * Slide-in sheet showing full playbook stats, rules, and recent trades.
 */

import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, TrendingDown, Target, BarChart2, CheckSquare, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { type Playbook, type PlaybookStats, getPlaybookColorClass } from "@/hooks/usePlaybooks";

interface RecentTrade {
  id: string;
  pair: string;
  profit: number;
  trade_date: string;
  trade_type: string | null;
}

interface Props {
  playbook: Playbook | null;
  open: boolean;
  onClose: () => void;
  stats: PlaybookStats | null;
}

export default function PlaybookDetail({ playbook, open, onClose, stats }: Props) {
  const [recentTrades, setRecentTrades] = useState<RecentTrade[]>([]);
  const [loadingTrades, setLoadingTrades] = useState(false);

  useEffect(() => {
    if (!playbook || !open) return;
    setLoadingTrades(true);
    supabase
      .from("trades")
      .select("id, pair, profit, trade_date, trade_type")
      .eq("playbook_id", playbook.id)
      .order("trade_date", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        setRecentTrades((data as RecentTrade[]) ?? []);
        setLoadingTrades(false);
      });
  }, [playbook, open]);

  if (!playbook) return null;

  const colorClass = getPlaybookColorClass(playbook.color);
  const winRate = stats && stats.total_trades > 0
    ? (stats.winning_trades / stats.total_trades) * 100 : 0;

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-xs ${colorClass}`}>
              {playbook.color}
            </Badge>
            <SheetTitle className="text-xl">{playbook.name}</SheetTitle>
          </div>
          {playbook.description && (
            <p className="text-sm text-muted-foreground">{playbook.description}</p>
          )}
        </SheetHeader>

        <div className="space-y-5">
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Total Trades", value: stats?.total_trades ?? 0, suffix: "", plain: true },
              {
                label: "Win Rate",
                value: stats?.total_trades ? `${winRate.toFixed(1)}%` : "—",
                color: winRate >= 60 ? "text-green-600 dark:text-green-400"
                  : winRate >= 40 ? "text-amber-600 dark:text-amber-400"
                  : "text-red-600 dark:text-red-400",
              },
              {
                label: "Total P&L",
                value: stats ? `${stats.total_profit >= 0 ? "+" : ""}$${Math.abs(stats.total_profit).toFixed(2)}` : "—",
                color: (stats?.total_profit ?? 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400",
              },
              {
                label: "Avg per Trade",
                value: stats?.total_trades ? `${stats.avg_profit >= 0 ? "+" : ""}$${Math.abs(stats.avg_profit).toFixed(2)}` : "—",
                color: (stats?.avg_profit ?? 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400",
              },
              {
                label: "Best Trade",
                value: stats?.total_trades ? `+$${stats.best_trade.toFixed(2)}` : "—",
                color: "text-green-600 dark:text-green-400",
              },
              {
                label: "Worst Trade",
                value: stats?.total_trades ? `-$${Math.abs(stats.worst_trade).toFixed(2)}` : "—",
                color: "text-red-600 dark:text-red-400",
              },
            ].map(stat => (
              <div key={stat.label} className="p-3 rounded-lg bg-muted/40 border border-border/50">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className={`text-xl font-bold font-mono mt-0.5 ${(stat as any).color ?? "text-foreground"}`}>
                  {String(stat.value)}
                </p>
              </div>
            ))}
          </div>

          {/* Risk params */}
          {(playbook.risk_per_trade || playbook.max_daily_loss) && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Risk Parameters
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {playbook.risk_per_trade && (
                    <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50">
                      <p className="text-xs text-muted-foreground">Risk per trade</p>
                      <p className="text-sm font-semibold mt-0.5">${playbook.risk_per_trade}</p>
                    </div>
                  )}
                  {playbook.max_daily_loss && (
                    <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50">
                      <p className="text-xs text-muted-foreground">Max daily loss</p>
                      <p className="text-sm font-semibold mt-0.5">${playbook.max_daily_loss}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Entry rules */}
          {playbook.entry_rules.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-primary" />
                  Entry Rules Checklist
                </p>
                <div className="space-y-2">
                  {playbook.entry_rules.map((rule, i) => (
                    <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/30 border border-border/40">
                      <span className="text-primary text-sm mt-0.5 shrink-0">✓</span>
                      <p className="text-sm">{rule}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Preferred sessions + pairs */}
          {(playbook.preferred_sessions.length > 0 || playbook.preferred_pairs.length > 0) && (
            <>
              <Separator />
              <div className="space-y-3">
                {playbook.preferred_sessions.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Sessions</p>
                    <div className="flex flex-wrap gap-1.5">
                      {playbook.preferred_sessions.map(s => (
                        <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {playbook.preferred_pairs.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Pairs</p>
                    <div className="flex flex-wrap gap-1.5">
                      {playbook.preferred_pairs.map(p => (
                        <Badge key={p} variant="outline" className="text-xs font-mono">{p}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Recent trades */}
          <Separator />
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-primary" />
              Recent Trades
            </p>
            {loadingTrades ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : recentTrades.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No trades tagged to this playbook yet.
              </p>
            ) : (
              <div className="space-y-1.5">
                {recentTrades.map(t => {
                  const isWin = t.profit > 0;
                  return (
                    <div key={t.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/40">
                      <div className="flex items-center gap-2">
                        {isWin
                          ? <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                          : <TrendingDown className="h-3.5 w-3.5 text-red-500" />}
                        <span className="font-medium text-sm">{t.pair}</span>
                        {t.trade_type && (
                          <Badge variant="outline" className={`text-[10px] py-0 px-1.5 ${
                            t.trade_type.toLowerCase() === "buy"
                              ? "bg-green-500/10 text-green-600 border-green-500/30"
                              : "bg-red-500/10 text-red-600 border-red-500/30"
                          }`}>
                            {t.trade_type}
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold font-mono ${isWin ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                          {isWin ? "+" : ""}${t.profit.toFixed(2)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{t.trade_date}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
