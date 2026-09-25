import { isGalleryId, like } from "@/lib/gallery";
import { clientId, consume, tooMany } from "@/lib/ratelimit";
import { BODY_LIMIT, errorResponse, readJson } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!isGalleryId(id)) return Response.json({ error: "No encontrado" }, { status: 404 });
    await readJson(request, BODY_LIMIT.small);
    const limit = await consume(request, "like");
    if (!limit.ok) return tooMany(limit);
    const result = await like(id, await clientId(request));
    return result ? Response.json(result) : Response.json({ error: "No encontrado" }, { status: 404 });
  } catch (err) {
    return errorResponse(err);
  }
}
