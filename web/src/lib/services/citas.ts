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
};

export async function agendarCita(d: DatosCita) {
  const fecha = parseFecha(d.fechaHora);
  if (!fecha) throw new Error("fechaHora inválida");

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
    },
  });
}
