import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function parseDevVars(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx < 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const vars = parseDevVars(resolve(".dev.vars"));
const base = (process.env.WORKER_URL ?? "").replace(/\/$/, "");
const secret = process.env.ADMIN_SECRET ?? vars.ADMIN_SECRET;

if (!base) {
  console.error("❌ Set WORKER_URL, contoh: WORKER_URL=https://k1ing.xxx.workers.dev npm run set-webhook");
  process.exit(1);
}
if (!secret) {
  console.error("❌ ADMIN_SECRET tidak ditemukan di .dev.vars atau environment.");
  process.exit(1);
}

const target = `${base}/admin/setWebhook?secret=${encodeURIComponent(secret)}`;
const response = await fetch(target);
const body = await response.text();

console.log(body);
if (!response.ok) process.exit(1);
