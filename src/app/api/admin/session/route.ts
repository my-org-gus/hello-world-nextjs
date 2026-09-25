import { adminConfigured, isAdmin } from "@/lib/admin";
import { diagnose } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await isAdmin(request);
  return Response.json({
    configured: adminConfigured(),
    admin,
    ...(admin && { diagnostics: await diagnose(request) }),
  });
}
