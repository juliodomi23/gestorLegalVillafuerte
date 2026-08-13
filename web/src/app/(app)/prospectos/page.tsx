import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listarProspectosUnificados } from "@/lib/services/prospectos";
import { alcanceDe } from "@/lib/alcance";
import ProspectosClient, { type ProspectoView } from "./client";

const TZ = "America/Mexico_City";
const ANIO = 2026;

function mesActualMX(): number {
  return parseInt(
    new Date().toLocaleString("en-US", { month: "numeric", timeZone: TZ })
  );
}

export default async function ProspectosPage({
  searchParams,
}: {
  searchParams: { ciudad?: string; estado?: string; mes?: string };
}) {
  const session = await getServerSession(authOptions);
  const esAdmin = session?.user?.rol === "admin";

  const mes = searchParams.mes ? parseInt(searchParams.mes) : mesActualMX();

  const alcance = await alcanceDe(session?.user?.id, session?.user?.rol);
  const rows = await listarProspectosUnificados(
    {
      ciudad: searchParams.ciudad || undefined,
      estado: searchParams.estado || undefined,
      mes,
      anio: ANIO,
    },
    alcance,
  );

  const prospectos: ProspectoView[] = rows.map((p) => ({
    id: p.id,
    origen: p.origen,
    clienteId: p.clienteId,
    nombre: p.nombre,
    telefono: p.telefono ?? "—",
    ciudad: p.ciudad ?? "—",
    asunto: p.asunto ?? "—",
    estado: p.estado,
    nota: p.nota ?? "",
    fechaLlamada: p.fecha
      ? p.fecha.toLocaleDateString("es-MX", {
          day: "numeric",
          month: "short",
          timeZone: TZ,
        })
      : "—",
  }));

  const ciudades = [...new Set(rows.map((p) => p.ciudad).filter(Boolean))] as string[];

  return (
    <ProspectosClient
      prospectos={prospectos}
      ciudades={ciudades}
      esAdmin={esAdmin}
      filtroEstado={searchParams.estado ?? ""}
      filtroCiudad={searchParams.ciudad ?? ""}
      filtroMes={mes}
    />
  );
}
