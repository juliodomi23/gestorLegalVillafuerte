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
  notas?: string;
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
      notas: form.notas || null,
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
  const seg = await prisma.seguimiento.update({
    where: { id },
    data: {
      tipoCaso: form.tipoCaso || null,
      frecuenciaDias: form.frecuencia,
      abogadoId,
      sucursalId,
      notas: form.notas || null,
    },
  });
  // El teléfono vive en el cliente, no en el seguimiento: si no se copia aquí,
  // el abogado lo escribe en el formulario y al guardar se pierde.
  if (seg.clienteId && form.telefono) {
    await prisma.cliente.update({
      where: { id: seg.clienteId },
      data: { telefono: form.telefono, nombre: form.cliente || undefined },
    });
  }
  revalidatePath("/seguimientos");
}

// `observaciones` = qué se le dijo al cliente en esta llamada. Se van apilando en
// `notas`, la más reciente arriba, con la fecha delante.
export async function marcarLlamadoAction(id: string, observaciones?: string) {
  await requireSession();
  const s = await prisma.seguimiento.findUnique({ where: { id } });
  if (!s) return;
  const hoy = new Date();
  const nota = observaciones?.trim();
  const entrada = nota ? `${hoy.toLocaleDateString("es-MX")} — ${nota}` : null;
  await prisma.seguimiento.update({
    where: { id },
    data: {
      ultimoContacto: hoy,
      proximoLlamado: sumarDias(hoy, s.frecuenciaDias ?? 7),
      ...(entrada ? { notas: s.notas ? `${entrada}\n${s.notas}` : entrada } : {}),
    },
  });
  revalidatePath("/seguimientos");
}

export async function borrarSeguimientoAction(id: string) {
  await requireSession();
  await prisma.seguimiento.delete({ where: { id } });
  revalidatePath("/seguimientos");
}
