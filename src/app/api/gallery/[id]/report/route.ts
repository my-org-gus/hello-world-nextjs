import { report } from "@/lib/gallery";
import { clientId, consume, tooMany } from "@/lib/ratelimit";
import { errorResponse } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!/^[a-f0-9]{16}$/.test(id)) return Response.json({ error: "No encontrado" }, { status: 404 });
    const limit = await consume(request, "report");
    if (!limit.ok) return tooMany(limit);
    return Response.json(await report(id, await clientId(request)));
  } catch (err) {
    return errorResponse(err);
  }
}
