"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

export function useScrollMensajes(conversacionId: string | null, mensajes: { id: string }[], cargados: boolean, vista: string) {
  const zona = useRef<HTMLDivElement>(null);
  const contenido = useRef<HTMLDivElement>(null);
  const pegadoAbajo = useRef(true);
  const anteriores = useRef<Set<string> | null>(null);
  const pendientes = useRef(new Set<string>());
  const [nuevos, setNuevos] = useState(0);

  const bajarAlFinal = useCallback(() => {
    const elemento = zona.current;
    if (!elemento?.clientHeight) return;
    elemento.scrollTop = elemento.scrollHeight;
    pegadoAbajo.current = true;
    pendientes.current.clear();
    setNuevos(0);
  }, []);

  const ajustar = useCallback(() => {
    if (pegadoAbajo.current) bajarAlFinal();
  }, [bajarAlFinal]);

  useLayoutEffect(() => {
    pegadoAbajo.current = true;
    anteriores.current = null;
    pendientes.current.clear();
    setNuevos(0);
  }, [conversacionId]);

  useLayoutEffect(() => {
    if (!cargados) return;
    const ids = new Set(mensajes.map((mensaje) => mensaje.id));
    if (anteriores.current && !pegadoAbajo.current) {
      for (const id of ids) if (!anteriores.current.has(id)) pendientes.current.add(id);
      for (const id of pendientes.current) if (!ids.has(id)) pendientes.current.delete(id);
      setNuevos(pendientes.current.size);
    }
    anteriores.current = ids;
    ajustar();
  }, [mensajes, cargados, ajustar]);

  useLayoutEffect(() => {
    const elemento = zona.current;
    const interior = contenido.current;
    if (!elemento || !interior) return;
    // También se dispara al mostrar el chat móvil y al crecer imágenes, audio o el compositor.
    const observador = new ResizeObserver(ajustar);
    observador.observe(elemento);
    observador.observe(interior);
    const frame = requestAnimationFrame(ajustar);
    return () => {
      cancelAnimationFrame(frame);
      observador.disconnect();
    };
  }, [conversacionId, cargados, vista, ajustar]);

  const alDesplazar = useCallback(() => {
    const elemento = zona.current;
    if (!elemento?.clientHeight) return;
    pegadoAbajo.current = elemento.scrollHeight - elemento.scrollTop - elemento.clientHeight < 120;
    if (pegadoAbajo.current) {
      pendientes.current.clear();
      setNuevos(0);
    }
  }, []);

  return { zona, contenido, nuevos, alDesplazar, ajustar, bajarAlFinal };
}
