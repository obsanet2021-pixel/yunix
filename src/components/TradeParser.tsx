import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { Brain, Trash2, FileText, TrendingUp, TrendingDown, Loader2, CheckCircle2 } from 'lucide-react';

interface ParsedTrade {
  date: string;
  time: string;
  closeDateTime: string;
  pair: string;
  type: string;
  vol: string;
  entry: string;
  tp: string;
  sl: string;
  close: string;
  pl: string;
  session: string;
  account: string;
}

function mt5DateTimeToIso(dt: string): string | null {
  const m = dt.trim().match(/^(\d{4})\.(\d{2})\.(\d{2}),\s*(\d{2}):(\d{2}):(\d{2})$/);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`;
}

export type ParsedTradeImport = {
  pair: string;
  profit: number;
  volume: number;
  trade_type: string;
  entry_price: number;
  close_price: number;
  open_time?: string | null;
  close_time?: string | null;
  trade_date: string;
  session?: string;
  notes?: string;
};

const TYPE_LABEL: Record<string, string> = {
  TAKE_PROFIT: 'TP Hit',
  STOP_LOSS: 'SL Hit',
  MARKET: 'Market',
};

const getTypeBadge = (type: string) => {
  if (type === 'TAKE_PROFIT') return 'bg-green-500/10 text-green-500 border-green-500/30';
  if (type === 'STOP_LOSS')   return 'bg-red-500/10 text-red-500 border-red-500/30';
  return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
};

export default function TradeParser({ onTradesExtracted }: { onTradesExtracted?: (trades: ParsedTradeImport[]) => void }) {
  const [rawInput, setRawInput] = useState('');
  const [parsedTrades, setParsedTrades] = useState<ParsedTrade[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const exampleText = `XAUUSD\tTAKE_PROFIT\t2026.04.23, 13:24:30\t 0.02  $4,729.72  2026.04.23, 17:43:01\t $4,678.96  $0  $101.32  $101.22  XAUUSD\tTAKE_PROFIT\t2026.04.23, 13:40:34\t 0.02  $4,733.5  2026.04.23, 17:43:01\t $4,678.62  $0  $109.92  $109.82  XAUUSD\tMARKET\t2026.05.04, 19:28:22\t 0.02  $4,523.88  2026.05.05, 12:24:29\t $4,570.88  -$1.39  $94.5  $93.01  XAUUSD\tMARKET\t2026.05.06, 13:54:51\t 0.02  $4,705.07  2026.05.06, 13:55:43\t $4,705.71  $0  -$1.3  -$1.4  XAUUSD\tSTOP_LOSS\t2026.05.06, 14:00:04\t 0.02  $4,701.99  2026.05.07, 00:00:21\t $4,701.13  $2.1  $0.68  $2.68`;

  const parseTrades = (raw: string): ParsedTrade[] => {
    if (!raw.trim()) return [];
    const tradeRegex = /([A-Z]+)\t([A-Z_]+)\t(\d{4}\.\d{2}\.\d{2}, \d{2}:\d{2}:\d{2})\t\s*(\S+)\s+(\$\S+)\s+(\d{4}\.\d{2}\.\d{2}, \d{2}:\d{2}:\d{2})\t\s+(\$\S+)\s+(\S+)\s+(\S+)\s+(\S+)/g;
    const trades: ParsedTrade[] = [];
    let match;
    while ((match = tradeRegex.exec(raw)) !== null) {
      const [, pair, type, openDateTime, vol, entry, closeDateTime, closePrice, , , netProfit] = match;
      const [datePart, timePart] = openDateTime.split(', ');
      trades.push({ date: datePart, time: timePart, closeDateTime, pair, type, vol, entry, tp: '', sl: '', close: closePrice, pl: netProfit, session: '', account: '' });
    }
    return trades;
  };

  const handleParse = () => {
    if (!rawInput.trim()) {
      toast({ title: 'No Data', description: 'Please paste trade data first.', variant: 'destructive' });
      return;
    }
    setIsParsing(true);
    setTimeout(() => {
      try {
        const trades = parseTrades(rawInput);
        if (trades.length === 0) {
          toast({ title: 'No Trades Found', description: 'No matching trade data found. Check the format matches the example.', variant: 'destructive' });
          setShowTable(false);
        } else {
          setParsedTrades(trades);
          setShowTable(true);
          toast({ title: `${trades.length} trades parsed`, description: 'Review below and click Import to save.' });
          if (onTradesExtracted) {
            onTradesExtracted(trades.map(trade => {
              const openIso = mt5DateTimeToIso(`${trade.date}, ${trade.time}`);
              const closeIso = mt5DateTimeToIso(trade.closeDateTime);
              return {
                pair: trade.pair,
                profit: parseFloat(trade.pl.replace(/[$,]/g, '')),
                volume: parseFloat(trade.vol),
                trade_type: trade.type.includes('PROFIT') ? 'Buy' : 'Sell',
                entry_price: parseFloat(trade.entry.replace(/[$,]/g, '')),
                close_price: parseFloat(trade.close.replace(/[$,]/g, '')),
                open_time: openIso,
                close_time: closeIso,
                trade_date: trade.date.replace(/\./g, '-'),
                session: trade.session,
                notes: `Parsed from ${trade.pair} trade data`,
              };
            }));
          }
        }
      } catch (err) {
        toast({ title: 'Parsing Error', description: err instanceof Error ? err.message : 'Failed to parse.', variant: 'destructive' });
      } finally {
        setIsParsing(false);
      }
    }, 100);
  };

  const handleClear = () => { setRawInput(''); setParsedTrades([]); setShowTable(false); };

  const totalPnL = parsedTrades.reduce((sum, t) => sum + (parseFloat(t.pl.replace(/[$,]/g, '')) || 0), 0);
  const wins = parsedTrades.filter(t => parseFloat(t.pl.replace(/[$,]/g, '')) > 0).length;
  const losses = parsedTrades.filter(t => parseFloat(t.pl.replace(/[$,]/g, '')) < 0).length;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3 px-4 pt-4">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Trade Parser
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-0.5">
          Paste MT5 trade history (copy from your trading platform history tab)
        </p>
      </CardHeader>

      <CardContent className="space-y-4 px-4 pb-4">
        {/* Input area */}
        <div className="space-y-2">
          <Textarea
            value={rawInput}
            onChange={e => setRawInput(e.target.value)}
            placeholder="Paste trade data here... (tab-separated from MT5 history)"
            className="min-h-[140px] font-mono text-xs resize-none bg-muted/30 focus:bg-background transition-colors"
            disabled={isParsing}
          />
          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleParse} disabled={isParsing || !rawInput.trim()} className="flex-1 min-w-[140px] gap-2">
              {isParsing
                ? <><Loader2 className="h-4 w-4 animate-spin" />Parsing...</>
                : <><Brain className="h-4 w-4" />Parse Trades</>}
            </Button>
            <Button variant="outline" onClick={handleClear} disabled={isParsing} className="gap-2">
              <Trash2 className="h-4 w-4" />Clear
            </Button>
            <Button variant="ghost" onClick={() => setRawInput(exampleText)} disabled={isParsing} className="gap-2 text-xs">
              <FileText className="h-3 w-3" />Load Example
            </Button>
          </div>
        </div>

        {/* Results */}
        {showTable && parsedTrades.length > 0 && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">

            {/* Summary bar */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-muted/50 border border-border p-2.5 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Trades</p>
                <p className="text-lg font-bold mt-0.5">{parsedTrades.length}</p>
              </div>
              <div className="rounded-lg bg-muted/50 border border-border p-2.5 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">W / L</p>
                <p className="text-lg font-bold mt-0.5">
                  <span className="text-green-500">{wins}</span>
                  <span className="text-muted-foreground mx-1">/</span>
                  <span className="text-red-500">{losses}</span>
                </p>
              </div>
              <div className={`rounded-lg border p-2.5 text-center ${totalPnL >= 0 ? 'bg-green-500/5 border-green-500/30' : 'bg-red-500/5 border-red-500/30'}`}>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Net P&L</p>
                <p className={`text-lg font-bold mt-0.5 flex items-center justify-center gap-1 ${totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {totalPnL >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Parsed trades table */}
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-muted border-b border-border">
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Date</th>
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Time</th>
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Pair</th>
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Type</th>
                      <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">Vol</th>
                      <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">Entry</th>
                      <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">Close</th>
                      <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedTrades.map((trade, idx) => {
                      const pl = parseFloat(trade.pl.replace(/[$,]/g, ''));
                      const isWin = pl > 0;
                      return (
                        <tr key={idx} className={`border-b border-border/60 transition-colors hover:bg-muted/40 ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}>
                          <td className="px-3 py-2 font-mono text-xs">{trade.date.replace(/\./g, '-')}</td>
                          <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{trade.time}</td>
                          <td className="px-3 py-2">
                            <span className="font-medium text-xs">{trade.pair}</span>
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getTypeBadge(trade.type)}`}>
                              {TYPE_LABEL[trade.type] ?? trade.type.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-xs">{trade.vol}</td>
                          <td className="px-3 py-2 text-right font-mono text-xs">{trade.entry}</td>
                          <td className="px-3 py-2 text-right font-mono text-xs">{trade.close}</td>
                          <td className={`px-3 py-2 text-right font-semibold text-xs ${isWin ? 'text-green-500' : pl < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                            {isWin && '+'}{trade.pl}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Confirmation hint */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
              Review the trades above, then click <strong className="text-foreground">Import</strong> to save them to your journal.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
