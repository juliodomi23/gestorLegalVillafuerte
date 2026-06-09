import { prisma } from "@/lib/prisma";
import AsesoriasClient, { type AsesoriaView } from "./client";
import type { StatusAsesoria } from "@/lib/constants";

export default async function AsesoriasPage() {
  const [rows, sucursalesDb, abogadosDb] = await Promise.all([
    prisma.asesoria.findMany({
      include: { sucursal: true, abogado: true },
      orderBy: { fecha: "desc" },
    }),
    prisma.sucursal.findMany({ orderBy: { nombre: "asc" } }),
    prisma.usuario.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
  ]);

  const asesorias: AsesoriaView[] = rows.map((a) => {
    const f = a.fecha instanceof Date ? a.fecha : new Date(a.fecha);
    const dd = String(f.getUTCDate()).padStart(2, "0");
    const mm = String(f.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = String(f.getUTCFullYear());
    return {
      id: a.id,
      fecha: `${dd}/${mm}/${yyyy}`,
      nombre: a.nombre ?? "Sin nombre",
      telefono: a.telefono ?? "—",
      asunto: a.tema ?? a.resumen ?? "—",
      sucursal: a.sucursal?.nombre ?? "—",
      abogado: a.abogado?.nombre ?? "—",
      pago: a.pagoAsesoria,
      monto: Number(a.monto ?? 0),
      status: (a.status as StatusAsesoria) ?? "pendiente",
      urlDocumento: a.urlDocumento ?? null,
    };
  });

  const sucursales = sucursalesDb.map((s) => s.nombre);
  const abogados = abogadosDb.map((u) => u.nombre);

  return (
    <AsesoriasClient
      asesorias={asesorias}
      sucursales={sucursales}
      abogados={abogados}
    />
  );
}
