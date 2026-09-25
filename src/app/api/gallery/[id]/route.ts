import { getImage } from "@/lib/gallery";
import { errorResponse } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!/^[a-f0-9]{16}$/.test(id)) return new Response("No encontrado", { status: 404 });
    const obj = await getImage(id);
    if (!obj) return new Response("No encontrado", { status: 404 });
    return new Response(obj.body, {
      headers: {
        "Content-Type": obj.httpMetadata?.contentType ?? "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
