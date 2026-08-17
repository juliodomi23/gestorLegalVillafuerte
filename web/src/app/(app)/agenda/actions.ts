"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { upsertCliente, resolverAbogado, resolverSucursal } from "@/lib/services/resolvers";
import { requireSession } from "@/lib/guard";
import { crearEventoCalendar } from "@/lib/googleCalendar";

export async function crearCitaAction(form: {
  cliente: string;
  asunto: string;
  fecha: string;
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
  // fecha: "2026-08-20", hora: "10:30" → combinar en un solo Date local
  const [y, mo, d] = (form.fecha || new Date().toLocaleDateString("en-CA")).split("-").map(Number);
  const [h, m] = (form.hora || "09:00").split(":").map(Number);
  const fechaHora = new Date(y, mo - 1, d, h, m, 0, 0);

  const googleEventId = await crearEventoCalendar({
    cliente: form.cliente,
    telefono: form.telefono,
    asunto: form.asunto,
    sucursal: form.sucursal,
    inicio: fechaHora,
  });

  await prisma.cita.create({
    data: {
      clienteId,
      abogadoId,
      sucursalId,
      asunto: form.asunto || null,
      telefono: form.telefono || null,
      fechaHora,
      origen: "manual",
      googleEventId,
    },
  });
  revalidatePath("/agenda");
}

export async function borrarCitaAction(id: string) {
  await requireSession();
  await prisma.cita.delete({ where: { id } });
  revalidatePath("/agenda");
}
