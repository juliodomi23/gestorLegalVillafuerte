export type TipoMensajeNormalizado = "texto" | "imagen" | "audio" | "video" | "documento" | "ubicacion" | "plantilla";

export type MensajeMetaNormalizado = {
  waMessageId: string;
  telefono: string;
  nombre?: string;
  tipo: TipoMensajeNormalizado;
  contenido: string;
  timestamp: Date;
  mediaId?: string;
  mediaNombre?: string;
};

export type EstadoMetaNormalizado = {
  waMessageId: string;
  status: "enviado" | "entregado" | "leido" | "fallido";
  error?: string;
};

const MARCADORES: Partial<Record<string, { tipo: TipoMensajeNormalizado; contenido: string }>> = {
  image: { tipo: "imagen", contenido: "[imagen]" },
  audio: { tipo: "audio", contenido: "[audio]" },
  video: { tipo: "video", contenido: "[video]" },
  document: { tipo: "documento", contenido: "[documento]" },
  location: { tipo: "ubicacion", contenido: "[ubicación]" },
};

function contenidoMensaje(message: any): { tipo: TipoMensajeNormalizado; contenido: string } {
  if (message?.type === "text") return { tipo: "texto", contenido: String(message.text?.body ?? "") };
  const marcador = MARCADORES[String(message?.type ?? "")];
  if (marcador) return marcador;
  const tipo = String(message?.type || "desconocido").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40);
  return { tipo: "texto", contenido: `[tipo no soportado: ${tipo || "desconocido"}]` };
}

export function normalizarMensajesMeta(payload: unknown): MensajeMetaNormalizado[] {
  const resultado: MensajeMetaNormalizado[] = [];
  const raw = payload as any;
  for (const entry of raw?.entry || []) {
    for (const change of entry?.changes || []) {
      const value = change?.value || {};
      const nombres = new Map<string, string>();
      for (const contact of value.contacts || []) {
        if (contact?.wa_id) nombres.set(String(contact.wa_id), String(contact.profile?.name || contact.wa_id));
      }
      for (const message of value.messages || []) {
        const waMessageId = String(message?.id || "");
        if (!waMessageId) continue;
        const telefono = String(message?.from || "");
        const adjunto = ["image", "audio", "video", "document"].includes(String(message?.type)) ? message[message.type] : null;
        resultado.push({
          waMessageId,
          telefono,
          nombre: nombres.get(telefono),
          ...contenidoMensaje(message),
          timestamp: message?.timestamp ? new Date(Number(message.timestamp) * 1000) : new Date(),
          ...(adjunto?.id ? { mediaId: String(adjunto.id) } : {}),
          ...(adjunto?.filename ? { mediaNombre: String(adjunto.filename).slice(0, 120) } : {}),
        });
      }
    }
  }
  return resultado;
}

// Códigos de Meta que más se ven al enviar plantillas; el resto conserva el título que manda Meta.
const PISTAS_META: Record<number, string> = {
  131026: "no se pudo entregar: el número no tiene WhatsApp o no lo aceptó",
  131047: "fuera de la ventana de 24 h: solo se puede enviar una plantilla",
  131049: "Meta no entregó el mensaje de marketing para proteger al usuario (límite por destinatario)",
  131051: "tipo de mensaje no compatible",
  132000: "los parámetros no coinciden con la plantilla",
  132001: "la plantilla no existe en ese idioma",
  132005: "el texto traducido de la plantilla es demasiado largo",
  132007: "la plantilla viola una política de Meta",
  132012: "el formato de un parámetro no es el que espera la plantilla",
  132015: "la plantilla está pausada por baja calidad",
  132016: "la plantilla está deshabilitada",
};

export function errorDeMeta(error: any): string {
  const codigo = Number(error?.code);
  const titulo = String(error?.title || error?.message || "").trim();
  const detalle = String(error?.error_data?.details || "").trim();
  if (!codigo && !titulo) return "Meta reportó un envío fallido";
  const texto = `Meta ${codigo || "?"}: ${PISTAS_META[codigo] || titulo}`;
  return (detalle && !texto.includes(detalle) ? `${texto} — ${detalle}` : texto).slice(0, 300);
}

export function normalizarEstadosMeta(payload: unknown): EstadoMetaNormalizado[] {
  const resultado: EstadoMetaNormalizado[] = [];
  const raw = payload as any;
  const mapa = { sent: "enviado", delivered: "entregado", read: "leido", failed: "fallido" } as const;
  for (const entry of raw?.entry || []) {
    for (const change of entry?.changes || []) {
      for (const status of change?.value?.statuses || []) {
        const clave = status?.status as keyof typeof mapa;
        if (!status?.id || !mapa[clave]) continue;
        resultado.push({
          waMessageId: String(status.id),
          status: mapa[clave],
          ...(clave === "failed" ? { error: errorDeMeta(status?.errors?.[0]) } : {}),
        });
      }
    }
  }
  return resultado;
}
