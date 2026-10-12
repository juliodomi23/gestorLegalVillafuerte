import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/guard";
import { chatWhatsappActivo } from "./modulo";

export async function requerirChatAdmin() {
  if (!chatWhatsappActivo()) {
    return { error: NextResponse.json({ error: "no encontrado" }, { status: 404 }) } as const;
  }
  try {
    return { sesion: await requireAdmin() } as const;
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "No autorizado";
    const status = mensaje.includes("administrador") ? 403 : 401;
    return { error: NextResponse.json({ error: status === 403 ? "acceso denegado" : "no autorizado" }, { status }) } as const;
  }
}
