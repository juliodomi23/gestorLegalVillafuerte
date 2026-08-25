"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { upsertCliente, resolverAbogado, resolverSucursal } from "@/lib/services/resolvers";
import { requireSession } from "@/lib/guard";
import {
  crearEventoCalendar,
  actualizarEventoCalendar,
  borrarEventoCalendar,
} from "@/lib/googleCalendar";

const TZ_DESPACHO = "America/Mexico_City";
const OFFSET_DESPACHO = "-06:00";

// fecha: "2026-08-20", hora: "10:30" → un solo Date.
// El offset va explícito: el contenedor corre en UTC, así que `new Date(y, mo, d, h, m)`
// interpretaba lo capturado como hora UTC y la cita quedaba 6 h corrida (11:30 → 05:30),
// tanto en la agenda como en el evento de Google Calendar.
// Chiapas es UTC-6 todo el año: México no aplica horario de verano desde 2022.
function combinarFechaHora(fechaForm: string, horaForm: string): Date {
  const fecha = fechaForm || new Date().toLocaleDateString("en-CA", { timeZone: TZ_DESPACHO });
  const hora = horaForm || "09:00";
  const fechaHora = new Date(`${fecha}T${hora}:00${OFFSET_DESPACHO}`);
  if (isNaN(fechaHora.getTime())) throw new Error("Fecha u hora inválida");
  return fechaHora;
}

export type FormCita = {
  cliente: string;
  asunto: string;
  fecha: string;
  hora: string;
  telefono: string;
  sucursal: string;
  abogado: string;
};

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
  const fechaHora = combinarFechaHora(form.fecha, form.hora);

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

export async function editarCitaAction(id: string, form: FormCita) {
  await requireSession();
  const cita = await prisma.cita.findUnique({
    where: { id },
    select: { googleEventId: true },
  });
  if (!cita) throw new Error("La cita ya no existe");

  const [abogadoId, sucursalId] = await Promise.all([
    resolverAbogado(form.abogado),
    resolverSucursal(form.sucursal),
  ]);
  const fechaHora = combinarFechaHora(form.fecha, form.hora);

  // Si el evento no se puede actualizar, se conserva el id anterior en vez de
  // borrarlo: perderlo dejaria el evento huerfano en Calendar para siempre.
  const googleEventId =
    (await actualizarEventoCalendar(cita.googleEventId, {
      cliente: form.cliente,
      telefono: form.telefono,
      asunto: form.asunto,
      sucursal: form.sucursal,
      inicio: fechaHora,
    })) ?? cita.googleEventId;

  await prisma.cita.update({
    where: { id },
    data: {
      abogadoId,
      sucursalId,
      asunto: form.asunto || null,
      telefono: form.telefono || null,
      clienteNombre: form.cliente || null,
      fechaHora,
      googleEventId,
    },
  });
  revalidatePath("/agenda");
}

const ESTADOS_VALIDOS = ["agendada", "confirmada", "asesorada", "no_show"];

export async function cambiarEstadoCitaAction(id: string, estado: string) {
  await requireSession();
  if (!ESTADOS_VALIDOS.includes(estado)) throw new Error("Estado inválido");
  await prisma.cita.update({ where: { id }, data: { estado } });
  revalidatePath("/agenda");
}

export async function borrarCitaAction(id: string) {
  await requireSession();
  // Leer el evento ANTES del delete: despues ya no se sabria cual borrar en Calendar.
  const cita = await prisma.cita.findUnique({
    where: { id },
    select: { googleEventId: true, sucursal: { select: { nombre: true } } },
  });
  await borrarEventoCalendar(cita?.googleEventId ?? null, cita?.sucursal?.nombre);
  await prisma.cita.delete({ where: { id } });
  revalidatePath("/agenda");
}
