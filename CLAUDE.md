# Kalko

Laboratorio de stickers con IA. El usuario sube una imagen o describe una
idea, responde 2-4 preguntas guiadas y recibe 4 opciones generadas en
paralelo. Cada opción se troquela en el navegador y se puede refinar,
descargar (PNG o A4), compartir (WhatsApp o historia de Instagram) y
publicar en una galería con aprobación.

Proyecto personal para el **Nerdearla 2026 App Challenge** de Webflow
(https://nerdearla-app-showcase.webflow.io/#how).

Documentación técnica en [`docs/`](docs/README.md): arquitectura, API,
almacenamiento, seguridad y lo realizado por pilar. Mantenerla al día
cuando cambie el comportamiento.

## Concurso

- **Cierre de envíos: viernes 25/09/2026, 18:00 ART.** Ganadores: sábado
  26/09, 12:00 ART.
- Requisitos: app fullstack desplegada en **Webflow Cloud** con URL
  pública. Un proyecto por cuenta de GitHub.
- Categorías: Mejor Tech, Mejor Diseño y Best in Show. No hay rúbrica y
  juzgan ingenieros de Webflow. **Objetivo: Best in Show.**
- El formulario pide usuario de GitHub, URL de la app y email; descripción
  y LinkedIn son opcionales.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript. Estilos con **CSS
  Modules** y tokens en `src/app/globals.css`; Tailwind está instalado
  pero no se usa.
- Runtime: Cloudflare Workers vía `@opennextjs/cloudflare` (Webflow
  Cloud). `wrangler.json` declara los bindings y `webflow.json` el
  framework.
- IA: **solo OpenAI** (Bedrock descartado). Los modelos se leen de env,
  con defaults `gpt-6-luna` (chat) y `gpt-image-2.5-flare` (imagen,
  `quality: low`, `background: transparent`, PNG).
  - Fuentes: https://developers.openai.com/api/docs/models y
    https://developers.openai.com/api/docs/guides/image-generation.
  - GPT Image requiere la organización verificada (lo está).

## App en Webflow Cloud

- App `kalko` (id `fab0e9b0-e754-4502-903e-2eb0d8406314`), standalone,
  mount `/`. Site id `6ab5bd40f60978e224978408`.
- Entorno `main` (id `71dc8767-abb3-4cbd-bf3b-5b63459cb27d`) →
  **https://kalko.webflow.io/**. Deploy automático en cada push a `main`
  (tarda ~2-4 min).
- El subdominio se cambió desde el dashboard; la URL autogenerada vieja da
  404. Si vuelve a cambiar, actualizar el default de `SITE_URL` en
  `src/app/layout.tsx`.
- Bindings: KV `RATE_LIMIT_KV` y `GALLERY_KV`, y R2 `GALLERY_R2`. En
  `wrangler.json` van ids de relleno; Webflow los aprovisiona.
- Variables de entorno: lista completa en
  [docs/arquitectura.md](docs/arquitectura.md#configuración). **Una
  variable nueva o cambiada requiere redeploy.**

## Decisiones que condicionan el diseño

- **Timeout de 20 s sin bytes** (medido: 504 a los 20,3 s; SSE de 33 s
  OK). Por eso `/api/generate` responde en SSE con vistas parciales y
  keep-alive, y genera una imagen por request, con 4 en paralelo. Límites
  de la plataforma: https://developers.webflow.com/webflow-cloud/limits
- **5 imágenes/min** por organización en OpenAI. Ante un 429, el servidor
  espera y reintenta con el stream abierto (evento `queued`). No se sube
  el tier.
- **Imagen en el navegador:** troquel, A4, WhatsApp e historias en canvas.
  El worker no procesa imágenes.
- **Assets en otro origen:** Webflow sirve `_next/` desde
  `<env>.wf-app-prod.cosmic.webflow.services` (`ASSETS_PREFIX`). Un
  `url()` relativo en una custom property CSS se resuelve contra ese
  origen y CORS lo bloquea, así que las máscaras usan `useMask()` (URL
  absoluta). La CSP incluye ese origen.
- `basePath` sale de `BASE_URL`; en el cliente usar
  `NEXT_PUBLIC_BASE_PATH` para todo `fetch` y asset.

## Estado (25/09/2026)

Todo desplegado y verificado en producción, con un flujo real de punta a
punta:

- **Páginas:**
  - `/`: home con hero, cómo funciona narrado por Kalko, 11 muestras,
    "bajo el capó" y roadmap;
  - `/laboratorio`: la app (acepta `?idea=`);
  - `/galeria`: dos secciones, "Kalkos de la comunidad" (con me gusta) y
    "Muestras del laboratorio";
  - `/admin`: backoffice, con `noindex`.
- **Laboratorio:**
  - entrevista → 4 opciones con vista previa en vivo;
  - acabados: borde fino/medio/grueso; blanco, portal u holo; línea de
    corte;
  - refinar con historial para deshacer;
  - descargar PNG, hoja A4, "Compartir"/"Para WhatsApp" e "Historia", con
    3 plantillas 9:16 para Instagram;
  - publicar.
  - La casilla "Publicar la primera imagen en la galería" viene
    **marcada por defecto**, por decisión del usuario para el hackatón:
    envía como pendiente el primer sticker que termina.
- **Mascotas** (`src/components/Mascot.tsx`): Kalko, Pelusa Eléctrica y
  Pelusa Chill. Imágenes en `public/*.webp`.
- **Muestras:** `public/examples/` + `src/lib/examples.ts`, generadas con
  la propia app. Se importan a la galería desde /admin; la importación es
  idempotente.
- **Zoom 3D** (`StickerZoom.tsx`): todo `StickerView` abre un `<dialog>`
  con giro por puntero o dedo. `zoomable={false}` lo desactiva.
- **Galería:**
  - moderación `omni-moderation-latest` y aprobación manual;
  - 5 reportes ocultan un sticker (las muestras nunca);
  - un me gusta por visitante.
  - Detalle en [docs/almacenamiento.md](docs/almacenamiento.md).
- **Seguridad:** revisión y parches del 25/09 (validación de origen, tipo
  y tamaño; *magic bytes*; errores sin filtrar a OpenAI; headers).
  Pendientes en [docs/seguridad.md](docs/seguridad.md). El más importante
  es verificar el rate limit en producción con el diagnóstico de
  `GET /api/admin/session` (solo con sesión de admin).

## Reglas de trabajo

- **Pedir confirmación antes de cada push a `main`.** Cada push despliega a
  producción (pedido del usuario el 25/09).
- **No nombrar la serie de referencia** del diseño en UI, código, commits
  ni docs.
- Secretos: `OPENAI_API_KEY` y `ADMIN_PASSWORD` se cargan con
  `webflow apps env-vars set <KEY> --secret`, leyendo de stdin o de un
  prompt oculto. Nunca como argumento, en el chat, en el código ni en los
  commits. En local van en `.env.local` (ignorado por git); nunca leerlo
  ni imprimirlo.
- Configurar y mantener un **límite de gasto en OpenAI**: es el techo real
  de costo.
- El repo es público: la documentación de riesgos abiertos va en términos
  generales, sin pasos para explotarlos.
- Tras cambios de UI, correr el detector de `impeccable`:
  `~/.claude/plugins/cache/impeccable/impeccable/4.4.0/skills/impeccable/scripts/impeccable detect <rutas>`.

## Comandos y trampas del entorno

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run preview` | Build OpenNext + runtime de Workers en local |
| `npm run cf-typegen` | Regenera `cloudflare-env.d.ts` tras tocar `wrangler.json` |
| `npx tsc --noEmit` | Chequeo de tipos |

- `npm install` falla por `sharp`: usar `npm install --ignore-scripts` y
  después `npm rebuild esbuild workerd`.
- Nunca correr `next build` ni `opennextjs-cloudflare build` con el dev
  server activo: rompe `.next`. Si pasa, `rm -rf .next` y reiniciar.
- Matar servidores con `fuser -k <puerto>/tcp`, no con `pkill -f`.
- No encadenar `build | tail && git ...`: el pipe oculta el código de
  salida. Mirar el exit code del build antes de commitear.
- `next/font` descarga las fuentes de Google al buildear: si falla por
  red, reintentar.
- OpenNext mete `.env.local` en `.open-next/cloudflare/next-env.mjs`. No
  desplegar desde local y borrar `.open-next/` después de un preview.
- Probar en local con credenciales descartables inline, por ejemplo
  `OPENAI_API_KEY=sk-fake ADMIN_USER=admin-local ADMIN_PASSWORD=solo-prueba-local npx next dev -p 3100`.
  Para la UI, simular `/api/interview`, `/api/options` y `/api/generate`
  con rutas de Playwright y no gastar cupo.

## Webflow: MCP y skills

- MCP `webflow`: llamar a `webflow_guide_tool` una vez por sesión.
  `data_apps_tool` gestiona apps, entornos, deploys y logs (no escribe
  valores de variables).
- Plugin `webflow-skills`: `webflow-cli:cloud`, `webflow-mcp:cloud-apps`,
  `troubleshoot-deploy`, `pre-deploy-check`.
- CLI: `webflow apps ...` (`webflow cloud ...` está deprecado).

## Git

- Remote: `git@github.com-craftech:my-org-gus/hello-world-nextjs.git`.
- **Excepción autorizada para el hackatón:** commits directos a `main`,
  siempre con confirmación antes del push.
- Formato: `<tipo>(<scope>): <descripción>` en español, en imperativo,
  con minúscula inicial y sin punto final.

## Roadmap y viabilidad (validado el 25/09/2026)

Roadmap del home en `ROADMAP` (`src/app/page.tsx`).

- **Telegram:** un bot es viable; los bienes digitales solo se cobran con
  Stars (https://core.telegram.org/bots/payments-stars).
- **WhatsApp:**
  - desde el 15/01/2026 Meta prohíbe los chatbots de IA de propósito
    general, pero un bot acotado a stickers entra;
  - los pagos en el chat solo existen en India y Brasil, así que se usaría
    un link de pago a la web;
  - cada mensaje tiene costo.
- **Marca de agua** después de 5 generaciones al mes por cuenta: hay que
  aplicarla en el servidor y requiere cuentas.
- Una web no puede instalar un pack de stickers en WhatsApp (requiere app
  nativa) ni publicar directo en historias de Instagram (el deep link es
  solo para apps nativas registradas en Meta). Por eso se usa Web Share.

## Decisiones cerradas

- El sticker de ejemplo "LGTM" queda como está.
- Compartir desde Android llega a WhatsApp como PNG; se acepta.
- La casilla de publicación queda marcada por defecto.

## Envío al concurso

Descripción propuesta:

> Kalko es un laboratorio de stickers con IA. Lanzas una foto o una idea
> al portal, la IA te hace 2-4 preguntas rápidas y trae cuatro versiones
> distintas en paralelo, que aparecen en vivo mientras se generan. Cada una
> se troquela en el navegador (borde blanco, portal u holográfico, línea
> de corte), se puede refinar con una frase, ver en 3D y descargar como PNG
> o en hoja A4 a 300 dpi. Se comparte como sticker de WhatsApp o como
> historia de Instagram con tres plantillas. La galería de la comunidad
> tiene moderación, aprobación y me gusta. Next.js en Webflow Cloud,
> streaming SSE para esquivar el timeout de 20 s, KV y R2 para datos, y
> OpenAI (GPT + GPT Image) para la entrevista y las imágenes.
