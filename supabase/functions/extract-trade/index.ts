import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ── Self-contained configuration ─────────────────────────────────────────

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Types ──────────────────────────────────────────────────────────────

interface GeminiContent {
  role: "user" | "model";
  parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
}

interface GeminiFunctionDeclaration {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
}

type GroqMessage = {
  role: "system" | "user" | "assistant";
  content: string | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;
};

type OpenRouterMessage = {
  role: "system" | "user" | "assistant";
  content: string | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;
};

interface GroqFunctionDeclaration {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
}

interface Trade {
  pair?: string;
  trade_type?: string;
  entry_price?: number;
  stop_loss?: number;
  take_profit?: number;
  close_price?: number;
  volume?: number;
  profit?: number;
  trade_date?: string;
  session?: string;
  emotion?: string;
  notes?: string;
  screenshot_url?: string;
}

// ── Helper functions ───────────────────────────────────────────────────

function getGeminiApiKey(): string {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new Error("GEMINI_API_KEY is not configured");
  return key;
}

function getGroqApiKey(): string | undefined {
  return Deno.env.get("GROQ_API_KEY");
}

function getOpenRouterApiKey(): string | undefined {
  return Deno.env.get("OPENROUTER_API_KEY");
}

async function callGeminiWithTool(
  contents: GeminiContent[],
  tools: GeminiFunctionDeclaration[],
  opts?: {
    systemInstruction?: string;
    generationConfig?: { temperature?: number; maxOutputTokens?: number };
    forcedFunctionName?: string;
  },
): Promise<{ name: string; args: Record<string, unknown> }> {
  const key = getGeminiApiKey();
  const model = "gemini-2.0-flash";

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

  const fnName = opts?.forcedFunctionName ?? tools[0]?.name;
  body.toolConfig = {
    functionCallingConfig: {
      mode: "ANY",
      allowedFunctionNames: [fnName],
    },
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) throw response;

  const data = await response.json();
  const fc = data?.candidates?.[0]?.content?.parts?.[0]?.functionCall;
  if (!fc) throw new Error("No function call in Gemini response");
  return { name: fc.name, args: fc.args as Record<string, unknown> };
}

