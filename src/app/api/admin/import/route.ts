import { isAdmin, unauthorized } from "@/lib/admin";
import { saveItem, statusById, type GalleryItem } from "@/lib/gallery";
import { cleanText, errorResponse } from "@/lib/validate";

export const dynamic = "force-dynamic";

async function exampleId(slug: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`kalko-example:${slug}`));
  return [...new Uint8Array(d).slice(0, 8)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Importa una muestra del home ya troquelada. Idempotente por slug. */
export async function POST(request: Request) {
  if (!(await isAdmin(request))) return unauthorized();
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const slug = cleanText(body.slug, 60);
    const match = /^data:(image\/(?:webp|png));base64,(.+)$/.exec(typeof body.image === "string" ? body.image : "");
    if (!slug || !match) return Response.json({ error: "Datos inválidos" }, { status: 400 });
    const id = await exampleId(slug);
    if (await statusById(id)) return Response.json({ id, skipped: true });
    const item: GalleryItem = {
      id,
      name: cleanText(body.name, 60),
      style: cleanText(body.style, 80),
      idea: cleanText(body.idea, 200),
      holo: body.holo === true,
      ts: Date.now() - Number(body.order ?? 0) * 1000,
      example: true,
    };
    await saveItem(item, Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0)), match[1], "published");
    return Response.json({ id, skipped: false }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
