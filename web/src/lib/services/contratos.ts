// Contratos firmados y su plan de pagos.
//
// Un contrato es un Documento con tipo "contrato": no hace falta una tabla propia,
// ya hay subida de PDF con control de acceso por expediente. El plan de pagos vive
// en PlanPago, que ya existía para la caja.
//
// Lo que aporta esta sección: verlos todos juntos y que los pagos futuros aparezcan
// solos en el calendario del despacho, en vez de vivir en la cabeza de quien
// firmó el contrato.

import { prisma } from "@/lib/prisma";
import { crearEventoCalendar } from "@/lib/googleCalendar";
import type { Alcance } from "@/lib/alcance";

export const TIPO_CONTRATO = "contrato";

const TIPOS_PLAN = ["todo_inicio", "inicio_final", "quincenal", "mensual"] as const;
export type TipoPlan = (typeof TIPOS_PLAN)[number];

export const ETIQUETA_PLAN: Record<string, string> = {
  todo_inicio: "Todo al inicio",
  inicio_final: "Inicio y final",
  quincenal: "Quincenal",
  mensual: "Mensual",
};

export function esTipoPlan(v: string): v is TipoPlan {
  return (TIPOS_PLAN as readonly string[]).includes(v);
}

// Un plan con un solo pago no genera recordatorios: ya se cobró todo.
export function tienePagosPendientes(tipo: string): boolean {
  return tipo !== "todo_inicio";
}

export type ContratoView = {
  documentoId: string;
  nombre: string;
  link: string | null;
  subidoEl: string;
  expedienteId: string;
  numeroExpediente: string;
  cliente: string;
  abogado: string;
  plan: {
    tipo: string;
    etiqueta: string;
    montoTotal: number;
    montoInicial: number | null;
    montoPeriodico: number | null;
    fechaProxPago: string | null;
    notas: string | null;
  } | null;
};

export async function listarContratos(alcance: Alcance): Promise<ContratoView[]> {
  const docs = await prisma.documento.findMany({
    where: {
      tipo: TIPO_CONTRATO,
      ...(alcance ? { expediente: { abogadoResponsableId: { in: alcance.abogadoIds } } } : {}),
    },
    include: {
      expediente: {
        include: {
          cliente: { select: { nombre: true } },
          abogadoResponsable: { select: { nombre: true } },
          planPago: true,
        },
      },
    },
    orderBy: { creadoEn: "desc" },
  });

  return docs.map((d) => {
    const p = d.expediente.planPago;
    return {
      documentoId: d.id,
      nombre: d.nombre,
      link: d.linkDrive,
      subidoEl: d.creadoEn.toLocaleDateString("es-MX", {
        timeZone: "America/Mexico_City",
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      expedienteId: d.expedienteId,
      numeroExpediente: d.expediente.numeroInterno ?? "—",
      cliente: d.expediente.cliente?.nombre ?? "Sin cliente",
      abogado: d.expediente.abogadoResponsable?.nombre ?? "Sin asignar",
      plan: p
        ? {
            tipo: p.tipo,
            etiqueta: ETIQUETA_PLAN[p.tipo] ?? p.tipo,
            montoTotal: Number(p.montoTotal),
            montoInicial: p.montoInicial ? Number(p.montoInicial) : null,
            montoPeriodico: p.montoPeriodico ? Number(p.montoPeriodico) : null,
            fechaProxPago: p.fechaProxPago ? p.fechaProxPago.toISOString().slice(0, 10) : null,
            notas: p.notas,
          }
        : null,
    };
  });
}

export type DatosPlan = {
  expedienteId: string;
  tipo: string;
  montoTotal: number;
  montoInicial?: number | null;
  montoPeriodico?: number | null;
  fechaProxPago?: string | null;
  notas?: string | null;
};

// Guarda el plan y, si queda un pago pendiente con fecha, lo pone en el calendario
// del despacho. Que el evento no se pueda crear no debe impedir guardar el plan:
// el dato en el gestor vale más que el recordatorio.
export async function guardarPlanPago(d: DatosPlan): Promise<{ eventoCreado: boolean }> {
  const fechaProxPago = d.fechaProxPago ? new Date(d.fechaProxPago) : null;

  const datos = {
    tipo: d.tipo,
    montoTotal: d.montoTotal,
    montoInicial: d.montoInicial ?? null,
    montoPeriodico: d.montoPeriodico ?? null,
    fechaProxPago,
    notas: d.notas ?? null,
  };

  await prisma.planPago.upsert({
    where: { expedienteId: d.expedienteId },
    create: { expedienteId: d.expedienteId, ...datos },
    update: datos,
  });

  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  if (!fechaProxPago || !tienePagosPendientes(d.tipo) || (d.fechaProxPago ?? "") <= hoy) {
    return { eventoCreado: false };
  }

  const expediente = await prisma.expediente.findUnique({
    where: { id: d.expedienteId },
    include: {
      cliente: { select: { nombre: true, telefono: true } },
      sucursal: { select: { nombre: true } },
    },
  });
  if (!expediente) return { eventoCreado: false };

  const monto = d.montoPeriodico ?? d.montoTotal;
  const id = await crearEventoCalendar({
    cliente: expediente.cliente?.nombre ?? "Cliente",
    telefono: expediente.cliente?.telefono ?? undefined,
    asunto: `Pago de contrato · $${monto.toLocaleString("es-MX")} · exp. ${
      expediente.numeroInterno ?? ""
    }`.trim(),
    sucursal: expediente.sucursal?.nombre,
    // 10:00 hora del despacho: un recordatorio de cobro a medianoche no lo ve nadie.
    inicio: new Date(`${d.fechaProxPago}T10:00:00-06:00`),
  });

  return { eventoCreado: !!id };
}

// Expedientes a los que se les puede subir un contrato.
export async function expedientesParaContrato(alcance: Alcance) {
  const lista = await prisma.expediente.findMany({
    where: alcance ? { abogadoResponsableId: { in: alcance.abogadoIds } } : {},
    include: { cliente: { select: { nombre: true } } },
    orderBy: { creadoEn: "desc" },
    take: 300,
  });
  return lista.map((e) => ({
    id: e.id,
    etiqueta: `${e.numeroInterno ?? "s/n"} — ${e.cliente?.nombre ?? "Sin cliente"}`,
  }));
}
