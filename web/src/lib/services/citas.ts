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

// Busca un cliente existente por teléfono o nombre — nunca crea uno nuevo.
// Usado para sync de Calendar: no queremos inflar la lista de clientes con
// personas que todavía no son clientes formales del despacho.
async function buscarClienteExistente(
  telefono?: string,
  nombre?: string
): Promise<string | null> {
  if (telefono) {
    const c = await prisma.cliente.findFirst({ where: { telefono } });
    if (c) return c.id;
  }
  if (nombre) {
    const c = await prisma.cliente.findFirst({
      where: { nombre: { equals: nombre, mode: "insensitive" } },
    });
    if (c) return c.id;
  }
  return null;
}

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

  const esCalendar = !!d.googleEventId;

  // Para citas del Calendar: solo vincular cliente si ya existe en el sistema
  const clienteId = esCalendar
    ? await buscarClienteExistente(d.telefono, d.cliente)
    : await upsertCliente(d.cliente, d.telefono);

  // Dedup: si ya existe una cita con este googleEventId, actualizar con datos frescos
  if (d.googleEventId) {
    const existente = await prisma.cita.findFirst({
      where: { googleEventId: d.googleEventId },
    });
    if (existente) {
      return prisma.cita.update({
        where: { id: existente.id },
        data: {
          clienteId,
          asunto: d.asunto,
          telefono: d.telefono ?? null,
          clienteNombre: clienteId ? null : (d.cliente ?? null),
        },
      });
    }
  }

  const [abogadoId, sucursalId] = await Promise.all([
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
      clienteNombre: clienteId ? null : (d.cliente ?? null),
    },
  });
}
