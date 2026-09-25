# Kalko

Generador de calcomanías/stickers con IA. El usuario sube una imagen o
describe una idea, responde 2-4 preguntas guiadas que arma la IA, recibe
3-4 opciones generadas, puede refinar una y descargarla como PNG con
mockup de sticker troquelado. Opcionalmente la publica en una galería.

Proyecto personal para el **Nerdearla 2026 App Challenge** de Webflow
(https://nerdearla-app-showcase.webflow.io/#how).

## Concurso — datos duros

- **Cierre de envíos: viernes 25/09/2026, 18:00 ART.** Ganadores: sábado
  26/09, 12:00 ART.
- La app debe ser fullstack, estar desplegada en **Webflow Cloud** y ser
  accesible por URL pública. Un proyecto por cuenta de GitHub.
- Categorías: Mejor Tech, Mejor Diseño, Best in Show. Sin rúbrica; juzgan
  ingenieros de Webflow. **Objetivo: Best in Show** (flujo completo que
  funcione + UI muy cuidada + detalle "wow").
- Envío por formulario: usuario GitHub, URL de la app, email; descripción y
  LinkedIn opcionales.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript + Tailwind v4.
- Runtime: Cloudflare Workers vía `@opennextjs/cloudflare` (es lo que usa
  Webflow Cloud). `wrangler.json` declara bindings; `webflow.json` marca el
  framework.
- IA: **solo OpenAI** (decisión tomada; Bedrock descartado porque no hay
  modelo activo de texto→imagen para cuentas nuevas).
  - Chat/análisis: `OPENAI_CHAT_MODEL`, default `gpt-6-luna` (acepta
    imagen de entrada).
  - Imagen: `OPENAI_IMAGE_MODEL`, default `gpt-image-2.5-flare` (rápido);
    `gpt-image-2.5-sunburst` como alternativa para refinado/edición.
  - Fuente: https://developers.openai.com/api/docs/models y
    https://developers.openai.com/api/docs/guides/image-generation.
    Re-verificar IDs antes de hardcodear nada; siempre leerlos de env.
  - `background: "transparent"` + `output_format: "png"` para que el
    sticker salga recortado.
  - **Requisito:** la organización de OpenAI debe estar verificada para
    usar GPT Image (platform.openai.com/settings/organization/general).
    Si no lo está, es bloqueante.

## App en Webflow Cloud

- App `hello-world-nextjs` (id `fab0e9b0-e754-4502-903e-2eb0d8406314`),
  **standalone** (`siteAttached: false`), mount `/`.
- Entorno `main` (id `71dc8767-abb3-4cbd-bf3b-5b63459cb27d`) →
  **https://kalko.webflow.io/**. Deploy automático en
  cada push a `main`. Sin bindings ni variables aún.

## Límites de Webflow Cloud que condicionan el diseño

Fuente: https://developers.webflow.com/webflow-cloud/limits

- **Request timeout: 20 s.** OpenAI avisa que una imagen compleja puede
  tardar hasta 2 min. Es el riesgo #1 del proyecto (ver Fase 0).
- CPU 30 s/request, memoria 128 MB, bundle del worker 10 MB, 6 requests
  salientes simultáneas por request, 100 env vars por entorno.
- Storage disponible: SQLite (D1), KV, Object Storage (R2), declarados en
  `wrangler.json`; en Next.js se acceden con `getCloudflareContext()`
  **dentro** de una función, nunca a nivel módulo
  (https://developers.webflow.com/webflow-cloud/storing-data/overview).
- `next.config.ts` aplica `basePath` desde `BASE_URL` (mount de la app).
  Todo `fetch` del cliente a `/api/...` y todo asset debe respetar el
  basePath; no hardcodear rutas absolutas.

## Fase 0 — spike (hacer primero, antes de construir features)

Objetivo: resolver incógnitas que cambian la arquitectura y dejar la URL
pública funcionando desde el minuto uno.

1. ~~Deploy del template a Webflow Cloud~~ — hecho (ver "App en Webflow
   Cloud").
2. Rutas de prueba temporales:
   - `/api/spike/sleep`: espera 25 s y responde → ¿el timeout es de reloj
     total?
   - `/api/spike/stream`: manda un chunk cada 3 s durante 30 s → ¿el
     streaming sobrevive a los 20 s?
   - `/api/spike/env`: devuelve **solo** `{ processEnv: boolean,
     cfContext: boolean }` indicando si `OPENAI_API_KEY` existe en
     `process.env` y/o en `getCloudflareContext().env`. Nunca el valor.
3. En local, medir la latencia real (y confirmar que los IDs de modelo
   existen) de los dos caminos:
   - texto → imagen (entrada por descripción);
   - edición con imagen de entrada (entrada por foto y "Refinar"): la
     imagen subida va al modelo de chat para la entrevista **y** al modelo
     de imagen como referencia.
4. Decidir según resultado:
   - Streaming sobrevive → 1 imagen por request, 3-4 requests paralelos
     desde el cliente, con `stream` + `partial_images` para UX progresiva.
   - No sobrevive → 1 imagen por request con `quality` baja/media y tamaño
     reducido hasta que entre holgado en ~15 s.
   - No usar `waitUntil` + polling como primera opción (límites post-respuesta
     de Webflow Cloud no documentados).
5. Anotar el resultado acá (sección "Decisiones del spike") y borrar las
   rutas `/api/spike/*`.

### Decisiones del spike

- 2026-09-25 — Acceso OpenAI OK: org verificada, `gpt-6-luna` y
  `gpt-image-2.5-flare` responden 200. Generación texto→imagen 1024x1024,
  `quality: low`, `background: transparent`, PNG: **9,4 s** (una muestra,
  desde local). Sale RGBA; el modelo ya dibuja un borde blanco con halo
  semitransparente: en el prompt pedir borde nítido, sin glow, si el
  troquelado se hace en canvas.
- 2026-09-25 — Edición con imagen de entrada (`/v1/images/edits`, mismo
  modelo/calidad): **11,5 s**. Mantiene muy bien el estilo del original.
  El halo blanco aparece igual aunque el prompt pida "no glow".
- 2026-09-25 — En Webflow Cloud (URL pública):
  - Respuesta no-streaming de 15 s: OK. De 25 s: **504 Gateway time-out a
    los 20,3 s** (el corte es de Cloudflare frente al worker).
  - Streaming SSE con un chunk cada 3 s durante 33 s: **OK, HTTP 200**. El
    límite de 20 s se evita mientras se envíen bytes.
  - `OPENAI_API_KEY` (secret) se lee tanto con `process.env` como con
    `getCloudflareContext().env`. Usar `process.env` por simplicidad.
- **Decisión:** `/api/generate` (y la edición) responden como stream SSE:
  reenviar `partial_images` de OpenAI (`stream: true`) o, como mínimo,
  enviar keep-alive cada ~3 s y la imagen final como último evento. Una
  imagen por request, 3-4 requests paralelos desde el cliente.
  Entrevista y prompts (solo texto, rápidos) pueden ser JSON normal.
- Rutas `/api/spike/*` eliminadas.

## Flujo de la app

1. **Entrada**: subir imagen (redimensionar en el cliente con canvas a
   ~1024 px lado mayor antes de enviar) o escribir la idea.
2. **Entrevista** (`POST /api/interview`): el modelo de chat analiza la
   entrada y devuelve JSON estructurado:
   `{ summary, questions: [{ id, question, options: string[] }] }`,
   2-4 preguntas (estilo, paleta, texto sí/no, forma/borde). UI de
   opciones clickeables. Sin chat libre.
3. **Prompts** (`POST /api/prompts`): con las respuestas, devuelve 3-4
   prompts de imagen diferenciados (variar estilo/composición).
4. **Generación** (`POST /api/generate`): una imagen por request; el cliente
   dispara las 3-4 en paralelo y muestra cada una al llegar.
5. **Refinar**: elegir una opción + instrucción corta ("más colores", "sin
   texto") → edición con la imagen como input.
6. **Troquelado**: 100 % en el cliente (canvas): dilatar el alfa para borde
   blanco, sombra, leve rotación/brillo. Descarga PNG del sticker final.
7. **Galería** (opcional, última fase): publicar opt-in.

## Estado

- Fases 0-3 hechas: flujo base, troquelado y refinado. Además: rate limit,
  imagen para compartir (`src/app/opengraph-image.jpg`), favicon y foco
  accesible entre etapas. Fase 4 (galería pública) hecha.
- Rutas: `/` home (presentación, cómo funciona, 11 muestras, "bajo el
  capó") y `/laboratorio` (la app; acepta `?idea=` para precargar). Las
  muestras están en `public/examples/` + `src/lib/examples.ts`, generadas
  con la propia app y troqueladas en el navegador al entrar en pantalla.
- Mascotas (`src/components/Mascot.tsx`): Kalko (principal, narra el
  home y dice el resumen en el laboratorio), Pelusa Eléctrica y Pelusa
  Chill (presentan las muestras). Imágenes en `public/*.webp`; las dos
  pelusas se generaron con Refinar sobre la de Kalko.
- OpenAI limita la org a 5 imágenes/min con este modelo: `/api/generate`
  abre el stream, y ante 429 espera lo indicado y reintenta (hasta 5
  intentos) enviando `{type:"queued"}`; la tarjeta muestra "en cola…".
  Para más concurrencia hay que subir el tier en OpenAI.
- Troquelado (`src/lib/diecut.ts`): 100 % en el navegador. Umbral de alfa
  para limpiar el halo de OpenAI, campo de distancias chamfer (cacheado
  por imagen) para el borde, línea de corte punteada magenta, hoja A4 a
  300 dpi. Vista vinilo en `src/components/StickerView.tsx`.
- Refinar: `/api/generate` con `instruction` + `reference` (la imagen de
  la tarjeta) usa edición; el cliente guarda historial para deshacer.
- URL pública: https://kalko.webflow.io/ (subdominio cambiado desde el
  dashboard el 25/09; la URL autogenerada anterior ya da 404). Si vuelve a
  cambiar, actualizar el default de `SITE_URL` en `src/app/layout.tsx`
  (metadataBase de la imagen para compartir).
- Diseño: "laboratorio interdimensional" — portal verde que gira como pieza
  central (dropzone y estado de carga), contornos gruesos de caricatura,
  bordes levemente irregulares. Fuentes: Titan One (display), Figtree
  (texto), JetBrains Mono (solo lecturas: tiempos, ids de dimensión).
  Tokens en `src/app/globals.css`. No nombrar ninguna serie o franquicia
  de referencia en UI, código, commits ni docs.
- Zoom 3D (`src/components/StickerZoom.tsx`): todo `StickerView` abre al
  hacer clic (o Enter/Espacio) un `<dialog>` modal con el sticker grande
  que gira siguiendo el puntero o el dedo, con brillo, canto apilado y
  sombra. Cierra con Esc, botón o clic en el fondo. `zoomable={false}`
  lo desactiva.
- Variables de entorno nuevas en Webflow Cloud requieren redeploy para
  verse en runtime.
- Rate limit (`src/lib/ratelimit.ts`): KV `RATE_LIMIT_KV` (Webflow asigna
  el id real en el deploy; en `wrangler.json` va un placeholder). Por IP
  hasheada y por hora: `RL_TEXT_PER_HOUR` (40) y `RL_IMAGES_PER_HOUR` (24);
  global diario de imágenes `DAILY_GENERATION_CAP` (500). Conteo
  aproximado (KV no es atómico). Sin binding deja pasar y loguea un aviso.
  Verificado en local; en prod el binding figura aprovisionado.
- Skills de diseño instalados: `impeccable` (usar `detect` tras cambios de
  UI) e `intent`.
- `npm install` local falla por `sharp`: usar `npm install --ignore-scripts`
  + `npm rebuild esbuild workerd`.

## Fases (deploy al cerrar cada una; cortar donde llegue el tiempo)

1. Fase 0 — spike + URL pública.
2. Flujo base: entrada → entrevista → 3-4 opciones → descarga PNG.
3. Mockup troquelado (alto impacto visual, bajo costo).
4. Refinar una opción.
5. Galería pública: PNG en R2, metadata en D1 o KV. Requiere antes:
   moderación (endpoint de moderación de OpenAI sobre prompt e imagen) y
   rate limit.

Reservar las últimas ~2 h antes del cierre para pulido, prueba end-to-end
en la URL pública y envío del formulario. No empezar features nuevas
después de eso.

## Seguridad y costos

- Secret único: `OPENAI_API_KEY`. En Webflow Cloud se carga con
  `webflow apps env-vars set OPENAI_API_KEY --secret` leyendo de stdin o
  prompt oculto; **nunca** como argumento, en el chat, en código ni en
  commits. En local va en `.env.local` / `.dev.vars` (ya en `.gitignore`).
- La key se usa solo en server (route handlers). Nada de llamadas a OpenAI
  desde el cliente.
- Rate limit por IP (contador en KV) + tope global diario por env var
  (`DAILY_GENERATION_CAP`). Configurar además un límite de gasto en el
  dashboard de OpenAI: la URL es pública y el concurso atrae tráfico.
- Validar tamaño/tipo de imagen subida en el server.

## UI

- Español, marca "Kalko". Estética sticker: colores saturados, bordes
  blancos gruesos, sombras suaves, microanimaciones al aparecer cada
  opción. Mobile-first (los jueces pueden abrirla desde el celular).
- Estados de carga cuidados: la generación tarda; mostrar progreso por
  opción, no un spinner global.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm install` | Instala dependencias |
| `npm run dev` | Dev server en http://localhost:3000 |
| `npm run preview` | Build OpenNext + preview en runtime de Workers (probar antes de deployar) |
| `npm run cf-typegen` | Regenera tipos de bindings tras tocar `wrangler.json` |
| `npm run deploy` | `webflow cloud deploy` (requiere Webflow CLI) |

Webflow CLI: `npm install -g @webflow/webflow-cli@latest`. Namespace
canónico `webflow apps ...` (`webflow cloud ...` está deprecado).

## Webflow: MCP y skills

- MCP `webflow` conectado. Llamar `webflow_guide_tool` una vez por sesión
  antes de otras tools. `data_apps_tool` gestiona apps, entornos,
  deployments y logs de Cloud (no escribe valores de env vars).
- Plugin `webflow-skills` (marketplace `webflow/webflow-skills`). Skills
  útiles acá:
  - `webflow-cli:cloud`: init/deploy por CLI, env vars y secrets.
  - `webflow-mcp:cloud-apps`: estado de apps/entornos, logs de build y
    runtime vía MCP.
  - `troubleshoot-deploy`, `pre-deploy-check`, `local-dev-setup`.

## Git

- Remote: `git@github.com-craftech:my-org-gus/hello-world-nextjs.git`.
- **Excepción autorizada para el hackatón:** commits directos a `main`
  (Webflow Cloud despliega desde ahí).
- Formato: `<tipo>(<scope>): <descripción>` en español, imperativo,
  minúscula inicial, sin punto final. Tipos: feat, fix, refactor, perf,
  style, test, docs, build, ops, chore.

## Galería pública

- Flujo con aprobación: lo que envía un usuario pasa la moderación de
  OpenAI y queda **pendiente**; solo se ve en `/galeria` cuando el admin
  lo aprueba en `/admin`. Estados en KV por prefijo: `p:` pendiente,
  `g:` publicado, `h:` oculto (`src/lib/gallery.ts`). La imagen pública
  (`/api/gallery/<id>`) solo se sirve si está publicada.
- Backoffice `/admin` (noindex): login con `ADMIN_USER` y
  `ADMIN_PASSWORD` (variables de entorno de Webflow Cloud, la contraseña
  como secret; nunca en el repo ni en el chat). Sesión en cookie
  `HttpOnly; Secure; SameSite=Strict` firmada con HMAC usando la
  contraseña (12 h; cambiarla invalida sesiones). Login con rate limit
  (10/h por IP). Sin las variables, el backoffice queda deshabilitado.
  Acciones: aprobar, rechazar, ocultar, restaurar, eliminar, e importar
  las 11 muestras del home (troqueladas en el navegador, idempotente).
- Opt-in por sticker desde el laboratorio ("Publicar"), con casilla de
  consentimiento (sin personas reales sin permiso ni datos personales).
- `POST /api/gallery`: rate limit `publish` (6/h por IP), moderación
  gratuita `omni-moderation-latest` sobre texto + imagen
  (https://developers.openai.com/api/docs/guides/moderation); si se
  marca, 422 y no se guarda. Imagen WebP 768 px en R2 `GALLERY_R2`
  (`img/<id>`), metadatos como metadata de KV `GALLERY_KV` en claves
  `g:<ts invertido>:<id>` para listar de más nueva a más vieja sin leer
  cada clave.
- R2 de Webflow Cloud no admite buckets públicos: las imágenes se sirven
  por `GET /api/gallery/<id>` con caché inmutable.
- Reportes: `POST /api/gallery/<id>/report` (1 por IP y sticker); con 3
  pasa a oculto y aparece en la pestaña "Ocultos" del backoffice.
- Página `/galeria`, enlazada desde el home.

## Compartir a WhatsApp y roadmap

- "Compartir"/"Para WhatsApp" (`whatsappSticker` en `src/lib/diecut.ts`):
  WebP 512×512 ≤ 100 KB con margen, según la spec de stickers de
  WhatsApp (https://github.com/WhatsApp/stickers/blob/main/Android/README.md).
  En mobile usa Web Share con archivos (el usuario elige WhatsApp); sin
  soporte, descarga. Safari no codifica WebP en canvas: cae a PNG. Una web
  no puede instalar un pack de stickers (requiere app nativa).
- Roadmap del home (`ROADMAP` en `src/app/page.tsx`), solo ideas, nada
  implementado. Viabilidad validada el 25/09/2026:
  - Telegram: bot viable; bienes digitales solo con Telegram Stars
    (https://core.telegram.org/bots/payments-stars).
  - WhatsApp: desde el 15/01/2026 Meta prohíbe chatbots de IA de propósito
    general en la Business Platform; un bot acotado a crear stickers
    entra. Pagos en el chat solo India/Brasil → link de pago a la web.
    Costo por mensaje.
  - Marca de agua tras 5 generaciones/mes por cuenta: aplicarla en el
    servidor (en el cliente se puede quitar); requiere cuentas.

## Decisiones finales (25/09/2026)

- No se sube el tier de OpenAI: queda el tope de 5 imágenes/min; la cola
  con reintento absorbe la concurrencia (más espera, sin fallos).
- El sticker de ejemplo "LGTM" queda como está.
- Compartir desde Android llega a WhatsApp como PNG (imagen, no sticker);
  se acepta así.

## Envío al concurso

Formulario: https://nerdearla-app-showcase.webflow.io/#how (cierre 25/09
18:00 ART). Campos: usuario GitHub, URL, email (obligatorios); descripción
y LinkedIn opcionales. Descripción propuesta:

> Kalko es un laboratorio de stickers con IA. Lanzas una foto o una idea
> al portal, la IA te hace 2-4 preguntas rápidas (estilo, paleta, texto) y
> trae cuatro versiones distintas en paralelo, que aparecen en vivo
> mientras se generan. Cada una se troquela en el navegador (borde blanco,
> portal u holográfico, línea de corte para imprenta), se puede refinar
> con una instrucción ("más colores", "sin texto") y descargar como PNG o
> en una hoja A4 a 300 dpi lista para imprimir, o compartir en formato
> sticker de WhatsApp desde el celular. Next.js en Webflow Cloud,
> streaming SSE para esquivar el timeout de 20 s, KV para rate limit y
> OpenAI (GPT + GPT Image) para la entrevista y las imágenes.
