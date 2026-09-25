import { UpstreamError } from "./openai";

export const MAX_IDEA_CHARS = 600;
// ~3 MB de base64: el cliente redimensiona a 1024 px antes de enviar.
export const MAX_IMAGE_DATA_URL = 4_000_000;

/** Tamaños máximos de body por tipo de ruta. */
export const BODY_LIMIT = {
  image: 4_500_000,
  publish: 2_200_000,
  small: 64_000,
} as const;

/** Error de validación propio: su mensaje sí se muestra al usuario. */
export class ClientError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function badRequest(message: string) {
  return Response.json({ error: message }, { status: 400 });
}

/**
 * Lee el body como JSON con tres defensas: rechaza pedidos cross-site
 * (CSRF de costo), exige `application/json` (fuerza el preflight CORS, que
 * falla porque no hay CORS) y corta al pasar `maxBytes` sin leer el resto.
 */
export async function readJson(request: Request, maxBytes: number): Promise<Record<string, unknown>> {
  if (request.headers.get("sec-fetch-site") === "cross-site") throw new ClientError(403, "Origen no permitido");
  const type = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!type.includes("application/json")) throw new ClientError(415, "Se espera JSON");
  if (Number(request.headers.get("content-length")) > maxBytes) throw tooLarge();
  if (!request.body) return {};

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw tooLarge();
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.byteLength;
  }
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

const tooLarge = () => new ClientError(413, "El pedido es demasiado grande");

export function cleanText(value: unknown, max = MAX_IDEA_CHARS) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** Recorta un texto para que su UTF-8 no pase de `maxBytes` (sin cortar un emoji). */
export function fitBytes(value: string, maxBytes: number) {
  const enc = new TextEncoder();
  if (enc.encode(value).byteLength <= maxBytes) return value;
  let out = "";
  let used = 0;
  for (const ch of value) {
    const n = enc.encode(ch).byteLength;
    if (used + n > maxBytes) break;
    out += ch;
    used += n;
  }
  return out;
}

type ImageType = "image/png" | "image/jpeg" | "image/webp";

function sniff(head: Uint8Array): ImageType | undefined {
  const at = (i: number, ...bytes: number[]) => bytes.every((b, j) => head[i + j] === b);
  if (at(0, 0x89, 0x50, 0x4e, 0x47)) return "image/png";
  if (at(0, 0xff, 0xd8, 0xff)) return "image/jpeg";
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return "image/webp";
  return undefined;
}

/**
 * Valida un data URL de imagen: tipo permitido, largo, base64 bien formado y
 * que los primeros bytes (magic bytes) coincidan con el tipo declarado.
 */
export function parseImage(value: unknown, allowed: ImageType[], maxLength: number) {
  if (typeof value !== "string" || !value) return undefined;
  if (value.length > maxLength) throw new ClientError(400, "La imagen es demasiado grande");
  const match = /^data:(image\/[a-z]+);base64,/.exec(value);
  const type = match?.[1] as ImageType | undefined;
  if (!match || !type || !allowed.includes(type)) throw new ClientError(400, "Formato de imagen no soportado");
  const b64 = value.slice(match[0].length);
  if (b64.length < 16 || !/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) throw new ClientError(400, "Imagen inválida");
  const head = Uint8Array.from(atob(b64.slice(0, 16)), (c) => c.charCodeAt(0));
  if (sniff(head) !== type) throw new ClientError(400, "Imagen inválida");
  return { dataUrl: value, type, b64 };
}

export function cleanImage(value: unknown) {
  return parseImage(value, ["image/png", "image/jpeg", "image/webp"], MAX_IMAGE_DATA_URL)?.dataUrl;
}

const GENERIC = "El portal se desestabilizó. Intenta de nuevo en unos segundos.";

/**
 * Traduce un error a una respuesta segura: los mensajes propios se muestran,
 * los de OpenAI nunca (solo se loguean status y code).
 */
export function errorResponse(err: unknown) {
  if (err instanceof ClientError) return Response.json({ error: err.message }, { status: err.status });
  if (err instanceof UpstreamError) {
    console.error("[kalko] openai", err.status, err.code ?? "-");
    if (err.status === 429) {
      return Response.json({ error: "El laboratorio está saturado. Intenta de nuevo en un minuto." }, { status: 429 });
    }
    return Response.json({ error: GENERIC }, { status: 502 });
  }
  const status = typeof err === "object" && err && "status" in err ? Number(err.status) : 500;
  console.error("[kalko]", status, err instanceof Error ? err.message : typeof err);
  return Response.json({ error: GENERIC }, { status: status >= 400 && status < 600 ? status : 500 });
}
