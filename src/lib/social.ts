// Redes de Kalko: se usan en el home y en los textos al compartir.
export const INSTAGRAM_URL = "https://www.instagram.com/kalko_ai";
export const INSTAGRAM_HANDLE = "@kalko_ai";

/** Texto que acompaña los archivos compartidos (WhatsApp, historias, Pruébala). */
export const shareText = (lead = "Hecho en Kalko") =>
  `${lead} · kalko.webflow.io · Síguenos en Instagram: ${INSTAGRAM_HANDLE}`;
