import { prisma } from "@/lib/prisma";
import { porAbogado, type Alcance } from "@/lib/alcance";

export type DatosProspecto = {
  nombre: string;
  telefono?: string;
  ciudad?: string;
  asunto?: string;
  fechaLlamada?: string;
};

// Dedup: si el mismo teléfono ya existe como prospecto en los últimos 30 días → actualiza.
// Evita duplicados cuando el cron manda el mismo lote varias veces.
export async function upsertProspecto(d: DatosProspecto) {
  const treintaDias = new Date();
  treintaDias.setDate(treintaDias.getDate() - 30);

  if (d.telefono) {
    const existente = await prisma.prospecto.findFirst({
      where: {
        telefono: d.telefono,
        creadoEn: { gte: treintaDias },
      },
      orderBy: { creadoEn: "desc" },
    });

    if (existente) {
      return prisma.prospecto.update({
        where: { id: existente.id },
        data: {
          nombre: d.nombre,
          ciudad: d.ciudad ?? existente.ciudad,
          asunto: d.asunto ?? existente.asunto,
          fechaLlamada: d.fechaLlamada ? new Date(d.fechaLlamada) : existente.fechaLlamada,
        },
      });
    }
  }

  return prisma.prospecto.create({
    data: {
      nombre: d.nombre,
      telefono: d.telefono ?? null,
      ciudad: d.ciudad ?? null,
      asunto: d.asunto ?? null,
      fechaLlamada: d.fechaLlamada ? new Date(d.fechaLlamada) : new Date(),
    },
  });
}

export async function actualizarEstadoProspecto(
  id: string,
  estado: string,
  nota?: string
) {
  return prisma.prospecto.update({
    where: { id },
    data: {
      estado,
      ...(nota !== undefined && { nota }),
    },
  });
}

export async function borrarProspecto(id: string) {
  return prisma.prospecto.delete({ where: { id } });
}

export async function listarProspectos(filtros?: {
  ciudad?: string;
  estado?: string;
  mes?: number;
  anio?: number;
}) {
  const anio = filtros?.anio ?? 2026;
  const mes = filtros?.mes;
  const fechaFiltro =
    mes !== undefined
      ? {
          gte: new Date(Date.UTC(anio, mes - 1, 1)),
          lt: new Date(Date.UTC(anio, mes, 1)),
        }
      : undefined;

  return prisma.prospecto.findMany({
    where: {
      ...(filtros?.ciudad && { ciudad: filtros.ciudad }),
      ...(filtros?.estado && { estado: filtros.estado }),
      ...(fechaFiltro && { fechaLlamada: fechaFiltro }),
    },
    orderBy: [{ fechaLlamada: "desc" }, { creadoEn: "desc" }],
  });
}

// Los dos embudos viven en tablas distintas: `prospectos` (bot de llamadas) y las
// asesorías de quien todavía no firma. En vez de copiar filas de un lado al otro,
// la pantalla los junta al leer. La asesoría se sigue editando en su pantalla.
const STATUS_ASESORIA_A_ESTADO: Record<string, string> = {
  pendiente: "por_contactar",
  contrato_firmado: "convertido",
  no_regreso: "llamar_despues",
  descartado: "descartado",
};

export type FilaProspectoUnificada = {
  id: string;
  origen: "llamada" | "asesoria";
  /** Solo en las de asesoría: para abrir el expediente sin crear otro cliente. */
  clienteId: string | null;
  nombre: string;
  telefono: string | null;
  ciudad: string | null;
  asunto: string | null;
  estado: string;
  nota: string | null;
  fecha: Date | null;
};

export async function listarProspectosUnificados(
  filtros: { ciudad?: string; estado?: string; mes?: number; anio?: number },
  alcance: Alcance,
) {
  const anio = filtros.anio ?? new Date().getFullYear();
  const mes = filtros.mes;
  const rango =
    mes !== undefined
      ? { gte: new Date(Date.UTC(anio, mes - 1, 1)), lt: new Date(Date.UTC(anio, mes, 1)) }
      : undefined;

  // Filtrar por un estado que ninguna asesoría puede tener (no_contesto, agendo_cita)
  // deja fuera a todas: no hay status equivalente.
  const statusBuscado = filtros.estado
    ? Object.keys(STATUS_ASESORIA_A_ESTADO).find((s) => STATUS_ASESORIA_A_ESTADO[s] === filtros.estado)
    : undefined;
  const pedirAsesorias = !filtros.estado || statusBuscado !== undefined;

  const [llamadas, asesorias] = await Promise.all([
    listarProspectos(filtros),
    pedirAsesorias
      ? prisma.asesoria.findMany({
          where: {
            AND: [
              // Prospecto = sin expediente todavía, ni propio ni del cliente.
              { expedienteId: null },
              { OR: [{ clienteId: null }, { cliente: { expedientes: { none: {} } } }] },
              porAbogado(alcance),
              ...(rango ? [{ fecha: rango }] : []),
              ...(statusBuscado ? [{ status: statusBuscado }] : []),
              // La ciudad del bot es texto libre; la de una asesoría es su sucursal.
              ...(filtros.ciudad ? [{ sucursal: { nombre: { contains: filtros.ciudad, mode: "insensitive" as const } } }] : []),
            ],
          },
          include: { cliente: { select: { id: true } }, sucursal: { select: { nombre: true } } },
          orderBy: { fecha: "desc" },
        })
      : [],
  ]);

  const filas: FilaProspectoUnificada[] = [
    ...llamadas.map((p) => ({
      id: p.id,
      origen: "llamada" as const,
      clienteId: null,
      nombre: p.nombre,
      telefono: p.telefono,
      ciudad: p.ciudad,
      asunto: p.asunto,
      estado: p.estado,
      nota: p.nota,
      fecha: p.fechaLlamada,
    })),
    ...asesorias.map((a) => ({
      id: a.id,
      origen: "asesoria" as const,
      clienteId: a.cliente?.id ?? null,
      nombre: a.nombre ?? "—",
      telefono: a.telefono,
      ciudad: a.sucursal?.nombre ?? null,
      asunto: a.tema,
      estado: STATUS_ASESORIA_A_ESTADO[a.status] ?? "por_contactar",
      nota: a.seguimiento ?? a.resumen,
      fecha: a.fecha,
    })),
  ];

  return filas.sort((x, y) => (y.fecha?.getTime() ?? 0) - (x.fecha?.getTime() ?? 0));
}
