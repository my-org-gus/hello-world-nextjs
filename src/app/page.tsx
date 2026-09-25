import Link from "next/link";
import { DieCutImage } from "@/components/DieCutImage";
import { FlaskIcon } from "@/components/Icons";
import { Mascot } from "@/components/Mascot";
import { Portal, PortalFilters } from "@/components/Portal";
import { EXAMPLES } from "@/lib/examples";
import styles from "./home.module.css";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const asset = (path: string) => `${BASE}${path}`;
const byId = (id: string) => EXAMPLES.find((e) => e.id === id)!;

const HERO = [byId("carpincho"), byId("tux-bugs"), byId("cafe")];
const DEMO = byId("gato-force");

export default function Home() {
  return (
    <div className={styles.shell}>
      <PortalFilters />

      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="Kalko, inicio">
          <FlaskIcon />
          <span>Kalko</span>
        </Link>
        <nav className={styles.nav} aria-label="Principal">
          <a href="#muestras">Muestras</a>
          <a href="#como">Cómo funciona</a>
          <Link href="/laboratorio" className={styles.navCta}>
            Abrir el laboratorio
          </Link>
        </nav>
      </header>

      <main>
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroCopy}>
            <h1 id="hero-title">
              Tu sticker ya existe <span className={styles.accent}>en otra dimensión.</span>
            </h1>
            <p className={styles.lede}>
              Kalko es un laboratorio de calcomanías con IA. Le das una foto o una idea, responde contigo un par de
              preguntas y trae cuatro versiones troqueladas, listas para descargar o imprimir en A4.
            </p>
            <div className={styles.heroActions}>
              <Link href="/laboratorio" className={styles.primary}>
                Abrir el laboratorio
              </Link>
              <a href="#muestras" className={styles.ghost}>
                Ver {EXAMPLES.length} muestras
              </a>
            </div>
          </div>

          <div className={styles.heroStage} aria-hidden>
            <Portal />
            <div className={styles.host}>
              <Mascot who="kalko" size={200} />
            </div>
            {HERO.map((ex, i) => (
              <div key={ex.id} className={styles.orbit} data-slot={i}>
                <DieCutImage src={asset(ex.image)} alt="" finish={ex.finish} eager />
              </div>
            ))}
          </div>
        </section>

        <section id="como" className={styles.how} aria-labelledby="how-title">
          <h2 id="how-title">Del portal a tu laptop en menos de un minuto</h2>
          <Mascot
            who="kalko"
            size={112}
            className={styles.narrator}
            says="¡Hola, soy Kalko! Tú me traes una muestra, yo abro el portal y te hago un par de preguntas. Después elegimos juntos la dimensión que más te guste."
          />
          <ol className={styles.steps}>
            <li className={styles.step}>
              <h3>Lanza una muestra</h3>
              <p>Una foto, un dibujo o una frase. Lo que tengas.</p>
              <div className={styles.demoIdea}>
                <span className={styles.demoLabel}>Idea</span>“{DEMO.idea}”
              </div>
            </li>
            <li className={styles.step}>
              <h3>Calibra el portal</h3>
              <p>La IA entiende tu idea y te hace de 2 a 4 preguntas que realmente cambian el diseño.</p>
              <div className={styles.demoChips}>
                {DEMO.answers.map((a) => (
                  <span key={a} className={styles.chip}>
                    {a}
                  </span>
                ))}
              </div>
            </li>
            <li className={styles.step}>
              <h3>Elige tu dimensión</h3>
              <p>Cuatro variantes en paralelo. Troquela, refina con una frase y descarga el PNG o la hoja A4.</p>
              <div className={styles.demoSticker}>
                <DieCutImage src={asset(DEMO.image)} alt={`Sticker ${DEMO.name}`} finish={DEMO.finish} />
              </div>
            </li>
          </ol>
        </section>

        <section id="muestras" className={styles.gallery} aria-labelledby="gallery-title">
          <div className={styles.galleryHead}>
            <h2 id="gallery-title">Muestras del laboratorio</h2>
            <div className={styles.hosts}>
              <Mascot
                who="electrica"
                size={104}
                says="¡Todas salieron de este mismo laboratorio! Misma entrevista, cuatro dimensiones, y elegimos la mejor."
              />
              <Mascot
                who="chill"
                size={104}
                side="left"
                says="Tranqui, pasa el cursor por encima y mira cómo brilla el vinilo. Si una te gusta, pruébala tú."
              />
            </div>
          </div>

          <ul className={styles.grid}>
            {EXAMPLES.map((ex) => (
              <li key={ex.id} className={styles.card}>
                <div className={styles.window}>
                  <DieCutImage src={asset(ex.image)} alt={`Sticker ${ex.name}`} finish={ex.finish} />
                </div>
                <div className={styles.cardBody}>
                  <p className={styles.quote}>“{ex.idea}”</p>
                  {ex.reference && (
                    <div className={styles.reference}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={asset(ex.reference)} alt="Imagen de referencia usada" loading="lazy" />
                      <span>Con imagen de referencia</span>
                    </div>
                  )}
                  <div className={styles.answers}>
                    {ex.answers.map((a) => (
                      <span key={a}>{a}</span>
                    ))}
                  </div>
                  <div className={styles.cardFoot}>
                    <div>
                      <h3>{ex.name}</h3>
                      <p className={styles.finishNote}>
                        Borde {ex.finish.width} · {ex.finish.color === "holo" ? "holográfico" : ex.finish.color}
                        {ex.finish.cutLine ? " · línea de corte" : ""}
                      </p>
                    </div>
                    <Link
                      className={styles.try}
                      href={ex.reference ? "/laboratorio" : `/laboratorio?idea=${encodeURIComponent(ex.idea)}`}
                    >
                      {ex.reference ? "Prueba con tu imagen" : "Probar esta idea"}
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.tech} aria-labelledby="tech-title">
          <h2 id="tech-title">Bajo el capó</h2>
          <dl className={styles.specs}>
            <div>
              <dt>Streaming de imágenes</dt>
              <dd>Cada dimensión viaja por SSE con vistas previas parciales, así ninguna respuesta queda muda 20 s.</dd>
            </div>
            <div>
              <dt>Troquel en el navegador</dt>
              <dd>
                Limpieza del halo por alfa, borde por campo de distancias y línea de corte para imprenta. Sin costo de
                IA extra.
              </dd>
            </div>
            <div>
              <dt>Cola con reintento</dt>
              <dd>Si el modelo de imágenes se satura, el servidor espera y reintenta sin cortar la conexión.</dd>
            </div>
            <div>
              <dt>Límites en el borde</dt>
              <dd>Cupo por IP y tope diario en KV de Webflow Cloud para que el laboratorio siga abierto para todos.</dd>
            </div>
          </dl>
        </section>

        <section className={styles.closer} aria-labelledby="closer-title">
          <div className={styles.trio} aria-hidden>
            <Mascot who="electrica" size={96} />
            <Mascot who="kalko" size={132} />
            <Mascot who="chill" size={96} />
          </div>
          <h2 id="closer-title">¿Qué sticker traemos hoy?</h2>
          <Link href="/laboratorio" className={styles.primary}>
            Abrir el laboratorio
          </Link>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>Hecho en Webflow Cloud · Imágenes generadas con IA</p>
      </footer>
    </div>
  );
}
