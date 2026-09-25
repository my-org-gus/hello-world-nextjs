import { structured } from "@/lib/openai";
import { OPTIONS_SCHEMA, OPTIONS_SYSTEM, type StickerOption } from "@/lib/schemas";
import { badRequest, cleanText, errorResponse } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const idea = cleanText(body.idea);
    const summary = cleanText(body.summary);
    const hasReference = body.hasReference === true;
    const answers = Array.isArray(body.answers)
      ? body.answers.slice(0, 6).map((a: { question?: unknown; answer?: unknown }) => ({
          question: cleanText(a?.question, 200),
          answer: cleanText(a?.answer, 200),
        }))
      : [];
    if (!idea && !summary) return badRequest("Falta la idea del sticker");

    const text = [
      idea && `Idea original: ${idea}`,
      summary && `Lo que entendimos: ${summary}`,
      hasReference && "Hay una imagen de referencia que se enviará al modelo de imágenes.",
      "Respuestas:",
      ...answers.map((a) => `- ${a.question}: ${a.answer}`),
    ]
      .filter(Boolean)
      .join("\n");

    const result = await structured<{ options: StickerOption[] }>({
      system: OPTIONS_SYSTEM,
      text,
      schemaName: "sticker_options",
      schema: OPTIONS_SCHEMA,
    });
    return Response.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
