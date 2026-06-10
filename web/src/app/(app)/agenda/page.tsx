import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AgendaClient, { type CitaView } from "./client";

const TZ = "America/Mexico_City";

function rangoFecha(fechaStr: string, vista: string) {
  if (vista === "semana") {
    const d = new Date(`${fechaStr}T12:00:00-06:00`);
    const diaSemana = d.getDay();
    const diffLunes = diaSemana === 0 ? -6 : 1 - diaSemana;
    const lunes = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diffLunes);
    const domingo = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + 6);
    const lunesStr = lunes.toLocaleDateString("en-CA");
    const domingoStr = domingo.toLocaleDateString("en-CA");
    return {
      inicio: new Date(`${lunesStr}T00:00:00-06:00`),
      fin: new Date(`${domingoStr}T23:59:59-06:00`),
    };
  }
  if (vista === "mes") {
    const [y, m] = fechaStr.split("-").map(Number);
    const primerDia = `${y}-${String(m).padStart(2, "0")}-01`;
    const ultimoDia = new Date(y, m, 0).getDate();
    const ultimoDiaStr = `${y}-${String(m).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;
    return {
      inicio: new Date(`${primerDia}T00:00:00-06:00`),
      fin: new Date(`${ultimoDiaStr}T23:59:59-06:00`),
    };
  }
  return {
    inicio: new Date(`${fechaStr}T00:00:00-06:00`),
    fin: new Date(`${fechaStr}T23:59:59-06:00`),
  };
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: { fecha?: string; vista?: string };
}) {
  const session = await getServerSession(authOptions);
  const esAdmin = session?.user?.rol === "admin";
  const userId = session?.user?.id;

  const vista = searchParams.vista ?? "dia";
  const fechaStr =
    searchParams.fecha ??
    new Date().toLocaleDateString("en-CA", { timeZone: TZ });

  const { inicio, fin } = rangoFecha(fechaStr, vista);

  const [rows, sucursalesDb, abogadosDb] = await Promise.all([
    prisma.cita.findMany({
      where: {
        fechaHora: { gte: inicio, lte: fin },
        estado: { not: "cancelada" },
        ...(esAdmin ? {} : { abogadoId: userId }),
      },
      include: { cliente: true, abogado: true, sucursal: true },
      orderBy: { fechaHora: "asc" },
    }),
    prisma.sucursal.findMany({ orderBy: { nombre: "asc" } }),
    prisma.usuario.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
  ]);

  const citas: CitaView[] = rows.map((c) => ({
    id: c.id,
    fechaISO: c.fechaHora.toLocaleDateString("en-CA", { timeZone: TZ }),
    hora: c.fechaHora.toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: TZ,
    }),
    cliente: c.cliente?.nombre ?? c.clienteNombre ?? "—",
    asunto: c.asunto ?? "—",
    telefono: c.telefono ?? c.cliente?.telefono ?? "—",
    sucursal: c.sucursal?.nombre ?? "—",
    abogado: c.abogado?.nombre ?? "—",
    estado: c.estado === "confirmada" ? "Confirmada" : "Por confirmar",
  }));

  const sucursales = sucursalesDb.map((s) => s.nombre);
  const abogados = abogadosDb.map((u) => u.nombre);

  return (
    <AgendaClient
      citas={citas}
      sucursales={sucursales}
      abogados={abogados}
      fechaActual={fechaStr}
      vista={vista}
    />
  );
}
