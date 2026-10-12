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
          ...(clave === "failed" ? { error: "Meta reportó un envío fallido" } : {}),
        });
      }
    }
  }
  return resultado;
}
