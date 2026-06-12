import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SeguimientosClient, { type SeguimientoView } from "./client";

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
  const esAdmin = session?.user?.rol === "admin";
  const userId = session?.user?.id;

  const [rows, sucursalesDb, abogadosDb] = await Promise.all([
    prisma.seguimiento.findMany({
      where: esAdmin ? { estado: "activo" } : { estado: "activo", abogadoId: userId },
      include: { cliente: true, abogado: true, sucursal: true },
      orderBy: { proximoLlamado: "asc" },
    }),
    prisma.sucursal.findMany({ orderBy: { nombre: "asc" } }),
    prisma.usuario.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
  ]);

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
  }));

  const sucursales = sucursalesDb.map((s) => s.nombre);
  const abogados = abogadosDb.map((u) => u.nombre);

  return (
    <SeguimientosClient
      seguimientos={seguimientos}
      sucursales={sucursales}
      abogados={abogados}
    />
  );
}
