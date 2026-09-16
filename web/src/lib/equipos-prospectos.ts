import type { ResumenAbogado } from "@/lib/services/prospectos";

// Copia de coincideNombre (turno-regla.ts): mismo módulo autocontenido y sin imports,
// para que este archivo se pueda probar con `node --experimental-strip-types` sin
// resolver el alias "@/" (igual que turno-regla.ts y checador-regla.ts).
const palabras = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/\s+/).filter(Boolean);
function coincideNombre(nombreCompleto: string, clave: string): boolean {
  const tokens = palabras(nombreCompleto);
  return palabras(clave).every((p) => tokens.includes(p));
}

// Equipos del ranking de Prospectos (motivacional, no de reparto de trabajo — ese es
// TURNO_TUXTLA). Mismos nombres completos para que coincideNombre no dude si mañana
// entra alguien con el mismo nombre de pila. Quien no esté en ningún equipo cuenta
// individual (Amairany, Karen, Christian, etc. caen aquí solos).
const EQUIPOS: { label: string; nombres: string[] }[] = [
  { label: "Alain y Fernando", nombres: ["Alain Aquiahuatl Gomez", "Fernando Salas"] },
  { label: "Estrella y Carolina", nombres: ["Estrella Fabiola Sanchez Vives", "Carolina Velazquez"] },
  { label: "Rosario y Giselle", nombres: ["Maria del Rosario Alvarez Vera", "Karla Giselle Villafuerte De Paz"] },
];

export type MetricaRanking = "llamadasHoy" | "agendadasHoy" | "citasHoy" | "contratosHoy";

export type ItemRanking = { lugar: number; label: string };

function agrupar(resumen: ResumenAbogado[], metrica: MetricaRanking, agrupador: (r: ResumenAbogado) => string) {
  const totales = new Map<string, number>();
  for (const r of resumen) {
    const clave = agrupador(r);
    totales.set(clave, (totales.get(clave) ?? 0) + r[metrica]);
  }
  return totales;
}

// Posición estándar (empates comparten lugar, ej. 1º, 1º, 3º); solo entra quien tiene
// al menos una llamada/cita/contrato hoy — sin eso el tablero se llena de ceros.
function aRanking(totales: Map<string, number>): ItemRanking[] {
  const ordenado = [...totales.entries()].filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  const items: ItemRanking[] = [];
  for (let i = 0; i < ordenado.length; i++) {
    const [label, n] = ordenado[i];
    const lugar = i > 0 && ordenado[i - 1][1] === n ? items[i - 1].lugar : i + 1;
    items.push({ label, lugar });
  }
  return items;
}

export function rankingPorEquipo(resumen: ResumenAbogado[], metrica: MetricaRanking): ItemRanking[] {
  const totales = agrupar(resumen, metrica, (r) => {
    const equipo = EQUIPOS.find((e) => e.nombres.some((n) => coincideNombre(r.nombre, n)));
    return equipo?.label ?? r.nombre;
  });
  return aRanking(totales);
}

export function rankingPorSucursal(resumen: ResumenAbogado[], metrica: MetricaRanking): ItemRanking[] {
  const totales = agrupar(resumen, metrica, (r) => r.sucursalNombre ?? "Sin sucursal");
  return aRanking(totales);
}
