// Forma Chatwoot de lo que GestorLegal guarda. Los IDs numéricos son los numero_compat.
import { Prisma } from "@prisma/client";
import { estadoChatwoot } from "./puro";

export const INBOX = { id: 1, name: "WhatsApp" } as const;
export const CUENTA = { id: 1, name: "GestorLegal" } as const;

export const incluirConversacion = Prisma.validator<Prisma.ConversacionInclude>()({
  contactoWhatsapp: true,
  etiquetas: { include: { etiqueta: true } },
  responsable: { select: { id: true, nombre: true, email: true } },
});

export type ConversacionCompleta = Prisma.ConversacionGetPayload<{ include: typeof incluirConversacion }>;
export type MensajeBase = Prisma.MensajeGetPayload<object>;

const segundos = (fecha: Date | null | undefined) => (fecha ? Math.floor(fecha.getTime() / 1000) : null);
const numero = (valor: bigint | number | null | undefined) => (valor == null ? null : Number(valor));

function urlBase(): string {
  return (process.env.NEXTAUTH_URL || "").replace(/\/+$/, "");
}

const TIPO_ARCHIVO: Record<string, string> = {
  imagen: "image",
  audio: "audio",
  video: "video",
  documento: "file",
  ubicacion: "location",
};

const ESTADO_MENSAJE: Record<string, string> = {
  pendiente: "sent",
  enviado: "sent",
  entregado: "delivered",
  leido: "read",
  fallido: "failed",
};

export function etiquetasDe(conv: ConversacionCompleta): string[] {
  return conv.etiquetas.map((item) => item.etiqueta.nombre).sort();
}

export function atributos(valor: unknown): Record<string, unknown> {
  return valor && typeof valor === "object" && !Array.isArray(valor) ? (valor as Record<string, unknown>) : {};
}

export function contactoJson(contacto: Prisma.ContactoWhatsappGetPayload<object>) {
  return {
    id: numero(contacto.numeroCompat),
    name: contacto.nombre,
    phone_number: contacto.telefono,
    email: null,
    identifier: null,
    thumbnail: "",
    availability_status: "offline",
    custom_attributes: atributos(contacto.atributos),
    additional_attributes: {},
    created_at: segundos(contacto.creadoEn),
  };
}

function remitenteContacto(conv: ConversacionCompleta) {
  const contacto = conv.contactoWhatsapp;
  return {
    id: numero(contacto?.numeroCompat),
    name: contacto?.nombre ?? conv.nombreContacto,
    phone_number: contacto?.telefono ?? conv.telefono,
    type: "contact",
  };
}

function asignado(conv: ConversacionCompleta) {
  return conv.responsable
    ? { id: conv.responsable.id, name: conv.responsable.nombre, email: conv.responsable.email, type: "user" }
    : null;
}

export function archivosDe(mensaje: MensajeBase) {
  if (!mensaje.mediaRuta) return [];
  const id = numero(mensaje.numeroCompat);
  return [
    {
      id,
      message_id: id,
      file_type: TIPO_ARCHIVO[mensaje.tipo] ?? "file",
      file_name: mensaje.mediaNombre,
      content_type: mensaje.mediaMime,
      file_size: numero(mensaje.mediaTamano),
      data_url: `${urlBase()}/api/v1/accounts/1/attachments/${id}`,
      thumb_url: "",
    },
  ];
}

export function mensajeJson(mensaje: MensajeBase, conv: { numeroCompat: bigint }) {
  const entrante = mensaje.direccion === "entrante";
  return {
    id: numero(mensaje.numeroCompat),
    content: mensaje.contenido ?? "",
    account_id: CUENTA.id,
    inbox_id: INBOX.id,
    conversation_id: numero(conv.numeroCompat),
    message_type: entrante ? 0 : 1,
    content_type: "text",
    content_attributes: {},
    private: mensaje.privado,
    status: ESTADO_MENSAJE[mensaje.status] ?? "sent",
    source_id: mensaje.waMessageId,
    sender_type: entrante ? "Contact" : mensaje.enviadoPor ? "User" : "AgentBot",
    created_at: segundos(mensaje.timestamp),
    attachments: archivosDe(mensaje),
  };
}

export function conversacionJson(conv: ConversacionCompleta, ultimo?: MensajeBase | null) {
  const contacto = conv.contactoWhatsapp;
  return {
    id: numero(conv.numeroCompat),
    account_id: CUENTA.id,
    inbox_id: INBOX.id,
    status: estadoChatwoot(conv.estado),
    labels: etiquetasDe(conv),
    custom_attributes: atributos(conv.atributos),
    additional_attributes: {},
    channel: "Channel::Whatsapp",
    can_reply: true,
    muted: false,
    unread_count: conv.noLeidos,
    assignee_id: conv.responsable?.id ?? null,
    contact_inbox: {
      contact_id: numero(contacto?.numeroCompat),
      source_id: contacto?.sourceId ?? null,
    },
    meta: {
      sender: remitenteContacto(conv),
      assignee: asignado(conv),
      channel: "Channel::Whatsapp",
    },
    messages: ultimo
      ? [{ id: numero(ultimo.numeroCompat), content: ultimo.contenido ?? "", sender_type: ultimo.direccion === "entrante" ? "Contact" : "User" }]
      : [],
    timestamp: segundos(conv.ultimoMensajeAt ?? conv.creadoEn),
    created_at: segundos(conv.creadoEn),
  };
}

export function payloadMensaje(evento: "message_created", mensaje: MensajeBase, conv: ConversacionCompleta) {
  const entrante = mensaje.direccion === "entrante";
  return {
    event: evento,
    id: numero(mensaje.numeroCompat),
    content: mensaje.contenido ?? "",
    content_type: "text",
    message_type: entrante ? "incoming" : "outgoing",
    private: mensaje.privado,
    source_id: mensaje.waMessageId,
    created_at: mensaje.timestamp.toISOString(),
    account: CUENTA,
    inbox: INBOX,
    sender: remitenteContacto(conv),
    attachments: archivosDe(mensaje),
    conversation: {
      ...conversacionJson(conv, mensaje),
      messages: [
        {
          id: numero(mensaje.numeroCompat),
          content: mensaje.contenido ?? "",
          sender_type: entrante ? "Contact" : "User",
          message_type: entrante ? 0 : 1,
        },
      ],
    },
  };
}

export function payloadConversacion(
  evento: "conversation_created" | "conversation_status_changed" | "conversation_updated",
  conv: ConversacionCompleta,
  cambios?: Record<string, unknown>,
) {
  return {
    event: evento,
    account: CUENTA,
    inbox: INBOX,
    ...conversacionJson(conv),
    ...(cambios ? { changed_attributes: [cambios] } : {}),
  };
}
