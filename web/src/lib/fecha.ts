// Fechas del despacho.
//
// El contenedor corre en UTC, así que nada que dependa de "el día de hoy" o de "todo
// el día X" puede usar la hora local del proceso: se corre 6 horas. Chiapas es UTC-6
// todo el año (México no aplica horario de verano desde 2022), así que el offset va
// explícito y no hace falta librería de zonas.

export const TZ_DESPACHO = "America/Mexico_City";
export const OFFSET_DESPACHO = "-06:00";

// El día de hoy en el despacho, "yyyy-MM-dd". `new Date().toISOString()` da el día
// UTC: después de las 18:00 en Chiapas ya devuelve el día siguiente.
export function hoyDespacho(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ_DESPACHO });
}

// Rango completo de un día del despacho, para filtrar columnas timestamp.
export function rangoDelDiaDespacho(fechaISO: string) {
  return {
    gte: new Date(`${fechaISO}T00:00:00${OFFSET_DESPACHO}`),
    lte: new Date(`${fechaISO}T23:59:59.999${OFFSET_DESPACHO}`),
  };
}

// Acepta "dd/MM/yyyy", "yyyy-MM-dd" o ISO; devuelve Date o null.
export function parseFecha(s?: string | null): Date | null {
  if (!s) return null;
  const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (dmy) {
    const [, d, m, y] = dmy;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  const fecha = new Date(s);
  return isNaN(fecha.getTime()) ? null : fecha;
}

export function sumarDias(base: Date, dias: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + dias);
  return d;
}

// "2026-08-21" → 1..7 (lunes..domingo), sin depender de la zona del servidor.
// Duplicado de productividad.ts: ese archivo no se puede importar aquí (crearía un
// ciclo con lib/prisma) y esto no puede vivir en un "use server" (diligencias/actions.ts)
// porque ahí todo export debe ser async.
function diaSemanaDe(fechaISO: string): number {
  const [y, m, d] = fechaISO.split("-").map(Number);
  const dom0 = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return dom0 === 0 ? 7 : dom0;
}

// Las llamadas de seguimiento se hacen miércoles (3) y viernes (5).
export const DIAS_LLAMADA = [3, 5];

// Primer día de llamada estrictamente después de hoy (hora del despacho). Con
// `dias = [3]` o `[5]` se puede forzar uno solo para repartir la carga.
export function proximoDiaLlamada(dias: number[] = DIAS_LLAMADA): Date {
  const hoy = hoyDespacho();
  const [y, m, d] = hoy.split("-").map(Number);
  for (let i = 1; i <= 7; i++) {
    const candidato = new Date(Date.UTC(y, m - 1, d + i));
    const dia = candidato.getUTCDay() === 0 ? 7 : candidato.getUTCDay();
    if (dias.includes(dia)) return candidato;
  }
  throw new Error("dias de llamada inválidos");
}

// Solo de lunes (1) a jueves (4). El Lic. pidió que no se puedan registrar diligencias
// viernes/sábado/domingo.
export function diligenciasHabilitadoHoy(): boolean {
  return diaSemanaDe(hoyDespacho()) <= 4;
}
