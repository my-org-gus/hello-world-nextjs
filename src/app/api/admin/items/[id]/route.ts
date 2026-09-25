import { isAdmin, unauthorized } from "@/lib/admin";
import { deleteItem, isGalleryId, moveItem } from "@/lib/gallery";
import { BODY_LIMIT, errorResponse, readJson } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin(request))) return unauthorized();
  try {
    const { id } = await params;
    if (!isGalleryId(id)) return Response.json({ error: "No encontrado" }, { status: 404 });
    const { action } = (await readJson(request, BODY_LIMIT.small)) as { action?: string };
    if (action === "delete") {
      await deleteItem(id);
      return Response.json({ ok: true });
    }
    const to = action === "approve" || action === "restore" ? "published" : action === "hide" ? "hidden" : undefined;
    if (!to) return Response.json({ error: "Acción inválida" }, { status: 400 });
    const ok = await moveItem(id, to);
    return ok ? Response.json({ ok: true }) : Response.json({ error: "No encontrado" }, { status: 404 });
  } catch (err) {
    return errorResponse(err);
  }
}
