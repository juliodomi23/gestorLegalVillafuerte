import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { alcanceDe, porAbogado } from "@/lib/alcance";
import { diligenciasHabilitadoHoy } from "@/lib/fecha";
import DiligenciasClient, { type DiligenciaView } from "./client";
import type { EstadoPagoDiligencia } from "./actions";

export default async function DiligenciasPage() {
  const session = await getServerSession(authOptions);
  const alcance = await alcanceDe(session?.user?.id, session?.user?.rol);

  const [rows, sucursalesDb, abogadosDb] = await Promise.all([
    prisma.diligencia.findMany({
      where: porAbogado(alcance),
      include: { sucursal: true, abogado: true, cliente: true, renglones: { orderBy: { fecha: "asc" } } },
      orderBy: { fecha: "desc" },
      take: 300, // ponytail: tope simple en vez de paginación; subir o paginar de verdad si el despacho pasa de esto
    }),
    prisma.sucursal.findMany({ orderBy: { nombre: "asc" } }),
    prisma.usuario.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
  ]);

  const diligencias: DiligenciaView[] = rows.map((d) => {
    const f = d.fecha instanceof Date ? d.fecha : new Date(d.fecha);
    const dd = String(f.getUTCDate()).padStart(2, "0");
    const mm = String(f.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = String(f.getUTCFullYear());
    return {
      id: d.id,
      fecha: `${dd}/${mm}/${yyyy}`,
      fechaISO: `${yyyy}-${mm}-${dd}`,
      folio: d.folio ?? null,
      cliente: d.cliente?.nombre ?? d.clienteNombre ?? "Sin cliente",
      sucursal: d.sucursal?.nombre ?? "",
      abogado: d.abogado?.nombre ?? "",
      estadoPago: (d.estadoPago as EstadoPagoDiligencia) ?? "pendiente",
      renglones: d.renglones.map((r) => ({
        id: r.id,
        fecha: r.fecha ? r.fecha.toISOString().split("T")[0] : "",
        descripcion: r.descripcion ?? "",
        asunto: r.asunto ?? "",
        importe: Number(r.importe),
      })),
    };
  });

  return (
    <DiligenciasClient
      diligencias={diligencias}
      sucursales={sucursalesDb.map((s) => s.nombre)}
      abogados={abogadosDb.map((u) => u.nombre)}
      sesionNombre={session?.user?.name ?? ""}
      sesionRol={session?.user?.rol ?? ""}
      puedeCrearHoy={diligenciasHabilitadoHoy()}
    />
  );
}
