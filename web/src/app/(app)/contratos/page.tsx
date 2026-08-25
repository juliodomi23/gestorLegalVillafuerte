import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { alcanceDe } from "@/lib/alcance";
import { prisma } from "@/lib/prisma";
import { listarContratos, expedientesParaContrato } from "@/lib/services/contratos";
import ContratosClient from "./client";

export default async function ContratosPage() {
  const session = await getServerSession(authOptions);
  const alcance = await alcanceDe(session?.user?.id, session?.user?.rol);

  const [contratos, expedientes, sucursalesDb, abogadosDb] = await Promise.all([
    listarContratos(alcance),
    expedientesParaContrato(alcance),
    prisma.sucursal.findMany({ orderBy: { nombre: "asc" } }),
    prisma.usuario.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
  ]);

  return (
    <ContratosClient
      contratos={contratos}
      expedientes={expedientes}
      sucursales={sucursalesDb.map((s) => s.nombre)}
      abogados={abogadosDb.map((u) => u.nombre)}
      esAdmin={session?.user?.rol === "admin"}
      sesionNombre={session?.user?.name ?? ""}
    />
  );
}
