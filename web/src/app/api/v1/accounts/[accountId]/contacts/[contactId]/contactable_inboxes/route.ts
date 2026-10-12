import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { conBot } from "@/lib/bot/auth";
import { parsearIdNumerico } from "@/lib/bot/puro";
import { json, noEncontrado } from "@/lib/bot/respuestas";
import { inboxJson } from "@/lib/bot/serializar";

export const dynamic = "force-dynamic";

// Un contacto de WhatsApp es alcanzable por cualquiera de los números conectados.
export async function GET(req: NextRequest, { params }: { params: { accountId: string; contactId: string } }) {
  return conBot(req, params, "contacto_inboxes", async () => {
    const numero = parsearIdNumerico(params.contactId);
    const contacto = numero === null ? null : await prisma.contactoWhatsapp.findUnique({ where: { numeroCompat: numero } });
    if (!contacto) return noEncontrado("contacto inexistente");
    const canales = await prisma.canalWhatsapp.findMany({ where: { activo: true }, orderBy: { numeroCompat: "asc" } });
    return json({
      payload: canales.map((canal) => ({
        source_id: contacto.sourceId,
        inbox: { ...inboxJson(canal), channel_type: "Channel::Whatsapp", phone_number: canal.telefono },
      })),
    });
  });
}
