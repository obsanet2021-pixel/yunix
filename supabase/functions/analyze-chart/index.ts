import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const analyzeChartTool = {
  type: "function",
  function: {
    name: "analyze_chart",
    description: "Analyze a trading chart and provide technical analysis with success prediction",
    parameters: {
      type: "object",
      properties: {
        direction: { 
          type: "string", 
          enum: ["bullish", "bearish", "neutral"],
          description: "Overall market direction based on the chart"
        },
        confidence: { 
          type: "number", 
          description: "Success probability percentage (0-100)" 
        },
        patterns: { 
          type: "array", 
          items: { type: "string" },
          description: "Chart patterns identified (e.g., double top, ascending triangle, head and shoulders)"
        },
        candlestick_patterns: {
          type: "array",
          items: { type: "string" },
          description: "Candlestick patterns identified (e.g., bullish engulfing, doji, hammer)"
        },
        key_levels: {
          type: "object",
          properties: {
            support: { type: "number", description: "Key support level" },
            resistance: { type: "number", description: "Key resistance level" }
          },
          description: "Important price levels"
        },
        trend: {
          type: "string",
          enum: ["uptrend", "downtrend", "sideways", "reversal"],
          description: "Current trend state"
        },
        recommendation: { 
          type: "string", 
          description: "Trading recommendation with entry and stop loss suggestion"
        },
        risk_rating: { 
          type: "string", 
          enum: ["low", "medium", "high"],
          description: "Risk level for entering this trade"
        },
        reasoning: {
          type: "string",
          description: "Detailed explanation of the analysis"
        }
      },
      required: ["direction", "confidence", "patterns", "recommendation", "risk_rating", "reasoning"],
      additionalProperties: false
    }
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64 } = await req.json();
    
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "No chart image provided" }), {
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
                text: `You are an expert technical analyst. Analyze this trading chart and provide a detailed analysis.

Look for:
1. **Chart Patterns**: Double top/bottom, head and shoulders, triangles, wedges, flags, pennants
2. **Candlestick Patterns**: Engulfing, doji, hammer, shooting star, morning/evening star
3. **Trend Analysis**: Current trend direction and strength
4. **Key Levels**: Support and resistance zones
5. **Price Action**: Recent momentum and volatility

Based on your analysis:
- Estimate the probability of success for a trade in the predicted direction
- Provide a clear BUY/SELL recommendation with suggested entry and stop loss
- Rate the risk level (low/medium/high)

Be realistic with confidence levels - typically 50-75% for most setups, only give higher for very clear patterns.
IMPORTANT: This is for educational purposes. Always emphasize risk management.`
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
        tools: [analyzeChartTool],
        tool_choice: { type: "function", function: { name: "analyze_chart" } }
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
    
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "analyze_chart") {
      return new Response(JSON.stringify({ error: "Failed to analyze chart" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const analysis = JSON.parse(toolCall.function.arguments);
    
    return new Response(JSON.stringify({ success: true, analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-chart error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
