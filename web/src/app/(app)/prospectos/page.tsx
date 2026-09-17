import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hoyDespacho } from "@/lib/fecha";
import {
  listarProspectosUnificados,
  resumenLlamadasPorAbogado,
  mapProspectosRows,
  mesActualMX,
  ANIO_PROSPECTOS,
} from "@/lib/services/prospectos";
import { alcanceDe } from "@/lib/alcance";
import ProspectosClient from "./client";

export default async function ProspectosPage({
  searchParams,
}: {
  searchParams: { ciudad?: string; estado?: string; mes?: string; abogado?: string };
}) {
  const session = await getServerSession(authOptions);
  const esAdmin = session?.user?.rol === "admin";

  const mes = searchParams.mes ? parseInt(searchParams.mes) : mesActualMX();
  // Admin puede filtrar por cualquier abogado (reporte de "quién le llamó a quién");
  // un no-admin solo puede filtrar por sí mismo ("Solo mías"), no por nadie más.
  const filtroAbogadoId = esAdmin
    ? searchParams.abogado || undefined
    : searchParams.abogado && searchParams.abogado === session?.user?.id
      ? searchParams.abogado
      : undefined;

  const alcance = await alcanceDe(session?.user?.id, session?.user?.rol);
  const [rows, abogadosDb, resumen, sucursalesDb] = await Promise.all([
    listarProspectosUnificados(
      {
        ciudad: searchParams.ciudad || undefined,
        estado: searchParams.estado || undefined,
        abogadoId: filtroAbogadoId,
        mes,
        anio: ANIO_PROSPECTOS,
      },
      alcance,
    ),
    prisma.usuario.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
    resumenLlamadasPorAbogado(),
    prisma.sucursal.findMany({ orderBy: { nombre: "asc" } }),
  ]);

  const prospectos = mapProspectosRows(rows);
  const ciudades = [...new Set(rows.map((p) => p.ciudad).filter(Boolean))] as string[];
  const hoyLabel = new Date(`${hoyDespacho()}T00:00:00.000Z`).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  // La tabla de todos los abogados vive en /reportes (solo admin); aquí cada quien
  // ve nada más su propia fila, sea admin o no.
  const miResumen = resumen.find((r) => r.abogadoId === session?.user?.id) ?? null;

  return (
    <ProspectosClient
      prospectos={prospectos}
      ciudades={ciudades}
      abogados={abogadosDb.map((u) => ({ id: u.id, nombre: u.nombre }))}
      sucursales={sucursalesDb.map((s) => s.nombre)}
      esAdmin={esAdmin}
      miId={session?.user?.id ?? null}
      resumen={resumen}
      miResumen={miResumen}
      hoyLabel={hoyLabel}
      hoy={hoyDespacho()}
      filtroEstado={searchParams.estado ?? ""}
      filtroCiudad={searchParams.ciudad ?? ""}
      filtroAbogado={filtroAbogadoId ?? ""}
      filtroMes={mes}
    />
  );
}
