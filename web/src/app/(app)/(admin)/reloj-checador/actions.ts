"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guard";

export async function actualizarGeocercaAction(
  sucursalId: string,
  data: { lat: string; lon: string; radioM: string; horaEntrada: string }
) {
  await requireAdmin();

  const lat = data.lat.trim() === "" ? null : Number(data.lat);
  const lon = data.lon.trim() === "" ? null : Number(data.lon);
  if (lat != null && (Number.isNaN(lat) || lat < -90 || lat > 90)) throw new Error("Latitud inválida");
  if (lon != null && (Number.isNaN(lon) || lon < -180 || lon > 180)) throw new Error("Longitud inválida");
  if ((lat == null) !== (lon == null)) throw new Error("Captura latitud y longitud juntas, o ninguna");

  const radioM = data.radioM.trim() === "" ? 100 : Math.round(Number(data.radioM));
  if (Number.isNaN(radioM) || radioM < 20 || radioM > 2000) throw new Error("El radio debe estar entre 20 y 2000 metros");

  const horaEntrada = data.horaEntrada.trim();
  if (horaEntrada && !/^([01]\d|2[0-3]):[0-5]\d$/.test(horaEntrada)) throw new Error("Hora inválida, usa HH:MM");

  await prisma.sucursal.update({
    where: { id: sucursalId },
    data: { lat, lon, radioM, horaEntrada: horaEntrada || null },
  });
  revalidatePath("/reloj-checador");
}

// Justificar/desjustificar un retardo con un clic, sin exigir nota escrita —
// a fin de mes se revisan muchos retardos y no da tiempo de redactar cada uno.
export async function alternarJustificacionAction(checadaId: string, justificada: boolean) {
  const sesion = await requireAdmin();
  await prisma.checada.update({
    where: { id: checadaId },
    data: {
      justificada,
      justificadaPor: justificada ? sesion.id : null,
      justificadaEn: justificada ? new Date() : null,
    },
  });
  revalidatePath("/reloj-checador");
}

// Nota libre sobre una checada (salida temprana, detalle de la justificación, etc.).
// Independiente de si está justificada o no.
export async function actualizarNotaAction(checadaId: string, motivo: string) {
  await requireAdmin();
  await prisma.checada.update({
    where: { id: checadaId },
    data: { motivo: motivo.trim() || null },
  });
  revalidatePath("/reloj-checador");
}
