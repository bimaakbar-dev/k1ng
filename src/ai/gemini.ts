import type { ChatMessage } from "../types";
import type { AIProvider } from "./types";

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export function createGemini(apiKey: string, model = "gemini-2.5-flash"): AIProvider {
  return {
    id: "gemini",
    label: "Google Gemini",
    model,

    async chat(messages: ChatMessage[], system?: string): Promise<string> {
      const contents = messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      const body: Record<string, unknown> = { contents };
      if (system) body.systemInstruction = { parts: [{ text: system }] };

      const response = await fetch(
        `${BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      if (!response.ok) {
        throw new Error(`Gemini ${response.status}: ${(await response.text()).slice(0, 300)}`);
      }

      const data = (await response.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
        promptFeedback?: { blockReason?: string };
      };
      const text = data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? "")
        .join("")
        .trim();

      if (!text) {
        throw new Error(
          data.promptFeedback?.blockReason
            ? `Gemini memblokir prompt (${data.promptFeedback.blockReason})`
            : "Gemini mengembalikan respons kosong",
        );
      }
      return text;
    },
  };
}
