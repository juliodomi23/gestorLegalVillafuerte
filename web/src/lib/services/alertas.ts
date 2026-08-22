// Lo que el despacho debería estar mirando ahora mismo, en un solo lugar.
//
// Las alertas se CALCULAN de los datos que ya hay; no hay tabla de notificaciones ni
// proceso que las genere. Eso tiene dos consecuencias buenas: una alerta desaparece
// sola en cuanto se resuelve el problema, y nunca se ve una que ya no es cierta.
//
// Cada quien ve lo suyo: un abogado no tiene por qué enterarse de los retardos de
// otro, y los avisos de asistencia son sólo para quien administra.

import { prisma } from "@/lib/prisma";
import { hoyDespacho, rangoDelDiaDespacho } from "@/lib/fecha";
import { resumenMensual } from "@/lib/services/asistencia";
import type { Alcance } from "@/lib/alcance";

export type Severidad = "critica" | "alta" | "media" | "info";

export type Alerta = {
  id: string;
  severidad: Severidad;
  titulo: string;
  detalle: string;
  href: string;
};

const ORDEN: Record<Severidad, number> = { critica: 0, alta: 1, media: 2, info: 3 };

function sumarDias(fechaISO: string, dias: number): string {
  const [y, m, d] = fechaISO.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() + dias);
  return base.toISOString().slice(0, 10);
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

export async function alertasDe(
  usuarioId: string,
  rol: string,
  alcance: Alcance
): Promise<Alerta[]> {
  const hoy = hoyDespacho();
  const esAdmin = rol === "admin";
  const alertas: Alerta[] = [];

  const [terminos, audienciasManana, citasHoy, contratosSinPlan, asistencia] = await Promise.all([
    // Términos vencidos o por vencer en 3 días, dentro del alcance de quien mira.
    prisma.termino.findMany({
      where: {
        cumplido: false,
        vencimientoTermino: { lte: new Date(`${sumarDias(hoy, 3)}T23:59:59-06:00`) },
        ...(alcance ? { expediente: { abogadoResponsableId: { in: alcance.abogadoIds } } } : {}),
      },
      include: { expediente: { select: { numeroInterno: true } } },
      orderBy: { vencimientoTermino: "asc" },
      take: 50,
    }),
    prisma.audiencia.findMany({
      where: {
        estado: "programada",
        fechaHora: rangoDelDiaDespacho(sumarDias(hoy, 1)),
        ...(alcance ? { expediente: { abogadoResponsableId: { in: alcance.abogadoIds } } } : {}),
      },
      include: { expediente: { select: { numeroInterno: true } } },
      orderBy: { fechaHora: "asc" },
      take: 20,
    }),
    prisma.cita.count({
      where: { fechaHora: rangoDelDiaDespacho(hoy), estado: "agendada" },
    }),
    esAdmin
      ? prisma.documento.count({
          where: { tipo: "contrato", expediente: { planPago: null } },
        })
      : Promise.resolve(0),
    esAdmin ? resumenMensual(hoy) : Promise.resolve([]),
  ]);

  // --- Asistencia: sólo para quien administra ---
  for (const a of asistencia) {
    if (!a.alerta) continue;
    alertas.push({
      id: `asistencia-${a.usuarioId}`,
      severidad: a.semaforo === "critico" ? "critica" : "alta",
      titulo: a.semaforo === "critico" ? "Retardos: umbral del reglamento" : "Retardos acumulados",
      detalle: a.alerta,
      href: "/reloj-checador",
    });
  }

  // --- Términos ---
  // `vencimientoTermino` es opcional en el modelo; el filtro de arriba ya descartó los
  // nulos, pero TypeScript no lo sabe.
  const inicioDeHoy = new Date(`${hoy}T00:00:00-06:00`);
  const vencidos = terminos.filter((t) => t.vencimientoTermino && t.vencimientoTermino < inicioDeHoy);
  const porVencer = terminos.filter((t) => !vencidos.includes(t));

  if (vencidos.length > 0) {
    alertas.push({
      id: "terminos-vencidos",
      severidad: "critica",
      titulo: "Términos vencidos",
      detalle: `${plural(vencidos.length, "término vencido", "términos vencidos")} sin cumplir: ${vencidos
        .slice(0, 3)
        .map((t) => t.expediente.numeroInterno ?? "s/n")
        .join(", ")}${vencidos.length > 3 ? "…" : ""}`,
      href: "/expedientes",
    });
  }
  if (porVencer.length > 0) {
    alertas.push({
      id: "terminos-por-vencer",
      severidad: "alta",
      titulo: "Términos por vencer",
      detalle: `${plural(porVencer.length, "término vence", "términos vencen")} en los próximos 3 días.`,
      href: "/expedientes",
    });
  }

  // --- Audiencias de mañana ---
  if (audienciasManana.length > 0) {
    alertas.push({
      id: "audiencias-manana",
      severidad: "alta",
      titulo: "Audiencias mañana",
      detalle: `${plural(audienciasManana.length, "audiencia programada", "audiencias programadas")}: ${audienciasManana
        .slice(0, 3)
        .map((a) => a.expediente.numeroInterno ?? "s/n")
        .join(", ")}${audienciasManana.length > 3 ? "…" : ""}`,
      href: "/agenda",
    });
  }

  // --- Citas de hoy sin confirmar ---
  if (citasHoy > 0) {
    alertas.push({
      id: "citas-sin-confirmar",
      severidad: "media",
      titulo: "Citas de hoy sin confirmar",
      detalle: `${plural(citasHoy, "cita sigue", "citas siguen")} en "agendada": nadie ha marcado si vinieron.`,
      href: "/agenda",
    });
  }

  // --- Contratos sin plan de pagos ---
  if (contratosSinPlan > 0) {
    alertas.push({
      id: "contratos-sin-plan",
      severidad: "media",
      titulo: "Contratos sin plan de pagos",
      detalle: `${plural(contratosSinPlan, "contrato subido", "contratos subidos")} sin registrar sus pagos: no van a entrar al calendario.`,
      href: "/contratos",
    });
  }

  return alertas.sort((a, b) => ORDEN[a.severidad] - ORDEN[b.severidad]);
}
