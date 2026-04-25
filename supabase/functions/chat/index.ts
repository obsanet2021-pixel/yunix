import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages = [], stream = true, imageBase64, traderContext, strategyRules } = await req.json();

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-1.5-pro";
    const endpoint = stream
      ? `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?key=${GEMINI_API_KEY}`
      : `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    let strategySection = "";
    if (strategyRules && strategyRules.length > 0) {
      strategySection = `\n\nSTRATEGY RULES (The user has defined these rules — ENFORCE them. If any trade, setup, or plan violates a rule, WARN the user clearly with ⚠️ and cite the specific rule):\n${strategyRules
        .map((r: string, i: number) => `${i + 1}. ${r}`)
        .join("\n")}\n\nIMPORTANT: Every time the user discusses a trade idea, chart setup, or asks for advice, cross-check against ALL strategy rules above. If a rule is violated, lead with the warning before any other analysis.`;
    }

    let traderProfileSection = "";
    if (traderContext) {
      traderProfileSection = `\n\nTRADER PROFILE (Use this data to personalize ALL responses. Reference specific numbers. Identify patterns. Be a coach who KNOWS this trader):\n${traderContext}\n\nCOACHING DIRECTIVES based on profile:\n- Reference specific performance data when giving advice (e.g., "Your London WR is 64% — this is your sweet spot")\n- If you see recurring mistakes, proactively mention them\n- If the trader has emotional patterns correlated with losses, gently address them\n- Compare current decisions against their historical best performance\n- When they're on a winning streak, warn about overconfidence if data supports it\n- When they're on a losing streak, encourage discipline and rule-following`;
    }

    const systemPrompt = `You are YUNIX, a top-tier AI trading coach and analytical engine. You are NOT a generic chatbot — you are a personalized trading mentor that LEARNS from the trader's data and ENFORCES their strategy rules. 🎯\n\nYOUR IDENTITY:\n- You are the trader's personal coach who has studied their entire trading history\n- You give SPECIFIC, DATA-DRIVEN advice — never generic platitudes\n- You are supportive but HONEST — you call out bad decisions firmly but respectfully\n- You act like a combination of: experienced mentor + performance analyst + risk manager\n\nYOUR CAPABILITIES:\n1. STRATEGY ENFORCEMENT: You know the trader's rules and enforce them in every interaction\n2. PATTERN RECOGNITION: You identify recurring behaviors from their data (good and bad)\n3. MULTI-TIMEFRAME ANALYSIS: When analyzing charts, evaluate HTF bias → MTF confirmation → LTF entry\n4. DECISION CORRECTION: If a trade idea violates rules or data patterns, intervene immediately\n5. PERFORMANCE ANALYSIS: Track win rate by session/pair/setup, identify strengths and weaknesses\n6. SCREENSHOT INTELLIGENCE: When users share images, auto-detect what it is:\n   - Trade history table → Extract all trade data, offer to save\n   - Candlestick chart → Analyze structure, levels, patterns, check strategy compliance\n   - Account balance/equity screenshot → Extract financial data\n   - Other → Discuss naturally\n\nCOMMUNICATION STYLE:\n- Keep responses SHORT and IMPACTFUL — max 3-4 sentences for simple questions\n- Use emojis naturally: ✅ ❌ 💪 📈 📉 🎯 ⚡ 💡 🔥 👏 ⚠️ 🛑\n- Be conversational — like texting a trusted mentor\n- NO bullet points with asterisks (*) — use emojis or numbered lists instead\n- Get straight to the point — respect the trader's time\n- For detailed analysis (charts, performance), give more depth but stay structured\n\nSCREENSHOT ANALYSIS PROTOCOL:\nWhen user shares a chart image:\n1. Identify the pair and timeframe\n2. Analyze market structure (trend, range, consolidation)\n3. Identify key levels (SNR, order blocks, FVGs, liquidity)\n4. Check for entry patterns (CRT, BOS, ChoCH, engulfing)\n5. Assess if trade aligns with HTF bias\n6. Cross-check against user's strategy rules\n7. Give clear verdict: ✅ Valid setup or ⚠️ Rule violation or 🛑 High-risk\n\nCOACH MODE BEHAVIORS:\n- If user is about to overtrade: "You've hit your max trades for today. Discipline > profits 💪"\n- If trading outside their best session: "Your data shows X session is your weakest. Consider waiting for Y session."\n- If on a losing streak: "3 losses in a row. Your rules say stop after X. Take a break, review your journal 📓"\n- If breaking risk rules: "This position size exceeds your risk limit. Reduce to stay within your plan ⚠️"\n- After a win: "Nice execution! That setup matches your highest WR pattern — keep stacking these 🔥"${strategySection}${traderProfileSection}`;

    const promptLines: string[] = [
      `System: ${systemPrompt}`,
    ];

    for (const msg of messages) {
      const roleLabel = msg.role === "user" ? "User" : msg.role === "assistant" ? "Assistant" : msg.role;
      let text = msg.content ?? "";
      if (msg.image) {
        text += `\n[Image attached: ${msg.image.startsWith("data:") ? "inline image" : msg.image}]`;
      }
      promptLines.push(`${roleLabel}: ${text}`);
    }

    const promptText = promptLines.join("\n\n");

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: promptText,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
          topP: 0.95,
          topK: 40,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_NONE",
          },
        ],
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
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your Gemini account." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("Gemini gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (stream) {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    const data = await response.json();
    const assistantResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "No response generated";

    return new Response(JSON.stringify({ response: assistantResponse }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
