"use client";

export type BorderWidth = "fino" | "medio" | "grueso";
export type BorderColor = "blanco" | "portal" | "holo";
export type Finish = { width: BorderWidth; color: BorderColor; cutLine: boolean };

export const DEFAULT_FINISH: Finish = { width: "medio", color: "blanco", cutLine: false };

const RADIUS: Record<BorderWidth, number> = { fino: 14, medio: 24, grueso: 36 };
const CUT_COLOR = [236, 0, 140]; // magenta de imprenta
const MARGIN = 10;

// Alfa del PNG original: bajo LOW es halo, sobre HIGH es sujeto; entre medio se suaviza.
const LOW = 70;
const HIGH = 170;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Distancia (en px) de cada píxel al sujeto, con chamfer 5x5 en dos pasadas.
 * Error ~2 % respecto de la distancia euclídea: alcanza para un borde redondo.
 */
function distanceField(mask: Uint8Array, w: number, h: number) {
  const INF = 1e9;
  const d = new Float32Array(w * h);
  for (let i = 0; i < d.length; i++) d[i] = mask[i] ? 0 : INF;
  const a = 1, b = Math.SQRT2, c = 2.2361; // 1, √2, √5
  // Vecinos ya visitados en la pasada hacia adelante (dx, dy, costo).
  const DX = [-1, 0, -1, 1, -2, -1, 1, 2];
  const DY = [0, -1, -1, -1, -1, -2, -2, -1];
  const K = [a, a, b, b, c, c, c, c];
  const n = DX.length;

  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      let v = d[i];
      if (v === 0) continue;
      for (let j = 0; j < n; j++) {
        const nx = x + DX[j], ny = y + DY[j];
        if (nx >= 0 && nx < w && ny >= 0) {
          const t = d[ny * w + nx] + K[j];
          if (t < v) v = t;
        }
      }
      d[i] = v;
    }
  for (let y = h - 1; y >= 0; y--)
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      let v = d[i];
      if (v === 0) continue;
      for (let j = 0; j < n; j++) {
        const nx = x - DX[j], ny = y - DY[j];
        if (nx >= 0 && nx < w && ny < h) {
          const t = d[ny * w + nx] + K[j];
          if (t < v) v = t;
        }
      }
      d[i] = v;
    }
  return d;
}

// El campo de distancias no depende del acabado: se calcula una vez por imagen.
const PAD = RADIUS.grueso + MARGIN;
type Prepared = { w: number; h: number; px: Uint8ClampedArray; dist: Float32Array };
const cache = new Map<string, Prepared>();

async function prepare(src: string): Promise<Prepared> {
  const cacheKey = src.startsWith("data:") ? `${src.length}:${src.slice(-80)}` : src;
  const hit = cache.get(cacheKey);
  if (hit) return hit;

  const img = await loadImage(src);
  const w = img.width + PAD * 2;
  const h = img.height + PAD * 2;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, PAD, PAD);
  const px = ctx.getImageData(0, 0, w, h).data;

  const mask = new Uint8Array(w * h);
  for (let i = 0; i < mask.length; i++) mask[i] = px[i * 4 + 3] >= LOW ? 1 : 0;
  const prepared = { w, h, px, dist: distanceField(mask, w, h) };

  cache.set(cacheKey, prepared);
  if (cache.size > 12) cache.delete(cache.keys().next().value!);
  return prepared;
}

/** Aplica troquel (borde, limpieza de halo y línea de corte) y devuelve un canvas. */
/** `src`: data URL o ruta de imagen (mismo origen). */
export async function dieCut(src: string, finish: Finish): Promise<HTMLCanvasElement> {
  const { w, h, px, dist } = await prepare(src);
  const r = RADIUS[finish.width];
  const cutAt = r - 5;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const out = ctx.createImageData(w, h);
  const o = out.data;
  const solid = finish.color === "portal" ? [157, 242, 46] : [255, 255, 255];
  const holo = finish.color === "holo";

  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const p = i * 4;
      const dd = dist[i];
      // Cobertura del borde con antialias en el contorno exterior.
      const border = Math.min(1, r + 0.5 - dd);
      if (border <= 0) continue;

      let cr: number, cg: number, cb: number;
      if (finish.cutLine && Math.abs(dd - cutAt) < 1.6 && (Math.floor(x / 10) + Math.floor(y / 10)) % 2 === 0) {
        cr = CUT_COLOR[0]; cg = CUT_COLOR[1]; cb = CUT_COLOR[2];
      } else if (holo) {
        // Pastel iridiscente en diagonal.
        const t = ((x / w) * 0.6 + (y / h) * 0.4) * Math.PI * 2;
        cr = 200 + 55 * Math.sin(t);
        cg = 205 + 50 * Math.sin(t + 2.1);
        cb = 215 + 40 * Math.sin(t + 4.2);
      } else {
        cr = solid[0]; cg = solid[1]; cb = solid[2];
      }

      // Sujeto limpio encima del borde: el halo semitransparente se descarta.
      const sa = px[p + 3];
      const subject = sa <= LOW ? 0 : sa >= HIGH ? 1 : (sa - LOW) / (HIGH - LOW);
      const inv = 1 - subject;
      o[p] = px[p] * subject + cr * inv;
      o[p + 1] = px[p + 1] * subject + cg * inv;
      o[p + 2] = px[p + 2] * subject + cb * inv;
      o[p + 3] = 255 * (border > subject ? border : subject);
    }

  ctx.putImageData(out, 0, 0);
  return canvas;
}

