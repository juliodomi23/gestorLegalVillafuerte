import type { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { conBot } from "@/lib/bot/auth";
import { atributosValidos, parsearIdNumerico } from "@/lib/bot/puro";
import { invalido, json, leerJson, noEncontrado } from "@/lib/bot/respuestas";
import { contactoJson } from "@/lib/bot/serializar";

export const dynamic = "force-dynamic";

type Params = { params: { accountId: string; contactId: string } };

async function buscar(contactId: string) {
  const numero = parsearIdNumerico(contactId);
  return numero === null ? null : prisma.contactoWhatsapp.findUnique({ where: { numeroCompat: numero } });
}

export async function GET(req: NextRequest, { params }: Params) {
  return conBot(req, params, "contacto_leer", async () => {
    const contacto = await buscar(params.contactId);
    return contacto ? json({ payload: contactoJson(contacto) }) : noEncontrado("contacto inexistente");
  });
}

export async function PUT(req: NextRequest, { params }: Params) {
  return conBot(req, params, "contacto_actualizar", async () => {
    const contacto = await buscar(params.contactId);
    if (!contacto) return noEncontrado("contacto inexistente");
    const body = await leerJson(req);
    const datos: { nombre?: string; atributos?: Prisma.InputJsonValue } = {};
    if (typeof body.name === "string" && body.name.trim()) datos.nombre = body.name.trim().slice(0, 120);
    if (body.custom_attributes !== undefined) {
      const nuevos = atributosValidos(body.custom_attributes);
      if (!nuevos) return invalido("custom_attributes inválido");
      datos.atributos = { ...((contacto.atributos ?? {}) as Record<string, Prisma.InputJsonValue>), ...(nuevos as Record<string, Prisma.InputJsonValue>) };
    }
    const final = await prisma.contactoWhatsapp.update({ where: { id: contacto.id }, data: datos });
    return json({ payload: contactoJson(final) });
  });
}
