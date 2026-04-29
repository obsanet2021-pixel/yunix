import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  callGemini,
  safeHandler,
  jsonResp,
  type GeminiContent,
} from "../shared/gemini.ts";

serve(safeHandler(async (req) => {
  const { tradeSetup, traderContext } = await req.json();

  let systemInstruction = `You are YUNIX, an expert trade planning AI. Analyze the trade setup and provide strategic insight in 2-3 sentences. Be specific and actionable. Use emojis naturally.`;

  if (traderContext) {
    systemInstruction += `\n\nTRADER CONTEXT:\n${traderContext}`;
  }

  const contents: GeminiContent[] = [
    {
      role: "user",
      parts: [{ text: `Analyze this trade plan:\n${JSON.stringify(tradeSetup, null, 2)}` }],
    },
  ];

  const insight = await callGemini(contents, {
    systemInstruction,
    generationConfig: { temperature: 0.3, maxOutputTokens: 512 },
  });

  return jsonResp({ insight: insight || "No insight available." });
}));
