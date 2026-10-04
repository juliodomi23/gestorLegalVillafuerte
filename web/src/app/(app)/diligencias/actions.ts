"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { resolverAbogado, resolverSucursal, asignarFolioDiligencia } from "@/lib/services/resolvers";
import { requireSession, type Sesion } from "@/lib/guard";
import { parsear, montoSchema } from "@/lib/validaciones";
import { diligenciasHabilitadoHoy } from "@/lib/fecha";
import { unlink } from "fs/promises";
import { basename, join } from "path";
import {
  exigirEdicionDiligencia,
  puedeGestionarDiligencias,
} from "@/lib/services/diligencias";

export type FormRenglon = {
  fecha: string;
  descripcion: string;
  asunto: string;
  importe: string;
};

export type FormDiligencia = {
  cliente: string;
  sucursal: string;
  abogado: string;
  renglones: FormRenglon[];
};

export type EstadoPagoDiligencia = "pendiente" | "reembolsado" | "en_nomina";

// Solo recepción y admin asignan la diligencia a otro abogado, igual que en asesorías:
// un server action es un endpoint HTTP y cualquiera con sesión puede invocarlo con el
// payload que quiera.
function puedeAsignar(sesion: Sesion) {
  return puedeGestionarDiligencias(sesion);
}

export async function crearDiligenciaAction(form: FormDiligencia) {
  const sesion = await requireSession();
  if (sesion.rol !== "admin" && !diligenciasHabilitadoHoy()) {
    throw new Error("Las diligencias solo se registran de lunes a jueves. Vuelve la próxima semana.");
  }
  const abogado = puedeAsignar(sesion) ? form.abogado || sesion.nombre : sesion.nombre;
  const [abogadoId, sucursalId] = await Promise.all([
    resolverAbogado(abogado),
    resolverSucursal(form.sucursal),
  ]);
  const folio = await asignarFolioDiligencia(sucursalId);
  const renglones = form.renglones.filter((r) => r.importe);
  const diligencia = await prisma.diligencia.create({
    data: {
      folio,
      clienteNombre: form.cliente.trim() || null,
      abogadoId,
      sucursalId,
      renglones: {
        create: renglones.map((r) => ({
          descripcion: r.descripcion.trim() || null,
          asunto: r.asunto.trim() || null,
          importe: parsear(montoSchema, r.importe),
          fecha: r.fecha ? new Date(r.fecha) : new Date(),
        })),
      },
    },
  });
  revalidatePath("/diligencias");
  return diligencia.id;
}

export type FormEdicionDiligencia = {
  cliente: string;
  sucursal: string;
  abogado: string;
};

export async function editarDiligenciaAction(id: string, form: FormEdicionDiligencia) {
  const sesion = await requireSession();
  await exigirEdicionDiligencia(id, sesion);
  const abogado = puedeAsignar(sesion) ? form.abogado || sesion.nombre : sesion.nombre;
  const [abogadoId, sucursalId] = await Promise.all([
    resolverAbogado(abogado),
    resolverSucursal(form.sucursal),
  ]);
  await prisma.diligencia.update({
    where: { id },
    data: {
      clienteNombre: form.cliente.trim() || null,
      abogadoId,
      sucursalId,
    },
  });
  revalidatePath("/diligencias");
}

export async function cambiarEstadoPagoAction(id: string, estadoPago: EstadoPagoDiligencia) {
  const sesion = await requireSession();
  if (!puedeGestionarDiligencias(sesion)) throw new Error("Sin permiso para cambiar el reembolso");
  if (!["pendiente", "reembolsado", "en_nomina"].includes(estadoPago)) {
    throw new Error("Estado de reembolso inválido");
  }
  await prisma.diligencia.update({ where: { id }, data: { estadoPago } });
  revalidatePath("/diligencias");
}

export async function borrarDiligenciaAction(id: string) {
  const sesion = await requireSession();
  await exigirEdicionDiligencia(id, sesion);
  const comprobantes = await prisma.diligenciaComprobante.findMany({
    where: { diligenciaId: id },
    select: { ruta: true },
  });
  await prisma.diligencia.delete({ where: { id } });
  await Promise.all(
    comprobantes.map((c) => unlink(join(process.cwd(), "uploads", basename(c.ruta))).catch(() => {}))
  );
  revalidatePath("/diligencias");
}

export async function agregarRenglonAction(diligenciaId: string, data: FormRenglon) {
  const sesion = await requireSession();
  await exigirEdicionDiligencia(diligenciaId, sesion);
  const importe = parsear(montoSchema, data.importe);
  await prisma.diligenciaRenglon.create({
    data: {
      diligenciaId,
      descripcion: data.descripcion.trim() || null,
      asunto: data.asunto.trim() || null,
      importe,
      fecha: data.fecha ? new Date(data.fecha) : new Date(),
    },
  });
  revalidatePath("/diligencias");
}

export async function editarRenglonAction(renglonId: string, data: FormRenglon) {
  const sesion = await requireSession();
  const renglon = await prisma.diligenciaRenglon.findUnique({
    where: { id: renglonId },
    select: { diligenciaId: true },
  });
  if (!renglon) throw new Error("El concepto ya no existe");
  await exigirEdicionDiligencia(renglon.diligenciaId, sesion);
  await prisma.diligenciaRenglon.update({
    where: { id: renglonId },
    data: {
      descripcion: data.descripcion.trim() || null,
      asunto: data.asunto.trim() || null,
      importe: parsear(montoSchema, data.importe),
      fecha: data.fecha ? new Date(data.fecha) : new Date(),
    },
  });
  revalidatePath("/diligencias");
}

export async function borrarRenglonAction(renglonId: string) {
  const sesion = await requireSession();
  const renglon = await prisma.diligenciaRenglon.findUnique({
    where: { id: renglonId },
    select: { diligenciaId: true },
  });
  if (!renglon) return;
  await exigirEdicionDiligencia(renglon.diligenciaId, sesion);
  await prisma.diligenciaRenglon.delete({ where: { id: renglonId } });
  revalidatePath("/diligencias");
}
