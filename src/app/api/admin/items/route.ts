import { isAdmin, unauthorized } from "@/lib/admin";
import { listItems, type GalleryStatus } from "@/lib/gallery";
import { errorResponse } from "@/lib/validate";

export const dynamic = "force-dynamic";

const STATUSES: GalleryStatus[] = ["pending", "published", "hidden"];

export async function GET(request: Request) {
  if (!(await isAdmin(request))) return unauthorized();
  try {
    const url = new URL(request.url);
    const status = (url.searchParams.get("status") ?? "pending") as GalleryStatus;
    if (!STATUSES.includes(status)) return Response.json({ error: "Estado inválido" }, { status: 400 });
    return Response.json(await listItems(status, url.searchParams.get("cursor") ?? undefined, 48), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
