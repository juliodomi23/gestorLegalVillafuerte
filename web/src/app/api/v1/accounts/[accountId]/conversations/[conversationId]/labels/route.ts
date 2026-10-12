import { NextRequest } from "next/server";
import { sanitizarEtiquetas } from "@/lib/bot/puro";
import { invalido, json, leerJson } from "@/lib/bot/respuestas";
import { conConversacionBot } from "@/lib/bot/rutas";
import { etiquetasDe } from "@/lib/bot/serializar";
import { publicarConversacion, reemplazarEtiquetas } from "@/lib/chat/operaciones";

export const dynamic = "force-dynamic";

type Params = { params: { accountId: string; conversationId: string } };

export async function GET(req: NextRequest, { params }: Params) {
  return conConversacionBot(req, params, "etiquetas_leer", async (conv) => json({ payload: etiquetasDe(conv) }));
}

// Semántica Chatwoot: la lista enviada REEMPLAZA el conjunto; los workflows hacen el merge antes.
export async function POST(req: NextRequest, { params }: Params) {
  return conConversacionBot(req, params, "etiquetas_reemplazar", async (conv) => {
    const body = await leerJson(req);
    if (!Array.isArray(body.labels)) return invalido("labels debe ser una lista");
    const resultado = await reemplazarEtiquetas(conv.id, sanitizarEtiquetas(body.labels));
    if (resultado.cambio) {
      await publicarConversacion("conversation_updated", conv.id, {
        label_list: { previous_value: resultado.antes, current_value: resultado.despues },
      });
    }
    return json({ payload: resultado.despues });
  });
}
