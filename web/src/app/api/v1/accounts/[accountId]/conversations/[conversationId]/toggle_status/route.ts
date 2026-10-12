import { NextRequest } from "next/server";
import { estadoGestor } from "@/lib/bot/puro";
import { invalido, json, leerJson } from "@/lib/bot/respuestas";
import { conConversacionBot } from "@/lib/bot/rutas";
import { cambiarEstado, publicarConversacion } from "@/lib/chat/operaciones";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { accountId: string; conversationId: string } }) {
  return conConversacionBot(req, params, "conversacion_estado", async (conv) => {
    const body = await leerJson(req);
    const estado = estadoGestor(body.status);
    if (!estado) return invalido("status inválido: open, pending, resolved o snoozed");
    if (await cambiarEstado(conv.id, estado)) {
      await publicarConversacion("conversation_status_changed", conv.id, {
        status: { current_value: String(body.status) },
      });
    }
    return json({
      meta: {},
      payload: {
        success: true,
        conversation_id: Number(conv.numeroCompat),
        current_status: String(body.status),
        snoozed_until: null,
      },
    });
  });
}
