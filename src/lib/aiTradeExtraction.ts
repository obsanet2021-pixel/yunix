import { GoogleGenerativeAI } from "@google/generative-ai";

// Trade extraction result interface
export interface ExtractedTrade {
  symbol: string;
  type: string;
  entry_time: string;
  exit_time: string;
  entry_price: number;
  exit_price: number;
  pnl: number;
  net_pnl: number;
  amount?: number;
  volume?: number;
  fee_swap?: number;
  duration?: string;
  outcome?: "Win" | "Loss";
}

export interface ExtractionResult {
  trades: ExtractedTrade[];
  metadata?: {
    provider: "gemini" | "openrouter";
    model: string;
    extractedAt: string;
  };
}

const EXTRACTION_PROMPT = `Analyze this trade history screenshot. Extract every trade row into a JSON array. For each trade, include:
- symbol: (e.g., XAUUSD, EURUSD, GBPUSD)
- type: (e.g., TAKE_PROFIT, MARKET, STOP_LOSS, BUY, SELL, LIMIT, Buy, Sell)
- entry_time: (Format: YYYY-MM-DD HH:MM:SS)
- exit_time: (Format: YYYY-MM-DD HH:MM:SS)
- entry_price: (As a number)
- exit_price: (As a number)
- pnl: (Profit/Loss amount as a number)
- net_pnl: (Net Profit/Loss after fees as a number)
- amount: (Position size/lot, e.g., 0.02, 0.50)
- volume: (Same as amount if available)
- fee_swap: (Fees, commission, or swap charges as a number)

Also calculate:
- duration: (How long the trade was open, e.g., "2h 15m" or "45m")
- outcome: ("Win" if net_pnl > 0, "Loss" if net_pnl < 0, "Breakeven" if net_pnl === 0)

Important:
- Extract ALL visible trades from the screenshot
- Parse dates correctly even if in different formats (YYYY.MM.DD, DD/MM/YYYY, etc.)
- Convert all prices to numeric values
- Calculate net_pnl = pnl - fee_swap if not explicitly shown
- Return trades in chronological order (oldest first)

Return ONLY a valid JSON object in this exact format:
{
  "trades": [
    {
      "symbol": "XAUUSD",
      "type": "TAKE_PROFIT",
      "entry_time": "2026-04-23 13:24:30",
      "exit_time": "2026-04-23 14:45:15",
      "entry_price": 2345.67,
      "exit_price": 2350.12,
      "pnl": 101.32,
      "net_pnl": 98.15,
      "amount": 0.02,
      "volume": 0.02,
      "fee_swap": 3.17,
      "duration": "1h 21m",
      "outcome": "Win"
    }
  ]
}

No markdown formatting, no extra text, only the JSON object.`;

/**
 * Convert image file to base64
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      // Remove data URL prefix if present
      const base64Data = base64.split(',')[1] || base64;
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Call Gemini API to extract trades
 */
async function callGemini(
  base64Image: string,
  mimeType: string
): Promise<ExtractionResult> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key not configured");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const imageData = {
    inlineData: {
      data: base64Image,
      mimeType,
    },
  };

  const result = await model.generateContent([EXTRACTION_PROMPT, imageData]);
  const response = result.response.text();

  // Parse the JSON response
  const parsed = JSON.parse(response);
  return {
    trades: parsed.trades || [],
    metadata: {
      provider: "gemini",
      model: "gemini-1.5-flash",
      extractedAt: new Date().toISOString(),
    },
  };
}

/**
 * Call OpenRouter API as fallback
 */
async function callOpenRouter(
  base64Image: string,
  mimeType: string
): Promise<ExtractionResult> {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OpenRouter API key not configured");
  }

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin,
        "X-Title": "Yunix Trade Journal",
      },
      body: JSON.stringify({
        model: "google/gemma-3-27b-it:free",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: EXTRACTION_PROMPT },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 4000,
        temperature: 0.1,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No content in OpenRouter response");
  }

  // Parse the JSON response
  const parsed = JSON.parse(content);
  return {
    trades: parsed.trades || [],
    metadata: {
      provider: "openrouter",
      model: "google/gemma-3-27b-it:free",
      extractedAt: new Date().toISOString(),
    },
  };
}

