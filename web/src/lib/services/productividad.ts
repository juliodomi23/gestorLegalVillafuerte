// Rutina semanal del Coordinador de Operaciones y Sistemas.
// Réplica del Excel del despacho: la plantilla dice qué toca cada día de la semana,
// y cada día se marca lo que se hizo. Todas las actividades pesan igual, así que el
// avance es simplemente realizadas/total — igual que en la hoja original.

import { prisma } from "@/lib/prisma";
import { calcularSenales, type Senal } from "./senales";
import { hoyDespacho, TZ_DESPACHO } from "@/lib/fecha";

export const DIAS = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export type ActividadDelDia = {
  plantillaId: string;
  hora: string;
  orden: number;
  descripcion: string;
  realizada: boolean;
  observaciones: string;
  // Lo que el gestor ya sabe al respecto, si esta actividad tiene una señal ligada.
  senal: Senal | null;
};

export type DiaResumen = {
  fechaISO: string;
  diaSemana: number;
  nombre: string;
  total: number;
  realizadas: number;
  porcentaje: number;
};

// "2026-08-21" → 1..7 (lunes..domingo). Se calcula sobre la fecha suelta, sin pasar
// por la zona del servidor: `new Date("2026-08-21").getDay()` en UTC puede caer en
// el día anterior según dónde corra el contenedor.
export function diaSemanaDe(fechaISO: string): number {
  const [y, m, d] = fechaISO.split("-").map(Number);
  const dom0 = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = domingo
  return dom0 === 0 ? 7 : dom0;
}

export const hoyISO = hoyDespacho;

// El lunes de la semana a la que pertenece esa fecha.
export function lunesDe(fechaISO: string): string {
  const [y, m, d] = fechaISO.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() - (diaSemanaDe(fechaISO) - 1));
  return base.toISOString().slice(0, 10);
}

export function sumarDiasISO(fechaISO: string, dias: number): string {
  const [y, m, d] = fechaISO.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() + dias);
  return base.toISOString().slice(0, 10);
}

export async function actividadesDelDia(fechaISO: string): Promise<ActividadDelDia[]> {
  const diaSemana = diaSemanaDe(fechaISO);
  const [plantillas, registros] = await Promise.all([
    prisma.actividadPlantilla.findMany({
      where: { diaSemana, activa: true },
      orderBy: [{ hora: "asc" }, { orden: "asc" }],
    }),
    prisma.actividadRegistro.findMany({ where: { fecha: new Date(fechaISO) } }),
  ]);

  const porPlantilla = new Map(registros.map((r) => [r.plantillaId, r]));
  const senales = await calcularSenales(
    plantillas.map((p) => p.senal).filter((s): s is string => !!s),
    fechaISO
  );

  return plantillas.map((p) => {
    const r = porPlantilla.get(p.id);
    return {
      plantillaId: p.id,
      hora: p.hora,
      orden: p.orden,
      descripcion: p.descripcion,
      realizada: r?.realizada ?? false,
      observaciones: r?.observaciones ?? "",
      senal: p.senal ? senales[p.senal] ?? null : null,
    };
  });
}

// Los siete días de la semana que contiene `fechaISO`, con su avance.
export async function resumenSemana(fechaISO: string): Promise<DiaResumen[]> {
  const lunes = lunesDe(fechaISO);
  const domingo = sumarDiasISO(lunes, 6);

  const [plantillas, registros] = await Promise.all([
    prisma.actividadPlantilla.groupBy({
      by: ["diaSemana"],
      where: { activa: true },
      _count: { _all: true },
    }),
    prisma.actividadRegistro.findMany({
      where: {
        realizada: true,
        fecha: { gte: new Date(lunes), lte: new Date(domingo) },
      },
      select: { fecha: true },
    }),
  ]);

  const totalPorDia = new Map(plantillas.map((p) => [p.diaSemana, p._count._all]));
  const hechasPorFecha = new Map<string, number>();
  for (const r of registros) {
    const clave = r.fecha.toISOString().slice(0, 10);
    hechasPorFecha.set(clave, (hechasPorFecha.get(clave) ?? 0) + 1);
  }

  return Array.from({ length: 7 }, (_, i) => {
    const fecha = sumarDiasISO(lunes, i);
    const diaSemana = i + 1;
    const total = totalPorDia.get(diaSemana) ?? 0;
    const realizadas = Math.min(hechasPorFecha.get(fecha) ?? 0, total);
    return {
      fechaISO: fecha,
      diaSemana,
      nombre: DIAS[diaSemana],
      total,
      realizadas,
      porcentaje: total > 0 ? Math.round((realizadas / total) * 100) : 0,
    };
  });
}

export async function marcarActividad(
  plantillaId: string,
  fechaISO: string,
  realizada: boolean,
  observaciones?: string
) {
  const fecha = new Date(fechaISO);
  await prisma.actividadRegistro.upsert({
    where: { plantillaId_fecha: { plantillaId, fecha } },
    create: { plantillaId, fecha, realizada, observaciones: observaciones || null },
    update: { realizada, ...(observaciones !== undefined ? { observaciones: observaciones || null } : {}) },
  });
}
