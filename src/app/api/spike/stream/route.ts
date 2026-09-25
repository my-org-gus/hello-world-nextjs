export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const seconds = Math.min(Number(new URL(request.url).searchParams.get("s") ?? 30), 60);
  const encoder = new TextEncoder();
  const start = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      for (let t = 0; t <= seconds; t += 3) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ elapsedMs: Date.now() - start })}\n\n`));
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, elapsedMs: Date.now() - start })}\n\n`));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  });
}
