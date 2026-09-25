# API

Todas las rutas viven en `src/app/api/` y son `force-dynamic`. Todos los
`POST` pasan por `readJson()` (`src/lib/validate.ts`), que devuelve:

| Código | Cuándo |
|---|---|
| 403 | `Sec-Fetch-Site: cross-site` (pedido disparado desde otro sitio) |
| 415 | `Content-Type` distinto de `application/json` |
| 413 | Body mayor al máximo de la ruta (se corta la lectura sin leer el resto) |

Errores: las validaciones propias devuelven 400 con un mensaje para el
usuario. Los errores de OpenAI nunca llegan literales: 429 pasa como 429
con un mensaje propio y el resto como 502 genérico; en los logs solo
quedan `status` y `error.code`.

## Públicas

| Método y ruta | Body máx. | Cupo | Descripción |
|---|---|---|---|
| `POST /api/interview` | 4,5 MB | `text` | `{ idea?, image? }` → `{ summary, subject, questions[] }` |
| `POST /api/options` | 64 KB | `text` | `{ idea, summary, hasReference, answers[] }` → `{ options[4] }` |
| `POST /api/generate` | 4,5 MB | `image` + tope diario | `{ prompt }` o `{ instruction, reference }` → SSE |
| `GET /api/gallery?cursor=` | — | — | Stickers publicados, 24 por página (`Cache-Control: public, max-age=20`) |
| `POST /api/gallery` | 2,2 MB | `publish` | `{ image, name, style, idea, holo, consent: true }` → 201 pendiente; 422 si la moderación lo marca |
| `GET /api/gallery/<id>` | — | — | Imagen, solo si está publicada (si no, 404) |
| `POST /api/gallery/<id>/report` | 64 KB | `report` | Un reporte por IP; con 5 se oculta (salvo las muestras) |
| `POST /api/gallery/<id>/like` | 64 KB | `like` | Un me gusta por IP → `{ likes, liked }` |

### `/api/generate` (SSE)

- `prompt`: hasta 2000 caracteres. `reference` (data URL PNG/JPEG/WebP
  de hasta 4 MB) cambia a `images/edits`.
- `instruction` (hasta 300 caracteres) exige `reference` y arma el prompt
  de refinado (`refinePrompt`).
- Eventos (`data: {...}`):
  - `{type:"partial", b64}`: vista previa;
  - `{type:"done", b64}`: PNG final con transparencia;
  - `{type:"queued"}`: esperando cupo de OpenAI;
  - `{type:"error", message}`.
- Keep-alive `: ping` cada 4 s.

### Validación de imágenes

`parseImage()` exige un data URL `data:image/(png|jpeg|webp);base64,`,
base64 bien formado y *magic bytes* que coincidan con el tipo declarado
(PNG `89 50 4E 47`, JPEG `FF D8 FF`, WebP `RIFF….WEBP`). La galería solo
acepta WebP o PNG.

## Admin (requieren la cookie de sesión)

| Método y ruta | Descripción |
|---|---|
| `POST /api/admin/login` | `{ user, password }` → cookie `kalko_admin`; cupo `login` |
| `DELETE /api/admin/login` | Cierra la sesión (borra la cookie) |
| `GET /api/admin/session` | `{ configured, admin, diagnostics? }`; `diagnostics` solo con sesión |
| `GET /api/admin/items?status=pending\|published\|hidden&cursor=` | Lista por estado |
| `POST /api/admin/items/<id>` | `{ action: "approve" \| "restore" \| "hide" \| "delete" }` |
| `GET /api/admin/image/<id>` | Imagen en cualquier estado (`private, no-store`) |
| `POST /api/admin/import` | Importa una muestra del home ya troquelada; idempotente por slug |

`diagnostics` informa, sin valores: si existe el binding `RATE_LIMIT_KV`,
qué header de IP llega (`cf-connecting-ip`, `x-forwarded-for` o ninguno) y
si KV devuelve de inmediato un valor recién escrito.
