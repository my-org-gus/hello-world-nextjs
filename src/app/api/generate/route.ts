import { streamImage } from "@/lib/openai";
import { badRequest, cleanImage, cleanText, errorResponse } from "@/lib/validate";

export const dynamic = "force-dynamic";

// Webflow Cloud corta a los 20 s una respuesta sin bytes: se reenvía el
// stream de OpenAI y se agrega un keep-alive por si tarda la primera parcial.
const KEEPALIVE_MS = 4000;

export async function POST(request: Request) {
  let upstream: ReadableStream<Uint8Array>;
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const prompt = cleanText(body.prompt, 2000);
    const reference = cleanImage(body.reference);
    if (!prompt) return badRequest("Falta el prompt");
    upstream = await streamImage({ prompt, referenceDataUrl: reference });
  } catch (err) {
    return errorResponse(err);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: object) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      const ping = setInterval(() => controller.enqueue(encoder.encode(": ping\n\n")), KEEPALIVE_MS);
      const reader = upstream.getReader();
      let buffer = "";
      let completed = false;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let idx: number;
          while ((idx = buffer.indexOf("\n\n")) !== -1) {
            const raw = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);
            const data = raw
              .split("\n")
              .filter((l) => l.startsWith("data:"))
              .map((l) => l.slice(5).trim())
              .join("");
            if (!data || data === "[DONE]") continue;
            const evt = JSON.parse(data) as { type?: string; b64_json?: string; error?: { message?: string } };
            if (evt.type?.endsWith(".partial_image") && evt.b64_json) {
              send({ type: "partial", b64: evt.b64_json });
            } else if (evt.type?.endsWith(".completed") && evt.b64_json) {
              completed = true;
              send({ type: "done", b64: evt.b64_json });
            } else if (evt.type === "error" || evt.error) {
              console.error("[kalko] image stream error", evt.error?.message);
              send({ type: "error", message: "Esta dimensión colapsó. Prueba regenerarla." });
            }
          }
        }
        if (!completed) send({ type: "error", message: "La imagen no llegó completa. Prueba regenerarla." });
      } catch (err) {
        console.error("[kalko] stream", err instanceof Error ? err.message : err);
        send({ type: "error", message: "Se cortó la conexión con el portal." });
      } finally {
        clearInterval(ping);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform" },
  });
}
