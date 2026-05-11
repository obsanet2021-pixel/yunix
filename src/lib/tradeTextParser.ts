import { extractTradeDataFromText, ExtractedTrade } from "./aiTradeExtraction";

export interface ParsedTrade {
  pair: string;
  trade_type: "Buy" | "Sell" | string;
  entry_price: number;
  close_price: number;
  volume: number;
  profit: number;
  open_time?: string;
  close_time?: string;
  trade_date: string;
  session?: string;
  notes?: string;
}

/**
 * Convert ExtractedTrade from AI to ParsedTrade format
 */
function convertExtractedToParsed(extracted: ExtractedTrade): ParsedTrade {
  return {
    pair: extracted.symbol,
    trade_type: extracted.type,
    entry_price: extracted.entry_price,
    close_price: extracted.exit_price,
    volume: extracted.amount || extracted.volume || 0,
    profit: extracted.net_pnl,
    open_time: extracted.entry_time,
    close_time: extracted.exit_time,
    trade_date: extracted.entry_time?.split(' ')[0] || new Date().toISOString().split('T')[0],
    notes: `Imported via AI text extraction. Duration: ${extracted.duration}, Outcome: ${extracted.outcome}`
  };
}

/**
 * Parse trade history text copied from prop firm dashboards
 * Handles various formats including tab-separated and multi-line formats
 */
export function parseTradeHistoryText(text: string): ParsedTrade[] {
  const trades: ParsedTrade[] = [];
  
  // Split into potential trade blocks - look for symbol patterns
  // Common patterns: XAUUSD, EURUSD, GBPUSD, etc.
  const symbolPattern = /^(XAUUSD|XAGUSD|EURUSD|GBPUSD|USDJPY|GBPJPY|EURJPY|US30|NAS100|SPX500|BTCUSD|ETHUSD)/im;
  
  // Split text by symbol occurrences to get individual trades
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  let currentTrade: Partial<ParsedTrade> = {};
  let currentField = 0;
  
  const fieldOrder = [
    'pair',
    'type',
    'open_time',
    'volume',
    'entry_price',
    'close_time',
    'close_price',
    'swap',
    'commission',
    'profit'
  ];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if this is a new trade (starts with symbol)
    const symbolMatch = line.match(symbolPattern);
    
    if (symbolMatch) {
      // Save previous trade if exists
      if (currentTrade.pair && currentTrade.profit !== undefined) {
        trades.push(finalizeTrade(currentTrade));
      }
      
      // Start new trade
      currentTrade = {};
      currentField = 0;
      
      // Parse first line which often has: SYMBOL\tTYPE\tDATE
      const parts = line.split('\t').map(p => p.trim()).filter(p => p.length > 0);
      
      if (parts.length >= 1) currentTrade.pair = parts[0].toUpperCase();
      if (parts.length >= 2) currentTrade.trade_type = parseTradeType(parts[1]);
      if (parts.length >= 3) {
        const dateTime = parseDateTime(parts[2]);
        currentTrade.open_time = dateTime.full;
        currentTrade.trade_date = dateTime.date;
      }
      
      currentField = parts.length;
    } else {
      // Continue filling fields for current trade
      const cleanLine = line.replace(/[$,]/g, ''); // Remove $ and commas
      const numValue = parseFloat(cleanLine);
      
      if (!isNaN(numValue)) {
        // It's a number field
        switch (currentField) {
          case 3: // Volume
            currentTrade.volume = numValue;
            break;
          case 4: // Entry price
            currentTrade.entry_price = numValue;
            break;
          case 6: // Close price
            currentTrade.close_price = numValue;
            break;
          case 9: // Profit (last field)
            currentTrade.profit = numValue;
            break;
          default:
            // Try to infer based on value magnitude
            if (numValue < 1 && numValue > 0 && !currentTrade.volume) {
              currentTrade.volume = numValue;
            } else if (numValue > 1000 && !currentTrade.entry_price) {
              currentTrade.entry_price = numValue;
            } else if (numValue > 1000 && !currentTrade.close_price && currentTrade.entry_price) {
              currentTrade.close_price = numValue;
            } else if (!currentTrade.profit && (currentTrade.close_price || currentTrade.entry_price)) {
              currentTrade.profit = numValue;
            }
        }
        currentField++;
      } else if (line.match(/\d{4}[./-]\d{2}[./-]\d{2}/)) {
        // It's a date - could be close time
        const dateTime = parseDateTime(line);
        if (!currentTrade.open_time) {
          currentTrade.open_time = dateTime.full;
          currentTrade.trade_date = dateTime.date;
        } else if (!currentTrade.close_time) {
          currentTrade.close_time = dateTime.full;
        }
        currentField++;
      }
    }
  }
  
  // Don't forget the last trade
  if (currentTrade.pair && currentTrade.profit !== undefined) {
    trades.push(finalizeTrade(currentTrade));
  }
  
  return trades;
}

