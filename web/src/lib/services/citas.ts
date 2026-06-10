import { prisma } from "@/lib/prisma";
import { parseFecha } from "@/lib/fecha";
import { resolverSucursal, resolverAbogado, upsertCliente } from "./resolvers";

export type DatosCita = {
  cliente: string;
  telefono?: string;
  asunto?: string;
  fechaHora: string;
  abogado?: string;
  sucursal?: string;
  numeroExpediente?: string;
  origen?: "bot_externo" | "manual";
  googleEventId?: string;
};

export async function citasDelDia(fecha: string) {
  const inicio = new Date(fecha);
  inicio.setHours(0, 0, 0, 0);
  const fin = new Date(fecha);
  fin.setHours(23, 59, 59, 999);
  return prisma.cita.findMany({
    where: { fechaHora: { gte: inicio, lte: fin } },
    orderBy: { fechaHora: "asc" },
    include: { cliente: true, abogado: true, sucursal: true },
  });
}

export async function actualizarCita(id: string, estado: "confirmada" | "cancelada") {
  return prisma.cita.update({ where: { id }, data: { estado } });
}

export async function agendarCita(d: DatosCita) {
  const fecha = parseFecha(d.fechaHora);
  if (!fecha) throw new Error("fechaHora inválida");

  // Dedup: si ya existe una cita con este googleEventId, retornar la existente
  if (d.googleEventId) {
    const existente = await prisma.cita.findFirst({
      where: { googleEventId: d.googleEventId },
    });
    if (existente) return existente;
  }

  const [clienteId, abogadoId, sucursalId] = await Promise.all([
    upsertCliente(d.cliente, d.telefono),
    resolverAbogado(d.abogado),
    resolverSucursal(d.sucursal),
  ]);

  let expedienteId: string | null = null;
  if (d.numeroExpediente) {
    const e = await prisma.expediente.findFirst({
      where: { OR: [{ numeroInterno: d.numeroExpediente }, { numeroJudicial: d.numeroExpediente }] },
    });
    expedienteId = e?.id ?? null;
  }

  return prisma.cita.create({
    data: {
      clienteId,
      abogadoId,
      sucursalId,
      expedienteId,
      asunto: d.asunto,
      telefono: d.telefono,
      fechaHora: fecha,
      origen: d.origen ?? "bot_externo",
      googleEventId: d.googleEventId ?? null,
    },
  });
}
