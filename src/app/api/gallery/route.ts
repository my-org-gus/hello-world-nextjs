import { listItems, saveItem, type GalleryItem } from "@/lib/gallery";
import { moderate } from "@/lib/openai";
import { consume, tooMany } from "@/lib/ratelimit";
import { badRequest, cleanText, errorResponse } from "@/lib/validate";

export const dynamic = "force-dynamic";

const MAX_IMAGE = 2_000_000; // data URL, ~1,5 MB de imagen

export async function GET(request: Request) {
  try {
    const cursor = new URL(request.url).searchParams.get("cursor") ?? undefined;
    return Response.json(await listItems(cursor), { headers: { "Cache-Control": "public, max-age=20" } });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    if (body.consent !== true) return badRequest("Confirma que el sticker se puede publicar");
    const image = typeof body.image === "string" ? body.image : "";
    const match = /^data:(image\/(?:webp|png));base64,(.+)$/.exec(image);
    if (!match || image.length > MAX_IMAGE) return badRequest("Imagen inválida o demasiado grande");
    const name = cleanText(body.name, 60) || "Sticker sin nombre";
    const style = cleanText(body.style, 80);
    const idea = cleanText(body.idea, 200);

    const limit = await consume(request, "publish");
    if (!limit.ok) return tooMany(limit);

    const verdict = await moderate([name, style, idea].filter(Boolean).join("\n"), image);
    if (verdict.flagged) {
      console.warn("[kalko] publicación rechazada por moderación", verdict.categories.join(","));
      return Response.json(
        { error: "Este sticker no pasó la moderación, así que no lo publicamos. Puedes descargarlo igual." },
        { status: 422 },
      );
    }

    const item: GalleryItem = {
      id: crypto.randomUUID().replace(/-/g, "").slice(0, 16),
      name,
      style,
      idea,
      holo: body.holo === true,
      ts: Date.now(),
    };
    const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
    await saveItem(item, bytes, match[1]);
    return Response.json({ item }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
