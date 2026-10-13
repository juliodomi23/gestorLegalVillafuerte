import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { conBot } from "@/lib/bot/auth";
import { parsearIdNumerico } from "@/lib/bot/puro";
import { invalido, json, leerJson } from "@/lib/bot/respuestas";
import { conversacionJson } from "@/lib/bot/serializar";
import { asegurarContacto, canalDeInbox } from "@/lib/chat/contactos";
import { datosEtapaInicial } from "@/lib/chat/embudo";
import { cargarConversacion, publicarConversacion } from "@/lib/chat/operaciones";

export const dynamic = "force-dynamic";

// Una conversación por persona y número: si ya existe se devuelve, no se duplica.
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
    const canal = body.inbox_id === undefined ? await prisma.canalWhatsapp.findUnique({ where: { id: contacto.canalId } }) : await canalDeInbox(body.inbox_id);
    if (!canal) return invalido("inbox_id inválido");

    // El mismo teléfono en otro número del despacho: se crea su contacto en ese canal.
    const enCanal =
      canal.id === contacto.canalId
        ? contacto
        : (await asegurarContacto(canal.id, { nombre: contacto.nombre, telefono: contacto.telefono, respaldo: contacto.id })).contacto;

    const existente = await prisma.conversacion.findUnique({
      where: { canalId_telefonoNormalizado: { canalId: canal.id, telefonoNormalizado: enCanal.telefonoNormalizado } },
    });
    let id = existente?.id;
    if (!existente) {
      const creada = await prisma.conversacion.create({
        data: {
          canalId: canal.id,
          contactoWhatsappId: enCanal.id,
          nombreContacto: enCanal.nombre,
          telefono: enCanal.sourceId,
          telefonoNormalizado: enCanal.telefonoNormalizado,
          estado: "abierta",
          ...(await datosEtapaInicial()),
        },
      });
      id = creada.id;
      await publicarConversacion("conversation_created", id);
    } else if (!existente.contactoWhatsappId) {
      await prisma.conversacion.update({ where: { id: existente.id }, data: { contactoWhatsappId: enCanal.id } });
    }
    contexto.conversacionId = id ?? null;
    const conv = await cargarConversacion({ id: id! });
    return json(conversacionJson(conv!));
  });
}
