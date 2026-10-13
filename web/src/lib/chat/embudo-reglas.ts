// Cuándo una etapa se mueve sola. Sin base de datos ni alias de rutas: se prueba con node --test.
export const CLAVES_ETAPA = ["nuevo", "agendo_cita", "agendo_llamada", "asesorado", "contrato_firmado"] as const;
export type ClaveEtapa = (typeof CLAVES_ETAPA)[number];

// Llamada y cita son caminos paralelos (mismo rango): se puede pasar de uno al otro.
const RANGO: Record<ClaveEtapa, number> = {
  nuevo: 0,
  agendo_llamada: 1,
  agendo_cita: 1,
  asesorado: 2,
  contrato_firmado: 3,
};

// `actual` es la clave de la etapa en la que está hoy (null = todavía sin etapa).
// Solo avanza: un evento tardío nunca regresa una tarjeta. Las etapas que agrega el
// despacho (sin clave) no se mueven solas: solo a mano o por el bot.
export function debeAvanzar(actual: string | null | undefined, destino: ClaveEtapa): boolean {
  if (actual === null || actual === undefined) return true;
  const rangoActual = RANGO[actual as ClaveEtapa];
  if (rangoActual === undefined) return false;
  return actual !== destino && RANGO[destino] >= rangoActual;
}

export function esClaveEtapa(valor: unknown): valor is ClaveEtapa {
  return typeof valor === "string" && (CLAVES_ETAPA as readonly string[]).includes(valor);
}
