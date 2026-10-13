"use client";

import { useLayoutEffect, useRef, useState } from "react";

// Ajusta un contenedor a lo que queda de pantalla debajo de su posición: la página no se
// desplaza y cada columna hace su propio scroll. Re-mide cuando cambia lo de arriba.
export function useAltoDisponible(minimo = 320) {
  const raiz = useRef<HTMLDivElement>(null);
  const [alto, setAlto] = useState<number | null>(null);

  useLayoutEffect(() => {
    function medir() {
      const elemento = raiz.current;
      if (!elemento) return;
      const relleno = parseFloat(getComputedStyle(elemento.closest("main") ?? document.body).paddingBottom) || 0;
      const arriba = elemento.getBoundingClientRect().top + window.scrollY;
      const visible = window.visualViewport?.height ?? window.innerHeight;
      setAlto(Math.max(minimo, Math.floor(visible - arriba - relleno)));
    }
    medir();
    void document.fonts?.ready.then(medir);
    const observador = new ResizeObserver(medir);
    observador.observe(document.body);
    const principal = raiz.current?.closest("main");
    if (principal) observador.observe(principal);
    window.addEventListener("resize", medir);
    window.visualViewport?.addEventListener("resize", medir);
    return () => {
      observador.disconnect();
      window.removeEventListener("resize", medir);
      window.visualViewport?.removeEventListener("resize", medir);
    };
  }, [minimo]);

  return { raiz, alto };
}
