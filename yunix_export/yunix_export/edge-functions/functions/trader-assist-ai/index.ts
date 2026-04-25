import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64, domData, journalData } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Build the structured context from DOM + journal data
    const structuredContext = JSON.stringify({
      dom_data: domData || {},
      journal: journalData || {},
    }, null, 2);

    const systemPrompt = `You are an elite ICT trading mentor integrated into the YUNIX trading journal platform.

You are given:
1. A chart screenshot (image) — use for pattern recognition (structure, liquidity, order blocks, breaker blocks, FVGs, sweeps)
2. Structured trade data (JSON) — trust these numbers over what you see in the image
3. Journal/emotional context — use to detect behavioral mistakes

Rules:
- Trust structured data over image for exact numbers (prices, SL, TP, entry)
- Use the image for visual pattern recognition (market structure, key levels, candle patterns)
- Validate the trade against ICT concepts (liquidity sweeps, order blocks, breaker blocks, FVGs, displacement)
- Detect emotional mistakes from journal notes and emotion tags
- Be strict but constructive

Your response MUST follow this format:

## Trade Verdict: [VALID ✅ | WEAK ⚠️ | INVALID ❌]

### What's Correct
- (list what the trader did right)

### What's Wrong
- (list mistakes or concerns)

### Chart Analysis
- (what you see in the chart — structure, key levels, patterns)

### Improvement Advice
- (specific, actionable advice)

### Risk Assessment
- Risk rating: [Low / Medium / High / Critical]
- (explain why)

Be concise but thorough. No fluff.`;

    const messages: any[] = [
      { role: "system", content: systemPrompt },
    ];

    // Build user message with optional image
    const userContent: any[] = [];

    userContent.push({
      type: "text",
      text: `Analyze this trade setup.\n\nStructured Data:\n${structuredContext}`,
    });

    if (imageBase64) {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:image/png;base64,${imageBase64}` },
      });
    }

    messages.push({ role: "user", content: userContent });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        stream: false,
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "No analysis available.";

    return new Response(JSON.stringify({ success: true, analysis: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("trader-assist-ai error:", e);
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