/**
 * Extract trade data from image with automatic failover
 * Primary: Gemini 1.5 Flash
 * Fallback: OpenRouter (Gemma 3)
 */
export async function extractTradeData(
  file: File
): Promise<ExtractionResult> {
  const mimeType = file.type;
  const base64Image = await fileToBase64(file);

  // Try Gemini first
  try {
    console.log("[AI Extraction] Trying Gemini...");
    const result = await callGemini(base64Image, mimeType);
    console.log("[AI Extraction] Gemini succeeded", result);
    return result;
  } catch (geminiError) {
    console.warn("[AI Extraction] Gemini failed:", geminiError);

    // Check if it's a rate limit error
    const errorMsg = geminiError instanceof Error ? geminiError.message : "";
    if (errorMsg.includes("429") || errorMsg.includes("rate limit")) {
      console.log("[AI Extraction] Rate limit hit, trying OpenRouter fallback...");
    }

    // Fallback to OpenRouter
    try {
      const result = await callOpenRouter(base64Image, mimeType);
      console.log("[AI Extraction] OpenRouter succeeded", result);
      return result;
    } catch (openRouterError) {
      console.error("[AI Extraction] OpenRouter also failed:", openRouterError);
      throw new Error(
        `Trade extraction failed. Gemini: ${geminiError instanceof Error ? geminiError.message : "Unknown error"}. OpenRouter: ${openRouterError instanceof Error ? openRouterError.message : "Unknown error"}`
      );
    }
  }
}

/**
 * Parse trade date from various formats to ISO-8601
 * Handles: YYYY.MM.DD, DD/MM/YYYY, YYYY-MM-DD, etc.
 */
export function parseTradeDate(dateStr: string, timeStr?: string): string {
  // Try different date formats
  const formats = [
    // YYYY.MM.DD
    /^(\d{4})\.(\d{2})\.(\d{2})$/,
    // DD/MM/YYYY
    /^(\d{2})\/(\d{2})\/(\d{4})$/,
    // YYYY-MM-DD
    /^(\d{4})-(\d{2})-(\d{2})$/,
    // MM/DD/YYYY
    /^(\d{2})\/(\d{2})\/(\d{4})$/,
  ];

  let year: string | undefined,
    month: string | undefined,
    day: string | undefined;

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      if (format.source.includes("YYYY\\\\.MM\\\\.DD")) {
        year = match[1];
        month = match[2];
        day = match[3];
      } else if (format.source.includes("DD/MM/YYYY")) {
        day = match[1];
        month = match[2];
        year = match[3];
      } else if (format.source.includes("YYYY-MM-DD")) {
        year = match[1];
        month = match[2];
        day = match[3];
      } else if (format.source.includes("MM/DD/YYYY")) {
        month = match[1];
        day = match[2];
        year = match[3];
      }
      break;
    }
  }

  if (!year || !month || !day) {
    throw new Error(`Unable to parse date: ${dateStr}`);
  }

  // Parse time if provided
  let hours = "00",
    minutes = "00",
    seconds = "00";
  if (timeStr) {
    const timeMatch = timeStr.match(/(\d{2}):(\d{2}):?(\d{2})?/);
    if (timeMatch) {
      hours = timeMatch[1];
      minutes = timeMatch[2];
      seconds = timeMatch[3] || "00";
    }
  }

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

/**
 * Convert extracted trade to database format
 */
