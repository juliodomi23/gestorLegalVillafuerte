// Forma que consume la interfaz del chat (sin BigInt: JSON no los serializa).
import type { Prisma } from "@prisma/client";

type Etiqueta = { nombre: string; color: string };

export function etiquetasVista(items: { etiqueta: Etiqueta }[]): Etiqueta[] {
  return items.map(({ etiqueta }) => ({ nombre: etiqueta.nombre, color: etiqueta.color })).sort((a, b) => a.nombre.localeCompare(b.nombre));
}

type MensajeConAutor = Prisma.MensajeGetPayload<object> & { usuario?: { nombre: string } | null };

export function mensajeVista(m: MensajeConAutor) {
  const saliente = m.direccion === "saliente";
  return {
    // Saliente sin usuario = lo mandó el bot (n8n); con usuario = un abogado desde el chat.
    esBot: saliente && !m.enviadoPor,
    remitente: saliente && m.enviadoPor ? m.usuario?.nombre ?? "Equipo" : null,
    id: m.id,
    numero: Number(m.numeroCompat),
    direccion: m.direccion,
    tipo: m.tipo,
    contenido: m.contenido,
    status: m.status,
    errorDetalle: m.errorDetalle,
    privado: m.privado,
    tieneMedia: Boolean(m.mediaRuta),
    mediaMime: m.mediaMime,
    mediaNombre: m.mediaNombre,
    timestamp: m.timestamp,
  };
}
