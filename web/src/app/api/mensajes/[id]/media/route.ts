import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirChat } from "@/lib/chat/api";
import { filtroConversaciones } from "@/lib/chat/acceso";
import { leerMedia, respuestaDeArchivo } from "@/lib/chat/media";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const permiso = await requerirChat();
  if ("error" in permiso) return permiso.error;
  const mensaje = await prisma.mensaje.findFirst({
    where: { id: params.id, conversacion: filtroConversaciones(permiso.acceso) },
    select: { mediaRuta: true, mediaMime: true, mediaNombre: true },
  });
  if (!mensaje?.mediaRuta) return NextResponse.json({ error: "archivo inexistente" }, { status: 404 });
  try {
    return respuestaDeArchivo(await leerMedia(mensaje.mediaRuta), mensaje.mediaMime, mensaje.mediaNombre);
  } catch {
    return NextResponse.json({ error: "archivo inexistente" }, { status: 404 });
  }
}
