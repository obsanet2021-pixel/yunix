/**
 * Shared Gemini API helper for YUNIX edge functions.
 * All calls use the Gemini native REST API format (contents/parts).
 * 
 * Env vars:
 *   GEMINI_API_KEY — required, your Google AI API key
 *   GEMINI_MODEL   — optional, defaults to "gemini-2.0-flash"
 *   GROQ_API_KEY   — optional, for fallback when Gemini is rate-limited
 *   GROQ_MODEL     — optional, defaults to "llama-3.3-70b-versatile"
 */

import { callGroq, callGroqWithTool, callGroqStream, type GroqMessage, type GroqFunctionDeclaration, type GroqGenerationConfig } from './groq.ts';

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

export { CORS_HEADERS, jsonResp };

// ── Types ──────────────────────────────────────────────────────────────

export interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
  functionCall?: { name: string; args: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
}

export interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

export interface GeminiFunctionDeclaration {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
}

export interface GeminiGenerationConfig {
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
}

export interface GeminiToolConfig {
  functionCallingConfig: {
    mode: "AUTO" | "ANY" | "NONE";
    allowedFunctionNames?: string[];
  };
}

// ── Helpers ────────────────────────────────────────────────────────────

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

// ── Convert Gemini format to Groq format ───────────────────────────────

function geminiToGroqMessages(contents: GeminiContent[], systemInstruction?: string): GroqMessage[] {
  const messages: GroqMessage[] = [];
  
  if (systemInstruction) {
    messages.push({ role: "system", content: systemInstruction });
  }
  
  for (const content of contents) {
    const textParts = content.parts.filter(p => p.text).map(p => p.text).join("\n");
    if (textParts) {
      messages.push({
        role: content.role === "model" ? "assistant" : "user",
        content: textParts,
      });
    }
  }
  
  return messages;
}

function geminiToGroqTools(tools: GeminiFunctionDeclaration[]): GroqFunctionDeclaration[] {
  return tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }));
}

function geminiToGroqConfig(config?: GeminiGenerationConfig): GroqGenerationConfig | undefined {
  if (!config) return undefined;
  return {
    temperature: config.temperature,
    max_tokens: config.maxOutputTokens,
    top_p: config.topP,
  };
}

// ── Public API with Groq Fallback ────────────────────────────────────────

/**
 * Non-streaming Gemini call with Groq fallback. Returns the text from the first candidate.
 * Throws on missing key, non-OK response, or empty candidates.
 */
export async function callGemini(
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

  try {
    const response = await fetch(endpoint(false, model, key), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      // If rate limited, try Groq fallback
      if (response.status === 429 && Deno.env.get("GROQ_API_KEY")) {
        console.warn("Gemini rate limited, falling back to Groq...");
        const groqMessages = geminiToGroqMessages(contents, opts?.systemInstruction);
        const groqConfig = geminiToGroqConfig(opts?.generationConfig);
        return await callGroq(groqMessages, { systemInstruction: opts?.systemInstruction, generationConfig: groqConfig });
      }
      throw response;
    }

    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  } catch (error) {
    // If Groq is available and Gemini failed, try Groq
    if (Deno.env.get("GROQ_API_KEY") && !(error instanceof Response)) {
      console.warn("Gemini failed, falling back to Groq...", error);
      const groqMessages = geminiToGroqMessages(contents, opts?.systemInstruction);
      const groqConfig = geminiToGroqConfig(opts?.generationConfig);
      return await callGroq(groqMessages, { systemInstruction: opts?.systemInstruction, generationConfig: groqConfig });
    }
    throw error;
  }
}

/**
 * Gemini call with forced tool calling (structured output) and Groq fallback.
 * Returns the parsed functionCall args from the first candidate.
 */
