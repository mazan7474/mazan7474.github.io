// language: TypeScript, file: main.ts, runtime: Deno Deploy
// World Hub — backend-заглушка. Принимает статус TShock-серверов, отдаёт список фронту.

// ============================================================
// КОНФИГУРАЦИЯ (через env vars Deno Deploy)
// ============================================================
const AUTH_TOKEN   = Deno.env.get("AUTH_TOKEN")   ?? "dev-token-change-me";
const ONLINE_TTL_MS = 5 * 60 * 1000;              // 5 минут — сервер онлайн
const MAX_BODY_BYTES = 64 * 1024;                 // 64 KB — максимум тела
const RATE_LIMIT_MS = 10 * 1000;                  // 10 сек между POST с одного IP

// KV для хранения статусов. Открывается лениво.
const kv = await Deno.openKv();

// ============================================================
// ТИПЫ
// ============================================================
interface ServerStatus {
  id: string;
  name: string;
  host: string;
  port: number;
  online: boolean;
  players: number;
  maxPlayers: number;
  mode: string;
  map: string;
  updated_at: number; // ms epoch, ставит бэкенд
  from_ip?: string;
}

// ============================================================
// УТИЛИТЫ
// ============================================================

function json(body: unknown, status = 200, extra: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      ...extra,
    },
  });
}

function error(message: string, status = 400) {
  return json({ error: message }, status);
}

// Проверка типов/полей. Возвращает либо ошибку, либо валидный объект.
function validateServer(body: unknown): ServerStatus | string {
  if (typeof body !== "object" || body === null) return "body must be an object";
  const b = body as Record<string, unknown>;

  const id = String(b.id ?? "").trim();
  if (!id || id.length > 64) return "id is required, max 64 chars";

  const name = String(b.name ?? "").trim();
  if (!name || name.length > 100) return "name is required, max 100 chars";

  const host = String(b.host ?? "").trim();
  if (!host || host.length > 255) return "host is required, max 255 chars";

  const port = Number(b.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return "port must be integer 1-65535";
  }

  const online = Boolean(b.online);
  const players = Number(b.players ?? 0);
  const maxPlayers = Number(b.maxPlayers ?? 0);

  if (!Number.isInteger(players) || players < 0 || players > 1000) {
    return "players must be integer 0-1000";
  }
  if (!Number.isInteger(maxPlayers) || maxPlayers < 1 || maxPlayers > 1000) {
    return "maxPlayers must be integer 1-1000";
  }
  if (players > maxPlayers) return "players cannot exceed maxPlayers";

  const mode = String(b.mode ?? "Classic").slice(0, 50);
  const map  = String(b.map  ?? "Unknown").slice(0, 100);

  return {
    id, name, host, port, online, players, maxPlayers, mode, map,
    updated_at: Date.now(),
  };
}

// ============================================================
// RATE LIMIT (простой, в памяти инстанса)
// ============================================================
const lastPostByIp = new Map<string, number>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const last = lastPostByIp.get(ip) ?? 0;
  if (now - last < RATE_LIMIT_MS) return true;
  lastPostByIp.set(ip, now);
  // раз в 1000 вызовов — чистка старых записей, чтобы map не рос вечно
  if (lastPostByIp.size > 1000) {
    for (const [k, v] of lastPostByIp) {
      if (now - v > RATE_LIMIT_MS * 6) lastPostByIp.delete(k);
    }
  }
  return false;
}

// ============================================================
// HANDLERS
// ============================================================

// GET /api/servers — публичный список
async function handleGetServers(): Promise<Response> {
  const out: ServerStatus[] = [];
  const cutoff = Date.now() - ONLINE_TTL_MS;

  for await (const entry of kv.list<ServerStatus>({ prefix: ["servers"] })) {
    const s = entry.value;
    if (!s) continue;
    // если статус протух — считаем оффлайн, но всё равно отдаём
    if (s.updated_at < cutoff) s.online = false;
    out.push(s);
  }

  // сортировка: онлайн первыми, потом по числу игроков, потом по имени
  out.sort((a, b) =>
    (Number(b.online) - Number(a.online)) ||
    ((b.online ? b.players : 0) - (a.online ? a.players : 0)) ||
    a.name.localeCompare(b.name, "ru")
  );

  return json(out);
}

// POST /api/status — приём статуса от плагина
async function handlePostStatus(req: Request, ip: string): Promise<Response> {
  // 1. Проверка токена
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return error("missing Bearer token", 401);
  if (auth.slice(7) !== AUTH_TOKEN)   return error("invalid token", 403);

  // 2. Rate limit
  if (rateLimited(ip)) return error("too many requests, slow down", 429);

  // 3. Чтение тела с ограничением
  const reader = req.body?.getReader();
  if (!reader) return error("empty body", 400);
  let total = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) return error("body too large", 413);
    chunks.push(value);
  }
  const text = new TextDecoder().decode(
    chunks.reduce((acc, c) => {
      const merged = new Uint8Array(acc.length + c.length);
      merged.set(acc); merged.set(c, acc.length);
      return merged;
    }, new Uint8Array(0))
  );

  // 4. Парсинг и валидация
  let parsed: unknown;
  try { parsed = JSON.parse(text); }
  catch { return error("invalid JSON", 400); }

  const result = validateServer(parsed);
  if (typeof result === "string") return error(result, 400);
  result.from_ip = ip;

  // 5. Сохранение в KV
  await kv.set(["servers", result.id], result);

  return json({ ok: true, id: result.id, updated_at: result.updated_at });
}

// GET /api/health — health check
function handleHealth(): Response {
  return json({ ok: true, ts: Date.now(), service: "world-hub-backend" });
}

// ============================================================
// ROUTER
// ============================================================
Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const path = url.pathname;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim()
           ?? req.headers.get("x-real-ip")
           ?? "unknown";

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  try {
    if (path === "/api/health"  && req.method === "GET")  return handleHealth();
    if (path === "/api/servers" && req.method === "GET")  return await handleGetServers();
    if (path === "/api/status"  && req.method === "POST") return await handlePostStatus(req, ip);
    return error("not found", 404);
  } catch (e) {
    console.error("handler error:", e);
    return error("internal error", 500);
  }
});