export function convertToTradeRecord(
  extracted: ExtractedTrade,
  userId: string,
  screenshotUrl?: string,
  propFirmId?: string | null,
  cycleId?: string | null
) {
  // Parse entry and exit times
  const entryTime = parseTradeDate(
    extracted.entry_time.split(" ")[0],
    extracted.entry_time.split(" ")[1]
  );
  const exitTime = parseTradeDate(
    extracted.exit_time.split(" ")[0],
    extracted.exit_time.split(" ")[1]
  );

  // Calculate fee from pnl and net_pnl
  const fee = extracted.pnl - extracted.net_pnl;

  return {
    user_id: userId,
    pair: extracted.symbol,
    trade_type: extracted.type,
    entry_price: extracted.entry_price,
    close_price: extracted.exit_price,
    profit: extracted.pnl,
    net_profit: extracted.net_pnl,
    fee_swap: extracted.fee_swap || fee || 0,
    volume: extracted.amount || extracted.volume || 0,
    open_time: entryTime,
    close_time: exitTime,
    trade_date: entryTime.split("T")[0],
    screenshot_url: screenshotUrl || null,
    extracted_from_screenshot: true,
    ai_extraction_metadata: {
      duration: extracted.duration,
      outcome: extracted.outcome,
      raw_extraction: extracted,
    },
    prop_firm_id: propFirmId || null,
    cycle_id: cycleId || null,
  };
}

// Text extraction prompt for copy-paste trade history
const TEXT_EXTRACTION_PROMPT = `Parse this trade history text copied from a prop firm dashboard. The text may be messy with line breaks and mixed formatting.

Extract ALL trades and return as a JSON array. For each trade, include:
- symbol: Trading pair (e.g., XAUUSD, EURUSD) - uppercase
- type: Trade type (e.g., TAKE_PROFIT, MARKET, STOP_LOSS, Buy, Sell)
- entry_time: Open datetime (Format: YYYY-MM-DD HH:MM:SS)
- exit_time: Close datetime (Format: YYYY-MM-DD HH:MM:SS)
- entry_price: Entry price as number
- exit_price: Exit/close price as number
- pnl: Gross profit/loss as number (positive for profit, negative for loss)
- net_pnl: Net profit after fees as number
- amount: Lot size/volume (e.g., 0.02, 0.50)
- volume: Same as amount
- fee_swap: Any fees, commission, or swap charges (calculate if not explicit: fee_swap = pnl - net_pnl)
- duration: How long trade was open (e.g., "4h 18m")
- outcome: "Win" if net_pnl > 0, "Loss" if net_pnl < 0, "Breakeven" if 0

IMPORTANT RULES:
- Input format is often: SYMBOL -> TYPE -> DATE -> VOLUME -> ENTRY_PRICE -> CLOSE_DATE -> CLOSE_PRICE -> FEES -> PROFIT
- Lines starting with symbols (XAUUSD, EURUSD) indicate new trades
- Dates may be in format: 2026.04.23, 2026-04-23, or 2026/04/23
- Prices are often large numbers (2000-50000 range)
- Volumes are small decimals (0.01-1.0 range)
- Profits can be positive or negative, with or without $ sign
- Extract EVERY trade found in the text, don't skip any

Return ONLY valid JSON in this format:
{
  "trades": [
    {
      "symbol": "XAUUSD",
      "type": "TAKE_PROFIT",
      "entry_time": "2026-04-23 13:24:30",
      "exit_time": "2026-04-23 17:43:01",
      "entry_price": 4729.72,
      "exit_price": 4678.96,
      "pnl": 101.32,
      "net_pnl": 101.22,
      "amount": 0.02,
      "volume": 0.02,
      "fee_swap": 0.10,
      "duration": "4h 18m",
      "outcome": "Win"
    }
  ]
}`;

/**
 * Extract trade data from pasted text using AI
 */
export async function extractTradeDataFromText(text: string): Promise<ExtractedTrade[]> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error("Gemini API key not configured");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  try {
    const result = await model.generateContent([
      { text: TEXT_EXTRACTION_PROMPT },
      { text: `Parse this trade history:\n\n${text}` }
    ]);

    const response = result.response.text();
    
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No valid JSON found in AI response");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    if (!parsed.trades || !Array.isArray(parsed.trades)) {
      throw new Error("Invalid response format: trades array not found");
    }

    return parsed.trades as ExtractedTrade[];
  } catch (error) {
    console.error("Text extraction error:", error);
    throw new Error("Failed to parse trade text. Please check the format and try again.");
  }
}
