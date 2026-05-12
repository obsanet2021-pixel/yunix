import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  CORS_HEADERS,
  callGemini,
  callGeminiStream,
  safeHandler,
  jsonResp,
  type GeminiContent,
  type GeminiGenerationConfig,
} from "../shared/gemini.ts";

// Import Groq for vision fallback since Gemini vision has issues
import { callGroq, type GroqMessage } from "../shared/groq.ts";

serve(safeHandler(async (req) => {
  const { messages = [], stream = true, imageBase64, traderContext, strategyRules } = await req.json();

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
2. Assess the current market structure (BOS, CHoCH, ranges)
3. Identify key levels (supply/demand, liquidity pools, order blocks)
4. Check if any active trade or setup violates strategy rules
5. Provide actionable insight with risk assessment

When user shares a trade history screenshot:
1. Extract ALL visible trade data
2. Identify patterns (recurring mistakes, best setups, emotional tags)
3. Cross-check against strategy rules
4. Offer to save the trades to their journal

IMPORTANT SAVE RULE:
- Never say trades are already saved unless the application explicitly confirms the save happened
- Use wording like "I extracted/formatted these trades" or "click Save to Journal to store them"
- Do not claim database actions were completed from chat alone

When user shares an account screenshot:
1. Extract balance, equity, margin data
2. Assess account health relative to their prop firm rules
3. Warn if approaching drawdown limits
4. Suggest risk adjustments if needed

EMOTIONAL INTELLIGENCE:
- If the trader seems frustrated/tilting → calm them down, suggest a break
- If overconfident after wins → remind about risk, cite their own data on post-win losses
- If anxious → provide structure, focus on process not outcome
- If they mention revenge trading → STOP them immediately, reference their rules

RULES:
- NEVER give financial advice about what to buy/sell without context
- ALWAYS reference their strategy rules when evaluating setups
- ALWAYS warn about risk when discussing leverage or position sizing
- If you don't have enough context, ask for it rather than guessing
- Be honest about uncertainty — "I'm not sure" is better than wrong advice${strategySection}${traderProfileSection}`;

  // Check if there's an image in the request
  const hasImage = imageBase64 || messages.some((msg: any) => msg.image);

  // If there's an image, use Groq with vision capability (llama-3.2-90b-vision-preview)
  if (hasImage) {
    console.log("🖼️ Image detected, using Groq Vision API for better image analysis");
    
    // Build Groq messages
    const groqMessages: GroqMessage[] = [];
    
    // Add system message
    groqMessages.push({
      role: "system",
      content: systemPrompt,
    });

    // Add conversation history
    for (const msg of messages) {
      const role = msg.role === "assistant" ? "assistant" : "user";
      
      if (msg.image) {
        // Image in message history
        const imageData = msg.image.startsWith("data:") ? msg.image : `data:image/png;base64,${msg.image}`;
        groqMessages.push({
          role: role as "user" | "assistant",
          content: [
            { type: "text", text: msg.content || "Analyze this image" },
            { type: "image_url", image_url: { url: imageData } }
          ]
        });
      } else {
        // Text-only message
        groqMessages.push({
          role: role as "user" | "assistant",
          content: msg.content || "",
        });
      }
    }

    // Add separate imageBase64 if provided
    if (imageBase64 && !messages.some((msg: any) => msg.image)) {
      const imageData = imageBase64.startsWith("data:") ? imageBase64 : `data:image/png;base64,${imageBase64}`;
      groqMessages.push({
        role: "user",
        content: [
          { type: "text", text: "Analyze this trading screenshot." },
          { type: "image_url", image_url: { url: imageData } }
        ]
      });
    }

    try {
      // Use Groq vision model
      const response = await callGroq(groqMessages, {
        generationConfig: {
          temperature: 0.2,
          max_tokens: 2048,
        },
        model: "llama-3.2-90b-vision-preview", // Vision-capable model
      });

      if (stream) {
        // For streaming, convert the response to SSE format
        const encoder = new TextEncoder();
        const readable = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: response })}\n\n`));
            controller.close();
          }
        });

        return new Response(readable, {
          headers: { ...CORS_HEADERS, "Content-Type": "text/event-stream" },
        });
      }

      return jsonResp({ response: response || "No response generated" });
    } catch (error) {
      console.error("❌ Groq Vision API error:", error);
      // Fall back to text-only response
      return jsonResp({ 
        response: "I'm having trouble analyzing the image right now. Please try uploading it again, or describe what you see and I'll help analyze it! 📸",
        error: "Image analysis temporarily unavailable"
      });
    }
  }

  // No image - use regular Gemini text API
  const contents: GeminiContent[] = [];
  for (const msg of messages) {
    const role: "user" | "model" = msg.role === "assistant" ? "model" : "user";
    contents.push({ 
      role, 
      parts: [{ text: msg.content ?? "" }] 
    });
  }

  // Ensure at least one user message exists
  if (contents.length === 0) {
    contents.push({ role: "user", parts: [{ text: "Hello" }] });
  }

  const generationConfig: GeminiGenerationConfig = {
    temperature: 0.2,
    maxOutputTokens: 2048,
    topP: 0.95,
    topK: 40,
  };

  if (stream) {
    const geminiResponse = await callGeminiStream(contents, {
      systemInstruction: systemPrompt,
      generationConfig,
    });
    return new Response(geminiResponse.body, {
      headers: { ...CORS_HEADERS, "Content-Type": "text/event-stream" },
    });
  }

  const text = await callGemini(contents, {
    systemInstruction: systemPrompt,
    generationConfig,
  });

  return jsonResp({ response: text || "No response generated" });
}));
