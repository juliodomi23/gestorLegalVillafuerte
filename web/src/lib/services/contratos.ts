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

const TIPOS_PLAN = ["todo_inicio", "inicio_final", "semanal", "quincenal", "mensual"] as const;
export type TipoPlan = (typeof TIPOS_PLAN)[number];

export const ETIQUETA_PLAN: Record<string, string> = {
  todo_inicio: "Todo al inicio",
  inicio_final: "Inicio y final",
  semanal: "Semanal",
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

const ESTADOS_REVISION = ["pendiente", "aprobado", "corregir"] as const;
export type EstadoRevision = (typeof ESTADOS_REVISION)[number];
export const ETIQUETA_REVISION: Record<EstadoRevision, string> = {
  pendiente: "Sin revisar",
  aprobado: "Revisado",
  corregir: "Hay que corregir",
};

export function esEstadoRevision(v: string): v is EstadoRevision {
  return (ESTADOS_REVISION as readonly string[]).includes(v);
}

export type ContratoView = {
  documentoId: string;
  nombre: string;
  link: string | null;
  subidoEl: string;
  subidoPor: string | null;
  expedienteId: string;
  numeroExpediente: string;
  cliente: string;
  abogado: string;
  revisionEstado: EstadoRevision;
  revisionNotas: string | null;
  /** yyyy-mm-dd; solo el admin la captura (ver guardarProrrogaAction). */
  prorrogaHasta: string | null;
  plan: {
    tipo: string;
    etiqueta: string;
    montoTotal: number;
    montoInicial: number | null;
    montoPeriodico: number | null;
    fechaProxPago: string | null;
    notas: string | null;
    pagos: { fecha: string; monto: number; concepto: string | null }[];
    pagado: number;
    saldo: number;
  } | null;
};

export async function listarContratos(alcance: Alcance): Promise<ContratoView[]> {
  const docs = await prisma.documento.findMany({
    where: {
      tipo: TIPO_CONTRATO,
      ...(alcance ? { expediente: { abogadoResponsableId: { in: alcance.abogadoIds } } } : {}),
    },
    include: {
      usuario: { select: { nombre: true } },
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

  // Los pagos ya se registran en Caja (movimientos de tipo ingreso ligados al
  // expediente); no hace falta una tabla nueva, solo agruparlos aquí por expediente.
  const expedienteIds = docs.filter((d) => d.expediente.planPago).map((d) => d.expedienteId);
  const movimientos = expedienteIds.length
    ? await prisma.movimientoCaja.findMany({
        where: { expedienteId: { in: expedienteIds }, tipo: "ingreso" },
        orderBy: { fecha: "desc" },
      })
    : [];
  const pagosPorExpediente = new Map<string, typeof movimientos>();
  for (const m of movimientos) {
    if (!m.expedienteId) continue;
    const lista = pagosPorExpediente.get(m.expedienteId) ?? [];
    lista.push(m);
    pagosPorExpediente.set(m.expedienteId, lista);
  }

  return docs.map((d) => {
    const p = d.expediente.planPago;
    const pagos = pagosPorExpediente.get(d.expedienteId) ?? [];
    const pagado = pagos.reduce((s, m) => s + Number(m.monto), 0);
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
      subidoPor: d.usuario?.nombre ?? null,
      expedienteId: d.expedienteId,
      numeroExpediente: d.expediente.numeroInterno ?? "—",
      cliente: d.expediente.cliente?.nombre ?? "Sin cliente",
      abogado: d.expediente.abogadoResponsable?.nombre ?? "Sin asignar",
      revisionEstado: esEstadoRevision(d.revisionEstado ?? "") ? (d.revisionEstado as EstadoRevision) : "pendiente",
      revisionNotas: d.revisionNotas,
      prorrogaHasta: d.prorrogaHasta ? d.prorrogaHasta.toISOString().slice(0, 10) : null,
      plan: p
        ? {
            tipo: p.tipo,
            etiqueta: ETIQUETA_PLAN[p.tipo] ?? p.tipo,
            montoTotal: Number(p.montoTotal),
            montoInicial: p.montoInicial ? Number(p.montoInicial) : null,
            montoPeriodico: p.montoPeriodico ? Number(p.montoPeriodico) : null,
            fechaProxPago: p.fechaProxPago ? p.fechaProxPago.toISOString().slice(0, 10) : null,
            notas: p.notas,
            pagos: pagos.map((m) => ({
              fecha: m.fecha.toISOString().slice(0, 10),
              monto: Number(m.monto),
              concepto: m.concepto,
            })),
            pagado,
            saldo: Number(p.montoTotal) - pagado,
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

// Checklist de revisión del Lic. sobre el PDF subido — solo admin lo toca (ver actions.ts).
export async function guardarRevisionContrato(documentoId: string, estado: EstadoRevision, notas: string | null) {
  await prisma.documento.update({
    where: { id: documentoId },
    data: { revisionEstado: estado, revisionNotas: notas },
  });
}

export async function guardarProrrogaContrato(documentoId: string, fecha: string | null) {
  await prisma.documento.update({
    where: { id: documentoId },
    data: { prorrogaHasta: fecha ? new Date(fecha) : null },
  });
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
