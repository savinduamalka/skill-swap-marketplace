// xAI exposes an OpenAI-compatible endpoint.
const LLM_API_URL = 'https://api.x.ai/v1/chat/completions';

export const LLM_MODEL =
  process.env.LLM_MODEL?.trim();

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  messages: ChatMessage[];
  /** 0 = deterministic, higher = more creative. Low values reduce garbage output. */
  temperature?: number;
  maxTokens?: number;
  /** When true, asks the model to return strict JSON (json_object mode). */
  jsonMode?: boolean;
  /** Abort the request if the provider is slow. */
  timeoutMs?: number;
}

/**
 * Error thrown when the LLM provider is misconfigured or fails.
 * The API layer maps this to a friendly, provider-agnostic message.
 */
export class LLMError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = 'LLMError';
    this.status = status;
  }
}

/**
 * Calls the chat completion endpoint and returns the assistant text.
 *
 * @throws {LLMError} when the key is missing or the provider returns an error.
 */
export async function createChatCompletion({
  messages,
  temperature = 0.4,
  maxTokens = 2400,
  jsonMode = false,
  timeoutMs = 30000,
}: ChatCompletionOptions): Promise<string> {
  const apiKey = process.env.LLM_API_KEY;

  if (!apiKey) {
    throw new LLMError(
      'The learning assistant is not configured. Missing LLM_API_KEY.',
      503
    );
  }

  // Guard against a hanging provider so the user always gets a response.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(LLM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages,
        temperature,
        max_tokens: maxTokens,
        // top_p kept slightly below 1 to trim low-probability "garbage" tokens.
        top_p: 0.9,
        ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new LLMError(
        'The learning assistant took too long to respond. Please try again.',
        504
      );
    }
    throw new LLMError('Could not reach the learning assistant.', 502);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    // Avoid leaking provider internals to the client.
    const detail = await response.text().catch(() => '');
    console.error('LLM API error:', response.status, detail);

    if (response.status === 429) {
      throw new LLMError(
        'The learning assistant is busy right now. Please try again in a moment.',
        429
      );
    }
    throw new LLMError('The learning assistant could not generate a response.', 502);
  }

  const data = await response.json();
  const text: string | undefined = data?.choices?.[0]?.message?.content;

  if (!text || !text.trim()) {
    throw new LLMError('The learning assistant returned an empty response.', 502);
  }

  return text.trim();
}
