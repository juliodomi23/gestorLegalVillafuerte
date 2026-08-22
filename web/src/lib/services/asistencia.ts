// Asistencia según el "Reglamento de horario, tolerancias y retardos" del despacho
// (firmado el 17 de agosto de 2026).
//
// Los números de aquí deciden descuentos de salario y, a los cinco retardos mayores
// en un mes, un despido. Dos criterios de diseño por eso:
//
//   1. Un retardo JUSTIFICADO no cuenta para la acumulación. El reglamento lo dice
//      explícitamente y es lo que evita castigar a quien estaba en una audiencia.
//   2. Una checada en una sucursal SIN hora de entrada configurada no se clasifica:
//      queda como "sin horario". Inventarle una hora sería fabricar retardos.

import { prisma } from "@/lib/prisma";
import {
  clasificarEntrada,
  minutosDesdeMedianoche,
  minutosDeHora,
  RETARDOS_PARA_SANCION,
  type Clasificacion,
} from "@/lib/checador-regla";

export { RETARDOS_PARA_SANCION };

export type ClasificacionConSinHorario = Clasificacion | "sin_horario";

export type ResumenMensual = {
  usuarioId: string;
  nombre: string;
  sucursal: string;
  puntuales: number;
  retardosMenores: number;
  retardosMayores: number;
  justificados: number;
  // Lo que ya se ganó según el reglamento, en días de salario.
  diasDescuento: number;
  // "ok" | "atencion" | "critico" — el semáforo.
  semaforo: Semaforo;
  alerta: string | null;
};

export type Semaforo = "ok" | "atencion" | "critico";

// El mes en curso en hora del despacho, como rango [inicio, fin).
export function rangoDelMes(fechaISO: string) {
  const [y, m] = fechaISO.split("-").map(Number);
  const inicio = new Date(`${y}-${String(m).padStart(2, "0")}-01T00:00:00-06:00`);
  const finMes = m === 12 ? new Date(`${y + 1}-01-01T00:00:00-06:00`) : new Date(`${y}-${String(m + 1).padStart(2, "0")}-01T00:00:00-06:00`);
  return { gte: inicio, lt: finMes };
}

// Días de salario descontados según el reglamento:
//   cada retardo menor            → 0.5 día
//   cada 5 retardos menores       → 1 día completo (además del 0.5 de cada uno)
//   cada retardo mayor            → 1 día completo
export function diasDeDescuento(menores: number, mayores: number): number {
  const porMenores = menores * 0.5 + Math.floor(menores / RETARDOS_PARA_SANCION);
  const porMayores = mayores;
  return porMenores + porMayores;
}

export function semaforoDe(menores: number, mayores: number): Semaforo {
  if (mayores >= RETARDOS_PARA_SANCION || menores >= RETARDOS_PARA_SANCION) return "critico";
  if (mayores > 0 || menores >= 3) return "atencion";
  return "ok";
}

export function alertaDe(nombre: string, menores: number, mayores: number): string | null {
  if (mayores >= RETARDOS_PARA_SANCION) {
    return `${nombre} acumula ${mayores} retardos mayores este mes — el reglamento lo marca como causal de despido.`;
  }
  if (menores >= RETARDOS_PARA_SANCION) {
    return `${nombre} acumula ${menores} retardos menores este mes — corresponde descuento de un día completo.`;
  }
  if (mayores >= 3) {
    return `${nombre} lleva ${mayores} retardos mayores este mes. A los ${RETARDOS_PARA_SANCION} es causal de despido.`;
  }
  if (menores >= 3) {
    return `${nombre} lleva ${menores} retardos menores este mes. A los ${RETARDOS_PARA_SANCION} es un día de descuento.`;
  }
  return null;
}

// Clasifica una entrada concreta. `horaEntrada` es la de su sucursal.
export function clasificarChecada(
  creadoEn: Date,
  horaEntrada: string | null
): ClasificacionConSinHorario {
  if (!horaEntrada) return "sin_horario";
  return clasificarEntrada(minutosDesdeMedianoche(creadoEn), minutosDeHora(horaEntrada));
}

// Resumen del mes por persona: la base del semáforo y de las alertas.
export async function resumenMensual(fechaISO: string, sucursalId?: string): Promise<ResumenMensual[]> {
  const rango = rangoDelMes(fechaISO);

  const [usuarios, entradas] = await Promise.all([
    prisma.usuario.findMany({
      where: { activo: true, ...(sucursalId ? { sucursalId } : {}) },
      select: { id: true, nombre: true, sucursal: { select: { nombre: true, horaEntrada: true } } },
      orderBy: { nombre: "asc" },
    }),
    prisma.checada.findMany({
      where: {
        tipo: "entrada",
        creadoEn: rango,
        ...(sucursalId ? { sucursalId } : {}),
      },
      select: {
        usuarioId: true,
        creadoEn: true,
        justificada: true,
        sucursal: { select: { horaEntrada: true } },
      },
    }),
  ]);

  const porUsuario = new Map<string, typeof entradas>();
  for (const e of entradas) {
    const lista = porUsuario.get(e.usuarioId) ?? [];
    lista.push(e);
    porUsuario.set(e.usuarioId, lista);
  }

  return usuarios.map((u) => {
    const suyas = porUsuario.get(u.id) ?? [];
    let puntuales = 0;
    let retardosMenores = 0;
    let retardosMayores = 0;
    let justificados = 0;

    for (const e of suyas) {
      const clase = clasificarChecada(e.creadoEn, e.sucursal.horaEntrada);
      if (clase === "puntual") puntuales++;
      else if (clase === "sin_horario") continue;
      else if (e.justificada) justificados++;
      else if (clase === "retardo_menor") retardosMenores++;
      else retardosMayores++;
    }

    return {
      usuarioId: u.id,
      nombre: u.nombre,
      sucursal: u.sucursal?.nombre ?? "—",
      puntuales,
      retardosMenores,
      retardosMayores,
      justificados,
      diasDescuento: diasDeDescuento(retardosMenores, retardosMayores),
      semaforo: semaforoDe(retardosMenores, retardosMayores),
      alerta: alertaDe(u.nombre, retardosMenores, retardosMayores),
    };
  });
}
