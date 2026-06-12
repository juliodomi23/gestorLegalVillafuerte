import { prisma } from "@/lib/prisma";
import CajaClient, { type MovimientoView, type ProximoPagoView } from "./client";

function fmtDate(d: Date): string {
  const date = d instanceof Date ? d : new Date(d);
  return `${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCMonth() + 1).padStart(2, "0")}/${date.getUTCFullYear()}`;
}

function diasHasta(d: Date): number {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

export default async function CajaPage() {
  const [rows, sucursalesDb, planesDb] = await Promise.all([
    prisma.movimientoCaja.findMany({
      include: {
        sucursal: true,
        expediente: { select: { numeroInterno: true } },
      },
      orderBy: { fecha: "desc" },
    }),
    prisma.sucursal.findMany({ orderBy: { nombre: "asc" } }),
    prisma.planPago.findMany({
      where: { fechaProxPago: { not: null } },
      include: {
        expediente: {
          select: { numeroInterno: true, cliente: { select: { nombre: true } } },
        },
      },
      orderBy: { fechaProxPago: "asc" },
    }),
  ]);

  const movimientos: MovimientoView[] = rows.map((m) => ({
    id: m.id,
    fecha: fmtDate(m.fecha),
    sucursal: m.sucursal?.nombre ?? "—",
    concepto: m.concepto ?? "—",
    expediente: m.expediente?.numeroInterno ?? null,
    tipo: m.tipo === "egreso" ? "Egreso" : "Ingreso",
    monto: Number(m.monto),
    origen: m.origen === "whatsapp" ? "WhatsApp" : "Web",
  }));

  const proximosPagos: ProximoPagoView[] = planesDb
    .filter((p) => p.fechaProxPago)
    .map((p) => ({
      expediente: p.expediente?.numeroInterno ?? "—",
      cliente: p.expediente?.cliente?.nombre ?? "—",
      tipo: p.tipo,
      monto: p.montoPeriodico ? Number(p.montoPeriodico) : Number(p.montoFinal ?? p.montoTotal),
      fechaProxPago: fmtDate(p.fechaProxPago!),
      diasRestantes: diasHasta(p.fechaProxPago!),
    }));

  const sucursales = sucursalesDb.map((s) => s.nombre);

  return <CajaClient movimientos={movimientos} sucursales={sucursales} proximosPagos={proximosPagos} />;
}
