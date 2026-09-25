import { structured } from "@/lib/openai";
import { INTERVIEW_SCHEMA, INTERVIEW_SYSTEM, type Interview } from "@/lib/schemas";
import { badRequest, cleanImage, cleanText, errorResponse } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const idea = cleanText(body.idea);
    const image = cleanImage(body.image);
    if (!idea && !image) return badRequest("Describe una idea o sube una imagen");

    const interview = await structured<Interview>({
      system: INTERVIEW_SYSTEM,
      text: idea ? `Idea: ${idea}` : "Sin texto: basa todo en la imagen de referencia.",
      imageDataUrl: image,
      schemaName: "interview",
      schema: INTERVIEW_SCHEMA,
    });
    return Response.json(interview);
  } catch (err) {
    return errorResponse(err);
  }
}
