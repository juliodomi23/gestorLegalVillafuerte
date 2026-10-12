export function chatWhatsappActivo(): boolean {
  return process.env.CHAT_WHATSAPP_ACTIVO?.trim().toLowerCase() === "true";
}

export function asegurarChatWhatsappActivo(): void {
  if (!chatWhatsappActivo()) throw new Error("CHAT_WHATSAPP_INACTIVO");
}
