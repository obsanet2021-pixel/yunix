/**
 * PlaybookCard.tsx
 * Displays a playbook with live win rate, P&L, trade count and actions.
 */

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, TrendingUp, TrendingDown, ChevronRight, CheckSquare } from "lucide-react";
import { type Playbook, getPlaybookColorClass } from "@/hooks/usePlaybooks";

interface Props {
  playbook: Playbook;
  onEdit: (p: Playbook) => void;
  onDelete: (p: Playbook) => void;
  onClick: (p: Playbook) => void;
}

export default function PlaybookCard({ playbook, onEdit, onDelete, onClick }: Props) {
  const total = playbook.total_trades ?? 0;
  const wins = playbook.winning_trades ?? 0;
  const profit = playbook.total_profit ?? 0;
  const winRate = total > 0 ? (wins / total) * 100 : 0;
  const colorClass = getPlaybookColorClass(playbook.color);

  return (
    <Card
      className="glow-card cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all group"
      onClick={() => onClick(playbook)}
    >
      <CardHeader className="pb-2 px-4 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Badge variant="outline" className={`text-xs shrink-0 ${colorClass}`}>
              {playbook.color.charAt(0).toUpperCase() + playbook.color.slice(1)}
            </Badge>
            <h3 className="font-semibold text-base truncate">{playbook.name}</h3>
          </div>
          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost" size="icon" className="h-7 w-7"
              onClick={e => { e.stopPropagation(); onEdit(playbook); }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10"
              onClick={e => { e.stopPropagation(); onDelete(playbook); }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        {playbook.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{playbook.description}</p>
        )}
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-3">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 rounded-lg bg-muted/40">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Trades</p>
            <p className="text-lg font-bold mt-0.5">{total}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/40">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Win Rate</p>
            <p className={`text-lg font-bold mt-0.5 ${
              total === 0 ? "text-muted-foreground"
              : winRate >= 60 ? "text-green-600 dark:text-green-400"
              : winRate >= 40 ? "text-amber-600 dark:text-amber-400"
              : "text-red-600 dark:text-red-400"
            }`}>
              {total === 0 ? "—" : `${winRate.toFixed(0)}%`}
            </p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/40">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">P&L</p>
            <div className={`flex items-center justify-center gap-0.5 mt-0.5 ${
              total === 0 ? "text-muted-foreground"
              : profit > 0 ? "text-green-600 dark:text-green-400"
              : profit < 0 ? "text-red-600 dark:text-red-400"
              : "text-muted-foreground"
            }`}>
              {total > 0 && (profit > 0
                ? <TrendingUp className="h-3.5 w-3.5" />
                : <TrendingDown className="h-3.5 w-3.5" />)}
              <p className="text-sm font-bold">
                {total === 0 ? "—" : `${profit >= 0 ? "+" : ""}$${Math.abs(profit).toFixed(0)}`}
              </p>
            </div>
          </div>
        </div>

        {/* Entry rules preview */}
        {playbook.entry_rules.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <CheckSquare className="h-3 w-3" />
              Entry Rules ({playbook.entry_rules.length})
            </p>
            {playbook.entry_rules.slice(0, 2).map((rule, i) => (
              <p key={i} className="text-xs text-muted-foreground truncate">
                <span className="text-primary mr-1">✓</span>{rule}
              </p>
            ))}
            {playbook.entry_rules.length > 2 && (
              <p className="text-xs text-muted-foreground">+{playbook.entry_rules.length - 2} more rules</p>
            )}
          </div>
        )}

        {/* Sessions + pairs tags */}
        {(playbook.preferred_sessions.length > 0 || playbook.preferred_pairs.length > 0) && (
          <div className="flex flex-wrap gap-1">
            {playbook.preferred_sessions.map(s => (
              <Badge key={s} variant="outline" className="text-[10px] py-0 px-1.5">{s}</Badge>
            ))}
            {playbook.preferred_pairs.map(p => (
              <Badge key={p} variant="outline" className="text-[10px] py-0 px-1.5 font-mono">{p}</Badge>
            ))}
          </div>
        )}

        <div className="flex items-center justify-end text-xs text-muted-foreground group-hover:text-primary transition-colors">
          View details <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
        </div>
      </CardContent>
    </Card>
  );
}
