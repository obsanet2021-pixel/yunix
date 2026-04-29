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
  const { imageBase64 } = await req.json();
  if (!imageBase64) throw new Error("No image provided");

  const systemInstruction = `You are an expert at reading trading platform screenshots. Extract the following data from the screenshot:
- balance (number)
- equity (number)
- floating_pnl (number, can be negative)
- margin_used (number)
- free_margin (number)
- open_trades (integer)

Return ONLY valid JSON with these exact keys. Use null for values you cannot determine. Example:
{"balance": 5000, "equity": 4975, "floating_pnl": -25, "margin_used": 320, "free_margin": 4655, "open_trades": 2}`;

  const contents: GeminiContent[] = [{
    role: "user",
    parts: [
      { text: "Extract the account data from this trading platform screenshot." },
      { inlineData: { mimeType: "image/png", data: imageBase64 } },
    ],
  }];

  const text = await callGemini(contents, {
    systemInstruction,
    generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
  });

  // Parse JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Could not parse AI response");

  const parsed = JSON.parse(jsonMatch[0]);

  return jsonResp({ success: true, data: parsed });
}));
