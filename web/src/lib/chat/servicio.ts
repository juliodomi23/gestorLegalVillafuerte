import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { asegurarContacto, asegurarContactoDeConversacion } from "./contactos";
import { datosEtapaInicial } from "./embudo";
import { claveTelefono, normalizarTelefonoWhatsapp } from "./telefono";
import type { ActualizacionEstado, MensajeEntranteNormalizado } from "@/lib/channel/types";

async function encontrarVinculo(clave: string) {
  const [clientes, prospectos] = await Promise.all([
    prisma.cliente.findMany({ where: { telefono: { not: null } }, select: { id: true, telefono: true } }),
    prisma.prospecto.findMany({ where: { telefono: { not: null } }, select: { id: true, telefono: true } }),
  ]);
  const clientesCoincidentes = clientes.filter((item) => claveTelefono(item.telefono) === clave);
  const prospectosCoincidentes = prospectos.filter((item) => claveTelefono(item.telefono) === clave);
  if (clientesCoincidentes.length + prospectosCoincidentes.length !== 1) {
    return { clienteId: null, prospectoId: null };
  }
  return clientesCoincidentes.length === 1
    ? { clienteId: clientesCoincidentes[0].id, prospectoId: null }
    : { clienteId: null, prospectoId: prospectosCoincidentes[0].id };
}

export type ResultadoIngesta =
  | { duplicado: true; mensajeId?: string }
  | {
      duplicado: false;
      mensajeId: string;
      conversacionId: string;
      conversacionCreada: boolean;
      estadoCambio: boolean;
      mediaId?: string;
      mediaNombre?: string;
    };

export async function ingestarMensajeEntrante(mensaje: MensajeEntranteNormalizado, canalId: string): Promise<ResultadoIngesta> {
  const existente = await prisma.mensaje.findUnique({ where: { waMessageId: mensaje.waMessageId } });
  if (existente) return { duplicado: true, mensajeId: existente.id };

  const telefono = normalizarTelefonoWhatsapp(mensaje.telefono, mensaje.waMessageId);
  const buscar = () =>
    prisma.conversacion.findUnique({
      where: { canalId_telefonoNormalizado: { canalId, telefonoNormalizado: telefono.clave } },
    });
  let conversacion = await buscar();
  let conversacionCreada = false;
  if (!conversacion) {
    const vinculo = await encontrarVinculo(telefono.clave);
    const { contacto } = await asegurarContacto(canalId, {
      nombre: mensaje.nombre,
      telefono: mensaje.telefono,
      respaldo: mensaje.waMessageId,
    });
    try {
      conversacion = await prisma.conversacion.create({
        data: {
          canalId,
          contactoWhatsappId: contacto.id,
          nombreContacto: mensaje.nombre?.trim() || telefono.telefono,
          telefono: telefono.telefono,
          telefonoNormalizado: telefono.clave,
          ...vinculo,
          ...(await datosEtapaInicial()),
        },
      });
      conversacionCreada = true;
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
      conversacion = await buscar();
      if (!conversacion) throw error;
    }
  } else if (!conversacion.contactoWhatsappId) {
    const contacto = await asegurarContactoDeConversacion(conversacion);
    conversacion = { ...conversacion, contactoWhatsappId: contacto.id };
  }

  const estadoCambio = conversacion.estado !== "abierta";
  try {
    const creado = await prisma.$transaction(async (tx) => {
      const nuevo = await tx.mensaje.create({
        data: {
          conversacionId: conversacion.id,
          direccion: "entrante",
          tipo: mensaje.tipo,
          contenido: mensaje.contenido,
          status: "entregado",
          waMessageId: mensaje.waMessageId,
          timestamp: mensaje.timestamp,
          mediaNombre: mensaje.mediaNombre ?? null,
        },
      });
      await tx.conversacion.update({
        where: { id: conversacion.id },
        data: {
          nombreContacto: mensaje.nombre?.trim() || conversacion.nombreContacto,
          telefono: telefono.telefono,
          noLeidos: { increment: 1 },
          ultimoMensajeAt: mensaje.timestamp,
          estado: "abierta",
        },
      });
      return nuevo;
    });
    return {
      duplicado: false,
      mensajeId: creado.id,
      conversacionId: conversacion.id,
      conversacionCreada,
      estadoCambio: estadoCambio && !conversacionCreada,
      mediaId: mensaje.mediaId,
      mediaNombre: mensaje.mediaNombre,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const repetido = await prisma.mensaje.findUnique({ where: { waMessageId: mensaje.waMessageId } });
      return { duplicado: true, mensajeId: repetido?.id };
    }
    throw error;
  }
}

export async function actualizarEstadosMensajes(estados: ActualizacionEstado[]) {
  for (const estado of estados) {
    await prisma.mensaje.updateMany({
      where: { waMessageId: estado.waMessageId },
      data: { status: estado.status, errorDetalle: estado.error ?? null },
    });
  }
}

export async function listarConversaciones(donde: Prisma.ConversacionWhereInput = {}, limite?: number) {
  return prisma.conversacion.findMany({
    where: donde,
    orderBy: [{ ultimoMensajeAt: "desc" }, { creadoEn: "desc" }],
    take: limite,
    include: {
      canal: { select: { id: true, nombre: true, activo: true } },
      cliente: { select: { id: true, nombre: true } },
      prospecto: { select: { id: true, nombre: true } },
      responsable: { select: { id: true, nombre: true } },
      etiquetas: { include: { etiqueta: { select: { nombre: true, color: true } } } },
      etapa: { select: { id: true, clave: true, nombre: true, color: true } },
      mensajes: {
        where: { privado: false },
        orderBy: { timestamp: "desc" },
        take: 1,
        select: { contenido: true, tipo: true },
      },
    },
  });
}

// `donde` es el filtro de visibilidad del usuario (ver acceso.ts): fuera de él, no existe.
export async function obtenerConversacion(id: string, donde: Prisma.ConversacionWhereInput = {}) {
  return prisma.conversacion.findFirst({
    where: { AND: [{ id }, donde] },
    include: {
      canal: { select: { id: true, nombre: true, telefono: true, activo: true } },
      cliente: { select: { id: true, nombre: true, telefono: true } },
      prospecto: { select: { id: true, nombre: true, telefono: true } },
      responsable: { select: { id: true, nombre: true } },
      etiquetas: { include: { etiqueta: { select: { nombre: true, color: true } } } },
      etapa: { select: { id: true, clave: true, nombre: true, color: true } },
      citas: { orderBy: { fechaHora: "desc" }, take: 10, select: { id: true, fechaHora: true, estado: true, asunto: true } },
      asesorias: { orderBy: { creadoEn: "desc" }, take: 10, select: { id: true, folio: true, fecha: true, status: true, tema: true } },
    },
  });
}

export async function listarMensajes(conversacionId: string) {
  const mensajes = await prisma.mensaje.findMany({
    where: { conversacionId },
    orderBy: { timestamp: "asc" },
  });
  await prisma.conversacion.updateMany({ where: { id: conversacionId }, data: { noLeidos: 0 } });
  return mensajes;
}
