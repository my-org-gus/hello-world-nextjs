import { getImage, isGalleryId, statusById } from "@/lib/gallery";
import { errorResponse } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // Solo se sirven públicamente los stickers aprobados.
    if (!isGalleryId(id) || (await statusById(id)) !== "published") return new Response("No encontrado", { status: 404 });
    const obj = await getImage(id);
    if (!obj) return new Response("No encontrado", { status: 404 });
    return new Response(obj.body, {
      headers: {
        "Content-Type": obj.httpMetadata?.contentType ?? "image/webp",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
