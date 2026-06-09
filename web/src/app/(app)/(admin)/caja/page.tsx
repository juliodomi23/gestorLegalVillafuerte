import { prisma } from "@/lib/prisma";
import CajaClient, { type MovimientoView } from "./client";

function fmtDate(d: Date): string {
  const date = d instanceof Date ? d : new Date(d);
  return `${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function CajaPage() {
  const [rows, sucursalesDb] = await Promise.all([
    prisma.movimientoCaja.findMany({
      include: {
        sucursal: true,
        expediente: { select: { numeroInterno: true } },
      },
      orderBy: { fecha: "desc" },
    }),
    prisma.sucursal.findMany({ orderBy: { nombre: "asc" } }),
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

  const sucursales = sucursalesDb.map((s) => s.nombre);

  return <CajaClient movimientos={movimientos} sucursales={sucursales} />;
}
