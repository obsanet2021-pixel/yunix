import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { Brain, Trash2, FileText } from 'lucide-react';

interface ParsedTrade {
  date: string;
  time: string;
  /** Close *time* from the export (group before close price), not the price */
  closeDateTime: string;
  pair: string;
  type: string;
  vol: string;
  entry: string;
  tp: string;
  sl: string;
  /** Close *price* */
  close: string;
  pl: string;
  session: string;
  account: string;
}

/** MT5-style "2026.04.23, 17:43:01" → ISO string for Postgres timestamptz */
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

export default function TradeParser({
  onTradesExtracted,
}: {
  onTradesExtracted?: (trades: ParsedTradeImport[]) => void;
}) {
  const [rawInput, setRawInput] = useState('');
  const [parsedTrades, setParsedTrades] = useState<ParsedTrade[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const exampleText = `XAUUSD\tTAKE_PROFIT\t2026.04.23, 13:24:30\t 0.02  $4,729.72  2026.04.23, 17:43:01\t $4,678.96  $0  $101.32  $101.22  XAUUSD\tTAKE_PROFIT\t2026.04.23, 13:40:34\t 0.02  $4,733.5  2026.04.23, 17:43:01\t $4,678.62  $0  $109.92  $109.82  XAUUSD\tMARKET\t2026.05.04, 19:28:22\t 0.02  $4,523.88  2026.05.05, 12:24:29\t $4,570.88  -$1.39  $94.5  $93.01  XAUUSD\tMARKET\t2026.05.06, 13:54:51\t 0.02  $4,705.07  2026.05.06, 13:55:43\t $4,705.71  $0  -$1.3  -$1.4  XAUUSD\tSTOP_LOSS\t2026.05.06, 14:00:04\t 0.02  $4,701.99  2026.05.07, 00:00:21\t $4,701.13  $2.1  $0.68  $2.68  XAUUSD\tSTOP_LOSS\t2026.05.11, 15:25:45\t 0.02  $4,735.02  2026.05.11, 22:46:26\t $4,752.33  $0.74  -$34.06  -$33.42`;

  const parseTrades = (raw: string): ParsedTrade[] => {
    if (!raw || !raw.trim()) return [];
    
    // Pattern: Pair (captured letters) TAB Type (letters/underscore) TAB OpenTime (YYYY.MM.DD, HH:MM:SS)
    // TAB size (non-space) space(s) Entry ($...) space(s) CloseTime ($... maybe) TAB Close ($...) space(s) Swap space(s) GrossProfit space(s) NetProfit
    const tradeRegex = /([A-Z]+)\t([A-Z_]+)\t(\d{4}\.\d{2}\.\d{2}, \d{2}:\d{2}:\d{2})\t\s*(\S+)\s+(\$\S+)\s+(\d{4}\.\d{2}\.\d{2}, \d{2}:\d{2}:\d{2})\t\s+(\$\S+)\s+(\S+)\s+(\S+)\s+(\S+)/g;
    
    const trades: ParsedTrade[] = [];
    let match;
    
    while ((match = tradeRegex.exec(raw)) !== null) {
      const [, pair, type, openDateTime, vol, entry, closeDateTime, closePrice, swap, grossProfit, netProfit] = match;
      
      // Split open date/time into date and time
      const [datePart, timePart] = openDateTime.split(', ');
      
      trades.push({
        date: datePart,
        time: timePart,
        closeDateTime,
        pair,
        type,
        vol,
        entry,
        tp: '',     // not available in data
        sl: '',     // not available
        close: closePrice,
        pl: netProfit,
        session: '',
        account: ''
      });
    }
    
    return trades;
  };

  const handleParse = () => {
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
      const trades = parseTrades(rawInput);
      
      if (trades.length === 0) {
        toast({
          title: "No Trades Found",
          description: "No matching trade data found. Please ensure format matches the example.",
          variant: "destructive",
        });
        setShowTable(false);
      } else {
        setParsedTrades(trades);
        setShowTable(true);
        toast({
          title: "Trades Parsed",
          description: `Found ${trades.length} trade records.`,
        });
        
        // Convert to ExtractedTradeData format and pass to parent
        const extractedTrades = trades.map((trade) => {
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
        });
        
        if (onTradesExtracted) {
          onTradesExtracted(extractedTrades);
        }
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
    setRawInput('');
    setParsedTrades([]);
    setShowTable(false);
  };

  const handleLoadExample = () => {
    setRawInput(exampleText);
  };

  const totalPnL = parsedTrades.reduce((sum, trade) => {
    const plValue = parseFloat(trade.pl.replace(/[$,]/g, ''));
    return sum + (isNaN(plValue) ? 0 : plValue);
  }, 0);

  return (
    <Card className="w-full">
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Trade Parser
          </h3>
        </div>
        
        <div className="space-y-3">
          <Textarea
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder="Paste trade data here... (tab-separated values)"
            className="min-h-[180px] font-mono text-sm"
            disabled={isParsing}
          />
          
          <div className="flex gap-2">
            <Button 
              onClick={handleParse} 
              disabled={isParsing || !rawInput.trim()}
              className="flex-1"
            >
              {isParsing ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Parsing...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Parse & Generate Table
                </>
              )}
            </Button>
            
            <Button variant="outline" onClick={handleClear}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </Button>
            
            <Button variant="outline" onClick={handleLoadExample}>
              <FileText className="h-4 w-4 mr-2" />
              Load Example
            </Button>
          </div>
        </div>

        {showTable && parsedTrades.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Parsed Trades ({parsedTrades.length})</h4>
              <span className={`text-lg font-bold ${totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                Total: {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
              </span>
            </div>
            
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Time</th>
                      <th className="px-3 py-2 text-left">Pair</th>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-right">Vol</th>
                      <th className="px-3 py-2 text-right">Entry</th>
                      <th className="px-3 py-2 text-right">TP</th>
                      <th className="px-3 py-2 text-right">SL</th>
                      <th className="px-3 py-2 text-right">Close</th>
                      <th className="px-3 py-2 text-right">P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedTrades.map((trade, idx) => (
                      <tr key={idx} className="border-b hover:bg-muted/50">
                        <td className="px-3 py-2">{trade.date}</td>
                        <td className="px-3 py-2 font-mono">{trade.time}</td>
                        <td className="px-3 py-2">
                          <Badge variant="secondary" className="text-xs">
                            {trade.pair}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <Badge 
                            variant={trade.type.includes('PROFIT') ? 'default' : trade.type.includes('LOSS') ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {trade.type.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-right font-mono">{trade.vol}</td>
                        <td className="px-3 py-2 text-right font-mono">{trade.entry}</td>
                        <td className="px-3 py-2 text-right font-mono">—</td>
                        <td className="px-3 py-2 text-right font-mono">—</td>
                        <td className="px-3 py-2 text-right font-mono">{trade.close}</td>
                        <td className={`px-3 py-2 text-right font-medium ${
                          parseFloat(trade.pl.replace(/[$,]/g, '')) >= 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {trade.pl}
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