/**
 * Use AI to parse messy text formats when regex fails
 */
export async function parseTradeTextWithAI(text: string): Promise<ParsedTrade[]> {
  const extracted = await extractTradeDataFromText(text);
  return extracted.map(convertExtractedToParsed);
}

function parseTradeType(type: string): "Buy" | "Sell" | string {
  const upper = type.toUpperCase();
  if (upper.includes("BUY") || upper.includes("LONG") || upper === "MARKET" || upper === "TAKE_PROFIT") {
    return "Buy";
  }
  if (upper.includes("SELL") || upper.includes("SHORT")) {
    return "Sell";
  }
  return type;
}

function parseDateTime(dateStr: string): { full: string; date: string } {
  // Try various formats
  // 2026.04.23, 13:24:30
  // 2026-04-23, 13:24:30
  // 2026/04/23 13:24:30
  
  const cleanStr = dateStr.replace(/,/g, ' ').trim();
  
  // Extract date components
  const dateMatch = cleanStr.match(/(\d{4})[./-](\d{2})[./-](\d{2})/);
  const timeMatch = cleanStr.match(/(\d{2}):(\d{2}):(\d{2})/);
  
  if (dateMatch) {
    const [, year, month, day] = dateMatch;
    const date = `${year}-${month}-${day}`;
    
    if (timeMatch) {
      const [, hours, minutes, seconds] = timeMatch;
      const full = `${date}T${hours}:${minutes}:${seconds}`;
      return { full, date };
    }
    
    return { full: date, date };
  }
  
  // Fallback to current date
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  return { full: date, date };
}

function finalizeTrade(trade: Partial<ParsedTrade>): ParsedTrade {
  // Infer trade type from prices if not set
  if (!trade.trade_type && trade.entry_price && trade.close_price) {
    if (trade.profit && trade.profit > 0) {
      trade.trade_type = trade.close_price > trade.entry_price ? "Buy" : "Sell";
    } else {
      trade.trade_type = trade.close_price < trade.entry_price ? "Buy" : "Sell";
    }
  }
  
  // Ensure required fields
  return {
    pair: trade.pair || "UNKNOWN",
    trade_type: trade.trade_type || "Buy",
    entry_price: trade.entry_price || 0,
    close_price: trade.close_price || 0,
    volume: trade.volume || 0,
    profit: trade.profit || 0,
    open_time: trade.open_time,
    close_time: trade.close_time,
    trade_date: trade.trade_date || new Date().toISOString().split('T')[0],
    session: trade.session || inferSession(trade.open_time),
    notes: trade.notes || `Imported from text paste`
  };
}

function inferSession(dateTimeStr?: string): string {
  if (!dateTimeStr) return "Unknown";
  
  const hour = parseInt(dateTimeStr.match(/T(\d{2})/)?.[1] || "0");
  
  // London: 08:00 - 17:00 UTC
  if (hour >= 8 && hour < 17) return "London";
  // New York: 13:00 - 22:00 UTC
  if (hour >= 13 && hour < 22) return "New York";
  // Asia: 00:00 - 09:00 UTC
  if (hour >= 0 && hour < 9) return "Asia";
  
  return "Unknown";
}
