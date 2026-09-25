import { getCloudflareContext } from "@opennextjs/cloudflare";

// Metadatos en KV (la lista devuelve metadata sin leer cada clave) e
// imágenes en R2. Claves de listado ordenadas de más nueva a más vieja.

export type GalleryItem = {
  id: string;
  name: string;
  style: string;
  idea: string;
  holo: boolean;
  ts: number;
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

export const HIDE_AFTER_REPORTS = 3;
const MAX_TS = 9_999_999_999_999;

export async function stores() {
  const { env } = await getCloudflareContext({ async: true });
  const e = env as { GALLERY_KV?: KV; GALLERY_R2?: R2 };
  if (!e.GALLERY_KV || !e.GALLERY_R2) throw Object.assign(new Error("Galería no configurada"), { status: 503 });
  return { kv: e.GALLERY_KV, r2: e.GALLERY_R2 };
}

const listKey = (ts: number, id: string) => `g:${String(MAX_TS - ts).padStart(13, "0")}:${id}`;

export async function saveItem(item: GalleryItem, image: Uint8Array, contentType: string) {
  const { kv, r2 } = await stores();
  await r2.put(`img/${item.id}`, image, { httpMetadata: { contentType } });
  const key = listKey(item.ts, item.id);
  await kv.put(key, "1", { metadata: item });
  await kv.put(`idx:${item.id}`, key);
}

export async function listItems(cursor?: string, limit = 24) {
  const { kv } = await stores();
  const res = await kv.list({ prefix: "g:", limit, cursor });
  return {
    items: res.keys.map((k) => k.metadata as GalleryItem).filter(Boolean),
    cursor: res.list_complete ? undefined : res.cursor,
  };
}

export async function getImage(id: string) {
  const { r2 } = await stores();
  return r2.get(`img/${id}`);
}

/** Suma un reporte; al llegar al umbral la saca del listado (la imagen queda para revisión). */
export async function report(id: string, reporter: string) {
  const { kv } = await stores();
  const listing = await kv.get(`idx:${id}`);
  if (!listing) return { hidden: true };
  const seenKey = `rp:${id}:${reporter}`;
  if (await kv.get(seenKey)) return { hidden: false };
  await kv.put(seenKey, "1", { expirationTtl: 60 * 60 * 24 * 30 });
  const count = Number((await kv.get(`rc:${id}`)) ?? 0) + 1;
  await kv.put(`rc:${id}`, String(count));
  if (count >= HIDE_AFTER_REPORTS) {
    await kv.delete(listing);
    await kv.put(`hidden:${id}`, listing);
    return { hidden: true };
  }
  return { hidden: false };
}
