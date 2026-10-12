import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { conBot } from "@/lib/bot/auth";
import { parsearIdNumerico } from "@/lib/bot/puro";
import { json, noEncontrado } from "@/lib/bot/respuestas";
import { INBOX } from "@/lib/bot/serializar";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { accountId: string; contactId: string } }) {
  return conBot(req, params, "contacto_inboxes", async () => {
    const numero = parsearIdNumerico(params.contactId);
    const contacto =
      numero === null
        ? null
        : await prisma.contactoWhatsapp.findUnique({
            where: { numeroCompat: numero },
            include: { canal: { select: { telefono: true } } },
          });
    if (!contacto) return noEncontrado("contacto inexistente");
    return json({
      payload: [
        {
          source_id: contacto.sourceId,
          inbox: { ...INBOX, channel_type: "Channel::Whatsapp", phone_number: contacto.canal.telefono },
        },
      ],
    });
  });
}
