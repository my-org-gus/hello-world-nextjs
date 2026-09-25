# Lo realizado por pilar

Agrupado según las categorías del Nerdearla 2026 App Challenge: Mejor
Tech, Mejor Diseño y Best in Show. El objetivo es Best in Show, que
combina las dos primeras con un producto completo.

## Tech

- **Streaming sobre un límite duro.** Webflow Cloud corta a los 20 s sin
  bytes. Se midió en la URL pública (504 a los 20,3 s; SSE de 33 s OK) y
  se diseñó `/api/generate` como SSE: reenvía vistas parciales de GPT
  Image y agrega keep-alive. Las 4 imágenes llegan en paralelo y se ven
  mientras se generan.
- **Cola del lado del servidor.** OpenAI limita la organización a 5
  imágenes/min. Ante un 429, el stream queda abierto, avisa `queued`,
  espera lo que indica OpenAI y reintenta. El usuario ve "en cola…" en
  lugar de un error.
- **IA estructurada.** Entrevista y opciones con Responses API y
  `json_schema` strict: preguntas con opciones cerradas y prompts en
  inglés con reglas de sticker. Refinado por edición con la imagen actual
  como referencia, con historial para deshacer.
- **Imagen en el navegador, no en el worker.** Troquel con campo de
  distancias chamfer cacheado (~1 s por cambio de acabado), limpieza del
  halo por umbral de alfa, hoja A4 a 300 dpi, WebP de WhatsApp dentro de
  la spec e historias 9:16. Nada de esto gasta CPU del worker ni tokens.
- **Datos sin base de datos.** Galería en KV, con el estado codificado en
  el prefijo y los datos en la metadata de la clave (listar = una sola
  llamada), e imágenes en R2 servidas por la app. Reportes y me gusta con
  deduplicación por visitante.
- **Seguridad.** Validación de origen, tipo y tamaño en todos los `POST`,
  *magic bytes* en imágenes, errores de OpenAI que nunca se filtran,
  headers de seguridad, moderación que falla cerrada, aprobación manual y
  backoffice con sesión firmada por HMAC. Detalle en [seguridad](seguridad.md).
- **Costo acotado.** `quality: low`, cupos por IP, tope diario, sin
  reintento cuando se agotó el gasto y moderación gratuita.

## Diseño

- **Identidad propia.** "Laboratorio interdimensional": un portal verde
  que gira como pieza central (dropzone y estado de carga), contornos
  gruesos de caricatura, bordes levemente irregulares y tokens de color
  en `globals.css`. Tipografía: Titan One (display), Figtree (texto) y
  JetBrains Mono (lecturas técnicas).
- **Mascotas que narran.** Kalko cuenta la plataforma en el home y dice el
  resumen de la entrevista; Pelusa Eléctrica y Pelusa Chill presentan las
  muestras, los resultados y la galería. Las dos pelusas se generaron con
  la propia app, refinando a Kalko.
- **Sticker como objeto.** Vista de vinilo con brillo que sigue al puntero
  y se despega al pasar; zoom 3D en primer plano con canto apilado,
  sombra que se mueve y reflejo holográfico, con mouse o dedo.
- **Estados cuidados.** Progreso por tarjeta (en cola, llegando, listo,
  tiempo de generación), vistas parciales, errores con acción, foco
  accesible entre etapas y `prefers-reduced-motion`.
- **Mobile-first.** Todas las pantallas probadas a 390 px, con controles
  táctiles y menú nativo para compartir.
- **Plantillas para redes.** Tres historias (Portal, Holográfico y Ficha
  de laboratorio) con la misma identidad visual.
- Revisión con el detector de `impeccable` después de cada cambio de UI.

## Best in Show (producto)

- **Flujo completo de punta a punta:** idea o foto → 2-4 preguntas → 4
  opciones → acabados → refinar → descargar, imprimir o compartir.
- **Home que vende:** 11 muestras reales generadas con la app (cada una
  abre el laboratorio con su idea precargada), "bajo el capó" y roadmap.
- **Pruébala en tu mundo:** una foto de tu laptop, moto o termo y ves
  cómo queda antes de pegarla; la IA puede dejarla como pegada de verdad.
  Hay 4 ejemplos en el home.
- **Viralidad:**
  - sticker de WhatsApp desde el celular;
  - historias para Instagram con tres plantillas, todas con el enlace a
    la app;
  - imagen para compartir (Open Graph) al pegar el link.
- **Comunidad:**
  - la primera imagen de cada sesión se envía a la galería (casilla
    marcada por defecto, pendiente de aprobación);
  - "Kalkos de la comunidad" con me gusta, separada de las muestras;
  - reportes y backoffice para moderar.
- **Roadmap validado:**
  - cuentas, galería privada y packs;
  - plan gratis con marca de agua en el servidor, suscripciones y pagos
    a demanda;
  - bots de Telegram (pagos con Stars) y WhatsApp (acotado a stickers).
  - La viabilidad está documentada en el `CLAUDE.md`.
