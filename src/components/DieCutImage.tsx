"use client";

import { useEffect, useRef, useState } from "react";
import { canvasToUrl, dieCut, type Finish } from "@/lib/diecut";
import { StickerView } from "./StickerView";

type Props = { src: string; alt: string; finish: Finish; eager?: boolean; className?: string };

/**
 * Troquela una imagen de ejemplo en el navegador cuando entra en pantalla
 * (el mismo proceso que usa el laboratorio). Mientras tanto muestra el PNG.
 */
export function DieCutImage({ src, alt, finish, eager, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    let made: string | undefined;
    const run = async () => {
      const canvas = await dieCut(src, finish);
      made = await canvasToUrl(canvas);
      if (cancelled) URL.revokeObjectURL(made);
      else setUrl(made);
    };
    if (eager) {
      run();
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            io.disconnect();
            // Escalonado para no trabar el hilo si entran varias a la vez.
            setTimeout(run, Math.random() * 250);
          }
        },
        { rootMargin: "300px" },
      );
      if (ref.current) io.observe(ref.current);
      return () => {
        cancelled = true;
        io.disconnect();
        if (made) URL.revokeObjectURL(made);
      };
    }
    return () => {
      cancelled = true;
      if (made) URL.revokeObjectURL(made);
    };
  }, [src, finish, eager]);

  return (
    <div ref={ref} className={className} style={{ display: "grid", placeItems: "center" }}>
      {url ? (
        <StickerView src={url} alt={alt} holo={finish.color === "holo"} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" aria-hidden style={{ width: "86%", opacity: 0.35, filter: "blur(4px)" }} />
      )}
    </div>
  );
}
