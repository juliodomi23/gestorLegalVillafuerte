import { NextRequest, NextResponse } from "next/server";
import { requerirChat } from "@/lib/chat/api";
import { filtroConversaciones } from "@/lib/chat/acceso";
import { listarMensajes, obtenerConversacion } from "@/lib/chat/servicio";
import { mensajeVista } from "@/lib/chat/vista";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const permiso = await requerirChat();
  if ("error" in permiso) return permiso.error;
  if (!(await obtenerConversacion(params.id, filtroConversaciones(permiso.acceso)))) {
    return NextResponse.json({ error: "conversación inexistente" }, { status: 404 });
  }
  return NextResponse.json({ mensajes: (await listarMensajes(params.id)).map(mensajeVista) });
}
