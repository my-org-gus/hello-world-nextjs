import { isAdmin, unauthorized } from "@/lib/admin";
import { getImage, isGalleryId } from "@/lib/gallery";
import { errorResponse } from "@/lib/validate";

export const dynamic = "force-dynamic";

/** Imagen de cualquier estado (pendiente u oculta), solo para el admin. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin(request))) return unauthorized();
  try {
    const { id } = await params;
    const obj = isGalleryId(id) ? await getImage(id) : null;
    if (!obj) return new Response("No encontrado", { status: 404 });
    return new Response(obj.body, {
      headers: { "Content-Type": obj.httpMetadata?.contentType ?? "image/webp", "Cache-Control": "private, no-store" },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
