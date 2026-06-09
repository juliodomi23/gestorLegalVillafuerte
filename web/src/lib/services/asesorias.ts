import { prisma } from "@/lib/prisma";
import { resolverSucursal, resolverAbogado } from "./resolvers";
import type { Prisma } from "@prisma/client";

export type DatosAsesoria = {
  nombre: string;
  telefono?: string;
  edad?: string;
  domicilio?: string;
  tema?: string;
  resumen?: string;
  pagoAsesoria?: boolean;
  monto?: number;
  seguimiento?: string;
  status?: "pendiente" | "contrato_firmado" | "no_regreso" | "descartado";
  abogado?: string;
  sucursal?: string;
  origen?: "web" | "whatsapp";
};

export type FiltrosAsesoria = {
  status?: string;
  telefono?: string;
  fecha?: string;    // YYYY-MM-DD
  sucursal?: string;
  limite?: number;
};

export type CambiosAsesoria = {
  status?: "pendiente" | "contrato_firmado" | "no_regreso" | "descartado";
  urlDocumento?: string;
  resumen?: string;
};

export async function buscarAsesorias(f: FiltrosAsesoria) {
  const where: Prisma.AsesoriaWhereInput = {};

  if (f.status) where.status = f.status;
  if (f.telefono) where.telefono = f.telefono;
  if (f.fecha) {
    const d = new Date(f.fecha);
    // campo `fecha` es Date (solo día)
    where.fecha = d;
  }
  if (f.sucursal) {
    const s = await prisma.sucursal.findFirst({
      where: { nombre: { contains: f.sucursal, mode: "insensitive" } },
    });
    if (s) where.sucursalId = s.id;
  }

  return prisma.asesoria.findMany({
    where,
    orderBy: { creadoEn: "desc" },
    take: f.limite ?? 100,
    include: { abogado: true, sucursal: true },
  });
}

export async function actualizarAsesoria(id: string, cambios: CambiosAsesoria) {
  const data: Prisma.AsesoriaUpdateInput = {};
  if (cambios.status) data.status = cambios.status;
  if (cambios.urlDocumento !== undefined) data.urlDocumento = cambios.urlDocumento;
  if (cambios.resumen !== undefined) data.resumen = cambios.resumen;
  return prisma.asesoria.update({ where: { id }, data });
}

export async function resumenDiario(fecha: string) {
  const dia = new Date(fecha);
  const lista = await prisma.asesoria.findMany({
    where: { fecha: dia },
    include: { sucursal: true },
  });

  const total = lista.length;
  const contratos = lista.filter((a) => a.status === "contrato_firmado").length;
  const recaudado = lista.reduce((s, a) => s + Number(a.monto ?? 0), 0);

  const porSucursal: Record<string, number> = {};
  for (const a of lista) {
    const nombre = a.sucursal?.nombre ?? "Sin sucursal";
    porSucursal[nombre] = (porSucursal[nombre] ?? 0) + 1;
  }

  return {
    fecha,
    total,
    contratos,
    conversion: total > 0 ? Math.round((contratos / total) * 100) : 0,
    recaudado,
    porSucursal,
  };
}

export async function registrarAsesoria(d: DatosAsesoria) {
  const [abogadoId, sucursalId] = await Promise.all([
    resolverAbogado(d.abogado),
    resolverSucursal(d.sucursal),
  ]);

  return prisma.asesoria.create({
    data: {
      nombre: d.nombre,
      telefono: d.telefono,
      edad: d.edad,
      domicilio: d.domicilio,
      tema: d.tema,
      resumen: d.resumen,
      pagoAsesoria: d.pagoAsesoria ?? false,
      monto: d.monto,
      seguimiento: d.seguimiento,
      status: d.status ?? "pendiente",
      abogadoId,
      sucursalId,
      origen: d.origen ?? "whatsapp",
    },
  });
}
