const MOTIVOS: Record<number, string> = {
  131047: "Pasaron más de 24 h desde el último mensaje del cliente: solo se puede enviar una plantilla aprobada.",
  131026: "No se pudo entregar: el número no tiene WhatsApp o no acepta mensajes de empresas.",
  132001: "La plantilla no existe o no está aprobada en ese idioma.",
};

export function motivoDeErrorMeta(error: unknown): string {
  const e = (error ?? {}) as { code?: number; message?: string; error_data?: { details?: string } };
  return (e.code && MOTIVOS[e.code]) || e.error_data?.details || e.message || "Meta rechazó el mensaje";
}