async function callGroqWithTool(
  messages: GroqMessage[],
  tools: GroqFunctionDeclaration[],
  opts?: {
    generationConfig?: { temperature?: number; max_tokens?: number };
    model?: string;
  },
): Promise<{ name: string; args: Record<string, unknown> }> {
  const key = getGroqApiKey();
  if (!key) throw new Error("GROQ_API_KEY not configured");

  const model = opts?.model ?? "llama-3.3-70b-versatile";

  const body = {
    model,
    messages,
    tools: tools.map(t => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description ?? "",
        parameters: t.parameters,
      },
    })),
    tool_choice: { type: "function" as const, function: { name: tools[0].name } },
    temperature: opts?.generationConfig?.temperature ?? 0.1,
    max_tokens: opts?.generationConfig?.max_tokens ?? 4096,
  };

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error: ${error}`);
  }

  const data = await response.json();
  const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("No tool call in Groq response");

  return {
    name: toolCall.function.name,
    args: JSON.parse(toolCall.function.arguments),
  };
}

// OpenRouter fallback using stable free vision models
async function callOpenRouterWithTool(
  messages: OpenRouterMessage[],
  toolName: string,
  toolDescription: string,
  toolParameters: Record<string, unknown>,
  opts?: {
    generationConfig?: { temperature?: number; max_tokens?: number };
    model?: string;
  },
): Promise<{ name: string; args: Record<string, unknown> }> {
  const key = getOpenRouterApiKey();
  if (!key) throw new Error("OPENROUTER_API_KEY not configured");

  // Use stable free vision models - gemma-3-27b-it:free is often unavailable
  const model = opts?.model ?? "google/gemini-flash-1.5-8b:free";

  const body = {
    model,
    messages,
    tools: [{
      type: "function" as const,
      function: {
        name: toolName,
        description: toolDescription,
        parameters: toolParameters,
      },
    }],
    tool_choice: { type: "function" as const, function: { name: toolName } },
    temperature: opts?.generationConfig?.temperature ?? 0.1,
    max_tokens: opts?.generationConfig?.max_tokens ?? 4096,
  };

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`,
      "HTTP-Referer": "https://yunix.app",
      "X-Title": "Yunix Trade Journal",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${error}`);
  }

  const data = await response.json();
  const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("No tool call in OpenRouter response");

  return {
    name: toolCall.function.name,
    args: JSON.parse(toolCall.function.arguments),
  };
}

// ── Tool Definitions ────────────────────────────────────────────────────

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

const groqExtractTool: GroqFunctionDeclaration = {
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

// ── Request Handler ─────────────────────────────────────────────────────

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
  const { imageBase64 } = await req.json();

  if (!imageBase64) {
    return new Response(JSON.stringify({ error: "No image provided" }), { 
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });
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

  console.log("🔍 Attempting trade extraction from image...");
  console.log("📊 Image data length:", imageBase64?.length || 0);

  // Check API keys
  const groqApiKey = getGroqApiKey();
  const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
  const openRouterApiKey = getOpenRouterApiKey();
  console.log("🔑 Groq API Key available:", !!groqApiKey);
  console.log("🔑 Gemini API Key available:", !!geminiApiKey);
  console.log("🔑 OpenRouter API Key available:", !!openRouterApiKey);
  
  // Validate at least one API key is configured
  if (!groqApiKey && !geminiApiKey && !openRouterApiKey) {
    console.error("❌ No API keys configured! Set GROQ_API_KEY, GEMINI_API_KEY, or OPENROUTER_API_KEY in Supabase secrets.");
    return new Response(JSON.stringify({ 
      error: "AI service not configured. Please contact support.",
      details: "No API keys found",
      success: false
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });
  }
  
  // Try Groq Vision first (better for images)
  
  if (groqApiKey) {
    console.log("✅ Using Groq Vision API for trade extraction");
    try {
      const imageData = imageBase64.startsWith("data:") ? imageBase64 : `data:image/png;base64,${imageBase64}`;
      
      const groqMessages: GroqMessage[] = [
        {
          role: "system",
          content: systemInstruction,
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract all trades from this trading history screenshot." },
            { type: "image_url", image_url: { url: imageData } }
          ]
        }
      ];

      const { args: result } = await callGroqWithTool(groqMessages, [groqExtractTool], {
        generationConfig: { temperature: 0.1, max_tokens: 4096 },
        model: "llama-3.2-90b-vision-preview",
      });

      const trades = (result.trades || []) as Trade[];
      console.log(`✅ Groq extracted ${trades.length} trades`);

      return new Response(JSON.stringify({
        success: true,
        trade: trades.length > 0 ? trades[0] : null,
        trades,
        source: "groq"
      }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    } catch (groqError) {
      const groqErrorMsg = groqError instanceof Error ? groqError.message : String(groqError);
      console.error("⚠️ Groq extraction failed:", groqErrorMsg);
    }
  }

  // Fallback to Gemini (only if API key is available)
  if (geminiApiKey) {
    console.log("🔄 Using Gemini API for trade extraction");
    try {
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

      const trades = (result.trades || []) as Trade[];
      console.log(`✅ Gemini extracted ${trades.length} trades`);

      return new Response(JSON.stringify({
        success: true,
        trade: trades.length > 0 ? trades[0] : null,
        trades,
        source: "gemini"
      }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    } catch (geminiError) {
      console.error("⚠️ Gemini extraction failed:", geminiError);
    }
  }
  
  // Final fallback to OpenRouter (using gemma-3-27b-it:free)
  if (!openRouterApiKey) {
    throw new Error("All AI services failed and no API keys configured");
  }
  
  console.log("🔄 Using OpenRouter API (gemma-3-27b-it) for trade extraction");
  const imageData = imageBase64.startsWith("data:") ? imageBase64 : `data:image/png;base64,${imageBase64}`;
  
  const openRouterMessages: OpenRouterMessage[] = [
    {
      role: "system",
      content: systemInstruction,
    },
    {
      role: "user",
      content: [
        { type: "text", text: "Extract all trades from this trading history screenshot." },
        { type: "image_url", image_url: { url: imageData } }
      ]
    }
  ];

  const { args: result } = await callOpenRouterWithTool(
    openRouterMessages,
    "extract_multiple_trades",
    "Extract ALL trades from a trading history screenshot table with full details",
    extractMultipleTradesTool.parameters || {},
    {
      generationConfig: { temperature: 0.1, max_tokens: 4096 },
      model: "google/gemini-flash-1.5-8b:free",
    }
  );

  const trades = (result.trades || []) as Trade[];
  console.log(`✅ OpenRouter extracted ${trades.length} trades`);

  return new Response(JSON.stringify({
    success: true,
    trade: trades.length > 0 ? trades[0] : null,
    trades,
    source: "openrouter"
  }), {
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
  });
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  // Log full error details internally for debugging
  console.error("❌ Trade extraction failed:", errorMessage);
  console.error("Stack trace:", errorStack);
  
  // Sanitize error message for user - don't expose internal API details
  let userMessage = "Unable to analyze screenshot right now. Please try again in a moment or enter the trade manually.";
  
  // Only show specific message for known user-fixable issues
  if (errorMessage.includes("Image Too Large") || errorMessage.includes("5MB")) {
    userMessage = "Image is too large. Please upload an image smaller than 5MB.";
  } else if (errorMessage.includes("No image provided")) {
    userMessage = "No image was provided. Please upload a screenshot.";
  }
  
  return new Response(JSON.stringify({ 
    error: userMessage,
    success: false
    // Intentionally NOT including: details, user_id, internal API errors, model names
  }), {
    status: 500,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
  });
}
});
