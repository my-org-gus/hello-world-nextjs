"use client";

// Imágenes 9:16 (1080×1920) para historias de Instagram u otras redes.
// Se dibujan en el navegador a partir del sticker ya troquelado.

export type StoryTemplate = "portal" | "holo" | "ficha";

export const STORY_TEMPLATES: { id: StoryTemplate; label: string }[] = [
  { id: "portal", label: "Portal" },
  { id: "holo", label: "Holográfico" },
  { id: "ficha", label: "Ficha de laboratorio" },
];

const W = 1080;
const H = 1920;
const SITE = "kalko.webflow.io";

const C = {
  void: "#05130f",
  void2: "#0a2219",
  void3: "#12352a",
  ink: "#031009",
  portal: "#9df22e",
  portalDeep: "#2fbf5b",
  goo: "#dcff5c",
  plasma: "#3de0f2",
  text: "#eafbe3",
  soft: "#a9d2b6",
};

type Story = { sticker: HTMLCanvasElement; name: string; style?: string; dim?: string };

function fonts() {
  const css = getComputedStyle(document.documentElement);
  const pick = (v: string, fallback: string) => css.getPropertyValue(v).trim() || fallback;
  return {
    display: `${pick("--font-display", "system-ui")}, system-ui, sans-serif`,
    body: `${pick("--font-body", "system-ui")}, system-ui, sans-serif`,
    mono: `${pick("--font-mono", "monospace")}, monospace`,
  };
}

/** Semilla fija por nombre: el fondo no cambia entre vistas previas. */
function random(seed: string) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/** Parte un texto en líneas que entren en `max` px (como mucho `lines`). */
function wrap(ctx: CanvasRenderingContext2D, text: string, max: number, lines = 2) {
  const words = text.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width <= max || !line) line = next;
    else {
      out.push(line);
      line = w;
    }
  }
  if (line) out.push(line);
  if (out.length > lines) {
    const kept = out.slice(0, lines);
    kept[lines - 1] = `${kept[lines - 1].replace(/\s+\S*$/, "")}…`;
    return kept;
  }
  return out;
}

