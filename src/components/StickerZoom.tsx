"use client";

import { useEffect, useRef } from "react";
import { CloseIcon } from "./Icons";
import styles from "./StickerZoom.module.css";

type Props = { src: string; alt: string; holo?: boolean; open: boolean; onClose: () => void };

// Capas del canto: copias apenas separadas en Z que dan espesor de vinilo al girar.
const EDGE_LAYERS = [1, 2, 3, 4, 5, 6];

/**
 * Vista en primer plano: el sticker gira en 3D siguiendo el puntero (o el
 * dedo) con brillo especular, canto con espesor y sombra que se desplaza.
 */
export function StickerZoom({ src, alt, holo, open, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const frame = useRef<number>(0);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  function tilt(clientX: number, clientY: number) {
    const el = stage.current;
    if (!el) return;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, ((clientX - r.left) / r.width) * 2 - 1));
      const y = Math.max(-1, Math.min(1, ((clientY - r.top) / r.height) * 2 - 1));
      el.style.setProperty("--ry", `${x * 28}deg`);
      el.style.setProperty("--rx", `${-y * 24}deg`);
      el.style.setProperty("--mx", `${(x + 1) * 50}%`);
      el.style.setProperty("--my", `${(y + 1) * 50}%`);
      el.style.setProperty("--sx", `${-x * 36}px`);
      el.style.setProperty("--sy", `${-y * 30 + 40}px`);
      el.dataset.active = "true";
    });
  }

  function rest() {
    const el = stage.current;
    if (!el) return;
    cancelAnimationFrame(frame.current);
    ["--ry", "--rx", "--mx", "--my", "--sx", "--sy"].forEach((p) => el.style.removeProperty(p));
    delete el.dataset.active;
  }

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-label={`${alt} en primer plano`}
      onClose={() => {
        rest();
        onClose();
      }}
      onClick={(e) => {
        // Click en el fondo (fuera del escenario) cierra.
        if (e.target === e.currentTarget) dialog.current?.close();
      }}
      onPointerMove={(e) => tilt(e.clientX, e.clientY)}
      onPointerLeave={rest}
      onPointerUp={(e) => e.pointerType !== "mouse" && rest()}
    >
      <button className={styles.close} onClick={() => dialog.current?.close()} aria-label="Cerrar">
        <CloseIcon size={22} />
      </button>

      {open && (
        <div
          ref={stage}
          className={styles.stage}
          data-holo={holo}
          style={{ "--mask": `url(${src})` } as React.CSSProperties}
          onPointerDown={(e) => tilt(e.clientX, e.clientY)}
        >
          {/* eslint-disable @next/next/no-img-element */}
          <img src={src} alt="" aria-hidden className={styles.shadow} draggable={false} />
          {EDGE_LAYERS.map((n) => (
            <img
              key={n}
              src={src}
              alt=""
              aria-hidden
              className={styles.edge}
              style={{ "--z": `${n * 1.6}px` } as React.CSSProperties}
              draggable={false}
            />
          ))}
          <img src={src} alt={alt} className={styles.face} draggable={false} />
          {/* eslint-enable @next/next/no-img-element */}
          <div className={styles.shine} aria-hidden />
          {holo && <div className={styles.holo} aria-hidden />}
        </div>
      )}

      <p className={styles.hint}>
        <span className={styles.hintMouse}>Mueve el cursor para girarlo</span>
        <span className={styles.hintTouch}>Arrastra con el dedo para girarlo</span>
      </p>
    </dialog>
  );
}
