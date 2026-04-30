/**
 * Shared Groq API helper for YUNIX edge functions.
 * Used as a fallback when Gemini hits rate limits.
 * 
 * Env vars:
 *   GROQ_API_KEY — required, your Groq API key
 *   GROQ_MODEL   — optional, defaults to "llama-3.3-70b-versatile"
 */

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

export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<{ type: "text" | "image_url"; text?: string; image_url?: { url: string } }>;
}

export interface GroqFunctionDeclaration {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
}

export interface GroqGenerationConfig {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
}

// ── Helpers ────────────────────────────────────────────────────────────

function getModel(): string {
  return Deno.env.get("GROQ_MODEL") ?? "llama-3.3-70b-versatile";
}

function getApiKey(): string {
  const key = Deno.env.get("GROQ_API_KEY");
  if (!key) throw new Error("GROQ_API_KEY is not configured");
  return key;
}

function endpoint(): string {
  return "https://api.groq.com/openai/v1/chat/completions";
}

function handleGroqError(response: Response): Response {
  if (response.status === 429) {
    return jsonResp({ error: "Groq rate limits exceeded, please try again later." }, 429);
  }
  if (response.status === 401) {
    return jsonResp({ error: "Invalid Groq API key." }, 401);
  }
  return jsonResp({ error: "Groq API error" }, 500);
}

// ── Public API ────────────────────────────────────────────────────────

/**
 * Non-streaming Groq call. Returns the text from the first choice.
 * Throws on missing key, non-OK response, or empty choices.
 */
export async function callGroq(
  messages: GroqMessage[],
  opts?: {
    systemInstruction?: string;
    generationConfig?: GroqGenerationConfig;
    model?: string;
  },
): Promise<string> {
  const key = getApiKey();
  const model = opts?.model ?? getModel();

  const groqMessages: GroqMessage[] = [...messages];
  
  // Add system instruction if provided
  if (opts?.systemInstruction) {
    groqMessages.unshift({
      role: "system",
      content: opts.systemInstruction,
    });
  }

  const body: Record<string, unknown> = {
    messages: groqMessages,
    model,
  };

  if (opts?.generationConfig) {
    if (opts.generationConfig.temperature !== undefined) {
      body.temperature = opts.generationConfig.temperature;
    }
    if (opts.generationConfig.max_tokens !== undefined) {
      body.max_tokens = opts.generationConfig.max_tokens;
    }
    if (opts.generationConfig.top_p !== undefined) {
      body.top_p = opts.generationConfig.top_p;
    }
  }

  const response = await fetch(endpoint(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) throw response;

  const data = await response.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

/**
 * Groq call with tool calling (structured output).
 * Returns the parsed tool call args from the first choice.
 */
export async function callGroqWithTool(
  messages: GroqMessage[],
  tools: GroqFunctionDeclaration[],
  opts?: {
    systemInstruction?: string;
    generationConfig?: GroqGenerationConfig;
    forcedFunctionName?: string;
    model?: string;
  },
): Promise<{ name: string; args: Record<string, unknown> }> {
  const key = getApiKey();
  const model = opts?.model ?? getModel();

  const groqMessages: GroqMessage[] = [...messages];
  
  // Add system instruction if provided
  if (opts?.systemInstruction) {
    groqMessages.unshift({
      role: "system",
      content: opts.systemInstruction,
    });
  }

  const body: Record<string, unknown> = {
    messages: groqMessages,
    model,
    tools: [{ type: "function", function: tools[0] }],
    tool_choice: "auto",
  };

  if (opts?.generationConfig) {
    if (opts.generationConfig.temperature !== undefined) {
      body.temperature = opts.generationConfig.temperature;
    }
    if (opts.generationConfig.max_tokens !== undefined) {
      body.max_tokens = opts.generationConfig.max_tokens;
    }
    if (opts.generationConfig.top_p !== undefined) {
      body.top_p = opts.generationConfig.top_p;
    }
  }

  const response = await fetch(endpoint(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) throw response;

  const data = await response.json();
  const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("No tool call in Groq response");
  
  return {
    name: toolCall.function.name,
    args: JSON.parse(toolCall.function.arguments) as Record<string, unknown>,
  };
}

/**
 * Streaming Groq call. Returns the raw SSE Response for the caller
 * to pipe through to the client.
 */
export async function callGroqStream(
  messages: GroqMessage[],
  opts?: {
    systemInstruction?: string;
    generationConfig?: GroqGenerationConfig;
    model?: string;
  },
): Promise<Response> {
  const key = getApiKey();
  const model = opts?.model ?? getModel();

  const groqMessages: GroqMessage[] = [...messages];
  
  // Add system instruction if provided
  if (opts?.systemInstruction) {
    groqMessages.unshift({
      role: "system",
      content: opts.systemInstruction,
    });
  }

  const body: Record<string, unknown> = {
    messages: groqMessages,
    model,
    stream: true,
  };

  if (opts?.generationConfig) {
    if (opts.generationConfig.temperature !== undefined) {
      body.temperature = opts.generationConfig.temperature;
    }
    if (opts.generationConfig.max_tokens !== undefined) {
      body.max_tokens = opts.generationConfig.max_tokens;
    }
    if (opts.generationConfig.top_p !== undefined) {
      body.top_p = opts.generationConfig.top_p;
    }
  }

  const response = await fetch(endpoint(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) throw response;
  return response;
}

/**
 * Convenience: wrap a handler that might `throw response` from the helpers
 * above into a proper error Response.
 */
export function safeGroqHandler(fn: (req: Request) => Promise<Response>): (req: Request) => Promise<Response> {
  return async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
    try {
      return await fn(req);
    } catch (e) {
      if (e instanceof Response) return handleGroqError(e);
      console.error("Edge function error:", e);
      return jsonResp(
        { error: e instanceof Error ? e.message : "Unknown error" },
        500,
      );
    }
  };
}
