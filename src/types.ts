export interface Env {
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
  ADMIN_SECRET?: string;

  GEMINI_API_KEY?: string;
  GROQ_API_KEY?: string;
  OPENROUTER_API_KEY?: string;

  DEFAULT_PROVIDER?: string;
  GEMINI_MODEL?: string;
  GROQ_MODEL?: string;
  MAX_HISTORY?: string;

  DB: D1Database;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatPreference {
  provider?: string;
}
