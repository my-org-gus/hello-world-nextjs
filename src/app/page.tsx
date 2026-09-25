"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BackIcon,
  CloseIcon,
  DownloadIcon,
  FlaskIcon,
  RetryIcon,
  SheetIcon,
  UndoIcon,
  UploadIcon,
  WandIcon,
} from "@/components/Icons";
import { Portal, PortalFilters } from "@/components/Portal";
import { StickerView } from "@/components/StickerView";
import { postJson, resizeImage, streamSticker } from "@/lib/client";
import {
  a4Sheet,
  canvasToUrl,
  DEFAULT_FINISH,
  dieCut,
  downloadUrl,
  slug,
  type BorderColor,
  type BorderWidth,
  type Finish,
} from "@/lib/diecut";
import type { Interview, StickerOption } from "@/lib/schemas";
import styles from "./page.module.css";

type Stage = "input" | "analyzing" | "questions" | "designing" | "results";
type Card = {
  status: "waiting" | "partial" | "done" | "error";
  b64?: string;
  message?: string;
  startedAt: number;
  ms?: number;
  /** Versiones anteriores (b64) para deshacer un refinado. */
  history?: string[];
};

const REFINE_SUGGESTIONS = ["Más colores", "Sin texto", "Más simple", "Otra expresión"];

type Cut = { key: string; url: string; canvas: HTMLCanvasElement };

const MAX_IDEA = 600;
const WIDTHS: { value: BorderWidth; label: string }[] = [
  { value: "fino", label: "Fino" },
  { value: "medio", label: "Medio" },
  { value: "grueso", label: "Grueso" },
];
const COLORS: { value: BorderColor; label: string }[] = [
  { value: "blanco", label: "Blanco" },
  { value: "portal", label: "Portal" },
  { value: "holo", label: "Holográfico" },
];
const EXAMPLES = [
  "Un carpincho astronauta tomando mate en la luna",
  "Un gato hacker con lentes de soldar",
  "Una planta carnívora que ama el café",
];

