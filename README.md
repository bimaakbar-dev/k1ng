# k1ing — Telegram AI Bot (Cloudflare Workers + Grammy + D1)

Bot Telegram pribadi dengan multiple AI provider (saat ini: **Gemini** + **Groq**), deploy gratis di **Cloudflare Workers** (free tier: 100.000 request/hari, tanpa kartu kredit). Penyimpanan memakai **D1 (SQLite di edge)**, bukan KV.

## Arsitektur

```
Telegram ──webhook──> /webhook (Worker)
                         │
                         ├─> verifikasi secret token
                         ├─> Grammy (command + handler)
                         ├─> AI provider: Gemini / Groq
                         └─> D1 (SQLite)
                               ├─> chat_messages   (riwayat per chat_id)
                               └─> chat_preferences (provider aktif per chat_id)
```

- **Webhook** dipakai (bukan long polling) karena Workers adalah serverless.
- Riwayat chat disimpan di tabel `chat_messages`, maksimal `MAX_HISTORY` pesan per chat. Baris lebih lama otomatis dibuang saat penyimpanan, dan pesan > 7 hari dibersihkan.
- Panggilan AI adalah `fetch` (network I/O), jadi tidak kena batas 10 ms CPU time di free plan.

Schema ada di [`migrations/0001_init.sql`](migrations/0001_init.sql).

## Setup

### 1. Pasang dependencies

```bash
cd k1ing
npm install
```

### 2. Login Cloudflare

```bash
npx wrangler login
```

### 3. Database D1

Database sudah dibuat dengan nama `agent-db` dan `database_id`-nya terpasang di `wrangler.toml`. Kalau perlu membuat database baru:

```bash
npx wrangler d1 create agent-db
```

Lalu paste `database_id`-nya ke `wrangler.toml` (dan `preview_database_id` kalau ingin terpisah untuk lokal).

Jalankan migrasi:

```bash
# lokal (untuk wrangler dev)
npx wrangler d1 migrations apply agent-db --local

# produksi
npx wrangler d1 migrations apply agent-db --remote
```

> Sebelum binding terisi, bot otomatis pakai penyimpanan in-memory supaya tetap bisa dites.

### 4. Isi secrets

```bash
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars`: token BotFather, `TELEGRAM_WEBHOOK_SECRET`, `ADMIN_SECRET`, `GEMINI_API_KEY`, `GROQ_API_KEY`.

Untuk secrets di production (disarankan, daripada menyimpan di file):

```bash
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET
npx wrangler secret put ADMIN_SECRET
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put GROQ_API_KEY
```

### 5. Deploy

```bash
npm run deploy
```

Catat URL worker-nya, misal `https://k1ing.<subdomain>.workers.dev`.

### 6. Daftarkan webhook

```bash
WORKER_URL=https://k1ing.<subdomain>.workers.dev npm run set-webhook
```

Atau manual:

```bash
curl "https://k1ing.<subdomain>.workers.dev/admin/setWebhook?secret=ADMIN_SECRET_KAMU"
```

### 7. Tes

Buka bot di Telegram, kirim `/start`, lalu kirim pesan biasa. Cek `/status`.

## Perintah bot

| Perintah | Fungsi |
|---|---|
| `/start` | Sambutan |
| `/help` | Daftar perintah |
| `/provider` | Lihat provider aktif + model |
| `/use <id>` | Ganti provider, cth `/use groq` |
| `/status` | Provider, model, jumlah pesan di riwayat |
| `/clear` | Hapus riwayat chat |
| `/ping` | Health check |

## Menambah provider gratis lain (nanti)

1. Buat `src/ai/<nama>.ts` yang mengekspor `create<Nama>(apiKey, model): AIProvider` dengan method `chat(messages, system)`.
2. Tambahkan field API key & model di `src/types.ts` (`Env`) dan `wrangler.toml`.
3. Tambahkan satu baris di `getProviders()` dalam `src/ai/index.ts`:

```ts
if (env.MISTRAL_API_KEY) {
  providers.push(createMistral(env.MISTRAL_API_KEY, env.MISTRAL_MODEL));
}
```

4. `npx wrangler secret put MISTRAL_API_KEY`, deploy ulang. Command `/provider` dan `/use` otomatis mengenali provider baru.

Kandidat free tier besar: **Mistral**, **Cerebras**, **Hugging Face Inference**, **OpenRouter** (banyak model gratis), **Groq model lain**.

## Query D1 berguna

```bash
# lihat riwayat suatu chat
npx wrangler d1 execute agent-db --remote --command \
  "SELECT id, role, substr(content,1,60) AS preview FROM chat_messages WHERE chat_id = 123 ORDER BY id DESC LIMIT 10"

# hapus semua riwayat
npx wrangler d1 execute agent-db --remote --command "DELETE FROM chat_messages"

# cek preferensi provider
npx wrangler d1 execute agent-db --remote --command "SELECT * FROM chat_preferences"
```

## Catatan biaya & limit

- Cloudflare Workers Free: 100k request/hari, 10 ms CPU per request, 100 subrequest per request.
- D1 Free: 5 GB storage, 5 juta row read/hari, 100 ribu row write/hari — jauh lebih dari cukup untuk pemakaian pribadi.
- Gemini & Groq punya free tier yang cukup untuk pemakaian pribadi; cek kuota masing-masing.
- Kalau bot dipakai banyak orang, pertimbangkan Workers Paid ($5/bulan) untuk CPU time lebih longgar.

## Development lokal

```bash
npm run dev
```

Webhook Telegram butuh URL publik. Untuk tes lokal bisa pakai tunnel (ngrok / cloudflared) lalu arahkan webhook ke URL tersebut, atau cukup deploy ke Workers lalu tes langsung.
