"use client";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "El portal no respondió. Intenta de nuevo.");
  return data;
}

export type StickerEvent =
  | { type: "partial" | "done"; b64: string }
  | { type: "error"; message: string }
  | { type: "queued" };

/** Pide un sticker por SSE y reporta cada evento (parciales y final). */
export async function streamSticker(
  body: { prompt?: string; reference?: string; instruction?: string },
  onEvent: (event: StickerEvent) => void,
  signal?: AbortSignal,
) {
  const res = await fetch(`${BASE}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    onEvent({ type: "error", message: data.error ?? "Esta dimensión no abrió." });
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const chunk = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const data = chunk
        .split("\n")
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).trim())
        .join("");
      if (data) onEvent(JSON.parse(data) as StickerEvent);
    }
  }
}

/** Redimensiona a 1024 px de lado mayor para no subir fotos pesadas. */
export async function resizeImage(file: File, max = 1024): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const type = file.type === "image/png" || file.type === "image/webp" ? "image/png" : "image/jpeg";
  return canvas.toDataURL(type, 0.9);
}

