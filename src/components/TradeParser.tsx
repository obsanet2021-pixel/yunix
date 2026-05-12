import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { Brain, Trash2, FileText } from "lucide-react";
import {
  parseTradeHistoryText,
  parseTradeTextWithAI,
  type ParsedTrade as LibParsedTrade,
} from "@/lib/tradeTextParser";
import { parseImportedTradeDate } from "@/lib/tradeImportFormat";

/** Shape consumed by journal / prop firm import handlers */
export interface ParsedTradeImport {
  pair: string;
  profit: number;
  volume: number;
  trade_type: string;
  entry_price: number;
  close_price: number;
  open_time?: string;
  close_time?: string;
  trade_date: string;
  session?: string;
  notes?: string;
}

interface LegacyTabRow {
  date: string;
  time: string;
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

function normalizeTradeType(tt: string | undefined): string {
  if (!tt) return "buy";
  const s = String(tt).toLowerCase();
  if (s === "sell" || s === "buy") return s;
  const u = String(tt).toUpperCase();
  if (u.includes("SELL") || u.includes("SHORT")) return "sell";
  if (u.includes("STOP_LOSS")) return "sell";
  return "buy";
}

function fromLibTrade(t: LibParsedTrade): ParsedTradeImport {
  return {
    pair: t.pair,
    profit: Number(t.profit) || 0,
    volume: Number(t.volume) || 0,
    trade_type: normalizeTradeType(t.trade_type),
    entry_price: Number(t.entry_price) || 0,
    close_price: Number(t.close_price) || 0,
    open_time: t.open_time,
    close_time: t.close_time,
    trade_date: parseImportedTradeDate(t.trade_date),
    session: t.session,
    notes: t.notes,
  };
}

function legacyRowToImport(trade: LegacyTabRow): ParsedTradeImport {
  const tradeDate = parseImportedTradeDate(trade.date);
  return {
    pair: trade.pair,
    profit: parseFloat(trade.pl.replace(/[$,]/g, "")) || 0,
    volume: parseFloat(trade.vol) || 0,
    trade_type: normalizeTradeType(trade.type),
    entry_price: parseFloat(trade.entry.replace(/[$,]/g, "")) || 0,
    close_price: parseFloat(trade.close.replace(/[$,]/g, "")) || 0,
    open_time: `${tradeDate} ${trade.time}`,
    close_time: undefined,
    trade_date: tradeDate,
    session: trade.session || "",
    notes: `Parsed from ${trade.pair} (${trade.type})`,
  };
}

function parseLegacyTabTrades(raw: string): LegacyTabRow[] {
  if (!raw?.trim()) return [];
  const tradeRegex =
    /([A-Z]+)\t([A-Z_]+)\t(\d{4}\.\d{2}\.\d{2}, \d{2}:\d{2}:\d{2})\t\s*(\S+)\s+(\$\S+)\s+(\d{4}\.\d{2}\.\d{2}, \d{2}:\d{2}:\d{2})\t\s+(\$\S+)\s+(\S+)\s+(\S+)\s+(\S+)/g;
  const trades: LegacyTabRow[] = [];
  let match;
  while ((match = tradeRegex.exec(raw)) !== null) {
    const [, pair, type, openDateTime, vol, entry, , closePrice, , , netProfit] = match;
    const [datePart, timePart] = openDateTime.split(", ");
    trades.push({
      date: datePart,
      time: timePart,
      pair,
      type,
      vol,
      entry,
      tp: "",
      sl: "",
      close: closePrice,
      pl: netProfit,
      session: "",
      account: "",
    });
  }
  return trades;
}

export default function TradeParser({
  onTradesExtracted,
}: {
  onTradesExtracted?: (trades: ParsedTradeImport[]) => void;
}) {
  const [rawInput, setRawInput] = useState("");
  const [parsedTrades, setParsedTrades] = useState<ParsedTradeImport[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const exampleText = `XAUUSD\tTAKE_PROFIT\t2026.04.23, 13:24:30\t 0.02  $4,729.72  2026.04.23, 17:43:01\t $4,678.96  $0  $101.32  $101.22  XAUUSD\tTAKE_PROFIT\t2026.04.23, 13:40:34\t 0.02  $4,733.5  2026.04.23, 17:43:01\t $4,678.62  $0  $109.92  $109.82  XAUUSD\tMARKET\t2026.05.04, 19:28:22\t 0.02  $4,523.88  2026.05.05, 12:24:29\t $4,570.88  -$1.39  $94.5  $93.01  XAUUSD\tMARKET\t2026.05.06, 13:54:51\t 0.02  $4,705.07  2026.05.06, 13:55:43\t $4,705.71  $0  -$1.3  -$1.4  XAUUSD\tSTOP_LOSS\t2026.05.06, 14:00:04\t 0.02  $4,701.99  2026.05.07, 00:00:21\t $4,701.13  $2.1  $0.68  $2.68  XAUUSD\tSTOP_LOSS\t2026.05.11, 15:25:45\t 0.02  $4,735.02  2026.05.11, 22:46:26\t $4,752.33  $0.74  -$34.06  -$33.42`;

  const handleParse = async () => {
    if (!rawInput.trim()) {
      toast({
        title: "No Data",
        description: "Please paste trade data first.",
        variant: "destructive",
      });
      return;
    }

    setIsParsing(true);
    try {
      let imports: ParsedTradeImport[] = [];

      const fromLib = parseTradeHistoryText(rawInput);
      if (fromLib.length > 0) {
        imports = fromLib.map(fromLibTrade);
      } else {
        const legacy = parseLegacyTabTrades(rawInput);
        if (legacy.length > 0) {
          imports = legacy.map(legacyRowToImport);
        } else {
          const aiTrades = await parseTradeTextWithAI(rawInput);
          imports = aiTrades.map(fromLibTrade);
        }
      }

      if (imports.length === 0) {
        toast({
          title: "No Trades Found",
          description: "Could not parse this text. Try MT5 copy-paste or a clearer export.",
          variant: "destructive",
        });
        setShowTable(false);
        setParsedTrades([]);
        onTradesExtracted?.([]);
      } else {
        setParsedTrades(imports);
        setShowTable(true);
        toast({
          title: "Trades Parsed",
          description: `Found ${imports.length} trade record${imports.length > 1 ? "s" : ""}.`,
        });
        onTradesExtracted?.(imports);
      }
    } catch (error) {
      console.error("Parse error:", error);
      toast({
        title: "Parsing Error",
        description: error instanceof Error ? error.message : "Failed to parse trade data.",
        variant: "destructive",
      });
    } finally {
      setIsParsing(false);
    }
  };

  const handleClear = () => {
    setRawInput("");
    setParsedTrades([]);
    setShowTable(false);
    onTradesExtracted?.([]);
  };

  const handleLoadExample = () => {
    setRawInput(exampleText);
  };

  const totalPnL = parsedTrades.reduce((sum, trade) => sum + (Number(trade.profit) || 0), 0);

  return (
    <Card className="w-full">
      <CardContent className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Paste trade history
          </h3>
        </div>

        <p className="text-xs text-muted-foreground">
          Uses the same flow as before in AI Chat: structured paste first, then AI if needed.
        </p>

        <div className="space-y-3">
          <Textarea
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder="Paste MT4/MT5 or prop-firm trade history…"
            className="min-h-[160px] font-mono text-sm"
            disabled={isParsing}
          />

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleParse} disabled={isParsing || !rawInput.trim()} className="flex-1 min-w-[140px]">
              {isParsing ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Parsing…
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Parse trades
                </>
              )}
            </Button>

            <Button type="button" variant="outline" onClick={handleClear}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </Button>

            <Button type="button" variant="outline" onClick={handleLoadExample}>
              <FileText className="h-4 w-4 mr-2" />
              Example
            </Button>
          </div>
        </div>

        {showTable && parsedTrades.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Preview ({parsedTrades.length})</h4>
              <span
                className={`text-lg font-bold ${totalPnL >= 0 ? "text-green-500" : "text-red-500"}`}
              >
                Total: {totalPnL >= 0 ? "+" : ""}${totalPnL.toFixed(2)}
              </span>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto max-h-[220px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 sticky top-0">
                      <th className="px-2 py-2 text-left">Date</th>
                      <th className="px-2 py-2 text-left">Pair</th>
                      <th className="px-2 py-2 text-left">Type</th>
                      <th className="px-2 py-2 text-right">Vol</th>
                      <th className="px-2 py-2 text-right">Entry</th>
                      <th className="px-2 py-2 text-right">Close</th>
                      <th className="px-2 py-2 text-right">P&amp;L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedTrades.map((trade, idx) => (
                      <tr key={idx} className="border-b hover:bg-muted/50">
                        <td className="px-2 py-2 whitespace-nowrap">{trade.trade_date}</td>
                        <td className="px-2 py-2">
                          <Badge variant="secondary" className="text-xs">
                            {trade.pair}
                          </Badge>
                        </td>
                        <td className="px-2 py-2">
                          <Badge
                            variant={trade.trade_type === "sell" ? "destructive" : "default"}
                            className="text-xs capitalize"
                          >
                            {trade.trade_type}
                          </Badge>
                        </td>
                        <td className="px-2 py-2 text-right font-mono">{trade.volume}</td>
                        <td className="px-2 py-2 text-right font-mono">{trade.entry_price}</td>
                        <td className="px-2 py-2 text-right font-mono">{trade.close_price}</td>
                        <td
                          className={`px-2 py-2 text-right font-medium ${
                            trade.profit >= 0 ? "text-green-500" : "text-red-500"
                          }`}
                        >
                          {trade.profit >= 0 ? "+" : ""}${trade.profit.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
