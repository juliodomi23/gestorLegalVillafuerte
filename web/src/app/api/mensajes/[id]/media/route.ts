import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirChatAdmin } from "@/lib/chat/api";
import { leerMedia, respuestaDeArchivo } from "@/lib/chat/media";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const acceso = await requerirChatAdmin();
  if ("error" in acceso) return acceso.error;
  const mensaje = await prisma.mensaje.findUnique({
    where: { id: params.id },
    select: { mediaRuta: true, mediaMime: true, mediaNombre: true },
  });
  if (!mensaje?.mediaRuta) return NextResponse.json({ error: "archivo inexistente" }, { status: 404 });
  try {
    return respuestaDeArchivo(await leerMedia(mensaje.mediaRuta), mensaje.mediaMime, mensaje.mediaNombre);
  } catch {
    return NextResponse.json({ error: "archivo inexistente" }, { status: 404 });
  }
}
