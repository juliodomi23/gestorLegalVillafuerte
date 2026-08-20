"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { upsertCliente, resolverAbogado, resolverSucursal } from "@/lib/services/resolvers";
import { requireSession } from "@/lib/guard";
import { crearEventoCalendar } from "@/lib/googleCalendar";

const TZ_DESPACHO = "America/Mexico_City";
const OFFSET_DESPACHO = "-06:00";

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
  // fecha: "2026-08-20", hora: "10:30" → un solo Date.
  // El offset va explícito: el contenedor corre en UTC, así que `new Date(y, mo, d, h, m)`
  // interpretaba lo capturado como hora UTC y la cita quedaba 6 h corrida (11:30 → 05:30),
  // tanto en la agenda como en el evento de Google Calendar.
  // Chiapas es UTC-6 todo el año: México no aplica horario de verano desde 2022.
  const fecha = form.fecha || new Date().toLocaleDateString("en-CA", { timeZone: TZ_DESPACHO });
  const hora = form.hora || "09:00";
  const fechaHora = new Date(`${fecha}T${hora}:00${OFFSET_DESPACHO}`);
  if (isNaN(fechaHora.getTime())) throw new Error("Fecha u hora inválida");

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
