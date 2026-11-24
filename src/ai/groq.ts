import type { ChatMessage } from "../types";
import type { AIProvider } from "./types";

const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

export function createGroq(apiKey: string, model = "llama-3.3-70b-versatile"): AIProvider {
  return {
    id: "groq",
    label: "Groq",
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
        },
        body: JSON.stringify({ model, messages: payload }),
      });

      if (!response.ok) {
        throw new Error(`Groq ${response.status}: ${(await response.text()).slice(0, 300)}`);
      }

      const data = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const text = data.choices?.[0]?.message?.content?.trim();
      if (!text) throw new Error("Groq mengembalikan respons kosong");
      return text;
    },
  };
}
