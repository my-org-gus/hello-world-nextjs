"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FlaskIcon, HeartIcon } from "@/components/Icons";
import { Mascot } from "@/components/Mascot";
import { PortalFilters } from "@/components/Portal";
import { StickerView } from "@/components/StickerView";
import type { GalleryItem } from "@/lib/gallery";
import home from "../home.module.css";
import styles from "./galeria.module.css";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const LIKES_KEY = "kalko-likes";

function when(ts: number) {
  const min = Math.round((Date.now() - ts) / 60000);
  if (min < 1) return "recién salido";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  return new Date(ts).toLocaleDateString("es", { day: "numeric", month: "short" });
}

export default function Galeria() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [cursor, setCursor] = useState<string>();
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [reported, setReported] = useState<Record<string, boolean>>({});
  // Qué stickers ya tienen tu me gusta: solo para pintar el botón (el servidor
  // cuenta uno por visitante igual).
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      setLiked(JSON.parse(localStorage.getItem(LIKES_KEY) ?? "{}"));
    } catch {
      /* sin storage: arranca vacío */
    }
  }, []);

  const load = useCallback(async (next?: string) => {
    setState("loading");
    try {
      const res = await fetch(`${BASE}/api/gallery${next ? `?cursor=${encodeURIComponent(next)}` : ""}`);
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { items: GalleryItem[]; cursor?: string };
      setItems((prev) => (next ? [...prev, ...data.items] : data.items));
      setCursor(data.cursor);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function reportItem(id: string) {
    setReported((r) => ({ ...r, [id]: true }));
    const res = await fetch(`${BASE}/api/gallery/${id}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    }).catch(() => undefined);
    const data = (await res?.json().catch(() => ({}))) as { hidden?: boolean } | undefined;
    if (data?.hidden) setItems((prev) => prev.filter((it) => it.id !== id));
  }

  async function likeItem(id: string) {
    if (liked[id]) return;
    const next = { ...liked, [id]: true };
    setLiked(next);
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, likes: (it.likes ?? 0) + 1 } : it)));
    try {
      localStorage.setItem(LIKES_KEY, JSON.stringify(next));
    } catch {
      /* sin storage */
    }
    const res = await fetch(`${BASE}/api/gallery/${id}/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    }).catch(() => undefined);
    const data = (await res?.json().catch(() => ({}))) as { likes?: number } | undefined;
    if (typeof data?.likes === "number") {
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, likes: data.likes } : it)));
    }
  }

  const community = items.filter((it) => !it.example);
  const samples = items.filter((it) => it.example);

  const renderCard = (it: GalleryItem) => (
    <li key={it.id} className={styles.card}>
      <div className={styles.window}>
        <StickerView src={`${BASE}/api/gallery/${it.id}`} alt={`Sticker ${it.name}`} holo={it.holo} />
      </div>
      <h3>{it.name}</h3>
      {it.style && <p className={styles.style}>{it.style}</p>}
      {it.idea && <p className={styles.idea}>“{it.idea}”</p>}
      <div className={styles.meta}>
        <button
          className={styles.like}
          onClick={() => likeItem(it.id)}
          aria-pressed={Boolean(liked[it.id])}
          aria-label={`Me gusta ${it.name}`}
        >
          <HeartIcon filled={liked[it.id]} />
          <span>{it.likes ?? 0}</span>
        </button>
        <span>{when(it.ts)}</span>
        <button
          className={styles.report}
          onClick={() => reportItem(it.id)}
          disabled={reported[it.id]}
          aria-label={`Reportar ${it.name}`}
        >
          {reported[it.id] ? "Reportado" : "Reportar"}
        </button>
      </div>
    </li>
  );

  return (
    <div className={home.shell}>
      <PortalFilters />
      <header className={home.header}>
        <Link className={home.brand} href="/" aria-label="Kalko, inicio">
          <FlaskIcon />
          <span>Kalko</span>
        </Link>
        <nav className={home.nav} aria-label="Principal">
          <Link href="/#muestras">Muestras</Link>
          <Link href="/laboratorio" className={home.navCta}>
            Abrir el laboratorio
          </Link>
        </nav>
      </header>

      <main className={styles.main}>
        <div className={styles.head}>
          <h1>Galería de la comunidad</h1>
          <Mascot
            who="chill"
            size={100}
            says="Acá llegan los stickers que la gente decide publicar. Todos pasan por moderación y aprobación antes de aparecer."
          />
        </div>

        {state === "error" && (
          <p className={styles.error} role="alert">
            No pudimos abrir la galería.{" "}
            <button className={styles.retry} onClick={() => load()}>
              Reintentar
            </button>
          </p>
        )}

        <section className={styles.section} aria-labelledby="community-title">
          <h2 id="community-title">Kalkos de la comunidad</h2>
          {state === "ready" && community.length === 0 ? (
            <div className={styles.empty}>
              <Mascot
                who="electrica"
                size={120}
                says="¡Todavía no hay nada! Genera un sticker en el laboratorio y sé el primero en publicarlo."
              />
              <Link href="/laboratorio" className={home.primary}>
                Abrir el laboratorio
              </Link>
            </div>
          ) : (
            <ul className={styles.grid} aria-busy={state === "loading"}>
              {community.map(renderCard)}
            </ul>
          )}
        </section>

        {samples.length > 0 && (
          <section className={styles.section} aria-labelledby="samples-title">
            <h2 id="samples-title">Muestras del laboratorio</h2>
            <ul className={styles.grid}>{samples.map(renderCard)}</ul>
          </section>
        )}

        {state === "loading" && <p className={styles.loading}>Abriendo el portal…</p>}
        {cursor && state === "ready" && (
          <div className={styles.more}>
            <button className={home.ghost} onClick={() => load(cursor)}>
              Cargar más
            </button>
          </div>
        )}
      </main>

      <footer className={home.footer}>
        <p>Hecho en Webflow Cloud · Imágenes generadas con IA · Contenido publicado por usuarios</p>
      </footer>
    </div>
  );
}
