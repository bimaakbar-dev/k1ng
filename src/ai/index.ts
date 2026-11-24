import type { Env } from "../types";
import { createGemini } from "./gemini";
import { createGroq } from "./groq";
import type { AIProvider } from "./types";

export type { AIProvider } from "./types";

/**
 * Daftar provider yang aktif.
 * Mau tambah provider gratis lain? Buka src/ai/<nama>.ts lalu tambahkan satu baris di sini.
 */
export function getProviders(env: Env): AIProvider[] {
  const providers: AIProvider[] = [];

  if (env.GEMINI_API_KEY) {
    providers.push(createGemini(env.GEMINI_API_KEY, env.GEMINI_MODEL));
  }
  if (env.GROQ_API_KEY) {
    providers.push(createGroq(env.GROQ_API_KEY, env.GROQ_MODEL));
  }

  return providers;
}

export function resolveProvider(
  providers: AIProvider[],
  preferredId?: string,
  fallbackId?: string,
): AIProvider {
  const wanted = preferredId ?? fallbackId ?? "gemini";
  return providers.find((p) => p.id === wanted) ?? providers[0];
}
