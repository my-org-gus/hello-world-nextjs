"use client";

import { useEffect, useRef, useState } from "react";
import { resizeImage, streamSticker } from "@/lib/client";
import { canvasToUrl, downloadUrl, shareFiles, slug } from "@/lib/diecut";
import { BackIcon, DownloadIcon, ShareIcon, UploadIcon, WandIcon } from "./Icons";
import { Mascot } from "./Mascot";
import styles from "./StickerMockup.module.css";

const OBJECTS = ["Laptop", "Moto", "Termo", "Botella", "Casco", "Cuaderno"];

type Props = { sticker: HTMLCanvasElement; name: string; onBack: () => void };
type Photo = { url: string; w: number; h: number };
type Place = { x: number; y: number; size: number; rot: number };
type Ai = { status: "waiting" | "partial" | "done" | "error"; b64?: string; message?: string; queued?: boolean };

const START: Place = { x: 0.5, y: 0.5, size: 0.34, rot: -6 };

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Copia del sticker achicada, como data URL PNG (para mandarla a la IA). */
function stickerDataUrl(sticker: HTMLCanvasElement, max = 768) {
  const scale = Math.min(1, max / Math.max(sticker.width, sticker.height));
  const c = document.createElement("canvas");
  c.width = Math.round(sticker.width * scale);
  c.height = Math.round(sticker.height * scale);
  c.getContext("2d")!.drawImage(sticker, 0, 0, c.width, c.height);
  return c.toDataURL("image/png");
}

/**
 * "Pruébala": el sticker elegido sobre una foto del objeto donde se va a
 * pegar. Se ubica a mano (arrastrar, pellizcar o con los controles) y la IA
 * puede ajustar luz, perspectiva y curvatura sin moverlo. Sin foto, la IA
 * imagina la escena con el objeto elegido.
 */
