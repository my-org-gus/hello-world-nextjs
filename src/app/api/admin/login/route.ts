import { adminConfigured, checkCredentials, clearSessionCookie, createSession } from "@/lib/admin";
import { consume, tooMany } from "@/lib/ratelimit";
import { BODY_LIMIT, cleanText, errorResponse, readJson } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    if (!adminConfigured()) return Response.json({ error: "El backoffice no está configurado." }, { status: 503 });
    const body = await readJson(request, BODY_LIMIT.small);
    const limit = await consume(request, "login");
    if (!limit.ok) return tooMany(limit);
    const ok = await checkCredentials(cleanText(body.user, 100), typeof body.password === "string" ? body.password : "");
    if (!ok) return Response.json({ error: "Usuario o contraseña incorrectos." }, { status: 401 });
    const session = await createSession();
    return Response.json({ ok: true }, { headers: { "Set-Cookie": session.cookie } });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE() {
  return Response.json({ ok: true }, { headers: { "Set-Cookie": clearSessionCookie } });
}
