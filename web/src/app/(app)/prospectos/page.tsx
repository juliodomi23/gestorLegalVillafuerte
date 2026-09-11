import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
  const [rows, abogadosDb] = await Promise.all([
    listarProspectosUnificados(
      {
        ciudad: searchParams.ciudad || undefined,
        estado: searchParams.estado || undefined,
        mes,
        anio: ANIO,
      },
      alcance,
    ),
    prisma.usuario.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
  ]);

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
    // p.fecha viene de columnas @db.Date (fechaLlamada / Asesoria.fecha): son fecha
    // pura sin hora, Prisma las devuelve como medianoche UTC. Formatear con TZ México
    // les resta 6h y las manda al día anterior — deben mostrarse en UTC tal cual.
    fechaRegistro: p.fecha
      ? p.fecha.toLocaleDateString("es-MX", { day: "numeric", month: "short", timeZone: "UTC" })
      : "—",
    fechaContacto: p.fechaContacto ? p.fechaContacto.toISOString().split("T")[0] : "",
    abogadoId: p.abogadoId,
  }));

  const ciudades = [...new Set(rows.map((p) => p.ciudad).filter(Boolean))] as string[];

  return (
    <ProspectosClient
      prospectos={prospectos}
      ciudades={ciudades}
      abogados={abogadosDb.map((u) => ({ id: u.id, nombre: u.nombre }))}
      esAdmin={esAdmin}
      filtroEstado={searchParams.estado ?? ""}
      filtroCiudad={searchParams.ciudad ?? ""}
      filtroMes={mes}
    />
  );
}
