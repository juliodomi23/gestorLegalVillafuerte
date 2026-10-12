import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { invalido, json, leerJson } from "@/lib/bot/respuestas";
import { conConversacionBot } from "@/lib/bot/rutas";
import { asignar, publicarConversacion, resolverAsignado } from "@/lib/chat/operaciones";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { accountId: string; conversationId: string } }) {
  return conConversacionBot(req, params, "conversacion_asignar", async (conv) => {
    const body = await leerJson(req);
    const asignado = await resolverAsignado(body.assignee_id);
    if (asignado.noEncontrado) return invalido("assignee_id inválido");
    await asignar(conv.id, asignado.id);
    if ((conv.responsable?.id ?? null) !== asignado.id) {
      await publicarConversacion("conversation_updated", conv.id, { assignee_id: { current_value: asignado.id } });
    }
    if (!asignado.id) return json({});
    const usuario = await prisma.usuario.findUnique({
      where: { id: asignado.id },
      select: { id: true, nombre: true, email: true },
    });
    return json({ id: usuario?.id, name: usuario?.nombre, email: usuario?.email });
  });
}
