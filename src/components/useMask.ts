"use client";

import { useEffect, useState } from "react";

/**
 * `url()` para una variable CSS de máscara. Un url relativo dentro de una
 * custom property se resuelve contra la hoja de estilos que la usa, y en
 * Webflow Cloud el CSS vive en otro origen (CORS bloquea la máscara): se
 * pasa a absoluto contra la página una vez montado.
 */
export function useMask(src: string) {
  const [abs, setAbs] = useState<string>();
  useEffect(() => {
    setAbs(src.startsWith("data:") || src.startsWith("blob:") ? src : new URL(src, window.location.href).href);
  }, [src]);
  // Máscara vacía (oculta el brillo) hasta tener la url absoluta.
  return abs ? `url("${abs}")` : "linear-gradient(transparent, transparent)";
}
