import { prisma } from "@/lib/prisma";
import { parseFecha } from "@/lib/fecha";

export type DatosAudiencia = {
  expedienteId?: string;
  numeroExpediente?: string;
  fechaHora: string;
  tipo?: string;
  lugar?: string;
};

export async function registrarAudiencia(d: DatosAudiencia) {
  const fecha = parseFecha(d.fechaHora);
  if (!fecha) throw new Error("fechaHora inválida");

  let expedienteId = d.expedienteId ?? null;
  if (!expedienteId && d.numeroExpediente) {
    const e = await prisma.expediente.findFirst({
      where: {
        OR: [
          { numeroInterno: d.numeroExpediente },
          { numeroJudicial: d.numeroExpediente },
        ],
      },
    });
    expedienteId = e?.id ?? null;
  }
  if (!expedienteId) throw new Error("expediente no encontrado");

  return prisma.audiencia.create({
    data: {
      expedienteId,
      fechaHora: fecha,
      tipo: d.tipo,
      lugar: d.lugar,
      estado: "programada",
    },
    include: { expediente: { select: { numeroInterno: true } } },
  });
}

export async function audienciasDelDia(fecha: string) {
  const inicio = new Date(fecha);
  inicio.setHours(0, 0, 0, 0);
  const fin = new Date(fecha);
  fin.setHours(23, 59, 59, 999);
  return prisma.audiencia.findMany({
    where: { fechaHora: { gte: inicio, lte: fin }, estado: "programada" },
    orderBy: { fechaHora: "asc" },
    include: { expediente: { include: { cliente: true } } },
  });
}
