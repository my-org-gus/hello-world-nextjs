export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const seconds = Math.min(Number(new URL(request.url).searchParams.get("s") ?? 25), 60);
  const start = Date.now();
  await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
  return Response.json({ requested: seconds, elapsedMs: Date.now() - start });
}
