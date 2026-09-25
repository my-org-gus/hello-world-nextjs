const API = "https://api.openai.com/v1";

export const CHAT_MODEL = () => process.env.OPENAI_CHAT_MODEL || "gpt-6-luna";
export const IMAGE_MODEL = () => process.env.OPENAI_IMAGE_MODEL || "gpt-image-2.5-flare";
export const IMAGE_QUALITY = () => process.env.OPENAI_IMAGE_QUALITY || "low";

function apiKey() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY no configurada");
  return key;
}

export class UpstreamError extends Error {
  constructor(
    public status: number,
    message: string,
    /** `error.code` de OpenAI; es lo único que se loguea (el mensaje puede traer datos de la key). */
    public code?: string,
  ) {
    super(message);
  }
}

// 429 que no se resuelven esperando: cupo o gasto agotado.
const EXHAUSTED = /insufficient_quota|spend_limit_exceeded|credit_balance_exhausted/;
export const isExhausted = (err: UpstreamError) => EXHAUSTED.test(`${err.code ?? ""} ${err.message}`);

async function upstreamError(res: Response) {
  const body = (await res.json().catch(() => ({}))) as { error?: { message?: string; code?: string; type?: string } };
  return new UpstreamError(
    res.status,
    body.error?.message ?? `OpenAI respondió ${res.status}`,
    body.error?.code ?? body.error?.type,
  );
}

type JsonSchema = Record<string, unknown>;

/** Llama a la Responses API y devuelve el JSON que cumple `schema`. */
export async function structured<T>(opts: {
  system: string;
  text: string;
  imageDataUrl?: string;
  schemaName: string;
  schema: JsonSchema;
}): Promise<T> {
  const content: Record<string, unknown>[] = [{ type: "input_text", text: opts.text }];
  if (opts.imageDataUrl) content.push({ type: "input_image", image_url: opts.imageDataUrl });

  const res = await fetch(`${API}/responses`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: CHAT_MODEL(),
      instructions: opts.system,
      input: [{ role: "user", content }],
      text: { format: { type: "json_schema", name: opts.schemaName, schema: opts.schema, strict: true } },
    }),
  });
  if (!res.ok) throw await upstreamError(res);

  const data = (await res.json()) as {
    output_text?: string;
    output?: { type: string; content?: { type: string; text?: string }[] }[];
  };
  const text =
    data.output_text ??
    data.output
      ?.flatMap((o) => o.content ?? [])
      .find((c) => c.type === "output_text")?.text;
  if (!text) throw new UpstreamError(502, "Respuesta vacía del modelo");
  return JSON.parse(text) as T;
}

function dataUrlToBlob(dataUrl: string) {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(dataUrl);
  if (!match) throw new UpstreamError(400, "Imagen inválida");
  const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: match[1] });
}

/**
 * Pide una imagen con streaming. Si hay `referenceDataUrl` usa edición
 * (la imagen guía el resultado); si no, texto → imagen.
 * Devuelve el body SSE de OpenAI tal cual.
 */
export async function streamImage(opts: { prompt: string; referenceDataUrl?: string }) {
  const common = {
    model: IMAGE_MODEL(),
    prompt: opts.prompt,
    size: "1024x1024",
    quality: IMAGE_QUALITY(),
    background: "transparent",
    output_format: "png",
    stream: "true",
    partial_images: "2",
  };

  let res: Response;
  if (opts.referenceDataUrl) {
    const form = new FormData();
    for (const [k, v] of Object.entries(common)) form.append(k, v);
    form.append("image[]", dataUrlToBlob(opts.referenceDataUrl), "reference.png");
    res = await fetch(`${API}/images/edits`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey()}` },
      body: form,
    });
  } else {
    res = await fetch(`${API}/images/generations`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...common, stream: true, partial_images: 2 }),
    });
  }
  if (!res.ok || !res.body) throw await upstreamError(res);
  return res.body;
}

/** Moderación gratuita de OpenAI sobre texto + imagen. Devuelve las categorías marcadas. */
export async function moderate(text: string, imageDataUrl: string) {
  const res = await fetch(`${API}/moderations`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_MODERATION_MODEL || "omni-moderation-latest",
      input: [
        { type: "text", text },
        { type: "image_url", image_url: { url: imageDataUrl } },
      ],
    }),
  });
  if (!res.ok) throw await upstreamError(res);
  const data = (await res.json()) as { results: { flagged: boolean; categories: Record<string, boolean> }[] };
  const r = data.results[0];
  return { flagged: r.flagged, categories: Object.keys(r.categories).filter((k) => r.categories[k]) };
}
