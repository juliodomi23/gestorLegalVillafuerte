import { prisma } from "@/lib/prisma";
import { sumarDias, proximoDiaLlamada } from "@/lib/fecha";
import { resolverSucursal, resolverAbogado, upsertCliente } from "./resolvers";

export type DatosSeguimiento = {
  cliente: string;
  telefono?: string;
  tipoCaso?: string;
  abogado?: string;
  sucursal?: string;
  frecuenciaDias: number;
};

export async function registrarSeguimiento(d: DatosSeguimiento) {
  const [abogadoId, sucursalId] = await Promise.all([
    resolverAbogado(d.abogado),
    resolverSucursal(d.sucursal),
  ]);
  // El cliente nuevo pertenece al abogado del seguimiento.
  const clienteId = await upsertCliente(d.cliente, d.telefono, abogadoId);

  const hoy = new Date();
  return prisma.seguimiento.create({
    data: {
      clienteId,
      abogadoId,
      sucursalId,
      tipoCaso: d.tipoCaso,
      frecuenciaDias: d.frecuenciaDias,
      fechaInicio: hoy,
      ultimoContacto: hoy,
      proximoLlamado: sumarDias(hoy, d.frecuenciaDias),
      estado: "activo",
    },
  });
}

export const FRECUENCIA_EXPEDIENTE_DIAS = 7;

// Todo expediente nuevo nace con su seguimiento semanal, para que el abogado lo llame
// el próximo miércoles o viernes sin tener que acordarse de darlo de alta. Idempotente
// por expediente (expedienteId es único). `dias` permite al script de relleno repartir
// la carga entre miércoles y viernes.
export async function crearSeguimientoDeExpediente(expedienteId: string, dias?: number[]) {
  const exp = await prisma.expediente.findUnique({
    where: { id: expedienteId },
    select: { clienteId: true, abogadoResponsableId: true, sucursalId: true, materia: true },
  });
  if (!exp?.clienteId) return null;

  const datos = {
    clienteId: exp.clienteId,
    abogadoId: exp.abogadoResponsableId,
    sucursalId: exp.sucursalId,
    tipoCaso: exp.materia,
    frecuenciaDias: FRECUENCIA_EXPEDIENTE_DIAS,
    fechaInicio: new Date(),
    proximoLlamado: proximoDiaLlamada(dias),
    estado: "activo",
  };
  return prisma.seguimiento.upsert({
    where: { expedienteId },
    create: { expedienteId, ...datos },
    update: {},
  });
}

// Si el expediente se concluye o archiva, ya no hay a quién llamar; si se reactiva, vuelve.
export async function sincronizarSeguimientoConEstado(expedienteId: string, estadoExpediente: string) {
  await prisma.seguimiento.updateMany({
    where: { expedienteId },
    data: { estado: estadoExpediente === "activo" ? "activo" : "cerrado" },
  });
}

// A quién hay que llamar hoy (para el CRON matutino del bot).
export async function seguimientosPendientes() {
  const hoy = new Date();
  hoy.setHours(23, 59, 59, 999);
  return prisma.seguimiento.findMany({
    where: { estado: "activo", proximoLlamado: { lte: hoy } },
    orderBy: { proximoLlamado: "asc" },
    include: { cliente: true, abogado: true, sucursal: true },
  });
}

// El abogado confirma que llamó: avanza el próximo llamado según la frecuencia.
export async function marcarLlamada(id: string) {
  const s = await prisma.seguimiento.findUnique({ where: { id } });
  if (!s) throw new Error("Seguimiento no encontrado");
  if (s.estado !== "activo") throw new Error("El seguimiento está inactivo");
  const hoy = new Date();
  return prisma.seguimiento.update({
    where: { id },
    data: {
      ultimoContacto: hoy,
      proximoLlamado: sumarDias(hoy, s.frecuenciaDias ?? 7),
    },
  });
}
