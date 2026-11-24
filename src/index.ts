import { webhookCallback } from "grammy";
import { createBot } from "./bot";
import type { Env } from "./types";

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "/health") {
      return Response.json({ ok: true, service: "k1ing" });
    }

    if (url.pathname === "/webhook" && request.method === "POST") {
      const secret = env.TELEGRAM_WEBHOOK_SECRET;
      if (secret && request.headers.get("x-telegram-bot-api-secret-token") !== secret) {
        return new Response("Unauthorized", { status: 401 });
      }
      const bot = createBot(env);
      return webhookCallback(bot, "cloudflare-mod")(request);
    }

    // Endpoint admin untuk mendaftarkan webhook ke Telegram.
    if (url.pathname === "/admin/setWebhook") {
      const adminSecret = env.ADMIN_SECRET;
      const provided = url.searchParams.get("secret");
      if (!adminSecret || !provided || provided !== adminSecret) {
        return new Response("Unauthorized", { status: 401 });
      }

      const telegramApi = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/setWebhook`;
      const response = await fetch(telegramApi, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url: `${url.origin}/webhook`,
          secret_token: env.TELEGRAM_WEBHOOK_SECRET,
          allowed_updates: ["message"],
          drop_pending_updates: true,
        }),
      });
      return new Response(await response.text(), {
        status: response.status,
        headers: { "content-type": "application/json" },
      });
    }

    return new Response("Not found", { status: 404 });
  },
};
