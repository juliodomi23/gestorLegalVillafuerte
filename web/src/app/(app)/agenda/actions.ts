"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { upsertCliente, resolverAbogado, resolverSucursal } from "@/lib/services/resolvers";
import { requireSession } from "@/lib/guard";

export async function crearCitaAction(form: {
  cliente: string;
  asunto: string;
  hora: string;
  telefono: string;
  sucursal: string;
  abogado: string;
}) {
  const sesion = await requireSession();
  const [abogadoId, sucursalId] = await Promise.all([
    resolverAbogado(form.abogado),
    resolverSucursal(form.sucursal),
  ]);
  // El cliente nuevo pertenece al abogado de la cita; si no se eligió, a quien la crea.
  const clienteId = await upsertCliente(form.cliente, form.telefono || undefined, abogadoId ?? sesion.id);
  // hora: "10:30" → combinar con la fecha de hoy
  const hoy = new Date();
  const [h, m] = (form.hora || "09:00").split(":").map(Number);
  hoy.setHours(h, m, 0, 0);

  await prisma.cita.create({
    data: {
      clienteId,
      abogadoId,
      sucursalId,
      asunto: form.asunto || null,
      telefono: form.telefono || null,
      fechaHora: hoy,
      origen: "manual",
    },
  });
  revalidatePath("/agenda");
}

export async function borrarCitaAction(id: string) {
  await requireSession();
  await prisma.cita.delete({ where: { id } });
  revalidatePath("/agenda");
}
