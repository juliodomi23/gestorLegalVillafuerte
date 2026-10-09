import { prisma } from "@/lib/prisma";
import CobrosClient, { type PagoMercadoPagoView } from "./client";

function fmtDate(d: Date): string {
  return d.toLocaleDateString("es-MX", { timeZone: "America/Mexico_City", day: "2-digit", month: "2-digit", year: "numeric" });
}

export default async function CobrosPage() {
  const pagosDb = await prisma.pago.findMany({
    include: {
      cliente: { select: { nombre: true } },
      cita: { select: { clienteNombre: true, cliente: { select: { nombre: true } } } },
      asesoria: { select: { nombre: true } },
    },
    orderBy: { creadoEn: "desc" },
    take: 200,
  });

  const pagos: PagoMercadoPagoView[] = pagosDb.map((p) => ({
    id: p.id,
    fecha: fmtDate(p.creadoEn),
    cliente: p.cliente?.nombre ?? p.cita?.cliente?.nombre ?? p.cita?.clienteNombre ?? p.asesoria?.nombre ?? p.concepto ?? "—",
    servicio: p.servicio,
    montoBase: Number(p.montoBase),
    comision: Number(p.comision),
    montoTotal: Number(p.montoTotal),
    estado: p.estado,
    linkPago: p.linkPago,
    externalReference: p.externalReference,
  }));

  return <CobrosClient pagos={pagos} />;
}
