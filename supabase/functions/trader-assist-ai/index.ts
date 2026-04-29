import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResp(body: unknown, status = 200, headers = CORS_HEADERS): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
  functionCall?: { name: string; args: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
}

interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

interface GeminiGenerationConfig {
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
}

function getModel(): string {
  return Deno.env.get("GEMINI_MODEL") ?? "gemini-2.0-flash";
}

function getApiKey(): string {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new Error("GEMINI_API_KEY is not configured");
  return key;
}

function endpoint(stream: boolean, model: string, key: string): string {
  const base = `https://generativelanguage.googleapis.com/v1beta/models/${model}`;
  return stream
    ? `${base}:streamGenerateContent?alt=sse&key=${key}`
    : `${base}:generateContent?key=${key}`;
}

function handleGeminiError(response: Response): Response {
  if (response.status === 429) {
    return jsonResp({ error: "Rate limits exceeded, please try again later." }, 429);
  }
  if (response.status === 402) {
    return jsonResp({ error: "Payment required, please add funds to your Gemini account." }, 402);
  }
  return jsonResp({ error: "AI gateway error" }, 500);
}

async function callGemini(
  contents: GeminiContent[],
  opts?: {
    systemInstruction?: string;
    generationConfig?: GeminiGenerationConfig;
    model?: string;
  },
): Promise<string> {
  const key = getApiKey();
  const model = opts?.model ?? getModel();

  const body: Record<string, unknown> = { contents };
  if (opts?.systemInstruction) {
    body.systemInstruction = { parts: [{ text: opts.systemInstruction }] };
  }
  if (opts?.generationConfig) {
    body.generationConfig = opts.generationConfig;
  }

  const response = await fetch(endpoint(false, model, key), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) throw response; // caller catches and uses handleGeminiError

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

function safeHandler(fn: (req: Request) => Promise<Response>): (req: Request) => Promise<Response> {
  return async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
    try {
      return await fn(req);
    } catch (e) {
      if (e instanceof Response) return handleGeminiError(e);
      console.error("Edge function error:", e);
      return jsonResp(
        { error: e instanceof Error ? e.message : "Unknown error" },
        500,
      );
    }
  };
}

serve(safeHandler(async (req) => {
  const { imageBase64, domData, journalData } = await req.json();

  const structuredContext = JSON.stringify({
    dom_data: domData || {},
    journal: journalData || {},
  }, null, 2);

  const systemInstruction = `You are an elite ICT trading mentor integrated into the YUNIX trading journal platform.

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

  const parts: GeminiPart[] = [
    { text: `Analyze this trade setup.\n\nStructured Data:\n${structuredContext}` },
  ];

  if (imageBase64) {
    parts.push({ inlineData: { mimeType: "image/png", data: imageBase64 } });
  }

  const contents: GeminiContent[] = [{ role: "user", parts }];

  const analysis = await callGemini(contents, {
    systemInstruction,
    generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
  });

  return jsonResp({ success: true, analysis: analysis || "No analysis available." });
}));