export default function Home() {
  const [stage, setStage] = useState<Stage>("input");
  const [idea, setIdea] = useState("");
  const [image, setImage] = useState<string>();
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string>();
  const [interview, setInterview] = useState<Interview>();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [options, setOptions] = useState<StickerOption[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [finish, setFinish] = useState<Finish>(DEFAULT_FINISH);
  const [cuts, setCuts] = useState<Record<number, Cut>>({});
  const cutsRef = useRef(cuts);
  cutsRef.current = cuts;
  const cardsRef = useRef(cards);
  cardsRef.current = cards;
  const [refining, setRefining] = useState<number | null>(null);
  const [instruction, setInstruction] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  // Troquela cada sticker terminado con el acabado actual (en el navegador),
  // de a uno y cediendo el hilo entre cada uno para no trabar la interfaz.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const [i, card] of cards.entries()) {
        if (cancelled) return;
        if (card.status !== "done" || !card.b64) continue;
        const key = `${card.startedAt}:${finish.width}:${finish.color}:${finish.cutLine}`;
        if (cutsRef.current[i]?.key === key) continue;
        await new Promise((r) => setTimeout(r, 0));
        const canvas = await dieCut(card.b64, finish);
        const url = await canvasToUrl(canvas);
        if (cancelled) return URL.revokeObjectURL(url);
        setCuts((prev) => {
          if (prev[i]) URL.revokeObjectURL(prev[i].url);
          return { ...prev, [i]: { key, url, canvas } };
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cards, finish]);

  async function downloadSheet(canvases: HTMLCanvasElement[], name: string) {
    const url = await canvasToUrl(await a4Sheet(canvases));
    downloadUrl(url, `kalko-a4-${slug(name)}.png`);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  const pickFile = useCallback(async (file?: File) => {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      setError("Usa una imagen PNG, JPG o WebP.");
      return;
    }
    setError(undefined);
    try {
      setImage(await resizeImage(file));
    } catch {
      setError("No pudimos leer esa imagen. Prueba con otra.");
    }
  }, []);

  async function openPortal() {
    if (!idea.trim() && !image) {
      setError("Describe una idea o suelta una imagen en el portal.");
      return;
    }
    setError(undefined);
    setStage("analyzing");
    try {
      const result = await postJson<Interview>("/api/interview", { idea, image });
      setInterview(result);
      setAnswers(Object.fromEntries(result.questions.map((q) => [q.id, q.options[0]])));
      setStage("questions");
    } catch (err) {
      setError((err as Error).message);
      setStage("input");
    }
  }

  const generate = useCallback(
    (index: number, option: StickerOption, refine?: string) => {
      const startedAt = Date.now();
      const current = cardsRef.current[index];
      const history = refine && current?.b64 ? [...(current.history ?? []), current.b64] : current?.history;
      const body = refine && current?.b64
        ? { instruction: refine, reference: `data:image/png;base64,${current.b64}` }
        : { prompt: option.prompt, reference: image };

      setCards((prev) => prev.map((c, i) => (i === index ? { status: "waiting", startedAt, history } : c)));
      setCuts((prev) => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
      streamSticker(body, (evt) => {
        setCards((prev) =>
          prev.map((c, i) => {
            if (i !== index) return c;
            if (evt.type === "partial") return { ...c, status: "partial", b64: evt.b64 };
            if (evt.type === "done") return { ...c, status: "done", b64: evt.b64, ms: Date.now() - startedAt };
            if (evt.type === "error") return { ...c, status: "error", message: evt.message };
            return c;
          }),
        );
      }).catch(() =>
        setCards((prev) =>
          prev.map((c, i) => (i === index ? { ...c, status: "error", message: "Se perdió la conexión." } : c)),
        ),
      );
    },
    [image],
  );

  function undo(index: number) {
    setCards((prev) =>
      prev.map((c, i) => {
        if (i !== index || !c.history?.length) return c;
        const history = c.history.slice(0, -1);
        return { status: "done", b64: c.history.at(-1), startedAt: Date.now(), history };
      }),
    );
  }

  function applyRefine(index: number, option: StickerOption, text: string) {
    const clean = text.trim();
    if (!clean) return;
    setRefining(null);
    setInstruction("");
    generate(index, option, clean);
  }

  async function summon() {
    if (!interview) return;
    setError(undefined);
    setStage("designing");
    try {
      const { options: opts } = await postJson<{ options: StickerOption[] }>("/api/options", {
        idea,
        summary: interview.summary,
        hasReference: Boolean(image),
        answers: interview.questions.map((q) => ({ question: q.question, answer: answers[q.id] })),
      });
      setOptions(opts);
      setCards(opts.map(() => ({ status: "waiting", startedAt: Date.now() })));
      setStage("results");
      opts.forEach((opt, i) => generate(i, opt));
    } catch (err) {
      setError((err as Error).message);
      setStage("questions");
    }
  }

  function restart() {
    setStage("input");
    setInterview(undefined);
    setOptions([]);
    setCards([]);
    setCuts({});
    setError(undefined);
  }

  const busy = stage === "analyzing" || stage === "designing";

  return (
    <div className={styles.shell}>
      <PortalFilters />

      <header className={styles.header}>
        <button className={styles.brand} onClick={restart} aria-label="Kalko, volver al inicio">
          <FlaskIcon />
          <span>Kalko</span>
        </button>
        <p className={styles.status} data-busy={busy} aria-live="polite">
          <span className={styles.statusDot} aria-hidden />
          {busy ? "Portal en uso" : "Portal estable"}
        </p>
      </header>

      <main className={styles.main}>
        {(stage === "input" || stage === "analyzing") && (
          <section className={styles.intro} aria-labelledby="title">
            <div className={styles.introCopy}>
              <h1 id="title">
                Tu sticker ya existe <span className={styles.accent}>en otra dimensión.</span>
              </h1>
              <p className={styles.lede}>
                Lanza una foto o una idea al portal. Te hacemos un par de preguntas y traemos cuatro versiones
                troqueladas, listas para imprimir.
              </p>
            </div>

            <div
              className={styles.portalStage}
              data-dragging={dragging}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                pickFile(e.dataTransfer.files[0]);
              }}
            >
              <Portal state={stage === "analyzing" ? "charging" : "idle"}>
                {stage === "analyzing" ? (
                  <p className={styles.portalNote} role="status">
                    Analizando tu muestra…
                  </p>
                ) : image ? (
                  <div className={styles.sample}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image} alt="Imagen de referencia cargada" />
                    <button className={styles.sampleRemove} onClick={() => setImage(undefined)} aria-label="Quitar imagen">
                      <CloseIcon />
                    </button>
                  </div>
                ) : (
                  <button className={styles.drop} onClick={() => fileInput.current?.click()}>
                    <UploadIcon />
                    <strong>Suelta una imagen</strong>
                    <span>o toca para elegir</span>
                  </button>
                )}
              </Portal>
              <input
                ref={fileInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                tabIndex={-1}
                onChange={(e) => pickFile(e.target.files?.[0])}
              />
            </div>

            <form
              className={styles.ideaForm}
              onSubmit={(e) => {
                e.preventDefault();
                openPortal();
              }}
            >
              <label htmlFor="idea" className={styles.label}>
                {image ? "Cuéntanos qué hacer con la imagen (opcional)" : "Describe tu idea"}
              </label>
              <textarea
                id="idea"
                className={styles.textarea}
                value={idea}
                maxLength={MAX_IDEA}
                rows={3}
                disabled={busy}
                placeholder={image ? "Conviértela en un sticker estilo caricatura" : EXAMPLES[0]}
                onChange={(e) => setIdea(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) openPortal();
                }}
              />
              {!image && !idea && (
                <div className={styles.examples}>
                  {EXAMPLES.slice(1).map((ex) => (
                    <button type="button" key={ex} className={styles.example} onClick={() => setIdea(ex)}>
                      {ex}
                    </button>
                  ))}
                </div>
              )}
              {error && (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              )}
              <button type="submit" className={styles.primary} disabled={busy}>
                {stage === "analyzing" ? "Abriendo…" : "Abrir portal"}
              </button>
            </form>
          </section>
        )}

        {(stage === "questions" || stage === "designing") && interview && (
          <section className={styles.calibrate} aria-labelledby="calibrate-title">
            <div className={styles.calibrateHead}>
              <button className={styles.ghost} onClick={() => setStage("input")} disabled={busy}>
                <BackIcon /> Cambiar muestra
              </button>
              <h2 id="calibrate-title">Calibremos el portal</h2>
              <p className={styles.summary}>{interview.summary}</p>
            </div>

            <div className={styles.questions}>
              {interview.questions.map((q) => (
                <fieldset key={q.id} className={styles.question} disabled={busy}>
                  <legend>{q.question}</legend>
                  <div className={styles.chips}>
                    {q.options.map((opt) => (
                      <label key={opt} className={styles.chip} data-selected={answers[q.id] === opt}>
                        <input
                          type="radio"
                          name={q.id}
                          value={opt}
                          checked={answers[q.id] === opt}
                          onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>

            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}

            <div className={styles.calibrateAction}>
              {stage === "designing" ? (
                <div className={styles.charging} role="status">
                  <div className={styles.miniPortal}>
                    <Portal size="small" state="charging" />
                  </div>
                  <p>Buscando cuatro dimensiones…</p>
                </div>
              ) : (
                <button className={styles.primary} onClick={summon}>
                  Traer 4 dimensiones
                </button>
              )}
            </div>
          </section>
        )}

        {stage === "results" && (
          <section className={styles.results} aria-labelledby="results-title">
            <div className={styles.resultsHead}>
              <h2 id="results-title">Llegaron de cuatro dimensiones</h2>
              <p className={styles.summary}>Elige tu favorita y descárgala. Si una no te convence, regénerala.</p>
            </div>

            <div className={styles.finish} role="group" aria-label="Acabado del sticker">
              <fieldset className={styles.finishGroup}>
                <legend>Borde</legend>
                <div className={styles.segmented}>
                  {WIDTHS.map((o) => (
                    <label key={o.value} data-selected={finish.width === o.value}>
                      <input
                        type="radio"
                        name="width"
                        checked={finish.width === o.value}
                        onChange={() => setFinish((f) => ({ ...f, width: o.value }))}
                      />
                      {o.label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset className={styles.finishGroup}>
                <legend>Color</legend>
                <div className={styles.segmented}>
                  {COLORS.map((o) => (
                    <label key={o.value} data-selected={finish.color === o.value}>
                      <input
                        type="radio"
                        name="color"
                        checked={finish.color === o.value}
                        onChange={() => setFinish((f) => ({ ...f, color: o.value }))}
                      />
                      <span className={styles.swatch} data-color={o.value} aria-hidden />
                      {o.label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  checked={finish.cutLine}
                  onChange={(e) => setFinish((f) => ({ ...f, cutLine: e.target.checked }))}
                />
                <span className={styles.toggleTrack} aria-hidden />
                Línea de corte
              </label>
            </div>

            <ol className={styles.grid}>
              {options.map((opt, i) => {
                const card = cards[i];
                const cut = cuts[i];
                return (
                  <li key={i} className={styles.card} data-status={card?.status}>
                    <div className={styles.cardMeta}>
                      <span>DIM-{String(i + 1).padStart(2, "0")}</span>
                      <span aria-live="polite">
                        {card?.status === "done"
                          ? card.ms
                            ? `${(card.ms / 1000).toFixed(1).replace(".", ",")} s`
                            : "listo"
                          : card?.status === "error"
                            ? "colapsó"
                            : "cruzando…"}
                      </span>
                    </div>

                    <div className={styles.window}>
                      {card?.status === "error" ? (
                        <p className={styles.cardError}>{card.message}</p>
                      ) : cut ? (
                        <StickerView src={cut.url} alt={`Sticker ${opt.name}`} holo={finish.color === "holo"} />
                      ) : card?.b64 ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`data:image/png;base64,${card.b64}`}
                          alt=""
                          className={styles.sticker}
                          data-partial="true"
                        />
                      ) : (
                        <div className={styles.miniPortal}>
                          <Portal size="small" state="charging" />
                        </div>
                      )}
                    </div>

                    <h3>{opt.name}</h3>
                    <p className={styles.cardStyle}>{opt.style}</p>

                    {refining === i ? (
                      <form
                        className={styles.refine}
                        onSubmit={(e) => {
                          e.preventDefault();
                          applyRefine(i, opt, instruction);
                        }}
                      >
                        <label htmlFor={`refine-${i}`} className={styles.refineLabel}>
                          ¿Qué le cambiarías?
                        </label>
                        <input
                          id={`refine-${i}`}
                          className={styles.refineInput}
                          value={instruction}
                          maxLength={300}
                          autoFocus
                          placeholder="Ej.: que sonría más"
                          onChange={(e) => setInstruction(e.target.value)}
                          onKeyDown={(e) => e.key === "Escape" && setRefining(null)}
                        />
                        <div className={styles.refineChips}>
                          {REFINE_SUGGESTIONS.map((sug) => (
                            <button type="button" key={sug} className={styles.example} onClick={() => applyRefine(i, opt, sug)}>
                              {sug}
                            </button>
                          ))}
                        </div>
                        <div className={styles.cardActions}>
                          <button type="submit" className={styles.primarySmall} disabled={!instruction.trim()}>
                            <WandIcon /> Aplicar
                          </button>
                          <button type="button" className={styles.ghost} onClick={() => setRefining(null)} aria-label="Cancelar">
                            <CloseIcon />
                          </button>
                        </div>
                      </form>
                    ) : (
                    <>
                    <div className={styles.cardActions}>
                      <button
                        className={styles.primarySmall}
                        disabled={!cut}
                        onClick={() => cut && downloadUrl(cut.url, `kalko-${slug(opt.name)}.png`)}
                      >
                        <DownloadIcon /> Descargar
                      </button>
                      <button
                        className={styles.ghost}
                        disabled={!cut}
                        onClick={() => cut && downloadSheet([cut.canvas], opt.name)}
                        aria-label={`Hoja A4 con 6 copias de ${opt.name}`}
                        title="Hoja A4 con 6 copias"
                      >
                        <SheetIcon />
                      </button>
                      <button
                        className={styles.ghost}
                        disabled={card?.status === "waiting" || card?.status === "partial"}
                        onClick={() => generate(i, opt)}
                        aria-label={`Regenerar ${opt.name}`}
                      >
                        <RetryIcon />
                      </button>
                    </div>
                    <div className={styles.cardSecondary}>
                      <button
                        className={styles.linkButton}
                        disabled={card?.status !== "done"}
                        onClick={() => {
                          setInstruction("");
                          setRefining(i);
                        }}
                      >
                        <WandIcon size={16} /> Refinar
                      </button>
                      {card?.history?.length ? (
                        <button
                          className={styles.linkButton}
                          disabled={card.status === "waiting" || card.status === "partial"}
                          onClick={() => undo(i)}
                        >
                          <UndoIcon size={16} /> Deshacer
                        </button>
                      ) : null}
                    </div>
                    </>
                    )}
                  </li>
                );
              })}
            </ol>

            <div className={styles.resultsFoot}>
              <button className={styles.ghost} onClick={() => setStage("questions")}>
                <BackIcon /> Ajustar respuestas
              </button>
              <div className={styles.footActions}>
                <button
                  className={styles.ghost}
                  disabled={Object.keys(cuts).length === 0}
                  onClick={() =>
                    downloadSheet(
                      Object.keys(cuts)
                        .sort()
                        .map((k) => cuts[Number(k)].canvas),
                      "dimensiones",
                    )
                  }
                >
                  <SheetIcon /> Hoja A4 con todas
                </button>
                <button className={styles.secondary} onClick={restart}>
                  Crear otro sticker
                </button>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className={styles.footer}>
        <p>Hecho en Webflow Cloud · Imágenes generadas con IA</p>
      </footer>
    </div>
  );
}
