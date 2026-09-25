import { getCloudflareContext } from "@opennextjs/cloudflare";
import { fitBytes } from "./validate";

// Metadatos en KV (la lista devuelve metadata sin leer cada clave) e
// imágenes en R2. Cada sticker vive en una lista según su estado, con
// claves ordenadas de más nueva a más vieja:
//   p:<ts invertido>:<id>  pendiente de aprobación
//   g:<ts invertido>:<id>  publicado en la galería
//   h:<ts invertido>:<id>  oculto (reportado o por el admin)
// `idx:<id>` apunta a la clave actual del sticker.

export type GalleryStatus = "pending" | "published" | "hidden";

export type GalleryItem = {
  id: string;
  name: string;
  style: string;
  idea: string;
  holo: boolean;
  ts: number;
  /** Muestra importada desde el home (no la publicó un usuario). */
  example?: boolean;
  reports?: number;
};

type KVList = {
  keys: { name: string; metadata?: unknown }[];
  list_complete: boolean;
  cursor?: string;
};
type KV = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { metadata?: unknown; expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
  list(opts: { prefix: string; limit?: number; cursor?: string }): Promise<KVList>;
};
type R2 = {
  put(key: string, value: ArrayBuffer | Uint8Array, opts?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  get(key: string): Promise<{ body: ReadableStream; httpMetadata?: { contentType?: string } } | null>;
  delete(key: string): Promise<void>;
};

// Alto a propósito: con pocas IPs se podría vaciar la galería. Las muestras
// del home nunca se ocultan solas; quedan marcadas para que decida el admin.
export const HIDE_AFTER_REPORTS = 5;
const MAX_TS = 9_999_999_999_999;
const PREFIX: Record<GalleryStatus, string> = { pending: "p:", published: "g:", hidden: "h:" };

export const isGalleryId = (id: string) => /^[a-f0-9]{16}$/.test(id);

export async function stores() {
  const { env } = await getCloudflareContext({ async: true });
  const e = env as { GALLERY_KV?: KV; GALLERY_R2?: R2 };
  if (!e.GALLERY_KV || !e.GALLERY_R2) throw Object.assign(new Error("Galería no configurada"), { status: 503 });
  return { kv: e.GALLERY_KV, r2: e.GALLERY_R2 };
}

const listKey = (status: GalleryStatus, ts: number, id: string) =>
  `${PREFIX[status]}${String(MAX_TS - ts).padStart(13, "0")}:${id}`;

const statusOf = (key: string): GalleryStatus =>
  key.startsWith("g:") ? "published" : key.startsWith("h:") ? "hidden" : "pending";

export async function statusById(id: string) {
  const { kv } = await stores();
  const key = await kv.get(`idx:${id}`);
  return key ? statusOf(key) : undefined;
}

// KV admite 1024 bytes de metadata por clave: se recorta por bytes, no por caracteres.
function fitItem(item: GalleryItem): GalleryItem {
  return { ...item, name: fitBytes(item.name, 120), style: fitBytes(item.style, 200), idea: fitBytes(item.idea, 380) };
}

export async function saveItem(raw: GalleryItem, image: Uint8Array, contentType: string, status: GalleryStatus) {
  const item = fitItem(raw);
  const { kv, r2 } = await stores();
  await r2.put(`img/${item.id}`, image, { httpMetadata: { contentType } });
  const key = listKey(status, item.ts, item.id);
  await kv.put(key, "1", { metadata: item });
  await kv.put(`idx:${item.id}`, key);
}

export async function listItems(status: GalleryStatus = "published", cursor?: string, limit = 24) {
  const { kv } = await stores();
  const res = await kv.list({ prefix: PREFIX[status], limit, cursor });
  return {
    items: res.keys.map((k) => k.metadata as GalleryItem).filter(Boolean),
    cursor: res.list_complete ? undefined : res.cursor,
  };
}

export async function getImage(id: string) {
  const { r2 } = await stores();
  return r2.get(`img/${id}`);
}

/** Lee la metadata actual de un sticker (buscando su clave en la lista). */
async function readItem(kv: KV, key: string): Promise<GalleryItem | undefined> {
  const res = await kv.list({ prefix: key, limit: 1 });
  return res.keys[0]?.metadata as GalleryItem | undefined;
}

/** Cambia el estado de un sticker moviéndolo de lista. */
export async function moveItem(id: string, to: GalleryStatus) {
  const { kv } = await stores();
  const from = await kv.get(`idx:${id}`);
  if (!from) return false;
  const item = await readItem(kv, from);
  if (!item) return false;
  if (statusOf(from) === to) return true;
  const next = listKey(to, item.ts, id);
  if (to === "published") item.reports = 0;
  await kv.put(next, "1", { metadata: item });
  await kv.put(`idx:${id}`, next);
  await kv.delete(from);
  if (to === "published") await kv.delete(`rc:${id}`);
  return true;
}

/** Borra el sticker por completo (imagen y metadatos). */
export async function deleteItem(id: string) {
  const { kv, r2 } = await stores();
  const key = await kv.get(`idx:${id}`);
  if (key) await kv.delete(key);
  await Promise.all([kv.delete(`idx:${id}`), kv.delete(`rc:${id}`), r2.delete(`img/${id}`)]);
}

/** Suma un reporte; al llegar al umbral lo oculta para que el admin lo revise. */
export async function report(id: string, reporter: string) {
  const { kv } = await stores();
  const key = await kv.get(`idx:${id}`);
  if (!key || statusOf(key) !== "published") return { hidden: true };
  const seenKey = `rp:${id}:${reporter}`;
  if (await kv.get(seenKey)) return { hidden: false };
  await kv.put(seenKey, "1", { expirationTtl: 60 * 60 * 24 * 30 });
  const count = Number((await kv.get(`rc:${id}`)) ?? 0) + 1;
  await kv.put(`rc:${id}`, String(count));
  const item = await readItem(kv, key);
  if (item) await kv.put(key, "1", { metadata: { ...item, reports: count } });
  if (count >= HIDE_AFTER_REPORTS && !item?.example) {
    await moveItem(id, "hidden");
    return { hidden: true };
  }
  return { hidden: false };
}
