import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  callGeminiWithTool,
  safeHandler,
  jsonResp,
  type GeminiContent,
  type GeminiFunctionDeclaration,
} from "../shared/gemini.ts";

const analyzeChartTool: GeminiFunctionDeclaration = {
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
    required: ["direction", "confidence", "patterns", "recommendation", "risk_rating", "reasoning"]
  }
};

serve(safeHandler(async (req) => {
  const { imageBase64 } = await req.json();

  if (!imageBase64) {
    return jsonResp({ error: "No chart image provided" }, 400);
  }

  const systemInstruction = `You are an expert technical analyst. Analyze the trading chart image and provide a detailed analysis.

Look for:
1. Chart Patterns: Double top/bottom, head and shoulders, triangles, wedges, flags, pennants
2. Candlestick Patterns: Engulfing, doji, hammer, shooting star, morning/evening star
3. Trend Analysis: Current trend direction and strength
4. Key Levels: Support and resistance zones
5. Price Action: Recent momentum and volatility

Based on your analysis:
- Estimate the probability of success for a trade in the predicted direction
- Provide a clear BUY/SELL recommendation with suggested entry and stop loss
- Rate the risk level (low/medium/high)

Be realistic with confidence levels - typically 50-75% for most setups, only give higher for very clear patterns.
IMPORTANT: This is for educational purposes. Always emphasize risk management.`;

  const contents: GeminiContent[] = [{
    role: "user",
    parts: [
      { text: "Analyze this trading chart." },
      { inlineData: { mimeType: "image/png", data: imageBase64 } },
    ],
  }];

  const { args: analysis } = await callGeminiWithTool(contents, [analyzeChartTool], {
    systemInstruction,
    forcedFunctionName: "analyze_chart",
    generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
  });

  return jsonResp({ success: true, analysis });
}));
