import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExpedientesClient, { type ExpView } from "./client";

function textoVence(fecha: Date | null): { texto: string; urgente: boolean } | null {
  if (!fecha) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const dias = Math.round((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  if (dias < 0) return { texto: "Vencido", urgente: true };
  if (dias === 0) return { texto: "Hoy", urgente: true };
  if (dias === 1) return { texto: "Mañana", urgente: true };
  return { texto: `${dias} días`, urgente: dias <= 3 };
}

export default async function ExpedientesPage() {
  const session = await getServerSession(authOptions);

  const [rows, sucursalesDb, abogadosDb] = await Promise.all([
    prisma.expediente.findMany({
      include: {
        cliente: true,
        abogadoResponsable: true,
        sucursal: true,
        terminos: { orderBy: { vencimientoTermino: "asc" }, take: 1 },
      },
      orderBy: { creadoEn: "desc" },
    }),
    prisma.sucursal.findMany({ orderBy: { nombre: "asc" } }),
    prisma.usuario.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
  ]);

  const expedientes: ExpView[] = rows.map((e) => {
    const proximoVencimiento =
      e.terminos.find((t) => !t.cumplido && t.vencimientoTermino)?.vencimientoTermino ?? null;
    const vence = textoVence(proximoVencimiento);
    return {
      id: e.id,
      numeroInterno: e.numeroInterno ?? "S/N",
      numeroJudicial: e.numeroJudicial ?? "—",
      cliente: e.cliente?.nombre ?? "—",
      materia: e.materia ?? "—",
      etapa: e.etapaProcesal ?? "—",
      abogado: e.abogadoResponsable?.nombre ?? "—",
      sucursal: e.sucursal?.nombre ?? "—",
      estado: e.estado.charAt(0).toUpperCase() + e.estado.slice(1),
      vencimiento: vence?.texto ?? null,
      urgente: vence?.urgente ?? false,
    };
  });

  const sucursales = sucursalesDb.map((s) => s.nombre);
  const abogados = abogadosDb.map((u) => u.nombre);

  return (
    <ExpedientesClient
      expedientes={expedientes}
      sucursales={sucursales}
      abogados={abogados}
      sesionRol={session?.user?.rol ?? "abogado"}
      sesionNombre={session?.user?.name ?? ""}
    />
  );
}
