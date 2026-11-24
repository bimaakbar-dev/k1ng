import type { ChatMessage } from "../types";
import type { AIProvider } from "./types";

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export function createOpenRouter(
  apiKey: string,
  model = "google/gemma-4-31b-it:free",
): AIProvider {
  return {
    id: "openrouter",
    label: "OpenRouter",
    model,

    async chat(messages: ChatMessage[], system?: string): Promise<string> {
      const payload = [
        ...(system ? [{ role: "system", content: system }] : []),
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ];

      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://k1ing.workers.dev",
          "X-Title": "k1ing",
        },
        body: JSON.stringify({ model, messages: payload }),
      });

      if (!response.ok) {
        throw new Error(`OpenRouter ${response.status}: ${(await response.text()).slice(0, 300)}`);
      }

      const data = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
        error?: { message?: string };
      };
      if (data.error?.message) throw new Error(`OpenRouter: ${data.error.message}`);

      const text = data.choices?.[0]?.message?.content?.trim();
      if (!text) throw new Error("OpenRouter mengembalikan respons kosong");
      return text;
    },
  };
}
