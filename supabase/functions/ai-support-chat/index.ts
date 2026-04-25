import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const YUNIX_KNOWLEDGE_BASE = `You are YUNIX Support Assistant, a helpful and friendly AI that assists users with questions about the YUNIX trading platform.

ABOUT YUNIX:
- YUNIX is a comprehensive trading dashboard platform for forex and prop firm traders
- Features include: Trade Journal, Analytics, Courses, Certificates, Prop Firm Management, Economic Calendar
- Users can log trades, track performance, earn certificates, and access educational courses

SERVICES & FEATURES:
1. Trade Journal - Log and analyze your trading activity with screenshots and notes
2. Analytics Dashboard - View win rates, profit/loss, trading patterns
3. Courses - Educational trading courses with video lessons
4. Certificates - Earn certificates upon course completion, order commemorative plaques
5. Prop Firm Tracking - Manage multiple prop firm accounts in one place
6. Economic Calendar - Stay updated on market-moving events

PRICING & PLAQUES:
- Platform access is included with membership
- Commemorative plaques are available for certificate holders
- Plaque pricing varies by size (Small, Medium, Large, Premium)
- Express delivery available for additional fee
- Contact support for current pricing

ACCOUNT ISSUES:
- For login problems: Try resetting password via Telegram verification
- Profile updates: Go to Settings > Profile
- Telegram linking: Required for password resets and notifications

REFUND POLICY:
- Plaque orders: Refunds available before production starts
- For payment disputes, we review on a case-by-case basis
- Contact support for refund requests

RESPONSE RULES:
1. Be concise - maximum 3 sentences per response
2. Be friendly and professional
3. NEVER make promises about payments or refunds - escalate these
4. For payment issues, account problems, or complex requests: immediately suggest connecting with a live support agent
5. Always end with: "Was this helpful?"

CATEGORIES YOU HANDLE:
- Account & Login Issues
- Course Access Problems  
- Certificate Questions
- Technical Bugs
- General Platform Questions

ESCALATE IMMEDIATELY (don't try to solve):
- Payment disputes or failed payments
- Refund requests
- Account access/security issues
- Billing problems`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, category } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    // Determine if this should be escalated
    const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';
    const escalationKeywords = ['payment', 'refund', 'money', 'charged', 'billing', 'invoice', 'account locked', 'hacked', 'security'];
    const shouldEscalate = escalationKeywords.some(keyword => lastMessage.includes(keyword));

    if (shouldEscalate) {
      return new Response(JSON.stringify({
        message: "I understand this is about payments or account security. These issues require personal attention from our support team. I'll connect you with a live agent who can help resolve this properly. Click 'Escalate to Support' below to create a ticket.",
        shouldEscalate: true,
        category: 'payment'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Add category context if provided
    let systemPrompt = YUNIX_KNOWLEDGE_BASE;
    if (category) {
      systemPrompt += `\n\nThe user selected category: ${category}. Focus your response on this topic.`;
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        max_tokens: 300,
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
        return new Response(JSON.stringify({ error: "Service temporarily unavailable." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI service unavailable");
    }

    const data = await response.json();
    const aiMessage = data.choices?.[0]?.message?.content || "I'm sorry, I couldn't process your request. Please try again.";

    return new Response(JSON.stringify({
      message: aiMessage,
      shouldEscalate: false
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("AI Support Chat error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
      message: "I'm having trouble connecting right now. Please try again or contact support directly."
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});