export function StickerMockup({ sticker, name, onBack }: Props) {
  const [object, setObject] = useState("Laptop");
  const [photo, setPhoto] = useState<Photo>();
  const [place, setPlace] = useState<Place>(START);
  const [stickerUrl, setStickerUrl] = useState<string>();
  const [ai, setAi] = useState<Ai>();
  const [error, setError] = useState<string>();
  const stage = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ dist: number; angle: number; place: Place } | null>(null);
  const abort = useRef<AbortController | null>(null);
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let made: string | undefined;
    canvasToUrl(sticker).then((u) => {
      made = u;
      setStickerUrl(u);
    });
    return () => {
      if (made) URL.revokeObjectURL(made);
      abort.current?.abort();
    };
  }, [sticker]);

  async function pickPhoto(file?: File) {
    if (!file) return;
    setError(undefined);
    try {
      const url = await resizeImage(file, 1024);
      const img = await loadImage(url);
      setPhoto({ url, w: img.naturalWidth, h: img.naturalHeight });
      setPlace(START);
      setAi(undefined);
    } catch {
      setError("No pudimos leer esa foto. Prueba con otra.");
    }
  }

  // ——— Gestos: un dedo mueve; dos dedos escalan y rotan ———
  function onPointerDown(e: React.PointerEvent) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    startGesture();
  }

  function startGesture() {
    const pts = [...pointers.current.values()];
    gesture.current =
      pts.length === 2
        ? {
            dist: Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y),
            angle: Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x),
            place,
          }
        : null;
  }

  function onPointerMove(e: React.PointerEvent) {
    const prev = pointers.current.get(e.pointerId);
    const el = stage.current;
    if (!prev || !el) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const rect = el.getBoundingClientRect();
    const pts = [...pointers.current.values()];
    if (pts.length === 1) {
      const dx = (e.clientX - prev.x) / rect.width;
      const dy = (e.clientY - prev.y) / rect.height;
      setPlace((p) => ({ ...p, x: clamp(p.x + dx, 0, 1), y: clamp(p.y + dy, 0, 1) }));
    } else if (pts.length === 2 && gesture.current) {
      const g = gesture.current;
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const angle = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
      setPlace({
        ...g.place,
        size: clamp(g.place.size * (dist / g.dist), 0.08, 0.9),
        rot: g.place.rot + ((angle - g.angle) * 180) / Math.PI,
      });
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    startGesture();
  }

  /** Foto + sticker en un canvas, con una sombra de contacto suave. */
  async function composite() {
    if (!photo) throw new Error("sin foto");
    const img = await loadImage(photo.url);
    const c = document.createElement("canvas");
    c.width = photo.w;
    c.height = photo.h;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const w = place.size * c.width;
    const h = (w * sticker.height) / sticker.width;
    ctx.save();
    ctx.translate(place.x * c.width, place.y * c.height);
    ctx.rotate((place.rot * Math.PI) / 180);
    ctx.shadowColor = "rgb(0 0 0 / 0.35)";
    ctx.shadowBlur = c.width * 0.012;
    ctx.shadowOffsetY = c.width * 0.005;
    ctx.drawImage(sticker, -w / 2, -h / 2, w, h);
    ctx.restore();
    return c;
  }

  async function currentFile() {
    if (ai?.status === "done" && ai.b64) {
      const blob = await (await fetch(`data:image/png;base64,${ai.b64}`)).blob();
      return new File([blob], `kalko-${slug(name)}-en-${slug(object)}.png`, { type: "image/png" });
    }
    const c = await composite();
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.92));
    return new File([blob!], `kalko-${slug(name)}-en-${slug(object)}.jpg`, { type: "image/jpeg" });
  }

  async function download() {
    const file = await currentFile();
    const url = URL.createObjectURL(file);
    downloadUrl(url, file.name);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  async function share() {
    const file = await currentFile();
    try {
      if (await shareFiles([file], "Así queda mi sticker · kalko.webflow.io")) return;
    } catch {
      /* cae a la descarga */
    }
    download();
  }

  async function realistic(fromPhoto: boolean) {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setError(undefined);
    setAi({ status: "waiting" });
    try {
      const reference = fromPhoto ? (await composite()).toDataURL("image/jpeg", 0.9) : stickerDataUrl(sticker);
      await streamSticker(
        { reference, mockup: { object, fromPhoto } },
        (evt) =>
          setAi((prev) => {
            if (evt.type === "queued") return { ...prev, status: "waiting", queued: true };
            if (evt.type === "partial") return { status: "partial", b64: evt.b64 };
            if (evt.type === "done") return { status: "done", b64: evt.b64 };
            if (evt.type === "error") return { status: "error", message: evt.message };
            return prev;
          }),
        controller.signal,
      );
    } catch {
      if (!controller.signal.aborted) setAi({ status: "error", message: "Se perdió la conexión con el portal." });
    }
  }

  const busy = ai?.status === "waiting" || ai?.status === "partial";
  const showAi = ai && ai.b64;

  return (
    <section className={styles.mockup} aria-labelledby="mockup-title">
      <div className={styles.head}>
        <button className={styles.ghost} onClick={onBack}>
          <BackIcon /> Volver a las dimensiones
        </button>
        <h2 id="mockup-title" tabIndex={-1}>
          Pruébala en tu mundo
        </h2>
        <Mascot
          who="chill"
          size={88}
          says="Sácale una foto a donde la vas a pegar y ubícala con el dedo. Si quieres, la IA la deja como pegada de verdad."
        />
      </div>

      <fieldset className={styles.objects}>
        <legend>¿Dónde la vas a pegar?</legend>
        <div className={styles.chips}>
          {OBJECTS.map((o) => (
            <label key={o} className={styles.chip} data-selected={object === o}>
              <input type="radio" name="mockup-object" checked={object === o} onChange={() => setObject(o)} />
              {o}
            </label>
          ))}
          <input
            className={styles.other}
            placeholder="Otro: patineta, heladera…"
            maxLength={40}
            value={OBJECTS.includes(object) ? "" : object}
            onChange={(e) => setObject(e.target.value || "Laptop")}
            aria-label="Otro objeto"
          />
        </div>
      </fieldset>

      <div className={styles.photoActions}>
        <button className={styles.primary} onClick={() => camera.current?.click()} disabled={busy}>
          <UploadIcon size={20} /> Sacar foto
        </button>
        <button className={styles.secondary} onClick={() => gallery.current?.click()} disabled={busy}>
          Subir foto
        </button>
        {!photo && (
          <button className={styles.ghost} onClick={() => realistic(false)} disabled={busy}>
            <WandIcon size={18} /> No tengo foto: que la IA lo imagine
          </button>
        )}
        <input
          ref={camera}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => pickPhoto(e.target.files?.[0])}
        />
        <input ref={gallery} type="file" accept="image/*" hidden onChange={(e) => pickPhoto(e.target.files?.[0])} />
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {showAi ? (
        <figure className={styles.result} data-status={ai.status}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`data:image/png;base64,${ai.b64}`} alt={`${name} en ${object.toLowerCase()}`} />
          <figcaption>{ai.status === "done" ? "Así queda, según la IA" : "Pegándola…"}</figcaption>
        </figure>
      ) : photo ? (
        <div
          ref={stage}
          className={styles.stage}
          style={{
            aspectRatio: `${photo.w} / ${photo.h}`,
            width: `min(100%, 760px, calc(72dvh * ${(photo.w / photo.h).toFixed(3)}))`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.url} alt={`Tu foto: ${object}`} className={styles.photo} draggable={false} />
          {stickerUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={stickerUrl}
              alt={`Sticker ${name}, arrástralo para ubicarlo`}
              className={styles.sticker}
              draggable={false}
              style={{
                left: `${place.x * 100}%`,
                top: `${place.y * 100}%`,
                width: `${place.size * 100}%`,
                transform: `translate(-50%, -50%) rotate(${place.rot}deg)`,
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            />
          )}
        </div>
      ) : (
        ai?.status !== "error" && (
          <div className={styles.empty} aria-busy={busy}>
            <p>{busy ? (ai?.queued ? "En cola, ya casi…" : "Imaginando la escena…") : "Tu foto aparece acá."}</p>
          </div>
        )
      )}

      {ai?.status === "error" && (
        <p className={styles.error} role="alert">
          {ai.message}
        </p>
      )}

      {photo && !showAi && (
        <div className={styles.controls}>
          <label>
            Tamaño
            <input
              type="range"
              min={8}
              max={90}
              value={Math.round(place.size * 100)}
              onChange={(e) => setPlace((p) => ({ ...p, size: Number(e.target.value) / 100 }))}
            />
          </label>
          <label>
            Giro
            <input
              type="range"
              min={-180}
              max={180}
              value={Math.round(place.rot)}
              onChange={(e) => setPlace((p) => ({ ...p, rot: Number(e.target.value) }))}
            />
          </label>
        </div>
      )}

      {(photo || ai?.status === "done") && (
        <div className={styles.actions}>
          {photo && !showAi && (
            <button className={styles.primary} onClick={() => realistic(true)} disabled={busy}>
              <WandIcon size={18} /> Hacerla realista con IA
            </button>
          )}
          {showAi && photo && ai.status === "done" && (
            <button className={styles.ghost} onClick={() => setAi(undefined)}>
              Volver a ubicarla
            </button>
          )}
          <button className={styles.secondary} onClick={share} disabled={busy}>
            <ShareIcon size={18} /> Compartir
          </button>
          <button className={styles.ghost} onClick={download} disabled={busy}>
            <DownloadIcon size={18} /> Descargar
          </button>
        </div>
      )}
    </section>
  );
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}
