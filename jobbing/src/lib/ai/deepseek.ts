import { env } from "@/lib/env";

export interface DeepSeekMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
}

/**
 * Calls DeepSeek and returns the parsed JSON object from the first choice.
 * AI output is treated as untrusted data: callers must validate the result
 * against a Zod schema before use.
 */
export async function chatJson<T>(
  system: string,
  user: string,
  options: ChatOptions = {},
): Promise<T> {
  const { temperature = 0.3, maxTokens = 1200 } = options;

  const baseUrl = env("DEEPSEEK_BASE_URL");
  const apiKey = env("DEEPSEEK_API_KEY");
  const model = env("DEEPSEEK_MODEL");

  const messages: DeepSeekMessage[] = [
    { role: "system", content: system },
    { role: "user", content: user },
  ];

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
        stream: false,
      }),
      cache: "no-store",
    });
  } catch (error) {
    throw new Error(
      `DeepSeek request failed: ${error instanceof Error ? error.message : "network error"}`,
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `DeepSeek returned ${response.status}: ${body.slice(0, 500)}`,
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("DeepSeek returned no content in the response");
  }

  try {
    return JSON.parse(content) as T;
  } catch {
    throw new Error("DeepSeek returned invalid JSON");
  }
}