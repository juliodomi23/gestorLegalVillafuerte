// Operaciones sobre una conversación compartidas por la API v1 (bots) y la interfaz (admin).
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { emitirEventoSeguro } from "@/lib/bot/webhooks";
import { payloadConversacion, incluirConversacion, type ConversacionCompleta } from "@/lib/bot/serializar";
import { asegurarContactoDeConversacion } from "./contactos";

export async function cargarConversacion(where: Prisma.ConversacionWhereUniqueInput): Promise<ConversacionCompleta | null> {
  const conv = await prisma.conversacion.findUnique({ where, include: incluirConversacion });
  if (!conv) return null;
  if (conv.contactoWhatsapp) return conv;
  await asegurarContactoDeConversacion(conv);
  return prisma.conversacion.findUnique({ where, include: incluirConversacion });
}

export async function reemplazarEtiquetas(convId: string, nombres: string[]) {
  const actuales = await prisma.conversacionEtiqueta.findMany({
    where: { conversacionId: convId },
    include: { etiqueta: true },
  });
  const antes = actuales.map((item) => item.etiqueta.nombre).sort();
  const despues = [...new Set(nombres)].sort();
  if (antes.join("\u0000") === despues.join("\u0000")) return { antes, despues, cambio: false };

  const catalogo = await Promise.all(
    despues.map((nombre) =>
      prisma.etiquetaChat.upsert({ where: { nombre }, update: {}, create: { nombre } }),
    ),
  );
  await prisma.$transaction([
    prisma.conversacionEtiqueta.deleteMany({
      where: { conversacionId: convId, etiqueta: { nombre: { notIn: despues } } },
    }),
    prisma.conversacionEtiqueta.createMany({
      data: catalogo.map((etiqueta) => ({ conversacionId: convId, etiquetaId: etiqueta.id })),
      skipDuplicates: true,
    }),
  ]);
  return { antes, despues, cambio: true };
}

export async function fusionarAtributos(convId: string, nuevos: Record<string, unknown>) {
  const conv = await prisma.conversacion.findUniqueOrThrow({ where: { id: convId }, select: { atributos: true } });
  const actuales = (conv.atributos && typeof conv.atributos === "object" && !Array.isArray(conv.atributos)
    ? conv.atributos
    : {}) as Record<string, unknown>;
  const fusion = { ...actuales, ...nuevos };
  await prisma.conversacion.update({ where: { id: convId }, data: { atributos: fusion as Prisma.InputJsonValue } });
  return fusion;
}

export async function quitarAtributo(convId: string, clave: string) {
  const conv = await prisma.conversacion.findUniqueOrThrow({ where: { id: convId }, select: { atributos: true } });
  const actuales = { ...((conv.atributos ?? {}) as Record<string, unknown>) };
  delete actuales[clave];
  await prisma.conversacion.update({ where: { id: convId }, data: { atributos: actuales as Prisma.InputJsonValue } });
  return actuales;
}

export async function cambiarEstado(convId: string, estado: string) {
  const antes = await prisma.conversacion.findUniqueOrThrow({ where: { id: convId }, select: { estado: true } });
  if (antes.estado === estado) return false;
  await prisma.conversacion.update({ where: { id: convId }, data: { estado } });
  return true;
}

// null = sin asignar. Acepta el UUID del usuario o su correo, solo si está activo.
export async function resolverAsignado(referencia: unknown) {
  if (referencia === null || referencia === undefined || referencia === "") return { id: null as string | null };
  const valor = String(referencia);
  const esUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor);
  const usuario = await prisma.usuario.findFirst({
    where: { activo: true, ...(esUuid ? { id: valor } : { email: valor }) },
    select: { id: true },
  });
  return { id: usuario?.id ?? null, noEncontrado: !usuario };
}

export async function asignar(convId: string, usuarioId: string | null) {
  await prisma.conversacion.update({ where: { id: convId }, data: { responsableId: usuarioId } });
}

export async function publicarConversacion(
  evento: "conversation_created" | "conversation_status_changed" | "conversation_updated",
  convId: string,
  cambios?: Record<string, unknown>,
) {
  const conv = await cargarConversacion({ id: convId });
  if (!conv) return;
  await emitirEventoSeguro(evento, payloadConversacion(evento, conv, cambios));
}
