import { NextResponse } from "next/server";
import { requireAdmin, requireSession } from "@/lib/guard";
import { chatWhatsappActivo } from "./modulo";
import { resolverAcceso } from "./acceso";
import { puedeReasignar } from "./alcance";

function respuestaDeError(error: unknown) {
  const mensaje = error instanceof Error ? error.message : "No autorizado";
  const status = mensaje.includes("administrador") ? 403 : 401;
  return NextResponse.json({ error: status === 403 ? "acceso denegado" : "no autorizado" }, { status });
}

// Cualquier usuario con sesión: lo que ve lo decide su alcance (ver acceso.ts).
export async function requerirChat() {
  if (!chatWhatsappActivo()) {
    return { error: NextResponse.json({ error: "no encontrado" }, { status: 404 }) } as const;
  }
  try {
    const sesion = await requireSession();
    return { sesion, acceso: await resolverAcceso(sesion) } as const;
  } catch (error) {
    return { error: respuestaDeError(error) } as const;
  }
}

// Quien puede reasignar conversaciones (administración y recepción).
export async function requerirChatReasignar() {
  const resultado = await requerirChat();
  if ("error" in resultado) return resultado;
  if (!puedeReasignar(resultado.acceso.alcance)) {
    return { error: NextResponse.json({ error: "acceso denegado" }, { status: 403 }) } as const;
  }
  return resultado;
}

// Configuración del canal, tokens y webhooks: solo administración.
export async function requerirChatAdmin() {
  if (!chatWhatsappActivo()) {
    return { error: NextResponse.json({ error: "no encontrado" }, { status: 404 }) } as const;
  }
  try {
    return { sesion: await requireAdmin() } as const;
  } catch (error) {
    return { error: respuestaDeError(error) } as const;
  }
}
