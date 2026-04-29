import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResp(body: unknown, status = 200, headers = CORS_HEADERS): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
  functionCall?: { name: string; args: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
}

interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

interface GeminiFunctionDeclaration {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
}

interface GeminiGenerationConfig {
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
}

function getModel(): string {
  return Deno.env.get("GEMINI_MODEL") ?? "gemini-2.0-flash";
}

function getApiKey(): string {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new Error("GEMINI_API_KEY is not configured");
  return key;
}

function endpoint(stream: boolean, model: string, key: string): string {
  const base = `https://generativelanguage.googleapis.com/v1beta/models/${model}`;
  return stream
    ? `${base}:streamGenerateContent?alt=sse&key=${key}`
    : `${base}:generateContent?key=${key}`;
}

function handleGeminiError(response: Response): Response {
  if (response.status === 429) {
    return jsonResp({ error: "Rate limits exceeded, please try again later." }, 429);
  }
  if (response.status === 402) {
    return jsonResp({ error: "Payment required, please add funds to your Gemini account." }, 402);
  }
  return jsonResp({ error: "AI gateway error" }, 500);
}

async function callGeminiWithTool(
  contents: GeminiContent[],
  tools: GeminiFunctionDeclaration[],
  opts?: {
    systemInstruction?: string;
    generationConfig?: GeminiGenerationConfig;
    forcedFunctionName?: string;
    model?: string;
  },
): Promise<{ name: string; args: Record<string, unknown> }> {
  const key = getApiKey();
  const model = opts?.model ?? getModel();

  const body: Record<string, unknown> = {
    contents,
    tools: [{ functionDeclarations: tools }],
  };

  if (opts?.systemInstruction) {
    body.systemInstruction = { parts: [{ text: opts.systemInstruction }] };
  }
  if (opts?.generationConfig) {
    body.generationConfig = opts.generationConfig;
  }

  // Force the tool call
  const fnName = opts?.forcedFunctionName ?? tools[0]?.name;
  body.toolConfig = {
    functionCallingConfig: {
      mode: "ANY",
      allowedFunctionNames: [fnName],
    },
  };

  const response = await fetch(endpoint(false, model, key), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) throw response;

  const data = await response.json();
  const fc = data?.candidates?.[0]?.content?.parts?.[0]?.functionCall;
  if (!fc) throw new Error("No function call in Gemini response");
  return { name: fc.name, args: fc.args as Record<string, unknown> };
}

function safeHandler(fn: (req: Request) => Promise<Response>): (req: Request) => Promise<Response> {
  return async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
    try {
      return await fn(req);
    } catch (e) {
      if (e instanceof Response) return handleGeminiError(e);
      console.error("Edge function error:", e);
      return jsonResp(
        { error: e instanceof Error ? e.message : "Unknown error" },
        500,
      );
    }
  };
}

const extractMultipleTradesTool: GeminiFunctionDeclaration = {
  name: "extract_multiple_trades",
  description: "Extract ALL trades from a trading history screenshot table with full details",
  parameters: {
    type: "object",
    properties: {
      trades: {
        type: "array",
        description: "Array of all trades found in the screenshot",
        items: {
          type: "object",
          properties: {
            pair: { type: "string", description: "Trading pair/symbol (e.g., XAUUSD, EURUSD, EURJPY)" },
            profit: { type: "number", description: "Net profit/loss amount in dollars (positive for profit, negative for loss)" },
            volume: { type: "number", description: "Lot size/volume of the trade (e.g., 0.01, 0.05, 0.10)" },
            trade_type: { type: "string", enum: ["Buy", "Sell"], description: "Type of trade - BUY or SELL action" },
            entry_price: { type: "number", description: "Entry/open price of the trade" },
            close_price: { type: "number", description: "Exit/close price of the trade" },
            pips: { type: "number", description: "Pips gained or lost (can be positive or negative)" },
            gain: { type: "number", description: "Percentage gain/loss on the trade (optional)" },
            open_time: { type: "string", description: "Full open date+time (e.g., '02/02/2026, 18:32:09' or '2026-02-02 18:32:09')" },
            close_time: { type: "string", description: "Close date+time if visible" },
            trade_date: { type: "string", description: "Trade date in YYYY-MM-DD format" }
          },
          required: ["pair", "profit", "volume", "trade_type", "entry_price", "close_price", "trade_date"]
        }
      }
    },
    required: ["trades"]
  }
};

serve(safeHandler(async (req) => {
  const { imageBase64 } = await req.json();

  if (!imageBase64) {
    return jsonResp({ error: "No image provided" }, 400);
  }

  const systemInstruction = `Analyze trading history screenshots carefully. Extract ALL visible trades from the table.

COLUMNS TO LOOK FOR (read each row left to right):
1. OPEN DATE - Full datetime when trade opened → extract as open_time AND derive trade_date (YYYY-MM-DD)
2. SYMBOL - Trading pair → extract as pair
3. ACTION - BUY or SELL → extract as trade_type ("Buy" or "Sell")
4. LOTS / VOLUME - Lot size → extract as volume
5. OPEN PRICE - Entry price → extract as entry_price
6. CLOSE PRICE - Exit price → extract as close_price
7. PIPS - Pips gained/lost → extract as pips
8. NET PROFIT - Dollar profit/loss → extract as profit (positive for green, negative for red)
9. GAIN - Percentage gain (optional) → extract as gain

CRITICAL RULES:
- Extract EVERY visible trade row - do not skip any!
- For dates: Convert to YYYY-MM-DD format
- For profit: Green values are POSITIVE, red values are NEGATIVE
- For trade_type: Use exactly "Buy" or "Sell" (capitalized)
- For volume: Use the decimal number (e.g., 0.05, not "0.05 lots")`;

  const contents: GeminiContent[] = [{
    role: "user",
    parts: [
      { text: "Extract all trades from this trading history screenshot." },
      { inlineData: { mimeType: "image/png", data: imageBase64 } },
    ],
  }];

  const { args: result } = await callGeminiWithTool(contents, [extractMultipleTradesTool], {
    systemInstruction,
    forcedFunctionName: "extract_multiple_trades",
    generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
  });

  const trades = (result.trades || []) as any[];

  return jsonResp({
    success: true,
    trade: trades.length > 0 ? trades[0] : null,
    trades,
  });
}));
