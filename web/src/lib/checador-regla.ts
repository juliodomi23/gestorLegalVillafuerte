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
export function distanciaMetros(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

// Puntualidad según el "Reglamento de horario, tolerancias y retardos" del despacho,
// firmado el 17 de agosto de 2026:
//
//   hasta +15 min   → dentro del horario laboral
//   desde +16 min   → retardo menor  (descuento del 50% de un día)
//   desde +32 min   → retardo mayor  (descuento de un día completo)
//
//   5 retardos MENORES en un mes  → descuento de un día completo
//   5 retardos MAYORES en un mes  → causal de despido
//
// Los minutos se cuentan desde la hora de entrada de la sucursal, no desde una hora
// fija: así una plaza con otro horario usa el mismo reglamento sin tocar código.
export const TOLERANCIA_PUNTUALIDAD_MIN = 15;
export const RETARDO_MAYOR_DESDE_MIN = 32;
export const RETARDOS_PARA_SANCION = 5;

export type Clasificacion = "puntual" | "retardo_menor" | "retardo_mayor";

export const ETIQUETA_CLASIFICACION: Record<Clasificacion, string> = {
  puntual: "A tiempo",
  retardo_menor: "Retardo menor",
  retardo_mayor: "Retardo mayor",
};

// `minutosEntrada` es la hora de entrada de la sucursal; `minutosChecada`, la de la
// marca. Ambos en minutos desde medianoche, hora del despacho.
export function clasificarEntrada(
  minutosChecada: number,
  minutosEntrada: number
): Clasificacion {
  const retraso = minutosChecada - minutosEntrada;
  if (retraso <= TOLERANCIA_PUNTUALIDAD_MIN) return "puntual";
  if (retraso < RETARDO_MAYOR_DESDE_MIN) return "retardo_menor";
  return "retardo_mayor";
}
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
