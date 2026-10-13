import { prisma } from "@/lib/prisma";
import { parsearIdNumerico } from "@/lib/bot/puro";
import { debeAvanzar, type ClaveEtapa } from "./embudo-reglas";
import { publicarConversacion } from "./operaciones";
import { claveTelefono, digitosTelefono } from "./telefono";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function listarEtapas() {
  return prisma.embudoEtapa.findMany({ orderBy: { orden: "asc" } });
}

// Etapa donde nace una conversación: "Nuevo" (o la primera columna si la renombraron).
export async function datosEtapaInicial() {
  const etapa =
    (await prisma.embudoEtapa.findUnique({ where: { clave: "nuevo" } })) ??
    (await prisma.embudoEtapa.findFirst({ orderBy: { orden: "asc" } }));
  return etapa ? { etapaId: etapa.id, etapaDesde: new Date() } : {};
}

// Acepta el id, la clave (agendo_cita) o el nombre visible ("Agendó cita").
export async function resolverEtapa(referencia: unknown) {
  const valor = String(referencia ?? "").trim();
  if (!valor) return null;
  if (UUID.test(valor)) return prisma.embudoEtapa.findUnique({ where: { id: valor } });
  const etapas = await listarEtapas();
  const minusculas = valor.toLowerCase();
  return etapas.find((e) => e.clave === valor || e.nombre.toLowerCase() === minusculas) ?? null;
}

type Quien = { origen: "automatico" | "bot" | "usuario"; usuarioId?: string | null; detalle?: string };

export async function moverEtapa(conversacionId: string, etapaId: string, quien: Quien) {
  const conv = await prisma.conversacion.findUnique({
    where: { id: conversacionId },
    select: { etapaId: true, etapa: { select: { nombre: true } } },
  });
  if (!conv || conv.etapaId === etapaId) return { cambio: false as const };
  const destino = await prisma.embudoEtapa.findUniqueOrThrow({ where: { id: etapaId }, select: { nombre: true } });
  await prisma.$transaction([
    prisma.conversacion.update({ where: { id: conversacionId }, data: { etapaId, etapaDesde: new Date() } }),
    prisma.conversacionEtapaHistorial.create({
      data: {
        conversacionId,
        etapaId,
        etapaAnteriorId: conv.etapaId,
        origen: quien.origen,
        usuarioId: quien.usuarioId ?? null,
        detalle: quien.detalle ?? null,
      },
    }),
  ]);
  await publicarConversacion("conversation_updated", conversacionId, {
    funnel_stage: { previous_value: conv.etapa?.nombre ?? null, current_value: destino.nombre },
  });
  return { cambio: true as const };
}

// Movimiento por un evento del despacho (cita agendada, asesoría registrada…): solo avanza.
export async function avanzarAutomatico(conversacionId: string, clave: ClaveEtapa, detalle: string) {
  const [conv, destino] = await Promise.all([
    prisma.conversacion.findUnique({
      where: { id: conversacionId },
      select: { etapaId: true, etapa: { select: { clave: true } } },
    }),
    prisma.embudoEtapa.findUnique({ where: { clave } }),
  ]);
  if (!conv || !destino) return { cambio: false as const };
  const actual = conv.etapaId ? (conv.etapa?.clave ?? "personalizada") : null;
  if (!debeAvanzar(actual, clave)) return { cambio: false as const };
  return moverEtapa(conversacionId, destino.id, { origen: "automatico", detalle });
}

// La conversación a la que pertenece un evento: por el id que mandó el bot o, si no,
// por el teléfono (la más reciente si la persona escribió a varios números).
export async function conversacionDe(datos: { conversationId?: string | null; telefono?: string | null }) {
  if (datos.conversationId) {
    const numero = parsearIdNumerico(String(datos.conversationId));
    if (numero !== null) {
      const conv = await prisma.conversacion.findUnique({ where: { numeroCompat: numero }, select: { id: true } });
      if (conv) return conv.id;
    }
  }
  const digitos = digitosTelefono(datos.telefono);
  if (digitos.length < 7) return null;
  const conv = await prisma.conversacion.findFirst({
    where: { telefonoNormalizado: claveTelefono(digitos) },
    orderBy: [{ ultimoMensajeAt: { sort: "desc", nulls: "last" } }, { creadoEn: "desc" }],
    select: { id: true },
  });
  return conv?.id ?? null;
}

// Mueve la tarjeta por un evento que no crea nada que ligar (llamada, no-show, descarte).
// Usa la conversación ya ligada si la hay; si no, busca por id del bot o teléfono.
export async function moverPorEvento(opciones: {
  conversacionId?: string | null;
  conversationId?: string | null;
  telefono?: string | null;
  clave: ClaveEtapa;
  detalle: string;
}) {
  try {
    const id = opciones.conversacionId ?? (await conversacionDe(opciones));
    if (id) await avanzarAutomatico(id, opciones.clave, opciones.detalle);
  } catch (error) {
    console.error("[embudo] no se pudo mover por evento", error instanceof Error ? error.message : "");
  }
}

// Para colgar de cada evento del despacho: liga la cita/asesoría al chat y mueve la
// tarjeta. Nunca debe romper el flujo del despacho, por eso traga y registra el error.
export async function sincronizarConChat(opciones: {
  conversationId?: string | null;
  telefono?: string | null;
  clave: ClaveEtapa;
  detalle: string;
  vincular?: { tabla: "cita" | "asesoria"; id: string };
}) {
  try {
    const conversacionId = await conversacionDe(opciones);
    if (!conversacionId) return;
    if (opciones.vincular?.tabla === "cita") {
      await prisma.cita.update({ where: { id: opciones.vincular.id }, data: { conversacionId } });
    } else if (opciones.vincular?.tabla === "asesoria") {
      await prisma.asesoria.update({ where: { id: opciones.vincular.id }, data: { conversacionId } });
    }
    await avanzarAutomatico(conversacionId, opciones.clave, opciones.detalle);
  } catch (error) {
    console.error("[embudo] no se pudo sincronizar con el chat", error instanceof Error ? error.message : "");
  }
}
