"use client";

import { useRef, useState } from "react";
import { StickerZoom } from "./StickerZoom";
import { useMask } from "./useMask";
import styles from "./StickerView.module.css";

type Props = { src: string; alt: string; holo?: boolean; zoomable?: boolean };

/** Sticker con brillo de vinilo que sigue al puntero y se despega al pasar. */
export function StickerView({ src, alt, holo, zoomable = true }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(false);
  const mask = useMask(src);

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
    <>
      <div
        ref={ref}
        className={styles.vinyl}
        data-holo={holo}
        data-zoomable={zoomable}
        onPointerMove={move}
        onPointerLeave={leave}
        style={{ "--mask": mask } as React.CSSProperties}
        {...(zoomable && {
          role: "button",
          tabIndex: 0,
          "aria-label": `Ver ${alt} en primer plano`,
          onClick: () => setZoom(true),
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setZoom(true);
            }
          },
        })}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={zoomable ? "" : alt} className={styles.art} draggable={false} />
        {holo && <div className={styles.holo} aria-hidden />}
        <div className={styles.shine} aria-hidden />
      </div>
      {zoomable && <StickerZoom src={src} alt={alt} holo={holo} open={zoom} onClose={() => setZoom(false)} />}
    </>
  );
}
