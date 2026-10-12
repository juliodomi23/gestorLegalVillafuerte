import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { conBot } from "@/lib/bot/auth";
import { parsearIdNumerico } from "@/lib/bot/puro";
import { json, noEncontrado } from "@/lib/bot/respuestas";
import { conversacionJson, incluirConversacion } from "@/lib/bot/serializar";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { accountId: string; contactId: string } }) {
  return conBot(req, params, "contacto_conversaciones", async () => {
    const numero = parsearIdNumerico(params.contactId);
    const contacto = numero === null ? null : await prisma.contactoWhatsapp.findUnique({ where: { numeroCompat: numero } });
    if (!contacto) return noEncontrado("contacto inexistente");
    const conversaciones = await prisma.conversacion.findMany({
      where: { contactoWhatsappId: contacto.id },
      include: incluirConversacion,
      orderBy: { creadoEn: "desc" },
    });
    const payload = await Promise.all(
      conversaciones.map(async (conv) => {
        const ultimo = await prisma.mensaje.findFirst({
          where: { conversacionId: conv.id, privado: false },
          orderBy: { timestamp: "desc" },
        });
        return conversacionJson(conv, ultimo);
      }),
    );
    return json({ payload });
  });
}
