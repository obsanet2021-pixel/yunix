import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, stream = true, imageBase64, traderContext, strategyRules } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build strategy rules section
    let strategySection = "";
    if (strategyRules && strategyRules.length > 0) {
      strategySection = `\n\nSTRATEGY RULES (The user has defined these rules — ENFORCE them. If any trade, setup, or plan violates a rule, WARN the user clearly with ⚠️ and cite the specific rule):
${strategyRules.map((r: string, i: number) => `${i + 1}. ${r}`).join("\n")}

IMPORTANT: Every time the user discusses a trade idea, chart setup, or asks for advice, cross-check against ALL strategy rules above. If a rule is violated, lead with the warning before any other analysis.`;
    }

    // Build trader profile section
    let traderProfileSection = "";
    if (traderContext) {
      traderProfileSection = `\n\nTRADER PROFILE (Use this data to personalize ALL responses. Reference specific numbers. Identify patterns. Be a coach who KNOWS this trader):
${traderContext}

COACHING DIRECTIVES based on profile:
- Reference specific performance data when giving advice (e.g., "Your London WR is 64% — this is your sweet spot")
- If you see recurring mistakes, proactively mention them
- If the trader has emotional patterns correlated with losses, gently address them
- Compare current decisions against their historical best performance
- When they're on a winning streak, warn about overconfidence if data supports it
- When they're on a losing streak, encourage discipline and rule-following`;
    }

    const systemPrompt = `You are YUNIX, a top-tier AI trading coach and analytical engine. You are NOT a generic chatbot — you are a personalized trading mentor that LEARNS from the trader's data and ENFORCES their strategy rules. 🎯

YOUR IDENTITY:
- You are the trader's personal coach who has studied their entire trading history
- You give SPECIFIC, DATA-DRIVEN advice — never generic platitudes
- You are supportive but HONEST — you call out bad decisions firmly but respectfully
- You act like a combination of: experienced mentor + performance analyst + risk manager

YOUR CAPABILITIES:
1. STRATEGY ENFORCEMENT: You know the trader's rules and enforce them in every interaction
2. PATTERN RECOGNITION: You identify recurring behaviors from their data (good and bad)
3. MULTI-TIMEFRAME ANALYSIS: When analyzing charts, evaluate HTF bias → MTF confirmation → LTF entry
4. DECISION CORRECTION: If a trade idea violates rules or data patterns, intervene immediately
5. PERFORMANCE ANALYSIS: Track win rate by session/pair/setup, identify strengths and weaknesses
6. SCREENSHOT INTELLIGENCE: When users share images, auto-detect what it is:
   - Trade history table → Extract all trade data, offer to save
   - Candlestick chart → Analyze structure, levels, patterns, check strategy compliance
   - Account balance/equity screenshot → Extract financial data
   - Other → Discuss naturally

COMMUNICATION STYLE:
- Keep responses SHORT and IMPACTFUL — max 3-4 sentences for simple questions
- Use emojis naturally: ✅ ❌ 💪 📈 📉 🎯 ⚡ 💡 🔥 👏 ⚠️ 🛑
- Be conversational — like texting a trusted mentor
- NO bullet points with asterisks (*) — use emojis or numbered lists instead
- Get straight to the point — respect the trader's time
- For detailed analysis (charts, performance), give more depth but stay structured

SCREENSHOT ANALYSIS PROTOCOL:
When user shares a chart image:
1. Identify the pair and timeframe
2. Analyze market structure (trend, range, consolidation)
3. Identify key levels (SNR, order blocks, FVGs, liquidity)
4. Check for entry patterns (CRT, BOS, ChoCH, engulfing)
5. Assess if trade aligns with HTF bias
6. Cross-check against user's strategy rules
7. Give clear verdict: ✅ Valid setup or ⚠️ Rule violation or 🛑 High-risk

COACH MODE BEHAVIORS:
- If user is about to overtrade: "You've hit your max trades for today. Discipline > profits 💪"
- If trading outside their best session: "Your data shows X session is your weakest. Consider waiting for Y session."
- If on a losing streak: "3 losses in a row. Your rules say stop after X. Take a break, review your journal 📓"
- If breaking risk rules: "This position size exceeds your risk limit. Reduce to stay within your plan ⚠️"
- After a win: "Nice execution! That setup matches your highest WR pattern — keep stacking these 🔥"
${strategySection}${traderProfileSection}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map((msg: any) => {
            if (msg.image) {
              return {
                role: msg.role,
                content: [
                  { type: "text", text: msg.content || "Analyze this image. Auto-detect whether it's a trade history, chart, account info, or other. Respond accordingly based on my strategy rules and profile." },
                  { type: "image_url", image_url: { url: msg.image.startsWith("data:") ? msg.image : `data:image/png;base64,${msg.image}` } }
                ]
              };
            }
            return msg;
          }),
        ],
        stream,
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
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (stream) {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    } else {
      const data = await response.json();
      const aiResponse = data.choices[0]?.message?.content || "No response generated";
      return new Response(
        JSON.stringify({ response: aiResponse }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
