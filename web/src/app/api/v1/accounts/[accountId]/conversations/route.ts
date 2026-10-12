import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { conBot } from "@/lib/bot/auth";
import { parsearIdNumerico } from "@/lib/bot/puro";
import { invalido, json, leerJson } from "@/lib/bot/respuestas";
import { conversacionJson } from "@/lib/bot/serializar";
import { canalPorDefecto } from "@/lib/chat/contactos";
import { cargarConversacion, publicarConversacion } from "@/lib/chat/operaciones";

export const dynamic = "force-dynamic";

// Una conversación por contacto: si ya existe se devuelve, no se duplica.
export async function POST(req: NextRequest, { params }: { params: { accountId: string } }) {
  return conBot(req, params, "conversacion_crear", async (contexto) => {
    const body = await leerJson(req);
    const numero = parsearIdNumerico(String(body.contact_id ?? ""));
    if (numero === null) return invalido("contact_id inválido");
    const contacto = await prisma.contactoWhatsapp.findUnique({ where: { numeroCompat: numero } });
    if (!contacto) return invalido("contact_id inexistente");
    if (body.source_id !== undefined && String(body.source_id) !== contacto.sourceId) {
      return invalido("source_id no corresponde al contacto");
    }
    const canal = await canalPorDefecto();
    if (!canal || canal.id !== contacto.canalId) return invalido("inbox_id inválido");

    const existente = await prisma.conversacion.findUnique({
      where: {
        canalId_telefonoNormalizado: { canalId: contacto.canalId, telefonoNormalizado: contacto.telefonoNormalizado },
      },
    });
    let id = existente?.id;
    if (!existente) {
      const creada = await prisma.conversacion.create({
        data: {
          canalId: contacto.canalId,
          contactoWhatsappId: contacto.id,
          nombreContacto: contacto.nombre,
          telefono: contacto.sourceId,
          telefonoNormalizado: contacto.telefonoNormalizado,
          estado: "abierta",
        },
      });
      id = creada.id;
      await publicarConversacion("conversation_created", id);
    } else if (!existente.contactoWhatsappId) {
      await prisma.conversacion.update({ where: { id: existente.id }, data: { contactoWhatsappId: contacto.id } });
    }
    contexto.conversacionId = id ?? null;
    const conv = await cargarConversacion({ id: id! });
    return json(conversacionJson(conv!));
  });
}
