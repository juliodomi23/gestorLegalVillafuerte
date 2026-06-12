"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { upsertCliente, resolverAbogado, resolverSucursal } from "@/lib/services/resolvers";
import { requireSession } from "@/lib/guard";
import { sumarDias } from "@/lib/fecha";

export type FormSeguimiento = {
  cliente: string;
  tipoCaso: string;
  telefono: string;
  abogado: string;
  sucursal: string;
  frecuencia: number;
};

export async function crearSeguimientoAction(form: FormSeguimiento) {
  const sesion = await requireSession();
  const [abogadoId, sucursalId] = await Promise.all([
    resolverAbogado(form.abogado),
    resolverSucursal(form.sucursal),
  ]);
  // El cliente nuevo pertenece al abogado del seguimiento; si no se eligió, a quien lo crea.
  const clienteId = await upsertCliente(form.cliente, form.telefono || undefined, abogadoId ?? sesion.id);
  const hoy = new Date();
  await prisma.seguimiento.create({
    data: {
      clienteId,
      abogadoId,
      sucursalId,
      tipoCaso: form.tipoCaso || null,
      frecuenciaDias: form.frecuencia,
      fechaInicio: hoy,
      ultimoContacto: hoy,
      proximoLlamado: sumarDias(hoy, form.frecuencia),
      estado: "activo",
    },
  });
  revalidatePath("/seguimientos");
}

export async function editarSeguimientoAction(id: string, form: FormSeguimiento) {
  await requireSession();
  const [abogadoId, sucursalId] = await Promise.all([
    resolverAbogado(form.abogado),
    resolverSucursal(form.sucursal),
  ]);
  await prisma.seguimiento.update({
    where: { id },
    data: {
      tipoCaso: form.tipoCaso || null,
      frecuenciaDias: form.frecuencia,
      abogadoId,
      sucursalId,
    },
  });
  revalidatePath("/seguimientos");
}

export async function marcarLlamadoAction(id: string) {
  await requireSession();
  const s = await prisma.seguimiento.findUnique({ where: { id } });
  if (!s) return;
  const hoy = new Date();
  await prisma.seguimiento.update({
    where: { id },
    data: {
      ultimoContacto: hoy,
      proximoLlamado: sumarDias(hoy, s.frecuenciaDias ?? 7),
    },
  });
  revalidatePath("/seguimientos");
}

export async function borrarSeguimientoAction(id: string) {
  await requireSession();
  await prisma.seguimiento.delete({ where: { id } });
  revalidatePath("/seguimientos");
}
