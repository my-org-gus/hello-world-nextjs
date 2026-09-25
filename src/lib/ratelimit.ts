import { getCloudflareContext } from "@opennextjs/cloudflare";

// KV no es atómico ni fuertemente consistente: el conteo es aproximado,
// alcanza para frenar abuso y acotar costo, no para facturar.

type Kind = "text" | "image" | "publish" | "report" | "login";

const LIMITS = {
  text: () => Number(process.env.RL_TEXT_PER_HOUR ?? 40),
  image: () => Number(process.env.RL_IMAGES_PER_HOUR ?? 24),
  publish: () => Number(process.env.RL_PUBLISH_PER_HOUR ?? 6),
  report: () => Number(process.env.RL_REPORT_PER_HOUR ?? 20),
  login: () => Number(process.env.RL_LOGIN_PER_HOUR ?? 10),
  daily: () => Number(process.env.DAILY_GENERATION_CAP ?? 500),
};

type KV = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
};

async function kv(): Promise<KV | undefined> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return (env as { RATE_LIMIT_KV?: KV }).RATE_LIMIT_KV;
  } catch {
    return undefined;
  }
}

export async function clientId(request: Request) {
  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`kalko:${ip}`));
  return [...new Uint8Array(digest).slice(0, 12)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Diagnóstico para el admin, sin valores: si el binding existe, qué header
 * de IP llega y si KV devuelve de inmediato lo recién escrito.
 */
export async function diagnose(request: Request) {
  const store = await kv();
  const ipHeader = request.headers.get("cf-connecting-ip")
    ? "cf-connecting-ip"
    : request.headers.get("x-forwarded-for")
      ? "x-forwarded-for"
      : "none";
  let readAfterWrite: boolean | null = null;
  if (store) {
    const key = `diag:${crypto.randomUUID()}`;
    await store.put(key, "1", { expirationTtl: 60 });
    readAfterWrite = (await store.get(key)) === "1";
  }
  return { rateLimitKv: Boolean(store), ipHeader, readAfterWrite };
}

export type LimitResult = { ok: true } | { ok: false; message: string; retryAfter: number };

/**
 * Consume `cost` unidades del cupo por IP (por hora) y, para imágenes,
 * del tope global diario. Si falta el binding de KV deja pasar y lo loguea.
 */
export async function consume(request: Request, kind: Kind, cost = 1): Promise<LimitResult> {
  const store = await kv();
  if (!store) {
    console.warn("[kalko] RATE_LIMIT_KV no disponible; límite desactivado");
    return { ok: true };
  }

  const now = new Date();
  const hour = now.toISOString().slice(0, 13);
  const day = now.toISOString().slice(0, 10);
  const retryAfter = 3600 - (now.getUTCMinutes() * 60 + now.getUTCSeconds());

  const ipKey = `rl:${kind}:${await clientId(request)}:${hour}`;
  const dayKey = `rl:daily:${day}`;

  const [ipUsed, dayUsed] = await Promise.all([
    store.get(ipKey).then(Number),
    kind === "image" ? store.get(dayKey).then(Number) : Promise.resolve(0),
  ]);

  if (kind === "image" && dayUsed + cost > LIMITS.daily()) {
    return {
      ok: false,
      retryAfter: 86400 - (now.getUTCHours() * 3600 + now.getUTCMinutes() * 60),
      message: "El laboratorio llegó a su cupo de hoy. Vuelve mañana para abrir más portales.",
    };
  }
  if (ipUsed + cost > LIMITS[kind]()) {
    const minutes = Math.max(1, Math.ceil(retryAfter / 60));
    return {
      ok: false,
      retryAfter,
      message:
        kind === "image"
          ? `Abriste muchos portales seguidos. Podrás generar más stickers en ${minutes} min.`
          : kind === "login"
            ? `Demasiados intentos de ingreso. Intenta de nuevo en ${minutes} min.`
            : kind === "publish"
            ? `Ya publicaste varios stickers seguidos. Podrás publicar más en ${minutes} min.`
            : `Demasiadas consultas seguidas. Intenta de nuevo en ${minutes} min.`,
    };
  }

  await Promise.all([
    store.put(ipKey, String(ipUsed + cost), { expirationTtl: 3700 }),
    kind === "image" ? store.put(dayKey, String(dayUsed + cost), { expirationTtl: 172800 }) : null,
  ]);
  return { ok: true };
}

export function tooMany(result: Extract<LimitResult, { ok: false }>) {
  return Response.json(
    { error: result.message },
    { status: 429, headers: { "Retry-After": String(result.retryAfter) } },
  );
}
