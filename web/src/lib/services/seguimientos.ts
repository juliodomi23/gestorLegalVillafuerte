import { prisma } from "@/lib/prisma";
import { sumarDias } from "@/lib/fecha";
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
  const [clienteId, abogadoId, sucursalId] = await Promise.all([
    upsertCliente(d.cliente, d.telefono),
    resolverAbogado(d.abogado),
    resolverSucursal(d.sucursal),
  ]);

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
  const hoy = new Date();
  return prisma.seguimiento.update({
    where: { id },
    data: {
      ultimoContacto: hoy,
      proximoLlamado: sumarDias(hoy, s.frecuenciaDias ?? 7),
    },
  });
}
