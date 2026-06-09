import { prisma } from "@/lib/prisma";
import AgendaClient, { type CitaView } from "./client";

export default async function AgendaPage() {
  const hoyInicio = new Date();
  hoyInicio.setHours(0, 0, 0, 0);
  const hoyFin = new Date();
  hoyFin.setHours(23, 59, 59, 999);

  const [rows, sucursalesDb, abogadosDb] = await Promise.all([
    prisma.cita.findMany({
      where: {
        fechaHora: { gte: hoyInicio, lte: hoyFin },
        estado: { not: "cancelada" },
      },
      include: { cliente: true, abogado: true, sucursal: true },
      orderBy: { fechaHora: "asc" },
    }),
    prisma.sucursal.findMany({ orderBy: { nombre: "asc" } }),
    prisma.usuario.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
  ]);

  const citas: CitaView[] = rows.map((c) => ({
    id: c.id,
    hora: c.fechaHora.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false }),
    cliente: c.cliente?.nombre ?? "—",
    asunto: c.asunto ?? "—",
    telefono: c.telefono ?? c.cliente?.telefono ?? "—",
    sucursal: c.sucursal?.nombre ?? "—",
    abogado: c.abogado?.nombre ?? "—",
    estado: c.estado === "confirmada" ? "Confirmada" : "Por confirmar",
  }));

  const sucursales = sucursalesDb.map((s) => s.nombre);
  const abogados = abogadosDb.map((u) => u.nombre);

  return <AgendaClient citas={citas} sucursales={sucursales} abogados={abogados} />;
}
