"use client";

import { useCallback, useRef, useState } from "react";
import { BackIcon, CloseIcon, DownloadIcon, FlaskIcon, RetryIcon, UploadIcon } from "@/components/Icons";
import { Portal, PortalFilters } from "@/components/Portal";
import { downloadPng, postJson, resizeImage, streamSticker } from "@/lib/client";
import type { Interview, StickerOption } from "@/lib/schemas";
import styles from "./page.module.css";

type Stage = "input" | "analyzing" | "questions" | "designing" | "results";
type Card = {
  status: "waiting" | "partial" | "done" | "error";
  b64?: string;
  message?: string;
  startedAt: number;
  ms?: number;
};

const MAX_IDEA = 600;
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
  const fileInput = useRef<HTMLInputElement>(null);

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
    (index: number, option: StickerOption) => {
      const startedAt = Date.now();
      setCards((prev) => prev.map((c, i) => (i === index ? { status: "waiting", startedAt } : c)));
      streamSticker({ prompt: option.prompt, reference: image }, (evt) => {
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

            <ol className={styles.grid}>
              {options.map((opt, i) => {
                const card = cards[i];
                return (
                  <li key={i} className={styles.card} data-status={card?.status}>
                    <div className={styles.cardMeta}>
                      <span>DIM-{String(i + 1).padStart(2, "0")}</span>
                      <span aria-live="polite">
                        {card?.status === "done" && card.ms
                          ? `${(card.ms / 1000).toFixed(1).replace(".", ",")} s`
                          : card?.status === "error"
                            ? "colapsó"
                            : "cruzando…"}
                      </span>
                    </div>

                    <div className={styles.window}>
                      {card?.status === "error" ? (
                        <p className={styles.cardError}>{card.message}</p>
                      ) : card?.b64 ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={card.status}
                          src={`data:image/png;base64,${card.b64}`}
                          alt={`Sticker ${opt.name}`}
                          className={styles.sticker}
                          data-partial={card.status === "partial"}
                        />
                      ) : (
                        <div className={styles.miniPortal}>
                          <Portal size="small" state="charging" />
                        </div>
                      )}
                    </div>

                    <h3>{opt.name}</h3>
                    <p className={styles.cardStyle}>{opt.style}</p>

                    <div className={styles.cardActions}>
                      <button
                        className={styles.primarySmall}
                        disabled={card?.status !== "done"}
                        onClick={() => card?.b64 && downloadPng(card.b64, opt.name)}
                      >
                        <DownloadIcon /> Descargar
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
                  </li>
                );
              })}
            </ol>

            <div className={styles.resultsFoot}>
              <button className={styles.ghost} onClick={() => setStage("questions")}>
                <BackIcon /> Ajustar respuestas
              </button>
              <button className={styles.secondary} onClick={restart}>
                Crear otro sticker
              </button>
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
