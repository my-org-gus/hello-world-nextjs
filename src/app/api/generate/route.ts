import { isExhausted, streamImage, UpstreamError } from "@/lib/openai";
import { refinePrompt } from "@/lib/schemas";
import { consume, tooMany } from "@/lib/ratelimit";
import { badRequest, BODY_LIMIT, cleanImage, cleanText, errorResponse, readJson } from "@/lib/validate";

export const dynamic = "force-dynamic";

// Webflow Cloud corta a los 20 s una respuesta sin bytes: se reenvía el
// stream de OpenAI y se agrega un keep-alive por si tarda la primera parcial.
const KEEPALIVE_MS = 4000;
// OpenAI limita imágenes por minuto a nivel organización: ante un 429 se
// espera lo que indica y se reintenta, con el stream ya abierto.
const MAX_ATTEMPTS = 5;

function retryDelayMs(message: string) {
  const s = /try again in ([\d.]+)s/i.exec(message)?.[1];
  return Math.min(30, Math.max(3, Number(s ?? 12))) * 1000 + Math.random() * 1500;
}

export async function POST(request: Request) {
  let prompt: string;
  let reference: string | undefined;
  try {
    const body = await readJson(request, BODY_LIMIT.image);
    const instruction = cleanText(body.instruction, 300);
    reference = cleanImage(body.reference);
    if (instruction && !reference) return badRequest("Falta la imagen a refinar");
    prompt = instruction ? refinePrompt(instruction) : cleanText(body.prompt, 2000);
    if (!prompt) return badRequest("Falta el prompt");
    const limit = await consume(request, "image");
    if (!limit.ok) return tooMany(limit);
  } catch (err) {
    return errorResponse(err);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: object) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      const ping = setInterval(() => controller.enqueue(encoder.encode(": ping\n\n")), KEEPALIVE_MS);
      let buffer = "";
      let completed = false;

      try {
        let upstream: ReadableStream<Uint8Array> | undefined;
        for (let attempt = 1; !upstream; attempt++) {
          try {
            upstream = await streamImage({ prompt, referenceDataUrl: reference });
          } catch (err) {
            // Un 429 por gasto o cupo agotado no se arregla esperando.
            if (!(err instanceof UpstreamError) || err.status !== 429 || isExhausted(err) || attempt >= MAX_ATTEMPTS) {
              throw err;
            }
            send({ type: "queued" });
            await new Promise((r) => setTimeout(r, retryDelayMs(err.message)));
          }
        }
        const reader = upstream.getReader();
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
              console.error("[kalko] image stream error", (evt.error as { code?: string } | undefined)?.code ?? "-");
              send({ type: "error", message: "Esta dimensión colapsó. Prueba regenerarla." });
            }
          }
        }
        if (!completed) send({ type: "error", message: "La imagen no llegó completa. Prueba regenerarla." });
      } catch (err) {
        if (err instanceof UpstreamError) console.error("[kalko] stream openai", err.status, err.code ?? "-");
        else console.error("[kalko] stream", err instanceof Error ? err.message : err);
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
