"use client";

import { useEffect, useRef, useState } from "react";
import { downloadUrl, shareFiles, slug } from "@/lib/diecut";
import { shareText } from "@/lib/social";
import { STORY_TEMPLATES, storyCanvas, storyFile, type StoryTemplate } from "@/lib/story";
import { CloseIcon, DownloadIcon, ShareIcon } from "./Icons";
import styles from "./StoryShare.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
  sticker?: HTMLCanvasElement;
  name: string;
  style?: string;
  dim?: string;
};

type Preview = { canvas: HTMLCanvasElement; url: string };

/**
 * Elige una de tres plantillas 9:16 y la comparte con el menú del sistema
 * (en el celular aparece Instagram entre los destinos) o la descarga.
 */
export function StoryShare({ open, onClose, sticker, name, style, dim }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [previews, setPreviews] = useState<Partial<Record<StoryTemplate, Preview>>>({});
  const [selected, setSelected] = useState<StoryTemplate>("portal");
  const [status, setStatus] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    if (!open || !sticker) return;
    let cancelled = false;
    const made: Preview[] = [];
    setStatus(undefined);
    (async () => {
      for (const t of STORY_TEMPLATES) {
        const canvas = await storyCanvas(t.id, { sticker, name, style, dim });
        const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.8));
        if (cancelled || !blob) return;
        const preview = { canvas, url: URL.createObjectURL(blob) };
        made.push(preview);
        setPreviews((p) => ({ ...p, [t.id]: preview }));
        await new Promise((r) => setTimeout(r, 0));
      }
    })();
    return () => {
      cancelled = true;
      made.forEach((p) => URL.revokeObjectURL(p.url));
      setPreviews({});
    };
  }, [open, sticker, name, style, dim]);

  async function share() {
    const chosen = previews[selected];
    if (!chosen) return;
    setBusy(true);
    setStatus(undefined);
    const file = await storyFile(chosen.canvas, `kalko-historia-${slug(name)}`);
    try {
      if (await shareFiles([file], shareText())) {
        setBusy(false);
        return;
      }
    } catch {
      /* cae a la descarga */
    }
    const url = URL.createObjectURL(file);
    downloadUrl(url, file.name);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    setStatus("Descargamos la imagen. Desde Instagram, súbela como historia o publicación.");
    setBusy(false);
  }

  function download() {
    const chosen = previews[selected];
    if (!chosen) return;
    storyFile(chosen.canvas, `kalko-historia-${slug(name)}`).then((file) => {
      const url = URL.createObjectURL(file);
      downloadUrl(url, file.name);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    });
  }

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby="story-title"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
    >
      <div className={styles.panel}>
        <div className={styles.head}>
          <h2 id="story-title">Elige tu historia</h2>
          <button className={styles.close} onClick={() => dialog.current?.close()} aria-label="Cerrar">
            <CloseIcon size={20} />
          </button>
        </div>
        <p className={styles.lead}>Tres diseños listos para Instagram. Toca el que más te guste.</p>

        <div className={styles.options} role="radiogroup" aria-label="Plantilla">
          {STORY_TEMPLATES.map((t) => (
            <label key={t.id} className={styles.option} data-selected={selected === t.id}>
              <input
                type="radio"
                name="story-template"
                value={t.id}
                checked={selected === t.id}
                onChange={() => setSelected(t.id)}
              />
              <span className={styles.frame}>
                {previews[t.id] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previews[t.id]!.url} alt={`Vista previa ${t.label}`} />
                ) : (
                  <span className={styles.loading} aria-hidden />
                )}
              </span>
              <span className={styles.label}>{t.label}</span>
            </label>
          ))}
        </div>

        {status && (
          <p className={styles.status} role="status">
            {status}
          </p>
        )}

        <div className={styles.actions}>
          <button className={styles.primary} onClick={share} disabled={!previews[selected] || busy}>
            <ShareIcon size={18} /> Compartir
          </button>
          <button className={styles.ghost} onClick={download} disabled={!previews[selected]}>
            <DownloadIcon size={18} /> Descargar
          </button>
        </div>
      </div>
    </dialog>
  );
}
