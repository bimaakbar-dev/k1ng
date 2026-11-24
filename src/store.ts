import type { ChatMessage, ChatPreference, Env } from "./types";

// Fallback in-memory kalau binding DB belum tersedia (misal sebelum migrasi D1 dijalankan).
const memMessages = new Map<number, ChatMessage[]>();
const memPrefs = new Map<number, ChatPreference>();

export async function getHistory(
  env: Env,
  chatId: number,
  limit = 20,
): Promise<ChatMessage[]> {
  if (env.DB) {
    const { results } = await env.DB.prepare(
      "SELECT role, content FROM chat_messages WHERE chat_id = ? ORDER BY id DESC LIMIT ?",
    )
      .bind(chatId, limit)
      .all<{ role: string; content: string }>();

    return results.reverse().map((row) => ({
      role: row.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: row.content,
    }));
  }
  return (memMessages.get(chatId) ?? []).slice(-limit);
}

export async function saveHistory(
  env: Env,
  chatId: number,
  messages: ChatMessage[],
  keep = 20,
): Promise<void> {
  const trimmed = messages.slice(-keep);

  if (env.DB) {
    const statements: D1PreparedStatement[] = [
      env.DB.prepare("DELETE FROM chat_messages WHERE chat_id = ?").bind(chatId),
      ...trimmed.map((m) =>
        env.DB
          .prepare("INSERT INTO chat_messages (chat_id, role, content) VALUES (?, ?, ?)")
          .bind(chatId, m.role, m.content),
      ),
      env.DB.prepare("DELETE FROM chat_messages WHERE created_at < datetime('now', '-7 days')"),
    ];
    await env.DB.batch(statements);
    return;
  }

  memMessages.set(chatId, trimmed);
}

export async function getPreference(env: Env, chatId: number): Promise<ChatPreference> {
  if (env.DB) {
    const row = await env.DB.prepare(
      "SELECT provider FROM chat_preferences WHERE chat_id = ?",
    )
      .bind(chatId)
      .first<{ provider: string | null }>();
    return { provider: row?.provider ?? undefined };
  }
  return memPrefs.get(chatId) ?? {};
}

export async function setPreference(
  env: Env,
  chatId: number,
  provider: string,
): Promise<void> {
  if (env.DB) {
    await env.DB.prepare(
      `INSERT INTO chat_preferences (chat_id, provider, updated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(chat_id) DO UPDATE SET
         provider = excluded.provider,
         updated_at = datetime('now')`,
    )
      .bind(chatId, provider)
      .run();
    return;
  }
  memPrefs.set(chatId, { provider });
}

export async function clearHistory(env: Env, chatId: number): Promise<void> {
  if (env.DB) {
    await env.DB.prepare("DELETE FROM chat_messages WHERE chat_id = ?").bind(chatId).run();
  }
  memMessages.delete(chatId);
}
