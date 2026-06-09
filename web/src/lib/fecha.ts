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
