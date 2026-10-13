// Cuándo una etapa se mueve sola. Sin base de datos ni alias de rutas: se prueba con node --test.
export const CLAVES_ETAPA = [
  "nuevo",
  "contactado",
  "agendo_cita",
  "agendo_llamada",
  "asesorado",
  "contrato_firmado",
  "no_asistio",
  "perdido",
] as const;
export type ClaveEtapa = (typeof CLAVES_ETAPA)[number];

// Camino principal. Registrarse para llamada y Contactado (ya le llamaron) son pares, mismo
// rango: se puede pasar de uno a otro. Agendar la cita es lo siguiente; de ahí no se regresa.
const RANGO: Record<string, number> = {
  nuevo: 0,
  agendo_llamada: 1,
  contactado: 1,
  agendo_cita: 2,
  asesorado: 3,
  contrato_firmado: 4,
};

// `actual` es la clave de la etapa en la que está hoy (null = todavía sin etapa).
// - Solo avanza: un evento tardío nunca regresa una tarjeta.
// - Contrato firmado cierra: nada lo mueve solo.
// - "No asistió" y "Perdido" se pueden marcar desde casi cualquier punto y se reactivan
//   con cualquier avance posterior (volvió a agendar, contestó, etc.).
// - Una etapa propia del despacho (sin clave) no se mueve sola.
export function debeAvanzar(actual: string | null | undefined, destino: ClaveEtapa): boolean {
  if (actual === null || actual === undefined) return true;
  if (!(CLAVES_ETAPA as readonly string[]).includes(actual)) return false;
  if (actual === destino || actual === "contrato_firmado") return false;
  if (destino === "perdido") return true;
  if (destino === "no_asistio") return actual !== "asesorado" && actual !== "perdido";
  if (actual === "no_asistio" || actual === "perdido") return destino !== "nuevo";
  return RANGO[destino] >= RANGO[actual];
}

export function esClaveEtapa(valor: unknown): valor is ClaveEtapa {
  return typeof valor === "string" && (CLAVES_ETAPA as readonly string[]).includes(valor);
}

// Resultado de una llamada de seguimiento (prospectos, no asistieron, ya asesoraron).
export function claveDeSeguimiento(estado: string | null | undefined): ClaveEtapa | null {
  if (estado === "no_contesto" || estado === "llamar_despues") return "contactado";
  if (estado === "agendo_cita") return "agendo_cita";
  if (estado === "descartado") return "perdido";
  return null;
}

export function claveDeStatusAsesoria(status: string | null | undefined): ClaveEtapa | null {
  if (status === "contrato_firmado") return "contrato_firmado";
  if (status === "no_regreso" || status === "descartado") return "perdido";
  return null;
}
