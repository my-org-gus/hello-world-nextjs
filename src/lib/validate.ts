export const MAX_IDEA_CHARS = 600;
// ~3 MB de base64: el cliente redimensiona a 1024 px antes de enviar.
export const MAX_IMAGE_DATA_URL = 4_000_000;

export function badRequest(message: string) {
  return Response.json({ error: message }, { status: 400 });
}

export function cleanText(value: unknown, max = MAX_IDEA_CHARS) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function cleanImage(value: unknown) {
  if (typeof value !== "string" || !value) return undefined;
  if (value.length > MAX_IMAGE_DATA_URL) throw new Error("La imagen es demasiado grande");
  if (!/^data:image\/(png|jpeg|webp);base64,/.test(value)) throw new Error("Formato de imagen no soportado");
  return value;
}

export function errorResponse(err: unknown) {
  const status = typeof err === "object" && err && "status" in err ? Number(err.status) : 500;
  const message = err instanceof Error ? err.message : "Error inesperado";
  console.error("[kalko]", status, message);
  // El texto de OpenAI puede ser técnico; al cliente le llega un mensaje corto.
  const safe = status === 400 ? message : "El portal se desestabilizó. Intenta de nuevo en unos segundos.";
  return Response.json({ error: safe }, { status: status >= 400 && status < 600 ? status : 500 });
}
