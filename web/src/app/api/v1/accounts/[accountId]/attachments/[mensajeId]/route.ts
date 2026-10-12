import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { conBot } from "@/lib/bot/auth";
import { parsearIdNumerico } from "@/lib/bot/puro";
import { noEncontrado } from "@/lib/bot/respuestas";
import { leerMedia, respuestaDeArchivo } from "@/lib/chat/media";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { accountId: string; mensajeId: string } }) {
  return conBot(req, params, "adjunto_leer", async (contexto) => {
    const numero = parsearIdNumerico(params.mensajeId);
    const mensaje =
      numero === null
        ? null
        : await prisma.mensaje.findUnique({
            where: { numeroCompat: numero },
            select: { mediaRuta: true, mediaMime: true, mediaNombre: true, conversacionId: true },
          });
    if (!mensaje?.mediaRuta) return noEncontrado("archivo inexistente");
    contexto.conversacionId = mensaje.conversacionId;
    try {
      return respuestaDeArchivo(await leerMedia(mensaje.mediaRuta), mensaje.mediaMime, mensaje.mediaNombre);
    } catch {
      return noEncontrado("archivo inexistente");
    }
  });
}
