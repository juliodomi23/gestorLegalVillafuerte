import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listarLecciones } from "@/lib/tecnicas";
import TecnicasClient, { type AvanceUsuario } from "./client";

function fmtDate(d: Date): string {
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Mexico_City" });
}

export default async function TecnicasPage() {
  const session = await getServerSession(authOptions);
  const esAdmin = session?.user?.rol === "admin";
  const userId = session?.user?.id;

  const [lecciones, vistas, usuarios] = await Promise.all([
    listarLecciones(),
    prisma.leccionVista.findMany({ where: esAdmin ? undefined : { usuarioId: userId } }),
    esAdmin
      ? prisma.usuario.findMany({ where: { activo: true, rol: { not: "admin" } }, orderBy: { nombre: "asc" } })
      : Promise.resolve([]),
  ]);

  const misVistas: Record<string, string> = {};
  for (const v of vistas) if (v.usuarioId === userId) misVistas[v.leccion] = fmtDate(v.vistoEn);

  const equipo: AvanceUsuario[] = usuarios.map((u) => {
    const vistasDe: Record<string, string> = {};
    for (const v of vistas) if (v.usuarioId === u.id) vistasDe[v.leccion] = fmtDate(v.vistoEn);
    return { nombre: u.nombre, vistas: vistasDe };
  });

  return <TecnicasClient lecciones={lecciones} misVistas={misVistas} equipo={esAdmin ? equipo : null} />;
}
