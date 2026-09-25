export type Question = { id: string; question: string; options: string[] };
export type Interview = { summary: string; subject: string; questions: Question[] };
export type StickerOption = { name: string; style: string; prompt: string };
export type Answer = { question: string; answer: string };

export const INTERVIEW_SYSTEM = `Eres el asistente de Kalko, un laboratorio que diseña calcomanías (stickers troquelados).
Recibes una idea en texto, una imagen de referencia, o ambas.
1. Resume en una frase qué quiere la persona (campo "summary"), en español neutro, tuteando.
2. Define el sujeto principal del sticker en pocas palabras (campo "subject").
3. Formula entre 2 y 4 preguntas cortas que realmente cambien el diseño: estilo de ilustración, paleta, si lleva texto y cuál, pose/expresión, nivel de detalle. No preguntes lo que ya está claro.
Cada pregunta tiene entre 3 y 4 opciones concretas y breves (máximo 5 palabras cada una). La primera opción es tu recomendación. Todas las opciones son cerradas: nunca ofrezcas "otro", "a tu elección" ni nada que requiera escribir. Si preguntas por texto, propone frases concretas entre comillas y una opción "Sin texto".
Usa ids cortos en snake_case. Nunca pidas datos personales.`;

export const INTERVIEW_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "subject", "questions"],
  properties: {
    summary: { type: "string" },
    subject: { type: "string" },
    questions: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "question", "options"],
        properties: {
          id: { type: "string" },
          question: { type: "string" },
          options: { type: "array", minItems: 3, maxItems: 4, items: { type: "string" } },
        },
      },
    },
  },
};

export const OPTIONS_SYSTEM = `Eres el director de arte de Kalko. Con la idea y las respuestas de la persona, diseña 4 variantes de sticker claramente distintas entre sí (composición, estilo o tono), todas fieles a lo que eligió.
Para cada variante:
- "name": nombre corto y con gracia en español (2-4 palabras).
- "style": descripción del estilo en español (máximo 8 palabras).
- "prompt": prompt en inglés para un modelo de imágenes. Siempre debe pedir: a single die-cut sticker, one isolated subject centered, bold clean outlines, flat vibrant colors, thick crisp white sticker border with hard edges, no glow, no drop shadow, no halo, transparent background, no mockup, no extra objects. Si lleva texto, escríbelo literal entre comillas y pide tipografía legible.
Si hay imagen de referencia, los prompts deben decir que se base en ella (keep the subject recognizable from the reference image).`;

export const OPTIONS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["options"],
  properties: {
    options: {
      type: "array",
      minItems: 4,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "style", "prompt"],
        properties: {
          name: { type: "string" },
          style: { type: "string" },
          prompt: { type: "string" },
        },
      },
    },
  },
};

export const STICKER_RULES =
  "A single die-cut sticker, one isolated subject centered, bold clean outlines, flat vibrant colors, thick crisp white sticker border with hard edges, no glow, no drop shadow, no halo, transparent background, no mockup, no extra objects.";

/** Prompt de edición: cambia solo lo pedido y conserva el resto del sticker. */
export function refinePrompt(instruction: string) {
  return `Edit the provided sticker image. Apply only this change requested by the user (in Spanish): "${instruction}". Keep the same character, pose, composition and illustration style unless the change asks otherwise. ${STICKER_RULES}`;
}

/**
 * Prompts de "Pruébala": el servidor los arma para que el endpoint no sea
 * un generador libre. `object` es lo que el usuario dice dónde la pega.
 */
export function mockupPrompt(object: string, fromPhoto: boolean) {
  const target = object || "the object";
  return fromPhoto
    ? `Photorealistic edit of the user's photo of their ${target} (described in Spanish). A die-cut vinyl sticker has been roughly placed on it. Make the sticker look physically applied to the surface: match the photo's lighting, perspective and surface curvature, add a subtle vinyl sheen and a soft contact shadow. Do not move, resize or redesign the sticker and keep its artwork and white border exactly. Keep everything else in the photo identical.`
    : `Photorealistic lifestyle photo of a ${target} (described in Spanish) with the provided die-cut vinyl sticker applied on it, clearly visible and centered on the most natural surface. Keep the sticker artwork and its white border exactly as provided, following the surface curvature with a subtle vinyl sheen. Natural light, shallow depth of field, realistic setting, no other stickers, no added text.`;
}
