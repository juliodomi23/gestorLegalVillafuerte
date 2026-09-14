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
  searchParams: { ciudad?: string; estado?: string; mes?: string };
}) {
  const session = await getServerSession(authOptions);
  const esAdmin = session?.user?.rol === "admin";

  const mes = searchParams.mes ? parseInt(searchParams.mes) : mesActualMX();

  const alcance = await alcanceDe(session?.user?.id, session?.user?.rol);
  const [rows, abogadosDb, resumenAbogados] = await Promise.all([
    listarProspectosUnificados(
      {
        ciudad: searchParams.ciudad || undefined,
        estado: searchParams.estado || undefined,
        mes,
        anio: ANIO_PROSPECTOS,
      },
      alcance,
    ),
    prisma.usuario.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
    esAdmin ? resumenLlamadasPorAbogado() : Promise.resolve([]),
  ]);

  const prospectos = mapProspectosRows(rows);
  const ciudades = [...new Set(rows.map((p) => p.ciudad).filter(Boolean))] as string[];
  const hoyLabel = new Date(`${hoyDespacho()}T00:00:00.000Z`).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

  return (
    <ProspectosClient
      prospectos={prospectos}
      ciudades={ciudades}
      abogados={abogadosDb.map((u) => ({ id: u.id, nombre: u.nombre }))}
      esAdmin={esAdmin}
      resumenAbogados={resumenAbogados}
      hoyLabel={hoyLabel}
      filtroEstado={searchParams.estado ?? ""}
      filtroCiudad={searchParams.ciudad ?? ""}
      filtroMes={mes}
    />
  );
}
