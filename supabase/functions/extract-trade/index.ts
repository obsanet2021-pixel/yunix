import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Tool for extracting MULTIPLE trades from a screenshot table
const extractMultipleTradesTool = {
  type: "function",
  function: {
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
      required: ["trades"],
      additionalProperties: false
    }
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64 } = await req.json();
    
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this trading history screenshot carefully. Extract ALL visible trades from the table.

COLUMNS TO LOOK FOR (read each row left to right):
1. OPEN DATE - Full datetime when trade opened (e.g., "02/02/2026, 18:32:09") → extract as open_time AND derive trade_date (YYYY-MM-DD)
2. SYMBOL - Trading pair (EURJPY, XAUUSD, USDJPY, GBPUSD, etc.) → extract as pair
3. ACTION - BUY or SELL → extract as trade_type ("Buy" or "Sell")
4. LOTS / VOLUME - Lot size (e.g., 0.01, 0.05, 0.10) → extract as volume
5. OPEN PRICE - Entry price → extract as entry_price
6. CLOSE PRICE - Exit price → extract as close_price  
7. PIPS - Pips gained/lost (positive or negative number) → extract as pips
8. NET PROFIT - Dollar profit/loss → extract as profit (positive for green/profits, negative for red/losses)
9. GAIN - Percentage gain (optional) → extract as gain

CRITICAL RULES:
- Extract EVERY visible trade row - do not skip any!
- For dates: Convert to YYYY-MM-DD format (e.g., "02/02/2026" becomes "2026-02-02")
- For open_time: Keep the full timestamp as shown (e.g., "02/02/2026, 18:32:09")
- For profit: Green values are POSITIVE, red values are NEGATIVE
- For pips: Include the sign (positive or negative)
- For trade_type: Use exactly "Buy" or "Sell" (capitalized)
- For volume: Use the decimal number (e.g., 0.05, not "0.05 lots")

Return ALL trades as an array with complete details for each trade.`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        tools: [extractMultipleTradesTool],
        tool_choice: { type: "function", function: { name: "extract_multiple_trades" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    
    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "extract_multiple_trades") {
      return new Response(JSON.stringify({ error: "Failed to extract trade data from image" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);
    const trades = result.trades || [];
    
    // Return both single trade (for backwards compat) and trades array
    return new Response(JSON.stringify({ 
      success: true, 
      trade: trades.length > 0 ? trades[0] : null,
      trades: trades
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-trade error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
