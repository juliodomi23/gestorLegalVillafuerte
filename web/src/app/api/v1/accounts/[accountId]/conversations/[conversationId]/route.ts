import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { conversacionJson } from "@/lib/bot/serializar";
import { conConversacionBot } from "@/lib/bot/rutas";
import { json } from "@/lib/bot/respuestas";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { accountId: string; conversationId: string } }) {
  return conConversacionBot(req, params, "conversacion_leer", async (conv) => {
    const ultimo = await prisma.mensaje.findFirst({
      where: { conversacionId: conv.id, privado: false },
      orderBy: { timestamp: "desc" },
    });
    return json(conversacionJson(conv, ultimo));
  });
}