/** Texto de display con contorno grueso y sombra dura, como en la web. */
function title(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, fill: string, stroke = C.ink) {
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineWidth = size * 0.14;
  ctx.strokeStyle = stroke;
  ctx.fillStyle = stroke;
  ctx.fillText(text, x, y + size * 0.1);
  ctx.strokeText(text, x, y + size * 0.1);
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawSticker(ctx: CanvasRenderingContext2D, s: HTMLCanvasElement, cx: number, cy: number, size: number, angle = 0) {
  const scale = size / Math.max(s.width, s.height);
  const w = s.width * scale;
  const h = s.height * scale;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.shadowColor = "rgb(0 0 0 / 0.45)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 26;
  ctx.drawImage(s, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function portal(ctx: CanvasRenderingContext2D, { sticker, name, style }: Story) {
  const f = fonts();
  const rnd = random(name);
  ctx.fillStyle = C.void;
  ctx.fillRect(0, 0, W, H);
  const bg = ctx.createRadialGradient(W / 2, 860, 60, W / 2, 860, 1100);
  bg.addColorStop(0, "rgb(157 242 46 / 0.35)");
  bg.addColorStop(0.45, "rgb(47 191 91 / 0.12)");
  bg.addColorStop(1, "rgb(5 19 15 / 0)");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Estrellas
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = `rgb(234 251 227 / ${0.15 + rnd() * 0.5})`;
    ctx.beginPath();
    ctx.arc(rnd() * W, rnd() * H, 1 + rnd() * 2.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Anillo del portal: espiral de trazos verdes alrededor del sticker
  ctx.save();
  ctx.translate(W / 2, 860);
  for (let i = 0; i < 26; i++) {
    const r = 330 + i * 9 + rnd() * 14;
    ctx.strokeStyle = i % 3 ? `rgb(157 242 46 / ${0.55 - i * 0.018})` : `rgb(220 255 92 / ${0.6 - i * 0.02})`;
    ctx.lineWidth = 5 + rnd() * 7;
    ctx.beginPath();
    const start = rnd() * Math.PI * 2;
    ctx.arc(0, 0, r, start, start + Math.PI * (1.1 + rnd() * 0.8));
    ctx.stroke();
  }
  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, 340);
  core.addColorStop(0, "rgb(220 255 92 / 0.9)");
  core.addColorStop(0.55, "rgb(157 242 46 / 0.75)");
  core.addColorStop(1, "rgb(47 191 91 / 0.2)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(0, 0, 340, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  drawSticker(ctx, sticker, W / 2, 860, 820);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = `44px ${f.display}`;
  title(ctx, "Kalko", W / 2, 190, 44, C.portal);
  ctx.font = `600 30px ${f.body}`;
  ctx.fillStyle = C.soft;
  ctx.fillText("recién salido del portal", W / 2, 245);

  ctx.font = `96px ${f.display}`;
  const lines = wrap(ctx, name, W - 160);
  lines.forEach((l, i) => title(ctx, l, W / 2, 1450 + i * 108, 96, C.text));
  if (style) {
    ctx.font = `500 36px ${f.body}`;
    ctx.fillStyle = C.soft;
    ctx.fillText(wrap(ctx, style, W - 200, 1)[0], W / 2, 1450 + lines.length * 108 + 20);
  }
  footer(ctx, f, C.text, "rgb(157 242 46 / 0.16)", C.portal);
}

function holo(ctx: CanvasRenderingContext2D, { sticker, name }: Story) {
  const f = fonts();
  const rnd = random(`holo:${name}`);
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#ff9ad5");
  g.addColorStop(0.3, "#8fe9ff");
  g.addColorStop(0.58, "#e4ff7a");
  g.addColorStop(0.85, "#c9a2ff");
  g.addColorStop(1, "#ff9ad5");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Destellos
  for (let i = 0; i < 26; i++) {
    const x = rnd() * W;
    const y = rnd() * H;
    const s = 10 + rnd() * 26;
    ctx.fillStyle = "rgb(255 255 255 / 0.75)";
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.quadraticCurveTo(x, y, x + s, y);
    ctx.quadraticCurveTo(x, y, x, y + s);
    ctx.quadraticCurveTo(x, y, x - s, y);
    ctx.quadraticCurveTo(x, y, x, y - s);
    ctx.fill();
  }
  // Banda de brillo diagonal
  const shine = ctx.createLinearGradient(0, 500, W, 1300);
  shine.addColorStop(0.35, "rgb(255 255 255 / 0)");
  shine.addColorStop(0.5, "rgb(255 255 255 / 0.4)");
  shine.addColorStop(0.65, "rgb(255 255 255 / 0)");
  ctx.fillStyle = shine;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center";
  ctx.font = `92px ${f.display}`;
  title(ctx, "¡Mi nuevo", W / 2, 250, 92, "#ffffff");
  title(ctx, "sticker!", W / 2, 360, 92, "#ffffff");

  drawSticker(ctx, sticker, W / 2, 960, 860, -0.07);

  // Nombre en una etiqueta
  let labelSize = 64;
  ctx.font = `${labelSize}px ${f.display}`;
  while (labelSize > 40 && ctx.measureText(name).width > W - 240) {
    labelSize -= 4;
    ctx.font = `${labelSize}px ${f.display}`;
  }
  const label = wrap(ctx, name, W - 240, 1)[0];
  const lw = Math.min(W - 120, ctx.measureText(label).width + 110);
  ctx.save();
  ctx.translate(W / 2, 1520);
  ctx.rotate(0.03);
  ctx.fillStyle = C.ink;
  roundRect(ctx, -lw / 2, -60 + 12, lw, 120, 60);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 6;
  roundRect(ctx, -lw / 2, -60, lw, 120, 60);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = C.ink;
  ctx.textBaseline = "middle";
  ctx.fillText(label, 0, 4);
  ctx.restore();
  ctx.textBaseline = "alphabetic";
  footer(ctx, f, C.ink, "rgb(255 255 255 / 0.75)", C.ink);
}

function ficha(ctx: CanvasRenderingContext2D, { sticker, name, style, dim }: Story) {
  const f = fonts();
  ctx.fillStyle = "#e6f7dd";
  ctx.fillRect(0, 0, W, H);
  // Papel cuadriculado
  ctx.strokeStyle = "rgb(47 191 91 / 0.18)";
  ctx.lineWidth = 2;
  for (let x = 0; x <= W; x += 54) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y <= H; y += 54) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // Encabezado
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, 0, W, 170);
  ctx.textAlign = "left";
  ctx.font = `700 34px ${f.mono}`;
  ctx.fillStyle = C.portal;
  ctx.fillText(`ESPÉCIMEN ${dim ?? "DIM-01"}`, 70, 100);
  ctx.textAlign = "right";
  ctx.fillStyle = C.soft;
  ctx.fillText("KALKO LAB", W - 70, 100);

  // Ventana del espécimen
  const top = 240;
  const size = W - 140;
  const winH = 820;
  ctx.fillStyle = C.void;
  roundRect(ctx, 70, top, size, winH, 36);
  ctx.fill();
  const glow = ctx.createRadialGradient(W / 2, top + winH / 2, 20, W / 2, top + winH / 2, winH / 1.4);
  glow.addColorStop(0, "rgb(157 242 46 / 0.32)");
  glow.addColorStop(1, "rgb(157 242 46 / 0)");
  ctx.fillStyle = glow;
  roundRect(ctx, 70, top, size, winH, 36);
  ctx.fill();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 8;
  roundRect(ctx, 70, top, size, winH, 36);
  ctx.stroke();
  drawSticker(ctx, sticker, W / 2, top + winH / 2, winH - 90);
  stamp(ctx, f, W - 190, top + winH - 30);

  // Datos
  ctx.textAlign = "left";
  let y = top + winH + 110;
  ctx.font = `700 30px ${f.mono}`;
  ctx.fillStyle = C.portalDeep;
  ctx.fillText("NOMBRE", 70, y);
  ctx.font = `78px ${f.display}`;
  ctx.fillStyle = C.ink;
  const lines = wrap(ctx, name, W - 140);
  lines.forEach((l, i) => ctx.fillText(l, 70, y + 88 + i * 86));
  y += 88 + lines.length * 86 + 40;
  if (style) {
    ctx.font = `700 30px ${f.mono}`;
    ctx.fillStyle = C.portalDeep;
    ctx.fillText("ESTILO", 70, y);
    ctx.font = `600 40px ${f.body}`;
    ctx.fillStyle = C.ink;
    ctx.fillText(wrap(ctx, style, W - 140, 1)[0], 70, y + 56);
    y += 110;
  }
  ctx.font = `700 30px ${f.mono}`;
  ctx.fillStyle = C.portalDeep;
  ctx.fillText("ESTADO", 70, y);
  ctx.fillStyle = C.ink;
  ctx.fillText("● ESTABLE · LISTO PARA PEGAR", 70, y + 50);

  footer(ctx, f, C.ink, "rgb(3 16 9 / 0.08)", C.portalDeep);
}

/** Sello "aprobado" apoyado sobre la esquina de la ventana. */
function stamp(ctx: CanvasRenderingContext2D, f: ReturnType<typeof fonts>, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.2);
  ctx.fillStyle = "#e6f7dd";
  ctx.beginPath();
  ctx.arc(0, 0, 124, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = C.portalDeep;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(0, 0, 118, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 100, 0, Math.PI * 2);
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.fillStyle = C.portalDeep;
  ctx.font = `44px ${f.display}`;
  ctx.fillText("KALKO", 0, 8);
  ctx.font = `700 22px ${f.mono}`;
  ctx.fillText("APROBADO", 0, 48);
  ctx.restore();
}

function footer(ctx: CanvasRenderingContext2D, f: ReturnType<typeof fonts>, color: string, pill: string, accent: string) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 34px ${f.mono}`;
  const text = `Créalo en ${SITE}`;
  const w = ctx.measureText(text).width + 90;
  ctx.fillStyle = pill;
  roundRect(ctx, (W - w) / 2, H - 170, w, 84, 42);
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc((W - w) / 2 + 38, H - 128, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.fillText(text, W / 2 + 14, H - 126);
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

const DRAW: Record<StoryTemplate, (ctx: CanvasRenderingContext2D, s: Story) => void> = { portal, holo, ficha };

/** Dibuja la historia con la plantilla elegida (espera a que carguen las fuentes). */
export async function storyCanvas(template: StoryTemplate, story: Story) {
  const f = fonts();
  await Promise.all(
    [`96px ${f.display}`, `600 40px ${f.body}`, `700 34px ${f.mono}`].map((font) =>
      document.fonts.load(font).catch(() => undefined),
    ),
  );
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  DRAW[template](ctx, story);
  return canvas;
}

/** JPEG liviano para compartir (las historias no necesitan transparencia). */
export function storyFile(canvas: HTMLCanvasElement, name: string) {
  return new Promise<File>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(new File([blob], `${name}.jpg`, { type: "image/jpeg" })) : reject(new Error("toBlob"))),
      "image/jpeg",
      0.9,
    ),
  );
}
