// Reglas puras del reloj checador, sin prisma, para poder probarlas sueltas.
// Ver checador.test.ts.

const DIACRITICOS = new RegExp("[\u0300-\u036f]", "g");

export function slugSucursal(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(DIACRITICOS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Alterna entrada/salida: si la entrada previa lleva más de 16h abierta, se asume
// que se le olvidó marcar salida y se reinicia a "entrada" — si no, un solo olvido
// invertiría todos los días siguientes de forma permanente.
export const HORAS_JORNADA_MAX = 16;

export function tipoDespuesDe(
  ultima: { tipo: string; creadoEn: Date } | null,
  ahora: Date = new Date()
): "entrada" | "salida" {
  if (!ultima || ultima.tipo === "salida") return "entrada";
  const horasAbierta = (ahora.getTime() - ultima.creadoEn.getTime()) / 3_600_000;
  return horasAbierta > HORAS_JORNADA_MAX ? "entrada" : "salida";
}

// Distancia en metros entre dos coordenadas (fórmula haversine).
function distanciaMetros(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Tope al margen de imprecisión del GPS: sin esto, un GPS interior muy impreciso
// podría "confirmar" una ubicación falsa.
const TOPE_MARGEN_M = 200;

export type ResultadoGeocerca = "dentro" | "fuera" | "sin_verificar";

// null en lat/lon de la sucursal = geocerca no configurada, no se evalúa nada
// (compatibilidad: una sucursal sin coordenadas nunca bloquea a nadie).
export function evaluarGeocerca(
  sucursal: { lat: number | null; lon: number | null; radioM: number },
  lat: number | null,
  lon: number | null,
  precision: number | null
): ResultadoGeocerca {
  if (sucursal.lat == null || sucursal.lon == null) return "sin_verificar";
  if (lat == null || lon == null) return "sin_verificar";
  const distancia = distanciaMetros(sucursal.lat, sucursal.lon, lat, lon);
  const margen = Math.min(precision ?? 0, TOPE_MARGEN_M);
  const radioEfectivo = sucursal.radioM + margen;
  return distancia <= radioEfectivo ? "dentro" : "fuera";
}

// Puntualidad: minutos desde medianoche en hora del despacho, para comparar
// contra `sucursal.horaEntrada` (HH:MM). Tolerancia fija de 10 minutos.
export const TOLERANCIA_PUNTUALIDAD_MIN = 10;
const TZ = "America/Mexico_City";

export function minutosDesdeMedianoche(fecha: Date): number {
  const [h, m] = fecha
    .toLocaleTimeString("es-MX", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false })
    .split(":")
    .map(Number);
  return h * 60 + m;
}

export function minutosDeHora(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
