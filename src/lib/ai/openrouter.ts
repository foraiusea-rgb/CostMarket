/**
 * OpenRouter Client
 * 
 * Sends prompts to any LLM via OpenRouter's unified API.
 * Supports both streaming and non-streaming responses.
 * 
 * Model is configurable via OPENROUTER_MODEL env var.
 * Default: anthropic/claude-sonnet-4-20250514
 */

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not set");
  return key;
}

function getModel(): string {
  return process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-4-20250514";
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenRouterChoice {
  message?: { content: string };
  delta?: { content?: string };
}

interface OpenRouterResponse {
  choices: OpenRouterChoice[];
}

/**
 * Send a chat completion request (non-streaming).
 * Returns the full response text.
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const res = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://aicostmarkets.com",
      "X-Title": "AI Cost Markets",
    },
    body: JSON.stringify({
      model: getModel(),
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 1024,
      stream: false,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "Unknown error");
    throw new Error(`OpenRouter error (${res.status}): ${err}`);
  }

  const data: OpenRouterResponse = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

/**
 * Send a streaming chat completion request.
 * Returns a ReadableStream that can be piped directly to the client.
 * 
 * The stream emits Server-Sent Events (SSE) compatible chunks.
 */
export async function chatCompletionStream(
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://aicostmarkets.com",
      "X-Title": "AI Cost Markets",
    },
    body: JSON.stringify({
      model: getModel(),
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 1024,
      stream: true,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "Unknown error");
    throw new Error(`OpenRouter error (${res.status}): ${err}`);
  }

  if (!res.body) throw new Error("No response body from OpenRouter");

  // Transform the OpenRouter SSE stream into a clean text stream
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  return new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }

      const text = decoder.decode(value, { stream: true });
      const lines = text.split("\n");

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") {
          controller.close();
          return;
        }

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            controller.enqueue(encoder.encode(content));
          }
        } catch {
          // Skip malformed chunks
        }
      }
    },
    cancel() {
      reader.cancel();
    },
  });
}
