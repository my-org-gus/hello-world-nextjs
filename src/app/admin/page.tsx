"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FlaskIcon } from "@/components/Icons";
import { Mascot } from "@/components/Mascot";
import { canvasToPublishDataUrl, dieCut } from "@/lib/diecut";
import { EXAMPLES } from "@/lib/examples";
import type { GalleryItem, GalleryStatus } from "@/lib/gallery";
import home from "../home.module.css";
import styles from "./admin.module.css";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const TABS: { status: GalleryStatus; label: string; empty: string }[] = [
  { status: "pending", label: "Pendientes", empty: "No hay stickers esperando aprobación." },
  { status: "published", label: "Publicados", empty: "Todavía no hay stickers publicados." },
  { status: "hidden", label: "Ocultos", empty: "No hay stickers ocultos ni reportados." },
];

type Session = { configured: boolean; admin: boolean } | undefined;

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw Object.assign(new Error(data.error ?? "Error inesperado"), { status: res.status });
  return data;
}

export default function Admin() {
  const [session, setSession] = useState<Session>();
  const [tab, setTab] = useState<GalleryStatus>("pending");
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [importing, setImporting] = useState<string>();

  const refreshSession = useCallback(async () => {
    setSession(await api<{ configured: boolean; admin: boolean }>("/api/admin/session").catch(() => ({ configured: false, admin: false })));
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const load = useCallback(async (status: GalleryStatus) => {
    setLoading(true);
    try {
      const data = await api<{ items: GalleryItem[] }>(`/api/admin/items?status=${status}`);
      setItems(data.items);
    } catch (err) {
      if ((err as { status?: number }).status === 401) setSession({ configured: true, admin: false });
      else setMessage((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.admin) load(tab);
  }, [session?.admin, tab, load]);

  async function act(id: string, action: "approve" | "hide" | "restore" | "delete") {
    if (action === "delete" && !window.confirm("¿Eliminar este sticker para siempre?")) return;
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      await api(`/api/admin/items/${id}`, { method: "POST", body: JSON.stringify({ action }) });
      setItems((prev) => prev.filter((it) => it.id !== id));
      setMessage(
        { approve: "Aprobado: ya se ve en la galería.", restore: "Restaurado en la galería.", hide: "Ocultado de la galería.", delete: "Eliminado." }[action],
      );
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  }

  async function importExamples() {
    let added = 0;
    try {
      for (const [i, ex] of EXAMPLES.entries()) {
        setImporting(`Troquelando y subiendo ${i + 1} de ${EXAMPLES.length}: ${ex.name}`);
        const canvas = await dieCut(`${BASE}${ex.image}`, ex.finish);
        const res = await api<{ skipped: boolean }>("/api/admin/import", {
          method: "POST",
          body: JSON.stringify({
            slug: ex.id,
            image: canvasToPublishDataUrl(canvas),
            name: ex.name,
            style: ex.style,
            idea: ex.idea,
            holo: ex.finish.color === "holo",
            order: i,
          }),
        });
        if (!res.skipped) added++;
      }
      setMessage(added ? `Importamos ${added} muestras a la galería.` : "Las muestras ya estaban en la galería.");
      if (tab === "published") load("published");
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setImporting(undefined);
    }
  }

  async function logout() {
    await api("/api/admin/login", { method: "DELETE" }).catch(() => undefined);
    setSession({ configured: true, admin: false });
    setItems([]);
  }

  return (
    <div className={home.shell}>
      <header className={home.header}>
        <Link className={home.brand} href="/" aria-label="Kalko, inicio">
          <FlaskIcon />
          <span>Kalko</span>
        </Link>
        <nav className={home.nav} aria-label="Backoffice">
          <Link href="/galeria">Ver galería</Link>
          {session?.admin && (
            <button className={styles.logout} onClick={logout}>
              Cerrar sesión
            </button>
          )}
        </nav>
      </header>

      <main className={styles.main}>
        <h1>Backoffice</h1>

        {!session && <p className={styles.muted}>Cargando…</p>}

        {session && !session.configured && (
          <Mascot
            who="chill"
            size={96}
            says="El backoffice todavía no está configurado. Faltan las variables ADMIN_USER y ADMIN_PASSWORD en el entorno."
          />
        )}

        {session?.configured && !session.admin && <Login onDone={refreshSession} />}

        {session?.admin && (
          <>
            <div className={styles.toolbar}>
              <div className={styles.tabs} role="tablist" aria-label="Estado de los stickers">
                {TABS.map((t) => (
                  <button
                    key={t.status}
                    role="tab"
                    aria-selected={tab === t.status}
                    className={styles.tab}
                    onClick={() => {
                      setMessage(undefined);
                      setTab(t.status);
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <button className={home.ghost} onClick={importExamples} disabled={Boolean(importing)}>
                Importar las {EXAMPLES.length} muestras del home
              </button>
            </div>

            {(importing || message) && (
              <p className={styles.notice} role="status" aria-live="polite">
                {importing ?? message}
              </p>
            )}

            {loading ? (
              <p className={styles.muted}>Abriendo el portal…</p>
            ) : items.length === 0 ? (
              <p className={styles.muted}>{TABS.find((t) => t.status === tab)!.empty}</p>
            ) : (
              <ul className={styles.list} role="tabpanel" aria-label={TABS.find((t) => t.status === tab)!.label}>
                {items.map((it) => (
                  <li key={it.id} className={styles.row}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`${BASE}/api/admin/image/${it.id}`} alt={`Sticker ${it.name}`} className={styles.thumb} loading="lazy" />
                    <div className={styles.info}>
                      <h2>{it.name}</h2>
                      <p className={styles.muted}>
                        {it.style}
                        {it.example ? " · muestra del home" : ""}
                        {it.reports ? ` · ${it.reports} reporte${it.reports > 1 ? "s" : ""}` : ""}
                      </p>
                      {it.idea && <p className={styles.idea}>“{it.idea}”</p>}
                      <p className={styles.date}>{new Date(it.ts).toLocaleString("es")}</p>
                    </div>
                    <div className={styles.actions}>
                      {tab === "pending" && (
                        <button className={styles.approve} disabled={busy[it.id]} onClick={() => act(it.id, "approve")}>
                          Aprobar
                        </button>
                      )}
                      {tab === "hidden" && (
                        <button className={styles.approve} disabled={busy[it.id]} onClick={() => act(it.id, "restore")}>
                          Restaurar
                        </button>
                      )}
                      {tab === "published" && (
                        <button className={styles.secondary} disabled={busy[it.id]} onClick={() => act(it.id, "hide")}>
                          Ocultar
                        </button>
                      )}
                      <button className={styles.danger} disabled={busy[it.id]} onClick={() => act(it.id, "delete")}>
                        {tab === "pending" ? "Rechazar" : "Eliminar"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Login({ onDone }: { onDone: () => void }) {
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [sending, setSending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(undefined);
    try {
      await api("/api/admin/login", { method: "POST", body: JSON.stringify({ user, password }) });
      setPassword("");
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <form className={styles.login} onSubmit={submit}>
      <label htmlFor="admin-user">Usuario</label>
      <input id="admin-user" autoComplete="username" value={user} onChange={(e) => setUser(e.target.value)} required />
      <label htmlFor="admin-password">Contraseña</label>
      <input
        id="admin-password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <button type="submit" className={home.primary} disabled={sending}>
        {sending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
