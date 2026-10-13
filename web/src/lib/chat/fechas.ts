const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

// Días calendario del navegador; UTC evita diferencias de 23/25 horas por horario de verano.
export function claveDia(fecha: Date): string {
  return `${fecha.getFullYear()}-${fecha.getMonth() + 1}-${fecha.getDate()}`;
}

const diaAbsoluto = (fecha: Date) => Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()) / 86_400_000;

export function etiquetaDia(fecha: Date, ahora: Date = new Date()): string {
  const diferencia = diaAbsoluto(ahora) - diaAbsoluto(fecha);
  if (diferencia === 0) return "Hoy";
  if (diferencia === 1) return "Ayer";
  if (diferencia > 1 && diferencia < 7) return DIAS[fecha.getDay()];
  const base = `${fecha.getDate()} de ${MESES[fecha.getMonth()]}`;
  return fecha.getFullYear() === ahora.getFullYear() ? base : `${base} de ${fecha.getFullYear()}`;
}

export function horaMensaje(fecha: string): string {
  return new Date(fecha).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

export function fechaConversacion(fecha: string | null, ahora: Date = new Date()): string {
  if (!fecha) return "";
  const dia = new Date(fecha);
  const diferencia = diaAbsoluto(ahora) - diaAbsoluto(dia);
  if (diferencia === 0) return horaMensaje(fecha);
  if (diferencia === 1) return "Ayer";
  return dia.toLocaleDateString("es-MX", {
    day: "numeric", month: "short", ...(dia.getFullYear() !== ahora.getFullYear() ? { year: "numeric" } : {}),
  });
}
