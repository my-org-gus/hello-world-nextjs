"use client";

import { useRef } from "react";
import styles from "./StickerView.module.css";

type Props = { src: string; alt: string; holo?: boolean };

/** Sticker con brillo de vinilo que sigue al puntero y se despega al pasar. */
export function StickerView({ src, alt, holo }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  function move(e: React.PointerEvent) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    el.style.setProperty("--mx", `${x * 100}%`);
    el.style.setProperty("--my", `${y * 100}%`);
    el.style.setProperty("--ry", `${(x - 0.5) * 22}deg`);
    el.style.setProperty("--rx", `${(0.5 - y) * 18}deg`);
  }

  function leave() {
    const el = ref.current;
    if (!el) return;
    el.style.removeProperty("--ry");
    el.style.removeProperty("--rx");
  }

  return (
    <div
      ref={ref}
      className={styles.vinyl}
      data-holo={holo}
      onPointerMove={move}
      onPointerLeave={leave}
      style={{ "--mask": `url(${src})` } as React.CSSProperties}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className={styles.art} draggable={false} />
      <div className={styles.shine} aria-hidden />
    </div>
  );
}
