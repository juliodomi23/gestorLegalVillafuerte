import { prisma } from "@/lib/prisma";

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

export async function listarProspectos(filtros?: { ciudad?: string; estado?: string }) {
  return prisma.prospecto.findMany({
    where: {
      ...(filtros?.ciudad && { ciudad: filtros.ciudad }),
      ...(filtros?.estado && { estado: filtros.estado }),
    },
    orderBy: { creadoEn: "desc" },
  });
}
