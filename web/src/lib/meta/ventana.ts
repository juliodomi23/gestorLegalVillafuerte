export const HORAS_VENTANA = 24;

export function estadoVentana(ultimoEntrante: Date | string | null | undefined, ahora = new Date()) {
  if (!ultimoEntrante) return { abierta: false, restanteMs: 0 };
  const cierre = new Date(ultimoEntrante).getTime() + HORAS_VENTANA * 60 * 60 * 1000;
  const restanteMs = Math.max(0, cierre - ahora.getTime());
  return { abierta: restanteMs > 0, restanteMs };
}
