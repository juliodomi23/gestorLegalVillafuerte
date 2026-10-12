import { NextRequest, NextResponse } from "next/server";
import { requerirChatAdmin } from "@/lib/chat/api";
import { listarMensajes, obtenerConversacion } from "@/lib/chat/servicio";
import { mensajeVista } from "@/lib/chat/vista";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const acceso = await requerirChatAdmin();
  if ("error" in acceso) return acceso.error;
  if (!(await obtenerConversacion(params.id))) {
    return NextResponse.json({ error: "conversación inexistente" }, { status: 404 });
  }
  return NextResponse.json({ mensajes: (await listarMensajes(params.id)).map(mensajeVista) });
}
