import type { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { conBot } from "@/lib/bot/auth";
import { atributosValidos } from "@/lib/bot/puro";
import { invalido, json, leerJson } from "@/lib/bot/respuestas";
import { contactoJson, INBOX } from "@/lib/bot/serializar";
import { asegurarContacto, canalPorDefecto } from "@/lib/chat/contactos";
import { digitosTelefono } from "@/lib/chat/telefono";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { accountId: string } }) {
  return conBot(req, params, "contactos_crear", async () => {
    const body = await leerJson(req);
    const digitos = digitosTelefono(body.phone_number);
    if (digitos.length < 7) return invalido("phone_number inválido");
    const atributos = body.custom_attributes === undefined ? {} : atributosValidos(body.custom_attributes);
    if (!atributos) return invalido("custom_attributes inválido");
    const canal = await canalPorDefecto();
    if (!canal) return invalido("no hay un canal de WhatsApp activo");

    const nombre = String(body.name ?? "").trim() || undefined;
    const { contacto, creado } = await asegurarContacto(canal.id, { nombre, telefono: digitos, respaldo: digitos });
    if (!creado) {
      return json(
        { message: "Phone number has already been taken", error: "Phone number has already been taken", attributes: ["phone_number"] },
        422,
      );
    }
    const final = Object.keys(atributos).length
      ? await prisma.contactoWhatsapp.update({ where: { id: contacto.id }, data: { atributos: atributos as Prisma.InputJsonValue } })
      : contacto;
    return json({ payload: { contact: contactoJson(final), contact_inbox: { inbox: INBOX, source_id: final.sourceId } } });
  });
}
