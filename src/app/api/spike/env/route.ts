import { getCloudflareContext } from "@opennextjs/cloudflare";

export const dynamic = "force-dynamic";

export async function GET() {
  let cfContext = false;
  try {
    const { env } = await getCloudflareContext({ async: true });
    cfContext = Boolean((env as Record<string, unknown>).OPENAI_API_KEY);
  } catch {
    cfContext = false;
  }
  return Response.json({ processEnv: Boolean(process.env.OPENAI_API_KEY), cfContext });
}
