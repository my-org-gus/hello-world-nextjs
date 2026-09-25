# Seguridad

Estado al 25/09/2026, después de la revisión de seguridad de ese día.

## Controles vigentes

**Secretos**
- Única credencial de IA: `OPENAI_API_KEY`, como secret de Webflow Cloud
  (`webflow apps env-vars set OPENAI_API_KEY --secret`, leyendo de stdin).
  Nunca en el repo, el chat, los logs ni el cliente.
- La key solo se usa en los route handlers. `cloudflare-env.d.ts` tiene
  el tipo, no el valor.
- `ADMIN_PASSWORD`, también como secret. `ADMIN_USER` es variable común.

**Pedidos**
- `readJson()` en todos los `POST`:
  - 403 si es cross-site (`Sec-Fetch-Site`);
  - 415 si no es JSON, lo que fuerza el preflight CORS, y el preflight
    falla porque ninguna ruta devuelve `Access-Control-Allow-*`;
  - 413 si el body supera el máximo.
- Imágenes validadas por tipo, largo, base64 y *magic bytes*.
- Textos truncados en el servidor (idea 600, instrucción 300, prompt
  2000, nombre 60, estilo 80, idea de galería 200).

**Headers** (`next.config.ts`, todas las rutas)
- CSP en `Report-Only`, con el origen de assets de Webflow y el CDN de su
  badge.
- `X-Frame-Options: DENY`.
- `X-Content-Type-Options: nosniff`.
- `Referrer-Policy: strict-origin-when-cross-origin`.
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
- HSTS de un año.
- Sin `x-powered-by`.

**Errores y logs**
- Los mensajes de OpenAI no llegan al cliente ni a los logs; solo se
  registran `status` y `error.code`.
- No se reintenta un 429 por gasto o cupo agotado (`insufficient_quota`,
  `*_spend_limit_exceeded`, `credit_balance_exhausted`).

**Galería**
- Todo lo publicado pasa por `omni-moderation-latest` (texto + imagen).
  La moderación falla cerrada: si OpenAI no responde, no se guarda nada.
- Todo queda pendiente hasta que el admin lo aprueba. Pendientes y ocultos
  dan 404, igual que un id inexistente.
- Los reportes ocultan con 5 (las muestras nunca).
- No hay `dangerouslySetInnerHTML`: todo el texto se renderiza escapado.

**Admin**
- Credenciales comparadas vía HMAC en tiempo constante.
- Sesión: cookie `HttpOnly; Secure; SameSite=Strict`, 12 h, firmada con
  HMAC usando `ADMIN_PASSWORD`. Cambiar la contraseña invalida todas las
  sesiones.
- `webflow.io` está en la Public Suffix List, así que otros
  `*.webflow.io` cuentan como cross-site y no reciben la cookie.
- `/admin` con `noindex`.

**Costo**
- Cupos por IP y tope diario de imágenes (ver [arquitectura](arquitectura.md#configuración)).
- Techo real: la cuenta de OpenAI es prepaga, con USD 10 de crédito y
  sin recarga automática. Al agotarse, OpenAI responde
  `insufficient_quota` y no se reintenta.

## Pendientes conocidos

| Tema | Riesgo | Plan |
|---|---|---|
| Rate limit en prod (trabajo futuro) | A la app no le llega `cf-connecting-ip` y la IP sale de `x-forwarded-for` | Confirmar qué entrada de `x-forwarded-for` agrega el proxy de Webflow, usar solo esa, agrupar IPv6 por /64 y fallar cerrado; después, contador atómico |
| Contadores no atómicos (KV) | Con requests en paralelo se excede el cupo y el tope diario | D1 (`UPDATE … RETURNING`), Durable Objects o el binding de Rate Limiting de Workers, si Webflow Cloud los admite |
| `/api/generate` acepta un `prompt` libre | Uso fuera del flujo del laboratorio | Turnstile y prompts firmados con HMAC desde `/api/options` |
| IP: fallback a `x-forwarded-for` | Se puede falsear si `cf-connecting-ip` no llega | Solo `cf-connecting-ip`, IPv6 agrupado por /64, fallar cerrado |
| Next 15.5.12 | Advisories de DoS y cache poisoning en RSC | `next@15.5.26` |
| Logout sin revocación, cookie sin `__Host-` | Bajo | Renombrar la cookie y versionar la sesión en KV |
| CSP en Report-Only | Sin bloqueo real | Pasar a enforce después de revisar violaciones |
| Casilla de publicación marcada por defecto | Consentimiento no explícito (RGPD, [considerando 32](https://gdpr-info.eu/recitals/no-32/)) | Aceptado para el hackatón; desmarcar si pasa a producción real |

Build local: OpenNext incluye `.env.local` en `.open-next/cloudflare/next-env.mjs`.
No desplegar desde local con la key real y borrar `.open-next/` después de
`npm run preview`. Webflow Cloud buildea desde git, donde ese archivo no
existe.