export async function callGeminiWithTool(
  contents: GeminiContent[],
  tools: GeminiFunctionDeclaration[],
  opts?: {
    systemInstruction?: string;
    generationConfig?: GeminiGenerationConfig;
    forcedFunctionName?: string;
    model?: string;
  },
): Promise<{ name: string; args: Record<string, unknown> }> {
  const key = getApiKey();
  const model = opts?.model ?? getModel();

  const body: Record<string, unknown> = {
    contents,
    tools: [{ functionDeclarations: tools }],
  };

  if (opts?.systemInstruction) {
    body.systemInstruction = { parts: [{ text: opts.systemInstruction }] };
  }
  if (opts?.generationConfig) {
    body.generationConfig = opts.generationConfig;
  }

  // Force the tool call
  const fnName = opts?.forcedFunctionName ?? tools[0]?.name;
  body.toolConfig = {
    functionCallingConfig: {
      mode: "ANY",
      allowedFunctionNames: [fnName],
    },
  };

  try {
    const response = await fetch(endpoint(false, model, key), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      // If rate limited, try Groq fallback
      if (response.status === 429 && Deno.env.get("GROQ_API_KEY")) {
        console.warn("Gemini rate limited, falling back to Groq...");
        const groqMessages = geminiToGroqMessages(contents, opts?.systemInstruction);
        const groqTools = geminiToGroqTools(tools);
        const groqConfig = geminiToGroqConfig(opts?.generationConfig);
        return await callGroqWithTool(groqMessages, groqTools, { systemInstruction: opts?.systemInstruction, generationConfig: groqConfig });
      }
      throw response;
    }

    const data = await response.json();
    const fc = data?.candidates?.[0]?.content?.parts?.[0]?.functionCall;
    if (!fc) throw new Error("No function call in Gemini response");
    return { name: fc.name, args: fc.args as Record<string, unknown> };
  } catch (error) {
    // If Groq is available and Gemini failed, try Groq
    if (Deno.env.get("GROQ_API_KEY") && !(error instanceof Response)) {
      console.warn("Gemini failed, falling back to Groq...", error);
      const groqMessages = geminiToGroqMessages(contents, opts?.systemInstruction);
      const groqTools = geminiToGroqTools(tools);
      const groqConfig = geminiToGroqConfig(opts?.generationConfig);
      return await callGroqWithTool(groqMessages, groqTools, { systemInstruction: opts?.systemInstruction, generationConfig: groqConfig });
    }
    throw error;
  }
}

/**
 * Streaming Gemini call with Groq fallback. Returns the raw SSE Response for the caller
 * to pipe through to the client.
 */
export async function callGeminiStream(
  contents: GeminiContent[],
  opts?: {
    systemInstruction?: string;
    generationConfig?: GeminiGenerationConfig;
    model?: string;
  },
): Promise<Response> {
  const key = getApiKey();
  const model = opts?.model ?? getModel();

  const body: Record<string, unknown> = { contents };
  if (opts?.systemInstruction) {
    body.systemInstruction = { parts: [{ text: opts.systemInstruction }] };
  }
  if (opts?.generationConfig) {
    body.generationConfig = opts.generationConfig;
  }

  try {
    const response = await fetch(endpoint(true, model, key), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      // If rate limited, try Groq fallback
      if (response.status === 429 && Deno.env.get("GROQ_API_KEY")) {
        console.warn("Gemini rate limited, falling back to Groq...");
        const groqMessages = geminiToGroqMessages(contents, opts?.systemInstruction);
        const groqConfig = geminiToGroqConfig(opts?.generationConfig);
        return await callGroqStream(groqMessages, { systemInstruction: opts?.systemInstruction, generationConfig: groqConfig });
      }
      throw response;
    }
    return response;
  } catch (error) {
    // If Groq is available and Gemini failed, try Groq
    if (Deno.env.get("GROQ_API_KEY") && !(error instanceof Response)) {
      console.warn("Gemini failed, falling back to Groq...", error);
      const groqMessages = geminiToGroqMessages(contents, opts?.systemInstruction);
      const groqConfig = geminiToGroqConfig(opts?.generationConfig);
      return await callGroqStream(groqMessages, { systemInstruction: opts?.systemInstruction, generationConfig: groqConfig });
    }
    throw error;
  }
}

/**
 * Convenience: wrap a handler that might `throw response` from the helpers
 * above into a proper error Response.
 */
export function safeHandler(fn: (req: Request) => Promise<Response>): (req: Request) => Promise<Response> {
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
