import { adminConfigured, isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return Response.json({ configured: adminConfigured(), admin: await isAdmin(request) });
}
