import { Bot, type Context } from "grammy";
import { getProviders, resolveProvider, type AIProvider } from "./ai";
import { clearHistory, getHistory, getPreference, saveHistory, setPreference } from "./store";
import type { ChatMessage, Env } from "./types";

const SYSTEM_PROMPT = `Kamu adalah asisten AI yang ramah, ringkas, dan membantu.
Jawab dalam Bahasa Indonesia unless user meminta bahasa lain.
Gunakan Markdown ringan (bold, italic, kode) bila membantu. Jangan terlalu panjang kecuali diminta.`;

const TELEGRAM_LIMIT = 4000;

async function replyLong(ctx: Context, text: string): Promise<void> {
  const chunks: string[] = [];
  let rest = text;
  while (rest.length > TELEGRAM_LIMIT) {
    const slice = rest.slice(0, TELEGRAM_LIMIT);
    const breakAt = Math.max(slice.lastIndexOf("\n"), slice.lastIndexOf(". "));
    const cut = breakAt > TELEGRAM_LIMIT / 2 ? breakAt : TELEGRAM_LIMIT;
    chunks.push(rest.slice(0, cut));
    rest = rest.slice(cut).trimStart();
  }
  if (rest) chunks.push(rest);

  for (const chunk of chunks) {
    await ctx.reply(chunk);
  }
}

function friendlyError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  if (raw.includes("429")) return "⏳ Rate limit AI tercapai. Tunggu sebentar lalu coba lagi.";
  if (raw.includes("401") || raw.includes("403")) return "🔑 API key AI tidak valid. Cek konfigurasi secret bot.";
  if (raw.includes("404")) return "🤖 Model tidak ditemukan. Cek nama model di wrangler.toml.";
  return `⚠️ Gagal memanggil AI: ${raw.slice(0, 250)}`;
}

export function createBot(env: Env): Bot {
  const bot = new Bot(env.TELEGRAM_BOT_TOKEN);
  const providers = getProviders(env);

  async function currentProvider(ctx: Context): Promise<AIProvider | undefined> {
    if (!providers.length) return undefined;
    const pref = await getPreference(env, ctx.chat?.id ?? ctx.from!.id);
    return resolveProvider(providers, pref.provider, env.DEFAULT_PROVIDER);
  }

  bot.command("start", async (ctx) => {
    await ctx.reply(
      `👋 Halo! Saya asisten AI pribadi kamu.\n\n` +
        `Ketik saja pesan apa pun, nanti saya jawab pakai ${providers.map((p) => p.label).join(" / ") || "AI (belum dikonfigurasi)"}.\n\n` +
        `/provider — lihat & pilih model\n` +
        `/status — info sesi saat ini\n` +
        `/clear — hapus riwayat chat\n` +
        `/help — daftar perintah`,
    );
  });

  bot.command("help", async (ctx) => {
    await ctx.reply(
      `Perintah yang tersedia:\n\n` +
        `/start — pesan sambutan\n` +
        `/provider — daftar provider AI aktif\n` +
        `/use <id> — ganti provider (contoh: /use groq)\n` +
        `/status — provider & model yang dipakai\n` +
        `/clear — hapus riwayat percakapan\n` +
        `/help — daftar ini`,
    );
  });

  bot.command("provider", async (ctx) => {
    if (!providers.length) {
      await ctx.reply("Belum ada API key AI yang aktif. Isi GEMINI_API_KEY / GROQ_API_KEY di secret.");
      return;
    }
    const pref = await getPreference(env, ctx.chat?.id ?? ctx.from!.id);
    const active = resolveProvider(providers, pref.provider, env.DEFAULT_PROVIDER);
    const lines = providers.map(
      (p) => `${p.id === active.id ? "✅" : "▪️"} <b>${p.label}</b> — <code>${p.model}</code> (id: ${p.id})`,
    );
    await ctx.reply(
      `Provider tersedia:\n\n${lines.join("\n")}\n\nGanti dengan: /use &lt;id&gt;`,
      { parse_mode: "HTML" },
    );
  });

  bot.command("use", async (ctx) => {
    const id = ctx.match.toString().trim().toLowerCase();
    if (!id) {
      await ctx.reply("Contoh: /use gemini atau /use groq");
      return;
    }
    const picked = providers.find((p) => p.id === id);
    if (!picked) {
      await ctx.reply(`Provider "${id}" tidak aktif. Ketik /provider untuk melihat daftar.`);
      return;
    }
    const chatId = ctx.chat?.id ?? ctx.from!.id;
    await setPreference(env, chatId, picked.id);
    await ctx.reply(`✅ Sekarang pakai <b>${picked.label}</b> (${picked.model})`, {
      parse_mode: "HTML",
    });
  });

  bot.command("status", async (ctx) => {
    const provider = await currentProvider(ctx);
    const chatId = ctx.chat?.id ?? ctx.from!.id;
    const history = await getHistory(env, chatId);
    if (!provider) {
      await ctx.reply("Belum ada provider AI aktif.");
      return;
    }
    await ctx.reply(
      `📊 Status\n\nProvider: <b>${provider.label}</b>\nModel: <code>${provider.model}</code>\nPesan di riwayat: ${history.length}`,
      { parse_mode: "HTML" },
    );
  });

  bot.command("clear", async (ctx) => {
    await clearHistory(env, ctx.chat?.id ?? ctx.from!.id);
    await ctx.reply("🧹 Riwayat percakapan dihapus.");
  });

  bot.command("ping", async (ctx) => {
    await ctx.reply("🏓 pong");
  });

  bot.on("message:text", async (ctx) => {
    const provider = await currentProvider(ctx);
    if (!provider) {
      await ctx.reply("Belum ada API key AI yang aktif. Isi secret GEMINI_API_KEY atau GROQ_API_KEY.");
      return;
    }

    const chatId = ctx.chat?.id ?? ctx.from!.id;
    const maxHistory = Number(env.MAX_HISTORY ?? 20) || 20;
    const history = await getHistory(env, chatId);
    history.push({ role: "user", content: ctx.message.text });

    await ctx.replyWithChatAction("typing");

    try {
      const answer = await provider.chat(history.slice(-maxHistory), SYSTEM_PROMPT);
      const updated = [...history, { role: "assistant" as const, content: answer }].slice(-maxHistory);
      await saveHistory(env, chatId, updated, maxHistory);
      await replyLong(ctx, answer);
    } catch (error) {
      await ctx.reply(friendlyError(error));
    }
  });

  bot.catch((err) => {
    console.error("Bot error:", err.error);
  });

  return bot;
}
