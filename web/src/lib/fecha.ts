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