export function canvasToUrl(canvas: HTMLCanvasElement) {
  return new Promise<string>((resolve) =>
    canvas.toBlob((blob) => resolve(URL.createObjectURL(blob!)), "image/png"),
  );
}

export function slug(name: string) {
  return name.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function downloadUrl(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}

/**
 * Hoja A4 a 300 dpi (2480×3508 px). Con un solo sticker lo repite en una
 * grilla 2×3 (~9,5 cm cada uno); con hasta 4 distintos usa 2×2 (~10 cm).
 */
export async function a4Sheet(stickers: HTMLCanvasElement[]) {
  const W = 2480, H = 3508, cols = 2, margin = 110;
  const rows = stickers.length > 1 && stickers.length <= 4 ? 2 : 3;
  const cellW = (W - margin * 2) / cols;
  const cellH = (H - margin * 2) / rows;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  const items = stickers.length === 1 ? Array(cols * rows).fill(stickers[0]) : stickers.slice(0, cols * rows);
  items.forEach((s: HTMLCanvasElement, i: number) => {
    const size = Math.min(cellW, cellH) * 0.94;
    const scale = size / Math.max(s.width, s.height);
    const dw = s.width * scale, dh = s.height * scale;
    const cx = margin + (i % cols) * cellW + (cellW - dw) / 2;
    const cy = margin + Math.floor(i / cols) * cellH + (cellH - dh) / 2;
    ctx.drawImage(s, cx, cy, dw, dh);
  });

  ctx.fillStyle = "#6f9c80";
  ctx.font = "600 34px sans-serif";
  ctx.fillText("Kalko · hoja A4 a 300 dpi · recorta por el contorno", margin, H - 50);
  return canvas;
}

/**
 * Formato sticker de WhatsApp: WebP 512×512 y ≤ 100 KB, con margen para el
 * borde. Baja la calidad hasta entrar en el peso. Safari no codifica WebP en
 * canvas y devuelve PNG: en ese caso se comparte PNG.
 */
export async function whatsappSticker(sticker: HTMLCanvasElement, name: string): Promise<File> {
  const SIZE = 512, MARGIN = 16, MAX_BYTES = 100 * 1024;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  const scale = (SIZE - MARGIN * 2) / Math.max(sticker.width, sticker.height);
  const w = sticker.width * scale, h = sticker.height * scale;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(sticker, (SIZE - w) / 2, (SIZE - h) / 2, w, h);

  const encode = (q: number) =>
    new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/webp", q));
  let blob = await encode(0.9);
  for (let q = 0.8; blob.type === "image/webp" && blob.size > MAX_BYTES && q >= 0.3; q -= 0.1) blob = await encode(q);

  const ext = blob.type === "image/webp" ? "webp" : "png";
  return new File([blob], `kalko-${slug(name)}.${ext}`, { type: blob.type });
}

/** Comparte por el menú del sistema (WhatsApp, Telegram…). Devuelve false si no se puede. */
export async function shareFiles(files: File[], text: string) {
  if (!navigator.canShare?.({ files })) return false;
  try {
    await navigator.share({ files, text });
  } catch (err) {
    // El usuario cerró el menú: no es un error.
    if ((err as DOMException).name !== "AbortError") throw err;
  }
  return true;
}

/** Imagen liviana para publicar en la galería (WebP 768 px; PNG si el navegador no codifica WebP). */
export function canvasToPublishDataUrl(sticker: HTMLCanvasElement, max = 768) {
  const scale = Math.min(1, max / Math.max(sticker.width, sticker.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(sticker.width * scale);
  canvas.height = Math.round(sticker.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(sticker, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/webp", 0.86);
}
