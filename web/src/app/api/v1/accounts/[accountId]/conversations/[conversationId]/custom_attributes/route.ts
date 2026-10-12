import { NextRequest } from "next/server";
import { atributosValidos } from "@/lib/bot/puro";
import { invalido, json, leerJson } from "@/lib/bot/respuestas";
import { conConversacionBot } from "@/lib/bot/rutas";
import { fusionarAtributos, publicarConversacion } from "@/lib/chat/operaciones";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { accountId: string; conversationId: string } }) {
  return conConversacionBot(req, params, "atributos_actualizar", async (conv) => {
    const body = await leerJson(req);
    const nuevos = atributosValidos(body.custom_attributes);
    if (!nuevos) return invalido("custom_attributes inválido");
    const fusion = await fusionarAtributos(conv.id, nuevos);
    await publicarConversacion("conversation_updated", conv.id, { custom_attributes: { current_value: nuevos } });
    return json({ custom_attributes: fusion });
  });
}
