import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SeguimientosClient, { type SeguimientoView } from "./client";
import { alcanceDe, porSeguimiento } from "@/lib/alcance";

function fmtDate(d: Date | null): string {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  return `${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCMonth() + 1).padStart(2, "0")}/${date.getUTCFullYear()}`;
}

function calcAlerta(proximo: Date | null): "hoy" | "atrasado" | null {
  if (!proximo) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const dias = Math.round((proximo.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  if (dias < 0) return "atrasado";
  if (dias === 0) return "hoy";
  return null;
}

function calcLlamoEstaSemana(ultimoContacto: Date | null): boolean {
  if (!ultimoContacto) return false;
  const hoy = new Date();
  const diasPasados = (hoy.getTime() - ultimoContacto.getTime()) / (1000 * 60 * 60 * 24);
  return diasPasados <= 7;
}

export default async function SeguimientosPage() {
  const session = await getServerSession(authOptions);
  let alcance = await alcanceDe(session?.user?.id, session?.user?.rol);

  // Mismo criterio que Agenda: la coordinadora de operaciones (permiso
  // verProductividad) da seguimiento a llamadas de todos los abogados, no solo
  // las suyas.
  if (alcance && session?.user?.id) {
    const u = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { verProductividad: true },
    });
    if (u?.verProductividad) alcance = null;
  }

  const verResumen = alcance === null;

  const [rows, sucursalesDb, abogadosDb, expedientesPorAbogado] = await Promise.all([
    prisma.seguimiento.findMany({
      where: { estado: "activo", ...porSeguimiento(alcance) },
      include: { cliente: true, abogado: true, sucursal: true },
      orderBy: { proximoLlamado: "asc" },
    }),
    prisma.sucursal.findMany({ orderBy: { nombre: "asc" } }),
    prisma.usuario.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
    verResumen
      ? prisma.expediente.groupBy({ by: ["abogadoResponsableId"], where: { estado: "activo" }, _count: { id: true } })
      : Promise.resolve([]),
  ]);

  // Para que el Lic. Christian vea de un vistazo quién está llamando y quién no:
  // expedientes activos (cartera) + de los seguimientos ya filtrados, cuántos se
  // llamaron esta semana y cuántos se quedaron sin llamar.
  const resumenAbogados = verResumen
    ? abogadosDb.map((u) => {
        const propios = rows.filter((s) => s.abogadoId === u.id);
        const llamadosSemana = propios.filter((s) => calcLlamoEstaSemana(s.ultimoContacto)).length;
        return {
          abogadoId: u.id,
          nombre: u.nombre,
          expedientesActivos: expedientesPorAbogado.find((e) => e.abogadoResponsableId === u.id)?._count.id ?? 0,
          carteraSeguimiento: propios.length,
          llamadosSemana,
          faltanSemana: propios.length - llamadosSemana,
        };
      })
    : [];

  const seguimientos: SeguimientoView[] = rows.map((s) => ({
    id: s.id,
    cliente: s.cliente?.nombre ?? "—",
    tipoCaso: s.tipoCaso ?? "—",
    abogado: s.abogado?.nombre ?? "—",
    sucursal: s.sucursal?.nombre ?? "—",
    telefono: s.cliente?.telefono ?? "—",
    ultimoContacto: fmtDate(s.ultimoContacto),
    proximoLlamado: fmtDate(s.proximoLlamado),
    frecuencia: s.frecuenciaDias ?? 7,
    alerta: calcAlerta(s.proximoLlamado),
    llamoEstaSemana: calcLlamoEstaSemana(s.ultimoContacto),
    notas: s.notas ?? "",
  }));

  const sucursales = sucursalesDb.map((s) => s.nombre);
  const abogados = abogadosDb.map((u) => u.nombre);

  return (
    <SeguimientosClient
      seguimientos={seguimientos}
      sucursales={sucursales}
      abogados={abogados}
      resumenAbogados={resumenAbogados}
    />
  );
}
