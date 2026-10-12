import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { conBot } from "@/lib/bot/auth";
import { json } from "@/lib/bot/respuestas";
import { contactoJson } from "@/lib/bot/serializar";
import { claveTelefono, digitosTelefono } from "@/lib/chat/telefono";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { accountId: string } }) {
  return conBot(req, params, "contactos_buscar", async () => {
    const q = (req.nextUrl.searchParams.get("q") || "").trim();
    const digitos = digitosTelefono(q);
    const donde =
      digitos.length >= 7
        ? { telefonoNormalizado: claveTelefono(digitos) }
        : q
          ? { nombre: { contains: q, mode: "insensitive" as const } }
          : {};
    const contactos = await prisma.contactoWhatsapp.findMany({ where: donde, orderBy: { creadoEn: "desc" }, take: 25 });
    return json({ meta: { count: contactos.length }, payload: contactos.map(contactoJson) });
  });
}
